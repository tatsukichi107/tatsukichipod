// FILE: js/game.js
/* =========================================================
   TalisPod v0.77+
   game.js（module不使用）

   修正ポイント（安全復旧＋仕様反映）：
   - TEMP_STEPS から -297 を削除（-273 を正に）
   - state.js の growHP / growStats を前提にHP計算を修正（NaN対策）
   - areaMap.js の属性値（volcano/tornado/earthquake/storm）に統一
   - 相性ルールを最新版に更新：
     陸上：光が適切でないなら強制 最悪
     超ベスト：ピンポイント座標一致
     ベスト：同じエリア
     良好：自属性一致
     最悪：自属性の真逆（風↔土、火↔水）
     普通：隣り合った属性
     水中：水属性扱い（光足切り無視、属性相性のみ）
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

  const ATTRIBUTES = AM.ATTRIBUTES; // values are lowercase strings
  const AREAS = AM.AREAS;

  /* =========================================================
     ステップ値（スライダーはインデックス）
     ★-297 を削除し、-273 を採用
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
     属性メタ（表示用）
     ========================================================= */
  const ATTR_META = {
    [ATTRIBUTES.VOLCANO]: { jp: "ヴォルケーノ", key: "fire" },
    [ATTRIBUTES.TORNADO]: { jp: "トルネード", key: "wind" },
    [ATTRIBUTES.EARTHQUAKE]: { jp: "アースクエイク", key: "earth" },
    [ATTRIBUTES.STORM]: { jp: "ストーム", key: "water" },
    neutral: { jp: "無属性", key: null }
  };

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
     ========================================================= */
  function expectedLightByTime(dateObj) {
    const h = dateObj.getHours();
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0;
  }

  /* =========================================================
     envAttribute（3引数必須：temp, hum, lightOrDepth）
     ========================================================= */
  function envAttribute(temp, hum, lightOrDepth) {
    const areaId = AR.resolveAreaId(temp, hum, lightOrDepth);
    if (areaId === "NEUTRAL") return "neutral";
    const area = AREAS[areaId];
    return area ? area.attribute : "neutral";
  }

  /* =========================================================
     超ベスト/ベスト
     ========================================================= */
  function isSuperBest(mon, env) {
    if (!mon || !mon.superBest) return false;
    const sb = mon.superBest;

    const tOk = Number(env.temp) === Number(sb.temp);
    const hOk = Number(env.hum) === Number(sb.hum);
    if (!tOk || !hOk) return false;

    if (Number(env.hum) === 100) {
      return Number(env.light) === Number(sb.waterDepth);
    }
    return true;
  }

  function isBest(mon, areaId) {
    if (!mon || !mon.bestAreaId) return false;
    return String(mon.bestAreaId) === String(areaId);
  }

  /* =========================================================
     相性（あなた仕様）
     - 風↔土、火↔水 が真逆
     - 隣接：風→火/水、火→風/土、土→火/水、水→風/土
     ========================================================= */
  const OPPOSITE = Object.freeze({
    [ATTRIBUTES.TORNADO]: ATTRIBUTES.EARTHQUAKE,
    [ATTRIBUTES.EARTHQUAKE]: ATTRIBUTES.TORNADO,
    [ATTRIBUTES.VOLCANO]: ATTRIBUTES.STORM,
    [ATTRIBUTES.STORM]: ATTRIBUTES.VOLCANO
  });

  const ADJACENT = Object.freeze({
    [ATTRIBUTES.TORNADO]: [ATTRIBUTES.VOLCANO, ATTRIBUTES.STORM],
    [ATTRIBUTES.VOLCANO]: [ATTRIBUTES.TORNADO, ATTRIBUTES.EARTHQUAKE],
    [ATTRIBUTES.EARTHQUAKE]: [ATTRIBUTES.VOLCANO, ATTRIBUTES.STORM],
    [ATTRIBUTES.STORM]: [ATTRIBUTES.TORNADO, ATTRIBUTES.EARTHQUAKE]
  });

  function relationRank(monAttr, envAttr) {
    if (!envAttr || envAttr === "neutral") return Rank.neutral;
    if (!monAttr || monAttr === "neutral") return Rank.normal;

    if (envAttr === monAttr) return Rank.good;
    if (OPPOSITE[monAttr] === envAttr) return Rank.bad;

    const adj = ADJACENT[monAttr] || [];
    if (adj.includes(envAttr)) return Rank.normal;

    // 念のためフォールバック
    return Rank.normal;
  }

  /* =========================================================
     computeRank
     ========================================================= */
  function computeRank(mon, envApplied, now, monAttribute) {
    const temp = Number(envApplied.temp);
    const hum = Number(envApplied.hum);
    const light = Number(envApplied.light);

    const areaId = AR.resolveAreaId(temp, hum, light);

    // 無属性
    if (areaId === "NEUTRAL") {
      return {
        rank: Rank.neutral,
        areaId,
        envAttr: "neutral",
        areaName: null,
        isSea: false,
        lightExpected: expectedLightByTime(now),
        lightOk: true
      };
    }

    const area = AREAS[areaId] || null;
    const envAttr = area ? area.attribute : "neutral";
    const isSea = AR.isSeaAreaId(areaId);

    // 水中：光足切り無視、属性相性のみ（ただし超/ベスト優先）
    if (isSea) {
      if (isSuperBest(mon, { temp, hum, light })) {
        return { rank: Rank.superbest, areaId, envAttr, areaName: area?.name ?? null, isSea: true, lightExpected: null, lightOk: true };
      }
      if (isBest(mon, areaId)) {
        return { rank: Rank.best, areaId, envAttr, areaName: area?.name ?? null, isSea: true, lightExpected: null, lightOk: true };
      }
      const rel = relationRank(monAttribute, envAttr);
      return { rank: rel, areaId, envAttr, areaName: area?.name ?? null, isSea: true, lightExpected: null, lightOk: true };
    }

    // 陸上：光足切り
    const need = expectedLightByTime(now);
    const lightOk = (light === need);
    if (!lightOk) {
      return { rank: Rank.bad, areaId, envAttr, areaName: area?.name ?? null, isSea: false, lightExpected: need, lightOk: false };
    }

    // 超ベスト/ベスト
    if (isSuperBest(mon, { temp, hum, light })) {
      return { rank: Rank.superbest, areaId, envAttr, areaName: area?.name ?? null, isSea: false, lightExpected: need, lightOk: true };
    }
    if (isBest(mon, areaId)) {
      return { rank: Rank.best, areaId, envAttr, areaName: area?.name ?? null, isSea: false, lightExpected: need, lightOk: true };
    }

    // 属性相性
    const rel = relationRank(monAttribute, envAttr);
    return { rank: rel, areaId, envAttr, areaName: area?.name ?? null, isSea: false, lightExpected: need, lightOk: true };
  }

  /* =========================================================
     成長/回復/ダメージ
     ★state.js 互換：HP成長は growHP を使用
     ========================================================= */
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function maxHP(soul) {
    const base = Number(soul.baseHP || 0);
    const grow = Number(soul.growHP || 0);
    return base + grow;
  }

  function capGrowHP(soul) {
    soul.growHP = clamp(Number(soul.growHP || 0), 0, 5110);
  }
  function capGrowElem(soul, key) {
    soul.growStats[key] = clamp(Number(soul.growStats[key] || 0), 0, 630);
  }

  function envElemKey(envAttr) {
    const meta = ATTR_META[envAttr];
    return meta ? meta.key : null;
  }

  function growthProfile(rank) {
    switch (rank) {
      case Rank.superbest: return { hpGrow: 50, elemGrow: 20, elemInterval: 1, healCap: 500, hpDmg: 0 };
      case Rank.best:      return { hpGrow: 30, elemGrow: 10, elemInterval: 1, healCap: 300, hpDmg: 0 };
      case Rank.good:      return { hpGrow: 20, elemGrow: 10, elemInterval: 2, healCap: 200, hpDmg: 0 };
      case Rank.normal:    return { hpGrow: 10, elemGrow: 10, elemInterval: 3, healCap: 100, hpDmg: 0 };
      case Rank.bad:       return { hpGrow: 10, elemGrow: 10, elemInterval: 5, healCap: 0,   hpDmg: 10 };
      default:             return { hpGrow: 0,  elemGrow: 0,  elemInterval: 0, healCap: 0,   hpDmg: 0 };
    }
  }

  function computeMinutePreview(soul, mon, envApplied, now, elemCounter) {
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
    const info = computeRank(mon, envApplied, now, soul.attribute);
    if (info.rank === Rank.neutral) return;

    const prof = growthProfile(info.rank);

    // 安全化
    soul.growStats = soul.growStats || { fire: 0, wind: 0, earth: 0, water: 0 };
    soul.growHP = Number(soul.growHP || 0);

    // 回復
    const mxBefore = maxHP(soul);
    if (prof.healCap > 0) {
      const cur = Number(soul.currentHP != null ? soul.currentHP : mxBefore);
      const missing = Math.max(0, mxBefore - cur);
      const heal = Math.min(prof.healCap, missing);
      if (heal > 0) soul.currentHP = cur + heal;
    }

    // HP成長（増えた分 currentHP も増やす）
    if (prof.hpGrow > 0) {
      const before = Number(soul.growHP || 0);
      if (before < 5110) {
        const add = Math.min(prof.hpGrow, 5110 - before);
        soul.growHP = before + add;

        const cur = Number(soul.currentHP != null ? soul.currentHP : mxBefore);
        soul.currentHP = cur + add;
      }
    }
    capGrowHP(soul);

    // 属性成長
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

    // 最悪：ダメージ
    if (info.rank === Rank.bad && prof.hpDmg > 0) {
      const mxAfter = maxHP(soul);
      const cur = Number(soul.currentHP != null ? soul.currentHP : mxAfter);
      soul.currentHP = clamp(cur - prof.hpDmg, 0, mxAfter);
    }

    // クランプ
    const mxFinal = maxHP(soul);
    soul.currentHP = clamp(Number(soul.currentHP != null ? soul.currentHP : mxFinal), 0, mxFinal);
  }

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
