// FILE: js/game.js
/* =========================================================
   TalisPod v0.77+  game.js（相性ルール更新・データ整合版）
   エリアID（TSP_AREA）ベースで
   - 環境属性（ヴォルケーノ/トルネード/アースクエイク/ストーム/無属性）
   - 相性ランク（超ベスト/ベスト/良好/普通/最悪/無属性）
   - 育成（回復→成長→ダメージ）
   - 1分予告
   を提供する統合ロジック

   ★今回の重要整合
   - TEMP_STEPS から -297 を撤去（最下段は -273）
   - 属性は "volcano/tornado/earthquake/storm/neutral"（小文字）で統一して返す
   - maxHP / 成長は state.js のデータ構造に合わせる
     - growHP（HP成長）
     - growStats.{fire,wind,earth,water}（属性成長）
   - 相性ルール（ユーザー指定）
     1) 陸上：光量が適切でないなら強制「最悪」
     2) 超ベスト：ピンポイント座標一致（temp/hum + 水中ならdepth）
     3) ベスト：超ベストと同じエリア（bestAreaId一致）
     4) 自属性一致：良好
     5) 自属性と座標上真逆：最悪（風↔土、火↔水）
     6) 隣接属性：普通（それ以外も普通）
     7) 水中（湿度100）：水属性扱い、光足切りは無視（相性判定のみ）
   ========================================================= */

(function () {
  "use strict";

  const AM = window.TSP_AREAMAP;
  const AR = window.TSP_AREA;

  if (!AM || !AR) {
    console.error("[game] required libs missing:", { TSP_AREAMAP: !!AM, TSP_AREA: !!AR });
    window.TSP_GAME = window.TSP_GAME || {};
    return;
  }

  const ATTRIBUTES = AM.ATTRIBUTES; // "VOLCANO" etc
  const AREAS = AM.AREAS;

  /* =========================================================
     ステップ値（スライダーはインデックスで選ぶ）
     -297 は撤去、-273 を採用
     ========================================================= */
  const TEMP_STEPS = [
    -45, -40, -35,
    -30, -25, -20, -15, -10, -5,
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
    -273,
    999
  ];

  const HUM_STEPS = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 100
  ];

  /* =========================================================
     属性：内部統一（小文字）
     ========================================================= */
  const CANON = Object.freeze({
    volcano: "volcano",
    tornado: "tornado",
    earthquake: "earthquake",
    storm: "storm",
    neutral: "neutral"
  });

  function canonAttr(x) {
    const s = String(x || "");
    if (!s) return CANON.neutral;

    // 既存：state.js は "tornado" 等の小文字
    if (s === CANON.volcano || s === CANON.tornado || s === CANON.earthquake || s === CANON.storm || s === CANON.neutral) {
      return s;
    }

    // areaMap.js は "VOLCANO" 等の大文字
    if (s === ATTRIBUTES.VOLCANO) return CANON.volcano;
    if (s === ATTRIBUTES.TORNADO) return CANON.tornado;
    if (s === ATTRIBUTES.EARTHQUAKE) return CANON.earthquake;
    if (s === ATTRIBUTES.STORM) return CANON.storm;

    // 念のため
    const up = s.toUpperCase();
    if (up === "VOLCANO") return CANON.volcano;
    if (up === "TORNADO") return CANON.tornado;
    if (up === "EARTHQUAKE") return CANON.earthquake;
    if (up === "STORM") return CANON.storm;

    return CANON.neutral;
  }

  /* =========================================================
     属性メタ（表示用）
     app.js の attrJp() が参照するのでキーは小文字で統一
     ========================================================= */
  const ATTR_META = {
    [CANON.volcano]: { jp: "ヴォルケーノ", key: "fire" },
    [CANON.tornado]: { jp: "トルネード", key: "wind" },
    [CANON.earthquake]: { jp: "アースクエイク", key: "earth" },
    [CANON.storm]: { jp: "ストーム", key: "water" },
    [CANON.neutral]: { jp: "無属性", key: null }
  };

  /* =========================================================
     ランク
     ========================================================= */
  const Rank = Object.freeze({
    neutral: "neutral",
    superbest: "superbest",
    best: "best",
    good: "good",
    normal: "normal",
    bad: "bad"
  });

  /* =========================================================
     光適正（陸上のみ足切り）
     - 6:00〜9:59  => 50
     - 10:00〜15:59 => 100
     - 16:00〜5:59 => 0
     ========================================================= */
  function expectedLightByTime(dateObj) {
    const h = dateObj.getHours();
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0;
  }

  /* =========================================================
     envAttribute(temp, hum, lightOrDepth?) -> canon attr
     ※ lightOrDepth が省略された場合は 50 として扱う（プレビュー用）
     ========================================================= */
  function envAttribute(temp, hum, lightOrDepth) {
    const l = (lightOrDepth == null) ? 50 : Number(lightOrDepth);
    const areaId = AR.resolveAreaId(temp, hum, l);
    if (areaId === "NEUTRAL") return CANON.neutral;
    const area = AREAS[areaId];
    return canonAttr(area ? area.attribute : CANON.neutral);
  }

  /* =========================================================
     超ベスト / ベスト
     - 超ベスト：ピンポイント座標一致
     - ベスト：bestAreaId一致（同エリア）
     ========================================================= */
  function isSuperBest(mon, env) {
    if (!mon || !mon.superBest) return false;
    const sb = mon.superBest;

    const tOk = Number(env.temp) === Number(sb.temp);
    const hOk = Number(env.hum) === Number(sb.hum);
    if (!tOk || !hOk) return false;

    if (Number(env.hum) === 100) {
      // 水中は waterDepth を見る
      const dOk = Number(env.light) === Number(sb.waterDepth);
      return dOk;
    }
    return true;
  }

  function isBest(mon, areaId) {
    if (!mon || !mon.bestAreaId) return false;
    return String(mon.bestAreaId) === String(areaId);
  }

  /* =========================================================
     相性判定（ユーザー指定）
     - 自属性一致 => good
     - 真逆（風↔土 / 火↔水） => bad
     - それ以外 => normal（隣接含む）
     ========================================================= */
  const OPPOSITE = Object.freeze({
    [CANON.tornado]: CANON.earthquake,
    [CANON.earthquake]: CANON.tornado,
    [CANON.volcano]: CANON.storm,
    [CANON.storm]: CANON.volcano
  });

  function relationRankByRules(monAttrCanon, envAttrCanon) {
    if (!envAttrCanon || envAttrCanon === CANON.neutral) return Rank.neutral;

    if (monAttrCanon && envAttrCanon === monAttrCanon) return Rank.good;

    const opp = OPPOSITE[monAttrCanon];
    if (opp && envAttrCanon === opp) return Rank.bad;

    return Rank.normal;
  }

  /* =========================================================
     computeRank
     return:
     {
       rank,
       areaId,
       envAttr,     // canon（小文字）
       areaName,
       isSea,
       lightExpected,
       lightOk
     }
     ========================================================= */
  function computeRank(mon, envApplied, now, monAttribute) {
    const temp = Number(envApplied.temp);
    const hum = Number(envApplied.hum);
    const light = Number(envApplied.light);

    const areaId = AR.resolveAreaId(temp, hum, light);

    // 1) 無属性
    if (areaId === "NEUTRAL") {
      return {
        rank: Rank.neutral,
        areaId,
        envAttr: CANON.neutral,
        areaName: null,
        isSea: false,
        lightExpected: expectedLightByTime(now),
        lightOk: true
      };
    }

    const area = AREAS[areaId] || null;
    const envAttr = canonAttr(area ? area.attribute : CANON.neutral);
    const isSea = AR.isSeaAreaId(areaId);

    const monAttr = canonAttr(monAttribute);

    // 2) 水中（湿度100）：光足切りなし（属性相性のみ）
    if (isSea) {
      if (isSuperBest(mon, { temp, hum, light })) {
        return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      if (isBest(mon, areaId)) {
        return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      const rel = relationRankByRules(monAttr, envAttr);
      return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
    }

    // 3) 陸上：光足切り（適切でないなら強制 最悪）
    const need = expectedLightByTime(now);
    const lightOk = (light === need);
    if (!lightOk) {
      return { rank: Rank.bad, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: false };
    }

    // 4) 超ベスト/ベスト（優先）
    if (isSuperBest(mon, { temp, hum, light })) {
      return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }
    if (isBest(mon, areaId)) {
      return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }

    // 5) 相性
    const rel = relationRankByRules(monAttr, envAttr);
    return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
  }

  /* =========================================================
     成長/回復/ダメージ（state.js 構造に合わせる）
     - maxHP = baseHP + growHP
     - 属性成長は growStats.{fire,wind,earth,water}
     ========================================================= */
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function maxHP(soul) {
    const base = Number(soul.baseHP || 0);
    const grow = Number(soul.growHP || 0);
    return base + grow;
  }

  function ensureGrowStats(soul) {
    soul.growStats = soul.growStats || { fire: 0, wind: 0, earth: 0, water: 0 };
  }

  function capGrowHP(soul) {
    soul.growHP = clamp(Number(soul.growHP || 0), 0, 5110);
  }
  function capGrowElem(soul, key) {
    ensureGrowStats(soul);
    soul.growStats[key] = clamp(Number(soul.growStats[key] || 0), 0, 630);
  }

  function envElemKey(envAttrCanon) {
    const meta = ATTR_META[envAttrCanon];
    return meta ? meta.key : null;
  }

  function growthProfile(rank) {
    switch (rank) {
      case Rank.superbest:
        return { hpGrow: 50, elemGrow: 20, elemInterval: 1, healCap: 500, hpDmg: 0 };
      case Rank.best:
        return { hpGrow: 30, elemGrow: 10, elemInterval: 1, healCap: 300, hpDmg: 0 };
      case Rank.good:
        return { hpGrow: 20, elemGrow: 10, elemInterval: 2, healCap: 200, hpDmg: 0 };
      case Rank.normal:
        return { hpGrow: 10, elemGrow: 10, elemInterval: 3, healCap: 100, hpDmg: 0 };
      case Rank.bad:
        return { hpGrow: 10, elemGrow: 10, elemInterval: 5, healCap: 0, hpDmg: 10 };
      default:
        return { hpGrow: 0, elemGrow: 0, elemInterval: 0, healCap: 0, hpDmg: 0 };
    }
  }

  function computeMinutePreview(soul, mon, envApplied, now, elemCounter) {
    ensureGrowStats(soul);

    const info = computeRank(mon, envApplied, now, soul.attribute);
    if (info.rank === Rank.neutral) {
      return { rank: Rank.neutral, heal: 0, hpDmg: 0, hpGrow: 0, elemKey: null, elemGrow: 0 };
    }

    const prof = growthProfile(info.rank);
    const mx = maxHP(soul);
    const cur = Number(soul.currentHP != null ? soul.currentHP : mx);
    const missing = Math.max(0, mx - cur);

    const heal = (prof.healCap > 0) ? Math.min(prof.healCap, missing) : 0;

    const k = envElemKey(info.envAttr);
    let elemGrow = 0;
    if (k && prof.elemInterval > 0) {
      const c = Number((elemCounter && elemCounter[k]) || 0) + 1;
      if (c >= prof.elemInterval) elemGrow = prof.elemGrow;
    }

    const hpGrowNow = (Number(soul.growHP || 0) >= 5110) ? 0 : prof.hpGrow;
    const hpDmg = (info.rank === Rank.bad) ? prof.hpDmg : 0;

    return { rank: info.rank, heal, hpDmg, hpGrow: hpGrowNow, elemKey: k, elemGrow };
  }

  function applyOneMinute(soul, mon, envApplied, now, elemCounter) {
    ensureGrowStats(soul);

    const info = computeRank(mon, envApplied, now, soul.attribute);
    if (info.rank === Rank.neutral) return;

    const prof = growthProfile(info.rank);
    const mxBefore = maxHP(soul);

    // 1) 回復
    if (prof.healCap > 0) {
      const cur = Number(soul.currentHP != null ? soul.currentHP : mxBefore);
      const missing = Math.max(0, mxBefore - cur);
      const heal = Math.min(prof.healCap, missing);
      if (heal > 0) soul.currentHP = cur + heal;
    }

    // 2) HP成長（増えた分 currentHP も増やす）
    if (prof.hpGrow > 0) {
      const beforeGrow = Number(soul.growHP || 0);
      if (beforeGrow < 5110) {
        const add = Math.min(prof.hpGrow, 5110 - beforeGrow);
        soul.growHP = beforeGrow + add;

        const cur = Number(soul.currentHP != null ? soul.currentHP : mxBefore);
        soul.currentHP = cur + add;
      }
    }
    capGrowHP(soul);

    // 3) 属性成長（カウンタ到達分のみ）
    const k = envElemKey(info.envAttr);
    if (k && prof.elemInterval > 0) {
      elemCounter = elemCounter || {};
      elemCounter[k] = Number(elemCounter[k] || 0) + 1;

      if (elemCounter[k] >= prof.elemInterval) {
        elemCounter[k] = 0;
        const before = Number(soul.growStats[k] || 0);
        if (before < 630) {
          const add = Math.min(prof.elemGrow, 630 - before);
          soul.growStats[k] = before + add;
        }
        capGrowElem(soul, k);
      }
    }

    // 4) 最悪：現在HP減少
    if (info.rank === Rank.bad && prof.hpDmg > 0) {
      const mxAfter = maxHP(soul);
      const cur = Number(soul.currentHP != null ? soul.currentHP : mxAfter);
      soul.currentHP = clamp(cur - prof.hpDmg, 0, mxAfter);
    }

    // 5) クランプ
    const mxFinal = maxHP(soul);
    soul.currentHP = clamp(Number(soul.currentHP != null ? soul.currentHP : mxFinal), 0, mxFinal);
  }

  /* =========================================================
     window.TSP_GAME 公開
     ========================================================= */
  window.TSP_GAME = {
    Rank,
    TEMP_STEPS,
    HUM_STEPS,
    ATTR_META,

    expectedLightByTime,
    envAttribute,
    computeRank,

    maxHP,
    computeMinutePreview,
    applyOneMinute
  };
})();
