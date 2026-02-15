// FILE: js/game.js
/* =========================================================
   TalisPod v0.78
   game.js（module不使用）
   - TEMP_STEPS の並び修正：-273 を一番左へ（45と999の間に入らない）
   - -297 は完全撤去
   - HP計算/成長は state.js 仕様に合わせて growHP を使用（NaN防止）
   - 既存の環境判定（areaResolver/areaMap）と app.js 連携は維持
   公開：window.TSP_GAME
   依存：
     - window.TSP_AREAMAP（areaMap.js）
     - window.TSP_AREA（areaResolver.js）
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

  const ATTRIBUTES = AM.ATTRIBUTES;
  const AREAS = AM.AREAS;

  // ---------------------------------------------------------
  // Steps（スライダーは index で選ぶ）
  // ★ -273 は一番左。-297 は使わない。
  // ---------------------------------------------------------
  const TEMP_STEPS = [
    -273,
    -45, -40, -35,
    -30, -25, -20, -15, -10, -5,
    0,
    5, 10, 15, 20, 25, 30, 35, 40, 45,
    999
  ];

  const HUM_STEPS = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 100
  ];

  // ---------------------------------------------------------
  // 属性：areaMap（VOLCANO等）→ app.js で扱う小文字キーに正規化
  // ---------------------------------------------------------
  function normalizeAttr(attr) {
    switch (attr) {
      case ATTRIBUTES.VOLCANO: return "volcano";
      case ATTRIBUTES.TORNADO: return "tornado";
      case ATTRIBUTES.EARTHQUAKE: return "earthquake";
      case ATTRIBUTES.STORM: return "storm";
      default: return "neutral";
    }
  }

  // 表示用メタ（app.js の attrJp() が参照）
  const ATTR_META = {
    volcano: { jp: "ヴォルケーノ", key: "fire" },
    tornado: { jp: "トルネード", key: "wind" },
    earthquake: { jp: "アースクエイク", key: "earth" },
    storm: { jp: "ストーム", key: "water" },
    neutral: { jp: "無属性", key: null }
  };

  // ---------------------------------------------------------
  // Rank
  // ---------------------------------------------------------
  const Rank = Object.freeze({
    neutral: "neutral",
    superbest: "superbest",
    best: "best",
    good: "good",
    normal: "normal",
    bad: "bad"
  });

  // ---------------------------------------------------------
  // 光適正（陸上のみ足切り / 水中は無視）
  // 6:00〜9:59 => 50
  // 10:00〜15:59 => 100
  // 16:00〜5:59 => 0
  // ---------------------------------------------------------
  function expectedLightByTime(dateObj) {
    const h = dateObj.getHours();
    if (h >= 6 && h <= 9) return 50;
    if (h >= 10 && h <= 15) return 100;
    return 0;
  }

  // ---------------------------------------------------------
  // envAttribute(temp,hum,lightOrDepth) -> "volcano|tornado|earthquake|storm|neutral"
  // ---------------------------------------------------------
  function envAttribute(temp, hum, lightOrDepth) {
    const areaId = AR.resolveAreaId(temp, hum, lightOrDepth);
    if (areaId === "NEUTRAL") return "neutral";
    const area = AREAS[areaId];
    return area ? normalizeAttr(area.attribute) : "neutral";
  }

  // ---------------------------------------------------------
  // 相性（現行：同属性=good / 弱点=bad（mon.weakAttribute） / その他=normal）
  // ※ルールの大改修はこの後段でOK（今回は安定優先）
  // ---------------------------------------------------------
  function relationRank(monAttr, envAttr, mon) {
    if (!envAttr || envAttr === "neutral") return Rank.neutral;
    const weak = mon && mon.weakAttribute;
    if (weak && envAttr === weak) return Rank.bad;
    if (monAttr && envAttr === monAttr) return Rank.good;
    return Rank.normal;
  }

  // ---------------------------------------------------------
  // 超ベスト/ベスト
  // - 超ベスト：温度・湿度が完全一致（+水中は水深一致）
  // - ベスト：エリア一致（mon.bestAreaId）
  // ---------------------------------------------------------
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
    if (!mon) return false;
    if (!mon.bestAreaId) return false;
    return String(mon.bestAreaId) === String(areaId);
  }

  // ---------------------------------------------------------
  // computeRank
  // return:
  // {
  //   rank,
  //   areaId,
  //   envAttr,     // 小文字キー
  //   areaName,
  //   isSea,
  //   lightExpected,
  //   lightOk
  // }
  // ---------------------------------------------------------
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

    // 水中（湿度100）：光足切りなし
    if (isSea) {
      if (isSuperBest(mon, { temp, hum, light })) {
        return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      if (isBest(mon, areaId)) {
        return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
      }
      const rel = relationRank(monAttribute, envAttr, mon);
      return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: true, lightExpected: null, lightOk: true };
    }

    // 陸上：光足切り
    const need = expectedLightByTime(now);
    const lightOk = (light === need);
    if (!lightOk) {
      return { rank: Rank.bad, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: false };
    }

    // 超ベスト/ベスト
    if (isSuperBest(mon, { temp, hum, light })) {
      return { rank: Rank.superbest, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }
    if (isBest(mon, areaId)) {
      return { rank: Rank.best, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
    }

    // 相性
    const rel = relationRank(monAttribute, envAttr, mon);
    return { rank: rel, areaId, envAttr, areaName: area ? area.name : null, isSea: false, lightExpected: need, lightOk: true };
  }

  // ---------------------------------------------------------
  // Growth / HP
  // state.js 仕様：
  //   soul.growHP（HP成長）
  //   soul.growStats.{fire,wind,earth,water}（属性成長）
  // ---------------------------------------------------------
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function ensureGrowStruct(soul) {
    if (!soul.growStats) soul.growStats = { fire: 0, wind: 0, earth: 0, water: 0 };
    if (soul.growHP == null) soul.growHP = 0;
  }

  function maxHP(soul) {
    ensureGrowStruct(soul);
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
    ensureGrowStruct(soul);

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
    ensureGrowStruct(soul);

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

    // 3) 属性成長
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

  // ---------------------------------------------------------
  // expose
  // ---------------------------------------------------------
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
