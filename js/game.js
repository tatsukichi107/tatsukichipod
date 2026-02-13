/* =========================================================
 * game.js（タリスポッド：環境判定＆育成ロジック）
 *
 * app.js が期待する公開API：
 *  - window.TSP_GAME = {
 *      TEMP_STEPS, HUM_STEPS, ATTR_META, LIMITS,
 *      Rank,
 *      envAttribute(temp, hum),
 *      maxHP(soul),
 *      computeRank(monster, env, now),
 *      computeMinutePreview(soul, monster, env, now, elemCounter),
 *      applyOneMinute(soul, monster, env, now, elemCounter),
 *    }
 *
 * 重要：
 * - 最大HP NaN対策：baseHP / growHP を数値として扱う
 * - 光適正は「通常環境（無属性/水中以外）」でのみ足切り
 * - 無属性（temp0 hum50）は光無視＆成長なし
 * - 水中（hum=100）は光無視（＝水深扱いだが足切りしない）
 * - 成長：回復→成長（最大HP増加時は currentHP も同時増加）
 * ========================================================= */

(function () {
  "use strict";

  const TSP_GAME = {};

  // =========================================================
  // 定数
  // =========================================================

  // 温度ステップ（-297, -45, -40, -35 ... 0,5,10...40,45,999）
  const TEMP_STEPS = (() => {
    const arr = [-297, -45];
    for (let t = -40; t <= 45; t += 5) arr.push(t);
    arr.push(999);
    // 重複除去
    return Array.from(new Set(arr));
  })();

  // 湿度ステップ（0,5,10...90,95,99,100）
  const HUM_STEPS = (() => {
    const arr = [];
    for (let h = 0; h <= 90; h += 5) arr.push(h);
    arr.push(95, 99, 100);
    return Array.from(new Set(arr));
  })();

  const LIMITS = {
    hpGrowMax: 5110,
    elemGrowMax: 630,
  };

  const Rank = {
    neutral: "neutral",
    superbest: "superbest",
    best: "best",
    good: "good",
    normal: "normal",
    bad: "bad",
  };

  const ATTR_META = {
    volcano: { jp: "火", en: "Volcano" },
    tornado: { jp: "風", en: "Tornado" },
    earthquake: { jp: "土", en: "Earthquake" },
    storm: { jp: "水", en: "Storm" },
  };

  // 属性相性（現状：弱点だけ使う。光闇は後回し）
  // tornado（風）の弱点 earthquake（土）
  // ※他属性も暫定で循環させておく（後で調整OK）
  const WEAK_OF = {
    volcano: "storm",       // 火の弱点＝水（仮）
    tornado: "earthquake",  // 風の弱点＝土（確定）
    earthquake: "volcano",  // 土の弱点＝火（仮）
    storm: "tornado",       // 水の弱点＝風（仮）
  };

  // =========================================================
  // 環境属性決定（温度×湿度：0中心、四象限）
  // 右上=土 / 右下=水 / 左下=風 / 左上=火
  // 中心（temp0 hum50）=無属性
  // =========================================================
  function envAttribute(temp, hum) {
    const t = Number(temp);
    const h = Number(hum);

    if (t === 0 && h === 50) return "none";

    // dy: 湿度 50 を基準に上下
    const dx = t;         // 右：正、左：負
    const dy = h - 50;    // 上：正、下：負

    if (dx >= 0 && dy >= 0) return "earthquake"; // 右上=土
    if (dx >= 0 && dy < 0)  return "storm";      // 右下=水
    if (dx < 0 && dy < 0)   return "tornado";    // 左下=風
    return "volcano";                            // 左上=火
  }

  // =========================================================
  // 光の適正（通常環境のみで足切り）
  // 06:00-09:59 => 50
  // 10:00-15:59 => 100
  // 16:00-05:59 => 0
  // =========================================================
  function expectedLightByTime(now) {
    const h = now.getHours(); // ローカル時刻
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0; // 16〜翌5
  }

  // =========================================================
  // 最大HP
  // =========================================================
  function maxHP(soul) {
    const base = Number(soul?.baseHP ?? 0);
    const grow = Number(soul?.growHP ?? 0);
    const safeBase = Number.isFinite(base) ? base : 0;
    const safeGrow = Number.isFinite(grow) ? grow : 0;
    const cappedGrow = Math.min(LIMITS.hpGrowMax, Math.max(0, safeGrow));
    return safeBase + cappedGrow;
  }

  // =========================================================
  // 超ベスト/ベスト判定
  // - 超ベスト：温度・湿度（＋水中なら水深）完全一致
  // - ベスト：エリア一致（ざっくり：超ベストの近傍エリア）
  //
  // ※エリア一致は、今後の調整前提の実装：
  //    superBest(temp, hum) を中心に temp±10, hum±10 をベストエリアとする
  // =========================================================
  function isSuperBest(monster, env) {
    if (!monster?.superBest) return false;
    const sb = monster.superBest;

    const tOk = Number(env.temp) === Number(sb.temp);
    const hOk = Number(env.hum) === Number(sb.hum);

    if (!tOk || !hOk) return false;

    // 水中（hum=100）の時だけ水深も一致判定に使う、という仕様が将来あるので対応
    if (Number(env.hum) === 100) {
      const depth = Number(env.light);
      const sbDepth = Number(sb.waterDepth ?? 50);
      return depth === sbDepth;
    }
    return true;
  }

  function isBest(monster, env) {
    // 超ベストならここではtrueにしない（優先順位は上で処理）
    if (!monster?.superBest) return false;

    const sb = monster.superBest;

    // エリア一致：近傍（±10）
    const dt = Math.abs(Number(env.temp) - Number(sb.temp));
    const dh = Math.abs(Number(env.hum) - Number(sb.hum));

    return (dt <= 10 && dh <= 10);
  }

  // =========================================================
  // 環境ランク判定（app.js の表示/表情に直結）
  // =========================================================
  function computeRank(monster, env, now) {
    const temp = Number(env?.temp ?? 0);
    const hum = Number(env?.hum ?? 50);
    const light = Number(env?.light ?? 50);

    // 1) 無属性（最優先）
    if (temp === 0 && hum === 50) {
      return { rank: Rank.neutral, envAttr: "none", reason: "neutral" };
    }

    // 2) 水中（湿度=100）：光は足切り無視（＝水深扱いは将来）
    const isWater = (hum === 100);
    const envAttr = isWater ? "storm" : envAttribute(temp, hum);

    // 3) 光足切り（通常環境のみ）
    if (!isWater) {
      const expected = expectedLightByTime(now);
      if (light !== expected) {
        return { rank: Rank.bad, envAttr, reason: "light_mismatch" };
      }
    }

    // 4) 超ベスト
    if (!isWater && isSuperBest(monster, env)) {
      return { rank: Rank.superbest, envAttr, reason: "superbest" };
    }

    // 5) ベスト（エリア一致）
    if (!isWater && isBest(monster, env)) {
      return { rank: Rank.best, envAttr, reason: "best" };
    }

    // 6) 属性で 良好/普通/最悪
    const monAttr = monster?.id === "windragon" ? "tornado" : (monster?.attribute || "tornado");
    const weak = WEAK_OF[monAttr] || "earthquake";

    if (envAttr === monAttr) return { rank: Rank.good, envAttr, reason: "same_attr" };
    if (envAttr === weak) return { rank: Rank.bad, envAttr, reason: "weak_attr" };
    return { rank: Rank.normal, envAttr, reason: "normal_attr" };
  }

  // =========================================================
  // 成長パラメータの対象要素
  // =========================================================
  function elemKeyByEnvAttr(envAttr) {
    switch (envAttr) {
      case "volcano": return "fire";
      case "tornado": return "wind";
      case "earthquake": return "earth";
      case "storm": return "water";
      default: return null;
    }
  }

  // =========================================================
  // 分ごとの成長ルール（rank別）
  // =========================================================
  function growthRule(rank) {
    switch (rank) {
      case Rank.superbest:
        return { hpGrow: 50, elemGrow: 20, elemEvery: 1, hpDmg: 0, healMax: 500 };
      case Rank.best:
        return { hpGrow: 30, elemGrow: 10, elemEvery: 1, hpDmg: 0, healMax: 300 };
      case Rank.good:
        return { hpGrow: 20, elemGrow: 10, elemEvery: 2, hpDmg: 0, healMax: 200 };
      case Rank.normal:
        return { hpGrow: 10, elemGrow: 10, elemEvery: 3, hpDmg: 0, healMax: 100 };
      case Rank.bad:
        return { hpGrow: 0,  elemGrow: 10, elemEvery: 5, hpDmg: 10, healMax: 0 };
      default:
        return { hpGrow: 0,  elemGrow: 0,  elemEvery: 999, hpDmg: 0, healMax: 0 };
    }
  }

  // =========================================================
  // env変化でカウンタをリセット（elemCounterにlastを埋める）
  // =========================================================
  function resetCountersIfNeeded(elemCounter, envAttr, rank) {
    if (!elemCounter) return;
    const key = `${envAttr}:${rank}`;
    if (elemCounter._lastKey !== key) {
      elemCounter.fire = 0;
      elemCounter.wind = 0;
      elemCounter.earth = 0;
      elemCounter.water = 0;
      elemCounter._lastKey = key;
    }
  }

  // =========================================================
  // 次の1分で起こる「予告」を計算（UI表示用）
  // =========================================================
  function computeMinutePreview(soul, monster, env, now, elemCounter) {
    const info = computeRank(monster, env, now);
    const { rank, envAttr } = info;

    if (rank === Rank.neutral) {
      return { rank, envAttr, heal: 0, hpDmg: 0, hpGrow: 0, elemKey: null, elemGrow: 0 };
    }

    resetCountersIfNeeded(elemCounter, envAttr, rank);

    const rule = growthRule(rank);
    const ek = elemKeyByEnvAttr(envAttr);

    // 回復（普通以上のみ）
    const mx = maxHP(soul);
    const cur = Number(soul.currentHP ?? mx);
    const missing = Math.max(0, mx - cur);
    const heal = Math.min(rule.healMax, missing);

    // HPダメージ（最悪のみ）
    const hpDmg = rule.hpDmg;

    // 最大HP成長
    const hpGrow = rule.hpGrow;

    // 属性成長（周期到達時のみ予告表示）
    let elemGrow = 0;
    let elemKey = null;

    if (ek) {
      const cnt = Number(elemCounter?.[ek] ?? 0);
      const nextCnt = cnt + 1;
      elemKey = ek;

      // 上限なら予告は +0（app.js 側で +0 表示したいケースを拾うため）
      const remain = LIMITS.elemGrowMax - Number(soul.growStats?.[ek] ?? 0);
      if (remain <= 0) {
        elemGrow = 0;
      } else if (rule.elemEvery > 0 && (nextCnt % rule.elemEvery === 0)) {
        elemGrow = rule.elemGrow;
      } else {
        elemGrow = 0; // 周期未到達 → 表示しない（app.js側は0なら出さない）
      }
    }

    return { rank, envAttr, heal, hpDmg, hpGrow, elemKey, elemGrow };
  }

  // =========================================================
  // 1分経過を適用（回復→成長→ダメージ等）
  // =========================================================
  function applyOneMinute(soul, monster, env, now, elemCounter) {
    const info = computeRank(monster, env, now);
    const { rank, envAttr } = info;

    if (rank === Rank.neutral) return;

    resetCountersIfNeeded(elemCounter, envAttr, rank);

    const rule = growthRule(rank);
    const ek = elemKeyByEnvAttr(envAttr);

    // -------- 回復（普通以上）--------
    let mx = maxHP(soul);
    let cur = Number(soul.currentHP ?? mx);
    if (!Number.isFinite(cur)) cur = mx;

    if (rule.healMax > 0 && cur < mx) {
      const heal = Math.min(rule.healMax, mx - cur);
      soul.currentHP = Math.min(mx, cur + heal);
      cur = soul.currentHP;
    }

    // -------- 最悪環境のHP減少（現在HPが減る）--------
    if (rule.hpDmg > 0) {
      const dmg = rule.hpDmg;
      soul.currentHP = Math.max(1, Number(soul.currentHP ?? 1) - dmg);
      cur = soul.currentHP;
    }

    // -------- 最大HP成長（growHP）--------
    if (rule.hpGrow > 0) {
      const beforeGrow = Number(soul.growHP ?? 0);
      const cappedBefore = Math.min(LIMITS.hpGrowMax, Math.max(0, beforeGrow));

      const add = rule.hpGrow;
      const after = Math.min(LIMITS.hpGrowMax, cappedBefore + add);
      const delta = after - cappedBefore;

      soul.growHP = after;

      // 最大HPが増えるとき currentHP も同時増加（要求仕様）
      if (delta > 0) {
        mx = maxHP(soul);
        const newCur = Math.min(mx, Number(soul.currentHP ?? mx) + delta);
        soul.currentHP = newCur;
      }
    }

    // -------- 属性成長（周期）--------
    if (ek) {
      elemCounter[ek] = Number(elemCounter[ek] ?? 0) + 1;

      // 周期到達で +elemGrow
      if (rule.elemEvery > 0 && (elemCounter[ek] % rule.elemEvery === 0)) {
        const before = Number(soul.growStats?.[ek] ?? 0);
        const cappedBefore = Math.min(LIMITS.elemGrowMax, Math.max(0, before));
        const add = rule.elemGrow;

        const after = Math.min(LIMITS.elemGrowMax, cappedBefore + add);
        soul.growStats[ek] = after;
      }
    }

    // 互換フィールド更新（state.jsで作っているが、成長後も同期）
    // grow / stats / hp など
    if (soul.grow) {
      soul.grow.hp = soul.growHP;
      soul.grow.fire = soul.growStats.fire;
      soul.grow.wind = soul.growStats.wind;
      soul.grow.earth = soul.growStats.earth;
      soul.grow.water = soul.growStats.water;
    }
    if (soul.stats) {
      soul.stats.fire = (soul.baseStats.fire || 0) + (soul.growStats.fire || 0);
      soul.stats.wind = (soul.baseStats.wind || 0) + (soul.growStats.wind || 0);
      soul.stats.earth = (soul.baseStats.earth || 0) + (soul.growStats.earth || 0);
      soul.stats.water = (soul.baseStats.water || 0) + (soul.growStats.water || 0);
    }
    if (soul.hp) {
      soul.hp.base = soul.baseHP;
      soul.hp.grow = soul.growHP;
      soul.hp.current = soul.currentHP;
    }
  }

  // =========================================================
  // 公開
  // =========================================================
  TSP_GAME.TEMP_STEPS = TEMP_STEPS;
  TSP_GAME.HUM_STEPS = HUM_STEPS;
  TSP_GAME.LIMITS = LIMITS;
  TSP_GAME.Rank = Rank;
  TSP_GAME.ATTR_META = ATTR_META;

  TSP_GAME.envAttribute = envAttribute;
  TSP_GAME.maxHP = maxHP;

  TSP_GAME.computeRank = computeRank;
  TSP_GAME.computeMinutePreview = computeMinutePreview;
  TSP_GAME.applyOneMinute = applyOneMinute;

  window.TSP_GAME = TSP_GAME;
})();
