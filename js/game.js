/* =========================================================
   TalisPod v0.77+
   game.js（module不使用）
   環境判定・相性判定の中核ロジック（最新版ルール）

   依存：
   - window.TSP_AREAMAP（areaMap.js）
   - window.TSP_AREA（areaResolver.js）

   公開：
   window.TSP_GAME = {
     ATTR,                         // 内部属性 enum
     rankEnv(mon, env, now),       // 環境ランク判定（エリア名も返す）
     previewAttribute(env, now),   // 予想環境（属性のみ：無属性/水中含む）
     lightTarget(now),             // 陸上の適正光（0/50/100）
     isLightOk(now, light),        // 陸上の光足切り判定
     relation(monAttr, envAttr),   // GOOD/NORMAL/WORST
   }

   新ルール（優先順位）：
   0) 無属性（temp==0 && hum==50）→ NEUTRAL（相性判定外）
   1) 水中（hum==100）→ envAttr=STORM、水深で海域確定（光足切り無視）
   2) 陸上：光が適正でない → 強制 WORST
   3) 超ベスト：ピンポイント座標一致 → SUPER_BEST
   4) ベスト：超ベストと同じエリア → BEST
   5) 属性相性：
      - 同属性 → GOOD
      - 真逆（風↔土、火↔水）→ WORST
      - 隣（それ以外）→ NORMAL

   重要：
   - 属性の内部値は VOLCANO/TORNADO/EARTHQUAKE/STORM に統一
   ========================================================= */
(function () {
  "use strict";

  const AM = window.TSP_AREAMAP;
  const AR = window.TSP_AREA;

  if (!AM || !AM.ATTRIBUTES || !AM.AREAS) {
    console.error("[game] TSP_AREAMAP missing");
  }
  if (!AR || !AR.resolveAreaId) {
    console.error("[game] TSP_AREA missing");
  }

  const ATTR = Object.freeze({
    VOLCANO: "VOLCANO",
    TORNADO: "TORNADO",
    EARTHQUAKE: "EARTHQUAKE",
    STORM: "STORM"
  });

  const ATTR_LABEL = Object.freeze({
    VOLCANO: "ヴォルケーノ",
    TORNADO: "トルネード",
    EARTHQUAKE: "アースクエイク",
    STORM: "ストーム",
    NEUTRAL: "無属性"
  });

  // ランク（表示名はapp.js側でもよいが、返却に含める）
  const RANK = Object.freeze({
    NEUTRAL: "NEUTRAL",
    SUPER_BEST: "SUPER_BEST",
    BEST: "BEST",
    GOOD: "GOOD",
    NORMAL: "NORMAL",
    WORST: "WORST"
  });

  const RANK_LABEL = Object.freeze({
    NEUTRAL: "無属性環境",
    SUPER_BEST: "超ベスト環境",
    BEST: "ベスト環境",
    GOOD: "良好環境",
    NORMAL: "普通環境",
    WORST: "最悪環境"
  });

  function safeAttr(a) {
    return (a === ATTR.VOLCANO || a === ATTR.TORNADO || a === ATTR.EARTHQUAKE || a === ATTR.STORM) ? a : null;
  }

  // 真逆属性
  function opposite(attr) {
    switch (attr) {
      case ATTR.TORNADO: return ATTR.EARTHQUAKE;
      case ATTR.EARTHQUAKE: return ATTR.TORNADO;
      case ATTR.VOLCANO: return ATTR.STORM;
      case ATTR.STORM: return ATTR.VOLCANO;
      default: return null;
    }
  }

  // 隣属性（「真逆」と「同属性」以外）
  function isAdjacent(monAttr, envAttr) {
    const m = safeAttr(monAttr);
    const e = safeAttr(envAttr);
    if (!m || !e) return false;
    if (m === e) return false;
    if (opposite(m) === e) return false;
    return true;
  }

  // 陸上の適正光（時間帯）
  // 6:00-9:59  => 50
  // 10:00-15:59 => 100
  // 16:00-5:59 => 0
  function lightTarget(now) {
    const d = now instanceof Date ? now : new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    // 6:00-9:59
    if (h >= 6 && h <= 9) return 50;
    // 10:00-15:59
    if (h >= 10 && h <= 15) return 100;
    // 16:00-23:59 or 0:00-5:59
    return 0;
  }

  function isLightOk(now, light) {
    const t = lightTarget(now);
    return Number(light) === t;
  }

  // 予想環境：属性のみ（エリア名は出さない）
  // - 無属性：無属性
  // - 水中：ストーム
  // - 陸上：エリア属性から決定（光は関係なし）
  function previewAttribute(env, now) {
    const e = normalizeEnv(env);
    if (!e) return { key: "NEUTRAL", label: ATTR_LABEL.NEUTRAL };

    if (AR.isNeutral(e.temp, e.hum)) {
      return { key: "NEUTRAL", label: ATTR_LABEL.NEUTRAL };
    }
    if (Number(e.hum) === 100) {
      return { key: ATTR.STORM, label: ATTR_LABEL.STORM };
    }

    const areaId = AR.resolveAreaId(e.temp, e.hum, e.light);
    if (areaId === "NEUTRAL") return { key: "NEUTRAL", label: ATTR_LABEL.NEUTRAL };

    const area = AM.AREAS[areaId];
    const a = area ? safeAttr(area.attribute) : null;
    return a ? { key: a, label: ATTR_LABEL[a] } : { key: "NEUTRAL", label: ATTR_LABEL.NEUTRAL };
  }

  function normalizeEnv(env) {
    if (!env) return null;
    const temp = Number(env.temp);
    const hum = Number(env.hum);
    const light = Number(env.light);
    if (Number.isNaN(temp) || Number.isNaN(hum) || Number.isNaN(light)) return null;
    return { temp, hum, light };
  }

  // ピンポイント一致判定（超ベスト）
  // superBest: { temp, hum, light }（水中では light=水深）
  function isSuperBest(mon, env) {
    if (!mon || !mon.superBest) return false;
    const sb = mon.superBest;
    const t = Number(sb.temp);
    const h = Number(sb.hum);
    const l = Number(sb.light);
    if ([t, h, l].some(Number.isNaN)) return false;

    if (env.temp !== t) return false;
    if (env.hum !== h) return false;

    // 水中は水深一致が必要（light扱い）
    if (env.hum === 100) {
      return env.light === l;
    }
    // 陸上は光は足切り判定で見ているので、ここでは温度湿度のみ一致でOK
    // （あなたの「超ベストは温度湿度ピンポイント」方針を優先）
    return true;
  }

  // 超ベストが属するエリアID（ベスト判定に使う）
  function superBestAreaId(mon) {
    if (!mon || !mon.superBest) return "NEUTRAL";
    const sb = mon.superBest;
    const t = Number(sb.temp);
    const h = Number(sb.hum);
    const l = Number(sb.light);
    if ([t, h, l].some(Number.isNaN)) return "NEUTRAL";
    return AR.resolveAreaId(t, h, l);
  }

  // 属性相性（GOOD/NORMAL/WORST）
  function relation(monAttr, envAttr) {
    const m = safeAttr(monAttr);
    const e = safeAttr(envAttr);
    if (!m || !e) return RANK.NORMAL;
    if (m === e) return RANK.GOOD;
    if (opposite(m) === e) return RANK.WORST;
    if (isAdjacent(m, e)) return RANK.NORMAL;
    return RANK.NORMAL;
  }

  // 環境ランク判定（エリア名も返す）
  function rankEnv(mon, env, now) {
    const tNow = now instanceof Date ? now : new Date();
    const e = normalizeEnv(env);
    const monAttr = safeAttr(mon && mon.attribute);

    // フォールバック
    const out = {
      rankKey: RANK.NORMAL,
      rankLabel: RANK_LABEL[RANK.NORMAL],
      // 表示用（ホームはエリア名、環境タブは属性のみ運用）
      areaId: "NEUTRAL",
      areaName: "無属性",
      envAttr: null,
      envAttrLabel: ATTR_LABEL.NEUTRAL,
      // 光情報（陸上のみ意味あり）
      lightTarget: lightTarget(tNow),
      lightOk: true,
      isSea: false,
      isNeutral: false
    };

    if (!e) return out;

    // 0) 無属性
    if (AR.isNeutral(e.temp, e.hum)) {
      out.rankKey = RANK.NEUTRAL;
      out.rankLabel = RANK_LABEL[RANK.NEUTRAL];
      out.areaId = "NEUTRAL";
      out.areaName = "無属性";
      out.envAttr = null;
      out.envAttrLabel = ATTR_LABEL.NEUTRAL;
      out.isNeutral = true;
      out.isSea = false;
      out.lightOk = true; // 足切り無視
      return out;
    }

    // エリアID（海/陸）
    const areaId = AR.resolveAreaId(e.temp, e.hum, e.light);
    out.areaId = areaId;

    // 1) 水中
    if (Number(e.hum) === 100) {
      out.isSea = true;
      out.isNeutral = false;
      out.lightOk = true; // 光足切り無視

      out.envAttr = ATTR.STORM;
      out.envAttrLabel = ATTR_LABEL.STORM;

      const area = AM.AREAS[areaId];
      out.areaName = area ? area.name : "水中";

      // 超ベスト（ピンポイント：温度/湿度/水深）
      if (isSuperBest(mon, e)) {
        out.rankKey = RANK.SUPER_BEST;
        out.rankLabel = RANK_LABEL[RANK.SUPER_BEST];
        return out;
      }

      // ベスト（超ベストと同じエリア）
      const sbArea = superBestAreaId(mon);
      if (sbArea !== "NEUTRAL" && sbArea === areaId) {
        out.rankKey = RANK.BEST;
        out.rankLabel = RANK_LABEL[RANK.BEST];
        return out;
      }

      // 属性相性のみ（環境属性は水固定）
      const rel = relation(monAttr, ATTR.STORM);
      out.rankKey = rel;
      out.rankLabel = RANK_LABEL[rel] || RANK_LABEL[RANK.NORMAL];
      return out;
    }

    // 2) 陸上（湿度99も陸上）
    out.isSea = false;

    // エリア情報
    const area = AM.AREAS[areaId];
    const envAttr = area ? safeAttr(area.attribute) : null;

    out.areaName = (area && area.name) ? area.name : "無属性";
    out.envAttr = envAttr;
    out.envAttrLabel = envAttr ? ATTR_LABEL[envAttr] : ATTR_LABEL.NEUTRAL;

    // 2) 光足切り（陸上のみ）
    const lightOk = isLightOk(tNow, e.light);
    out.lightOk = lightOk;
    if (!lightOk) {
      out.rankKey = RANK.WORST;
      out.rankLabel = RANK_LABEL[RANK.WORST];
      return out;
    }

    // 3) 超ベスト（ピンポイント座標：温度/湿度一致）
    if (isSuperBest(mon, e)) {
      out.rankKey = RANK.SUPER_BEST;
      out.rankLabel = RANK_LABEL[RANK.SUPER_BEST];
      return out;
    }

    // 4) ベスト（超ベストと同じエリア）
    const sbArea = superBestAreaId(mon);
    if (sbArea !== "NEUTRAL" && sbArea === areaId) {
      out.rankKey = RANK.BEST;
      out.rankLabel = RANK_LABEL[RANK.BEST];
      return out;
    }

    // 5) 属性相性
    const rel = relation(monAttr, envAttr);
    out.rankKey = rel;
    out.rankLabel = RANK_LABEL[rel] || RANK_LABEL[RANK.NORMAL];
    return out;
  }

  window.TSP_GAME = Object.freeze({
    ATTR,
    ATTR_LABEL,
    RANK,
    RANK_LABEL,
    lightTarget,
    isLightOk,
    previewAttribute,
    relation,
    rankEnv
  });
})();
