/* =========================================================
 * game.js  v0.76-stable
 *
 * - 属性定義（環境属性の決定）※中心0＝無属性
 *   右上：土（earthquake）
 *   右下：水（storm）
 *   左下：風（tornado）
 *   左上：火（volcano）
 *
 * - 環境判定の優先順位（ユーザー最終合意）
 *   0) 温度0 & 湿度50 -> 無属性（光無視）
 *   1) 湿度100 -> 水中（北海/南海 + 水深0/50/100が一致判定に使える）
 *      ※水中は「光足切り」無視（= 水深は一致判定に必要）
 *   2) 通常環境（湿度!=100）では「光は足切り条件」
 *      光が不適切 -> 強制で最悪環境
 *   3) 光が適切なら
 *      超ベスト：温度・湿度（必要なら水深）完全一致
 *      ベスト：温度×湿度のエリア一致
 *      それ以外：属性相性で 良好/普通/最悪
 *
 * - 成長/回復（ホーム表示中のみ1分ごとに判定）
 *   HP成長と同時に currentHP も同時増加（例:600/600→650/650）
 *   苦手環境のHP減少は growHPではなく currentHP を減らす
 *   currentHP が最大未満なら、普通以上で放置回復
 *     普通：最大100/分、良好：200/分、ベスト：300/分、超ベスト：500/分
 *     上限に達する分まで
 *   上限：
 *     growHP 上限 = +5110
 *     growStats 上限 = +630
 *
 * ========================================================= */

(function () {
  "use strict";

  // ----- Attribute meta -----
  const ATTR_META = Object.freeze({
    volcano: { jp: "火", en: "Volcano" },
    tornado: { jp: "風", en: "Tornado" },
    earthquake: { jp: "土", en: "Earthquake" },
    storm: { jp: "水", en: "Storm" },
    // 将来拡張（未実装）：spiritual / necrom
  });

  // ----- Growth limits -----
  const LIMITS = Object.freeze({
    hpGrowMax: 5110,
    elemGrowMax: 630,
  });

  // ----- Slider steps -----
  // 温度: -297, -45, -40, -35 ... 0, 5, 10 ... 40, 45, 999
  const TEMP_STEPS = (() => {
    const arr = [-297, -45];
    for (let t = -40; t <= 45; t += 5) arr.push(t);
    arr.push(999);
    // 重複除去
    return Array.from(new Set(arr));
  })();

  // 湿度: 0..90 を5刻み + 95, 99, 100
  const HUM_STEPS = (() => {
    const arr = [];
    for (let h = 0; h <= 90; h += 5) arr.push(h);
    arr.push(95, 99, 100);
    return Array.from(new Set(arr));
  })();

  // ----- Rank -----
  const Rank = Object.freeze({
    neutral: "neutral",
    superbest: "superbest",
    best: "best",
    good: "good",
    normal: "normal",
    bad: "bad",
  });

  function clampInt(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) n = min;
    n = Math.floor(n);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function envAttribute(temp, hum) {
    // 無属性判定は上位で行うが、ここでは純粋に4象限の属性を返す（中心は無属性扱いにしない）
    // 右上：土 / 右下：水 / 左下：風 / 左上：火
    // x: temp, y: hum-50 を使って上下を判定（湿度50を中心）
    const x = Number(temp);
    const y = Number(hum) - 50;

    if (x === 0 && Number(hum) === 50) return "neutral"; // 便宜上
    if (x >= 0 && y < 0) return "storm";        // 右下（水）
    if (x >= 0 && y >= 0) return "earthquake";  // 右上（土）
    if (x < 0 && y < 0) return "tornado";       // 左下（風）
    return "volcano";                            // 左上（火）
  }

  function isNeutralEnv(env) {
    return Number(env.temp) === 0 && Number(env.hum) === 50;
  }

  // 光の適正（通常環境のみ足切り）
  // 6:00～9:59  -> 50
  // 10:00～15:59 -> 100
  // 16:00～5:59  -> 0
  function requiredLightByTime(now) {
    const h = now.getHours();
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0;
  }

  function isLightAppropriate(env, now) {
    const req = requiredLightByTime(now);
    return Number(env.light) === req;
  }

  // 水中のエリア（北海/南海）
  function seaAreaByTemp(temp) {
    return Number(temp) < 0 ? "north" : "south";
  }

  // 水深（0/50/100）
  function waterDepth(env) {
    // 湿度100のときだけ light を水深として扱う
    return Number(env.light);
  }

  // 属性相性（ユーザー最終：同属性＝良好、苦手属性＝最悪、残り2つ＝普通）
  // ※相性サイクルは将来調整可能。現時点は以下で固定：
  // tornado(風) の苦手 = volcano(火)
  // volcano(火) の苦手 = earthquake(土)
  // earthquake(土) の苦手 = storm(水)
  // storm(水) の苦手 = tornado(風)
  const WEAK_TO = Object.freeze({
    tornado: "volcano",
    volcano: "earthquake",
    earthquake: "storm",
    storm: "tornado",
  });

  function affinityRankByAttribute(legendzAttr, envAttr) {
    if (!legendzAttr || envAttr === "neutral") return Rank.neutral;

    if (envAttr === legendzAttr) return Rank.good; // 良好（同属性）
    const weak = WEAK_TO[legendzAttr];
    if (envAttr === weak) return Rank.bad;         // 最悪（苦手属性）
    return Rank.normal;                            // 普通（残り2属性）
  }

  // エリア一致（ベスト）：温度×湿度のエリア一致
  // 「エリア」は TEMP_STEPS / HUM_STEPS のインデックスを使い、周辺1セル以内を同エリアとみなす
  function areaKeyFor(env) {
    const tIdx = TEMP_STEPS.indexOf(Number(env.temp));
    const hIdx = HUM_STEPS.indexOf(Number(env.hum));
    return { tIdx, hIdx };
  }
  function areaMatch(a, b) {
    const A = areaKeyFor(a);
    const B = areaKeyFor(b);
    if (A.tIdx < 0 || A.hIdx < 0 || B.tIdx < 0 || B.hIdx < 0) return false;
    return Math.abs(A.tIdx - B.tIdx) <= 1 && Math.abs(A.hIdx - B.hIdx) <= 1;
  }

  // 超ベスト：温度・湿度（※水中は追加で水深）完全一致
  function isSuperBest(mon, env) {
    const sb = mon?.superBest;
    if (!sb) return false;

    if (Number(env.hum) === 100) {
      // 水中：温度・湿度（=100）・水深一致
      return Number(env.temp) === Number(sb.temp) &&
        Number(env.hum) === 100 &&
        Number(waterDepth(env)) === Number(sb.waterDepth);
    }

    // 通常：温度・湿度完全一致（湿度は sb.hum に従う）
    return Number(env.temp) === Number(sb.temp) &&
      Number(env.hum) === Number(sb.hum);
  }

  // ベスト：エリア一致（超ベストでなければ）
  function isBest(mon, env) {
    const sb = mon?.superBest;
    if (!sb) return false;

    // 超ベスト定義から「ベスト中心」を作る（湿度100の場合は水深も含めたいが、ベストは温度×湿度エリアのみ）
    const center = {
      temp: Number(sb.temp),
      hum: Number(env.hum) === 100 ? 100 : Number(sb.hum),
      light: Number(env.light),
    };

    return areaMatch(center, env);
  }

  // 環境ランク計算（ホーム表示用）
  function computeRank(mon, env, now, legendzAttrOpt) {
    const e = { temp: Number(env.temp), hum: Number(env.hum), light: Number(env.light) };

    // 0) 無属性
    if (isNeutralEnv(e)) {
      return { rank: Rank.neutral, envAttr: "neutral" };
    }

    // 1) 水中
    if (Number(e.hum) === 100) {
      const envAttr = "storm"; // 水中は水属性扱い（ベース）
      // 水中は光足切り無視（=水深扱いで一致判定に使える）
      if (isSuperBest(mon, e)) return { rank: Rank.superbest, envAttr, sea: seaAreaByTemp(e.temp), depth: waterDepth(e) };
      if (isBest(mon, e)) return { rank: Rank.best, envAttr, sea: seaAreaByTemp(e.temp), depth: waterDepth(e) };
      // それ以外は属性相性（通常の相性ルールで判定）
      const attr = envAttr;
      const legAttr = legendzAttrOpt || null;
      if (legAttr) return { rank: affinityRankByAttribute(legAttr, attr), envAttr: attr, sea: seaAreaByTemp(e.temp), depth: waterDepth(e) };
      return { rank: Rank.normal, envAttr: attr, sea: seaAreaByTemp(e.temp), depth: waterDepth(e) };
    }

    // 2) 通常環境：光足切り
    if (!isLightAppropriate(e, now)) {
      const attr = envAttribute(e.temp, e.hum);
      return { rank: Rank.bad, envAttr: attr === "neutral" ? "neutral" : attr, lightGate: "fail" };
    }

    // 3) 光OK：超ベスト→ベスト→属性相性
    const attr = envAttribute(e.temp, e.hum);
    if (isSuperBest(mon, e)) return { rank: Rank.superbest, envAttr: attr };
    if (isBest(mon, e)) return { rank: Rank.best, envAttr: attr };

    const legAttr = legendzAttrOpt || null;
    if (legAttr) return { rank: affinityRankByAttribute(legAttr, attr), envAttr: attr };

    return { rank: Rank.normal, envAttr: attr };
  }

  // 最大HP
  function maxHP(soul) {
    const base = Number(soul?.baseHP ?? 0);
    const grow = Number(soul?.growHP ?? 0);
    const m = base + grow;
    return Number.isFinite(m) ? m : base;
  }

  // 1分あたりの成長定義（HP成長・属性成長）
  // ユーザー仕様：
  // 超ベスト：HP +50/分、属性 +20/分
  // ベスト：HP +30/分、属性 +10/分
  // 得意（良好）：HP +20/分、属性 +10/2分
  // 普通：HP +10/分、属性 +10/3分
  // 苦手（最悪）：HP -10（currentHP減少）、属性 +10/5分
  const GROW_RULES = Object.freeze({
    superbest: { hp: 50, elem: 20, every: 1 },
    best: { hp: 30, elem: 10, every: 1 },
    good: { hp: 20, elem: 10, every: 2 },
    normal: { hp: 10, elem: 10, every: 3 },
    bad: { hpDmg: 10, hp: 0, elem: 10, every: 5 },
  });

  // 回復量/分
  const HEAL_RULES = Object.freeze({
    good: 200,
    best: 300,
    superbest: 500,
    normal: 100,
    bad: 0,
    neutral: 0,
  });

  // 1分判定の事前プレビュー（UI表示用）
  function computeMinutePreview(soul, mon, envApplied, now, elemCounter) {
    const legAttr = soul?.attribute;
    const rinfo = computeRank(mon, envApplied, now, legAttr);
    const r = rinfo.rank;

    if (r === Rank.neutral) {
      return { rank: r, envAttr: rinfo.envAttr, heal: 0, hpDmg: 0, hpGrow: 0, elemKey: null, elemGrow: 0 };
    }

    // 属性成長キー：環境属性に応じて上がるパラメータ
    // 火->fire, 風->wind, 土->earth, 水->water
    const envAttr = rinfo.envAttr;
    const elemKey =
      envAttr === "volcano" ? "fire" :
      envAttr === "tornado" ? "wind" :
      envAttr === "earthquake" ? "earth" :
      envAttr === "storm" ? "water" : null;

    // 回復（currentHPが最大未満なら）
    const mx = maxHP(soul);
    const cur = clampInt(soul.currentHP ?? mx, 0, mx);
    const healCap = HEAL_RULES[r] ?? 0;
    const heal = (cur < mx) ? Math.min(healCap, mx - cur) : 0;

    // 成長
    const rule = (r === Rank.superbest) ? GROW_RULES.superbest :
      (r === Rank.best) ? GROW_RULES.best :
      (r === Rank.good) ? GROW_RULES.good :
      (r === Rank.bad) ? GROW_RULES.bad : GROW_RULES.normal;

    const hpGrow = rule.hp ?? 0;
    const hpDmg = rule.hpDmg ?? 0;

    let elemGrow = 0;
    if (elemKey) {
      const curGrow = clampInt(soul.growStats?.[elemKey] ?? 0, 0, LIMITS.elemGrowMax);
      if (curGrow >= LIMITS.elemGrowMax) {
        elemGrow = 0;
      } else {
        // カウンタがrule.everyに達したときのみ加算
        const cnt = clampInt(elemCounter?.[elemKey] ?? 0, 0, 999999);
        // 予告は「次の分で上がるか」を表示するため、
        // 次の分で cnt+1 が every の倍数なら上がる
        const will = ((cnt + 1) % rule.every === 0);
        elemGrow = will ? rule.elem : 0;
      }
    }

    return { rank: r, envAttr, heal, hpDmg, hpGrow, elemKey, elemGrow };
  }

  // 1分経過時の適用
  function applyOneMinute(soul, mon, envApplied, now, elemCounter) {
    const legAttr = soul?.attribute;
    const rinfo = computeRank(mon, envApplied, now, legAttr);
    const r = rinfo.rank;

    if (r === Rank.neutral) return;

    const envAttr = rinfo.envAttr;
    const elemKey =
      envAttr === "volcano" ? "fire" :
      envAttr === "tornado" ? "wind" :
      envAttr === "earthquake" ? "earth" :
      envAttr === "storm" ? "water" : null;

    // まず回復（普通以上のみ、最悪は回復なし）
    const mx0 = maxHP(soul);
    soul.currentHP = clampInt(soul.currentHP ?? mx0, 0, mx0);

    const healCap = HEAL_RULES[r] ?? 0;
    if (healCap > 0 && soul.currentHP < mx0) {
      const heal = Math.min(healCap, mx0 - soul.currentHP);
      soul.currentHP += heal;
    }

    // 次に成長/ダメージ
    const rule = (r === Rank.superbest) ? GROW_RULES.superbest :
      (r === Rank.best) ? GROW_RULES.best :
      (r === Rank.good) ? GROW_RULES.good :
      (r === Rank.bad) ? GROW_RULES.bad : GROW_RULES.normal;

    // 最悪環境：HP減少（growではなくcurrentHP）
    if (rule.hpDmg) {
      soul.currentHP = Math.max(0, soul.currentHP - rule.hpDmg);
    }

    // HP成長（上限あり） & 最大HP増加時はcurrentHPも同時増加
    if (rule.hp) {
      const beforeGrow = clampInt(soul.growHP ?? 0, 0, LIMITS.hpGrowMax);
      const add = Math.min(rule.hp, LIMITS.hpGrowMax - beforeGrow);
      if (add > 0) {
        soul.growHP = beforeGrow + add;
        // 最大HPが増えた分、currentHPも同時に増加
        soul.currentHP += add;
      } else {
        soul.growHP = beforeGrow;
      }
    } else {
      soul.growHP = clampInt(soul.growHP ?? 0, 0, LIMITS.hpGrowMax);
    }

    // 最大HPに合わせて currentHP をクランプ
    const mx1 = maxHP(soul);
    soul.currentHP = clampInt(soul.currentHP ?? mx1, 0, mx1);

    // 属性成長（周期カウンタ方式）
    if (elemKey) {
      elemCounter[elemKey] = clampInt(elemCounter[elemKey] ?? 0, 0, 999999) + 1;

      const curGrow = clampInt(soul.growStats?.[elemKey] ?? 0, 0, LIMITS.elemGrowMax);
      if (curGrow < LIMITS.elemGrowMax && (elemCounter[elemKey] % rule.every === 0)) {
        const add = Math.min(rule.elem, LIMITS.elemGrowMax - curGrow);
        soul.growStats[elemKey] = curGrow + add;
      } else {
        soul.growStats[elemKey] = curGrow;
      }
    }

    soul.updatedAt = Date.now();
  }

  // 公開API
  window.TSP_GAME = {
    ATTR_META,
    LIMITS,
    TEMP_STEPS,
    HUM_STEPS,
    Rank,
    envAttribute,
    computeRank,
    computeMinutePreview,
    applyOneMinute,
    maxHP,
    requiredLightByTime,
    isLightAppropriate,
  };
})();