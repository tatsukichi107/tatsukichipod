/* =========================================================
   TalisPod v0.77+
   areaResolver.js（module不使用）
   温度/湿度/光(=水深)からエリアIDを確定する（画像マッピング確定版）

   公開：
   window.TSP_AREA = {
     resolveAreaId(temp, hum, lightOrDepth),
     resolveLandAreaId(temp, hum),
     resolveSeaAreaId(temp, depth),
     isSeaAreaId(areaId),
     isNeutral(temp, hum)
   }

   ルール：
   - 無属性：temp==0 && hum==50 → "NEUTRAL"
   - 水中：hum==100 → 北海/南海×水深(0/50/100)
     * 温度 < 0 → 北海（SN_）
     * 温度 >= 0 → 南海（SS_）
   - 陸上：画像の温度帯×湿度帯で16エリアにマップ
   - 湿度99は陸上扱い
   - -297は廃止（下限は-273）
   ========================================================= */
(function () {
  "use strict";

  const AM = window.TSP_AREAMAP;
  if (!AM || !AM.AREAS) {
    console.error("[areaResolver] TSP_AREAMAP missing");
    window.TSP_AREA = window.TSP_AREA || {};
    return;
  }

  // 湿度帯（列）キー
  const HUM_BANDS = Object.freeze([
    { key: "0",     match: (h) => h === 0 },
    { key: "5-10",  match: (h) => h >= 5 && h <= 10 },
    { key: "15-20", match: (h) => h >= 15 && h <= 20 },
    { key: "25-45", match: (h) => h >= 25 && h <= 45 },
    { key: "50",    match: (h) => h === 50 },
    { key: "55-75", match: (h) => h >= 55 && h <= 75 },
    { key: "80-85", match: (h) => h >= 80 && h <= 85 },
    { key: "90-95", match: (h) => h >= 90 && h <= 95 },
    { key: "99",    match: (h) => h === 99 }
  ]);

  // 温度帯（行）キー（画像どおり）
  // ※ UIは -273, -45, -40, -35... 45, 999 を取り得る
  // ※ -297は存在しない（来ても -273 に丸める）
  function tempKey(t) {
    const temp = Number(t);

    if (Number.isNaN(temp)) return null;

    if (temp >= 999) return "999"; // 999行（上段）

    // 40-45
    if (temp >= 40 && temp <= 45) return "40-45";

    // 35
    if (temp === 35) return "35";

    // 5-30
    if (temp >= 5 && temp <= 30) return "5-30";

    // 0
    if (temp === 0) return "0";

    // -5〜-30
    if (temp <= -5 && temp >= -30) return "-5--30";

    // -35
    if (temp === -35) return "-35";

    // -40〜-45
    if (temp <= -40 && temp >= -45) return "-40--45";

    // -273（下限）
    // UIの最小は -273。もし -297 等が来たら下限扱いで -273 行に入れる。
    if (temp <= -273) return "-273";

    // 上のどれにも入らない（例：-1, -2 などが来た場合）
    // 仕様上は来ないはずだが安全に最近傍へ
    if (temp < 0) return "-5--30";
    return "0";
  }

  function humKey(h) {
    const hum = Number(h);
    if (Number.isNaN(hum)) return null;
    for (const b of HUM_BANDS) {
      if (b.match(hum)) return b.key;
    }
    return null;
  }

  // 画像マッピング（陸上）
  // 行：999 / 40-45 / 35 / 5-30 / 0 / -5--30 / -35 / -40--45 / -273
  // 列：0 / 5-10 / 15-20 / 25-45 / 50 / 55-75 / 80-85 / 90-95 / 99
  const LAND_MAP = Object.freeze({
    "999": Object.freeze({
      "0": "V1", "5-10": "V2", "15-20": "V3", "25-45": "V3", "50": "V3",
      "55-75": "E3", "80-85": "E3", "90-95": "E2", "99": "E1"
    }),
    "40-45": Object.freeze({
      "0": "V2", "5-10": "V2", "15-20": "V3", "25-45": "V3", "50": "V3",
      "55-75": "E3", "80-85": "E3", "90-95": "E2", "99": "E2"
    }),
    "35": Object.freeze({
      "0": "V3", "5-10": "V3", "15-20": "V3", "25-45": "V3", "50": "V3",
      "55-75": "E3", "80-85": "E3", "90-95": "E3", "99": "E3"
    }),
    "5-30": Object.freeze({
      "0": "V3", "5-10": "V3", "15-20": "V3", "25-45": "V4", "50": "V4",
      "55-75": "E4", "80-85": "E4", "90-95": "E3", "99": "E3"
    }),
    "0": Object.freeze({
      "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "NEUTRAL",
      "55-75": "E4", "80-85": "E4", "90-95": "E3", "99": "E3"
    }),
    "-5--30": Object.freeze({
      "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "S4",
      "55-75": "S4", "80-85": "S3", "90-95": "S3", "99": "S3"
    }),
    "-35": Object.freeze({
      "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "S4",
      "55-75": "S4", "80-85": "S3", "90-95": "S3", "99": "S3"
    }),
    "-40--45": Object.freeze({
      "0": "T2", "5-10": "T2", "15-20": "T3", "25-45": "T3", "50": "S3",
      "55-75": "S3", "80-85": "S3", "90-95": "S2", "99": "S2"
    }),
    "-273": Object.freeze({
      "0": "T1", "5-10": "T2", "15-20": "T3", "25-45": "T3", "50": "S3",
      "55-75": "S3", "80-85": "S3", "90-95": "S2", "99": "S1"
    })
  });

  function isNeutral(temp, hum) {
    return Number(temp) === 0 && Number(hum) === 50;
  }

  function isSeaAreaId(areaId) {
    return typeof areaId === "string" && (areaId.startsWith("SS_") || areaId.startsWith("SN_"));
  }

  function resolveSeaAreaId(temp, depth) {
    const t = Number(temp);
    const d = Number(depth);

    const isNorth = t < 0; // 温度<0 北海、>=0 南海
    const prefix = isNorth ? "SN_" : "SS_";

    // depthは 0/50/100 以外来ない想定だが安全に丸める
    const dd = (d === 0 || d === 50 || d === 100) ? d : (d < 25 ? 0 : (d < 75 ? 50 : 100));

    if (dd === 0) return prefix + "SHALLOW";
    if (dd === 50) return prefix + "MID";
    return prefix + "DEEP";
  }

  function resolveLandAreaId(temp, hum) {
    const tKey = tempKey(temp);
    const hKey = humKey(hum);
    if (!tKey || !hKey) return "NEUTRAL";

    const row = LAND_MAP[tKey];
    if (!row) return "NEUTRAL";

    const areaId = row[hKey];
    if (!areaId) return "NEUTRAL";

    // 中央セルはNEUTRAL
    if (areaId === "NEUTRAL") return "NEUTRAL";

    // areaMap側に存在するIDか確認（存在しないならNEUTRALに落とす）
    if (!AM.AREAS[areaId]) return "NEUTRAL";

    return areaId;
  }

  function resolveAreaId(temp, hum, lightOrDepth) {
    const h = Number(hum);

    // 無属性（最優先）
    if (isNeutral(temp, hum)) return "NEUTRAL";

    // 水中
    if (h === 100) {
      const areaId = resolveSeaAreaId(temp, lightOrDepth);
      // 念のため areaMap に存在確認
      return AM.AREAS[areaId] ? areaId : "NEUTRAL";
    }

    // 陸上（湿度99も陸上）
    return resolveLandAreaId(temp, hum);
  }

  window.TSP_AREA = Object.freeze({
    resolveAreaId,
    resolveLandAreaId,
    resolveSeaAreaId,
    isSeaAreaId,
    isNeutral
  });
})();
