// FILE: js/game.js
/* =========================================================
   TalisPod v0.77+  game.js（整合修正版）
   エリアID（TSP_AREA）ベースで
   - 環境属性（volcano/tornado/earthquake/storm/neutral）
   - 相性ランク（超ベスト/ベスト/良好/普通/最悪/無属性）
   - 育成（回復→成長→ダメージ）
   - 1分予告
   を提供する統合ロジック

   公開：
   window.TSP_GAME

   依存：
   - window.TSP_AREAMAP（areaMap.js）
   - window.TSP_AREA（areaResolver.js）

   ★重要な整合ポイント
   - TEMP_STEPS から -297 を除去（-273 が正）
   - state.js の soul 仕様に合わせる：
     * baseHP + growHP が最大HP
     * growStats は fire/wind/earth/water のみ（hp は使わない）
     * currentHP は 0..maxHP にクランプ
   - 属性名は app.js と合わせて「小文字」を返す：
     volcano / tornado / earthquake / storm / neutral
   - 相性ルール（ユーザー指定）
     * 陸上：光が適切でない → 強制最悪
     * 超ベスト：座標ピンポイント一致
     * ベスト：同じエリアID
     * 良好：自属性一致
     * 最悪：真逆（tornado↔earthquake / volcano↔storm）
     * 普通：隣接（上記以外）
     * 水中：光足切り無視、属性相性のみ（ただし超ベスト/ベストは優先）
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

  const ATTR = AM.ATTRIBUTES;
  const AREAS = AM.AREAS;

  /* =========================================================
     ステップ値（スライダーはインデックスで選ぶ）
     -297 を排除し、-273 を採用
     ========================================================= */
  const TEMP_STEPS = [
    -273,
    -45, -40, -35,
    -30, -25, -20, -15, -10, -5,
    0,
    5, 10, 15, 20, 25, 30,
    35,
    40, 45,
    999
  ];

  const HUM_STEPS = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
    99, 100
  ];

  /* =========================================================
     属性の正規化（areaMap は大文字、UIは小文字）
     ========================================================= */
  function normalizeAttr(attr) {
    switch (attr) {
      case ATTR.VOLCANO: return "volcano";
      case ATTR.TORNADO: return "tornado";
      case ATTR.EARTHQUAKE: return "earthquake";
      case ATTR.STORM: return "storm";
      default: return "neutral";
    }
  }

  /* =========================================================
     表示メタ
     ========================================================= */
  const ATTR_META = {
    volcano: { jp: "ヴォルケーノ", key: "fire" },
    tornado: { jp: "トルネード", key: "wind" },
    earthquake: { jp: "アースクエイク", key: "earth" },
    storm: { jp: "ストーム", key: "water" },
    neutral: { jp: "無属性", key: null }
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
     6:00〜9:59 => 50
     10:00〜15:59 => 100
     16:00〜5:59 => 0
     ========================================================= */
  function expectedLightByTime(dateObj) {
    const h = dateObj.getHours();
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0;
  }

  /* =========================================================
     エリア属性（予想環境などで使用）
     ========================================================= */
  function envAttribute(temp, hum, lightOrDepth) {
    const l = (lightOrDepth == null) ? 50 : Number(lightOrDepth);
    const areaId = AR.resolveAreaId(temp, hum, l);
    if (areaId === "NEUTRAL") return "neutral";
    const area = AREAS[areaId];
    return area ? normalizeAttr(area.attribute) : "neutral";
  }

  /* =========================================================
     超ベスト / ベスト
     ========================================================= */
  function isSuperBest(mon, env) {
    if (!mon || !mon.superBest) return false;
    const sb = mon.superBest;
    if (Number(env.temp) !== Number(sb.temp)) return false;
    if (Number(env.hum) !== Number(sb.hum)) return false;

    // 水中（hum=100）の場合だけ waterDepth を見る
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
     相性ルール（ユーザー指定）
     - 同属性 => good
     - 真逆 => bad（tornado↔earthquake / volcano↔storm）
     - それ以外 => normal（隣接）
     ========================================================= */
  function isOpposite(monAttr, envAttr) {
    const a = String(monAttr || "neutral");
    const b = String(envAttr || "neutral");
    if (a === "tornado" && b === "earthquake") return true;
    if (a === "earthquake" && b === "tornado") return true;
    if (a === "volcano" && b === "storm") return true;
    if (a === "storm" && b === "volcano") return true;
    return false;
  }

  function relationRank(monAttr, envAttr) {
    if (!envAttr || envAttr === "neutral") return Rank.neutral;
    if (!monAttr || monAttr === "neutral") return Rank.normal;

    if (envAttr === monAttr) return Rank.good;
    if (isOpposite(monAttr, envAttr)) return Rank.bad;
    return Rank.normal;
  }

  /* =========================================================
     computeRank
     return:
     {
       rank,
       areaId,
       envAttr,   // volcano/tornado/earthquake/storm/neutral
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
    const envAttr = area ? normalizeAttr(area.attribute) : "neutral";
    const isSea = AR.isSeaAreaId(areaId);

    // 水中：光足切り無視（属性相性のみ）
    if (isSea) {
      if (isSuperBest(mon, { temp, hum, light })) {
        return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      if (isBest(mon, areaId)) {
        return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      const rel = relationRank(monAttribute, envAttr);
      return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
    }

    // 陸上：光足切り（不適切なら強制最悪）
    const need = expectedLightByTime(now);
    const lightOk = (light === need);
    if (!lightOk) {
      return { rank: Rank.bad, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: false };
    }

    // 超ベスト/ベスト（優先）
    if (isSuperBest(mon, { temp, hum, light })) {
      return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }
    if (isBest(mon, areaId)) {
      return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }

    // 相性（良好/普通/最悪）
    const rel = relationRank(monAttribute, envAttr);
    return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
  }

  /* =========================================================
     成長/回復/ダメージ（state.js整合）
     - maxHP = baseHP + growHP
     - growHP 上限 5110
     - growStats(火風土水) 上限 630
     ========================================================= */
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function ensureSoulShape(soul) {
    soul.baseHP = Number(soul.baseHP || 0);
    soul.growHP = Number(soul.growHP || 0);
    soul.currentHP = Number(soul.currentHP || 0);

    soul.baseStats = soul.baseStats || { fire: 0, wind: 0, earth: 0, water: 0 };
    soul.growStats = soul.growStats || { fire: 0, wind: 0, earth: 0, water: 0 };

    // 数値化
    ["fire", "wind", "earth", "water"].forEach((k) => {
      soul.baseStats[k] = Number(soul.baseStats[k] || 0);
      soul.growStats[k] = Number(soul.growStats[k] || 0);
    });

    soul.growHP = clamp(soul.growHP, 0, 5110);
    ["fire", "wind", "earth", "water"].forEach((k) => {
      soul.growStats[k] = clamp(soul.growStats[k], 0, 630);
    });

    const mx = maxHP(soul);
    soul.currentHP = clamp(Number.isFinite(soul.currentHP) ? soul.currentHP : mx, 0, mx);
  }

  function maxHP(soul) {
    const base = Number(soul && soul.baseHP || 0);
    const grow = Number(soul && soul.growHP || 0);
    return base + grow;
  }

  function envElemKey(envAttr) {
    const meta = ATTR_META[String(envAttr || "neutral")];
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
    ensureSoulShape(soul);

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

    const hpGrowNow = (soul.growHP >= 5110) ? 0 : prof.hpGrow;
    const hpDmg = (info.rank === Rank.bad) ? prof.hpDmg : 0;

    return { rank: info.rank, heal, hpDmg, hpGrow: hpGrowNow, elemKey: k, elemGrow };
  }

  function applyOneMinute(soul, mon, envApplied, now, elemCounter) {
    ensureSoulShape(soul);

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
    if (prof.hpGrow > 0 && soul.growHP < 5110) {
      const add = Math.min(prof.hpGrow, 5110 - soul.growHP);
      soul.growHP += add;

      const cur = Number(soul.currentHP != null ? soul.currentHP : mxBefore);
      soul.currentHP = cur + add;
    }
    soul.growHP = clamp(soul.growHP, 0, 5110);

    // 3) 属性成長（到達分のみ）
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
        soul.growStats[k] = clamp(Number(soul.growStats[k] || 0), 0, 630);
      }
    }

    // 4) 最悪：現在HP減少
    if (info.rank === Rank.bad && prof.hpDmg > 0) {
      const mxAfter = maxHP(soul);
      const cur = Number(soul.currentHP != null ? soul.currentHP : mxAfter);
      soul.currentHP = clamp(cur - prof.hpDmg, 0, mxAfter);
    }

    // 5) 最終クランプ
    const mxFinal = maxHP(soul);
    soul.currentHP = clamp(Number(soul.currentHP != null ? soul.currentHP : mxFinal), 0, mxFinal);
  }

  /* =========================================================
     公開
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
