// FILE: js/areaResolver.js
/* =========================================================
   TalisPod v0.77+  areaResolver.js（最終点検版）
   温度・湿度・光(水深)から「エリアID」を決定する

   重要（崩れ防止）：
   - import/export なし（file://でも動く）
   - areaMap.js の window.TSP_AREAMAP が前提
   - NEUTRAL は最優先（temp=0 & hum=50）
   - 湿度100のみ水中（光は 0/50/100 を水深として扱う）
   - 湿度99は陸上（※水中ではない）
   - 不明値は必ず "NEUTRAL" にフォールバック

   公開：
   window.TSP_AREA = { resolveAreaId, isSeaAreaId, isLandAreaId }
   ========================================================= */
(function () {
  "use strict";

  const AM = window.TSP_AREAMAP;
  if (!AM || !AM.AREAS) {
    console.error("[areaResolver] TSP_AREAMAP not found. areaMap.js is not loaded?");
    window.TSP_AREA = {
      resolveAreaId: () => "NEUTRAL",
      isSeaAreaId: () => false,
      isLandAreaId: () => false,
    };
    return;
  }

  const AREAS = AM.AREAS;

  // -----------------------------
  // 温度帯（行）
  // -----------------------------
  // 画像マップに合わせて「代表値・範囲」で判定
  // ※TEMP_STEPS 由来の値のみ来る想定だが、ガードしておく
  const TEMP_BANDS = [
    { key: "999",     match: (t) => t === 999 },
    { key: "40-45",   match: (t) => t >= 40 && t <= 45 },
    { key: "35",      match: (t) => t === 35 },
    { key: "5-30",    match: (t) => t >= 5 && t <= 30 },
    { key: "0",       match: (t) => t === 0 },
    { key: "-5--30",  match: (t) => t <= -5 && t >= -30 },
    { key: "-35",     match: (t) => t === -35 },
    { key: "-40--45", match: (t) => t <= -40 && t >= -45 },
    { key: "-273",    match: (t) => t === -273 },
  ];

  // -----------------------------
  // 湿度帯（列）
  // -----------------------------
  // 99は陸上、100は水中（ここでは100は扱わない：先に分岐する）
  const HUM_BANDS = [
    { key: "0",     match: (h) => h === 0 },
    { key: "5-10",  match: (h) => h >= 5 && h <= 10 },
    { key: "15-20", match: (h) => h >= 15 && h <= 20 },
    { key: "25-45", match: (h) => h >= 25 && h <= 45 },
    { key: "50",    match: (h) => h === 50 },
    { key: "55-75", match: (h) => h >= 55 && h <= 75 },
    { key: "80-85", match: (h) => h >= 80 && h <= 85 },
    { key: "90-95", match: (h) => h >= 90 && h <= 95 },
    { key: "99",    match: (h) => h === 99 },
  ];

  // -----------------------------
  // 陸上マップ（画像の表に対応）
  // 0セルは "NEUTRAL"（表中央の無属性）扱い
  // -----------------------------
  const LAND_MAP = {
    "999":     { "0": "V1", "5-10": "V2", "15-20": "V3", "25-45": "V3", "50": "V3",      "55-75": "E3", "80-85": "E3", "90-95": "E2", "99": "E1" },
    "40-45":   { "0": "V2", "5-10": "V2", "15-20": "V3", "25-45": "V3", "50": "V3",      "55-75": "E3", "80-85": "E3", "90-95": "E2", "99": "E2" },
    "35":      { "0": "V3", "5-10": "V3", "15-20": "V3", "25-45": "V3", "50": "V3",      "55-75": "E3", "80-85": "E3", "90-95": "E3", "99": "E3" },
    "5-30":    { "0": "V3", "5-10": "V3", "15-20": "V3", "25-45": "V4", "50": "V4",      "55-75": "E4", "80-85": "E4", "90-95": "E3", "99": "E3" },
    "0":       { "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "NEUTRAL", "55-75": "E4", "80-85": "E4", "90-95": "E3", "99": "E3" },
    "-5--30":  { "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "S4",      "55-75": "S4", "80-85": "S3", "90-95": "S3", "99": "S3" },
    "-35":     { "0": "T3", "5-10": "T3", "15-20": "T3", "25-45": "T4", "50": "S4",      "55-75": "S4", "80-85": "S3", "90-95": "S3", "99": "S3" },
    "-40--45": { "0": "T2", "5-10": "T2", "15-20": "T3", "25-45": "T3", "50": "S3",      "55-75": "S3", "80-85": "S3", "90-95": "S2", "99": "S2" },
    "-273":    { "0": "T1", "5-10": "T2", "15-20": "T3", "25-45": "T3", "50": "S3",      "55-75": "S3", "80-85": "S3", "90-95": "S2", "99": "S1" },
  };

  // -----------------------------
  // 水中マップ（湿度100）
  // side: temp>=0 => south / temp<0 => north
  // depth(light): 0/50/100 のいずれか想定。その他は MID に寄せる
  // -----------------------------
  const SEA_MAP = {
    south: { 0: "SS_SHALLOW", 50: "SS_MID", 100: "SS_DEEP" },
    north: { 0: "SN_SHALLOW", 50: "SN_MID", 100: "SN_DEEP" },
  };

  function pickTempBandKey(temp) {
    for (const b of TEMP_BANDS) if (b.match(temp)) return b.key;
    return null;
  }

  function pickHumBandKey(hum) {
    for (const b of HUM_BANDS) if (b.match(hum)) return b.key;
    return null;
  }

  function normalizeDepth(lightOrDepth) {
    const v = Number(lightOrDepth);
    if (v === 0 || v === 50 || v === 100) return v;
    // 変な値が来ても一番安全な中央に寄せる
    return 50;
  }

  function isSeaAreaId(areaId) {
    return !!areaId && (String(areaId).startsWith("SS_") || String(areaId).startsWith("SN_"));
  }

  function isLandAreaId(areaId) {
    return !!areaId && areaId !== "NEUTRAL" && !isSeaAreaId(areaId);
  }

  // -----------------------------
  // 公開関数：resolveAreaId
  // -----------------------------
  function resolveAreaId(temp, hum, lightOrDepth) {
    const t = Number(temp);
    const h = Number(hum);

    // NaN ガード
    if (!Number.isFinite(t) || !Number.isFinite(h)) return "NEUTRAL";

    // 1) 無属性（最優先）
    if (t === 0 && h === 50) return "NEUTRAL";

    // 2) 水中（湿度100のみ）
    if (h === 100) {
      const side = (t >= 0) ? "south" : "north";
      const depth = normalizeDepth(lightOrDepth);
      const id = SEA_MAP[side][depth] || (side === "south" ? "SS_MID" : "SN_MID");

      // 定義漏れガード
      if (!AREAS[id]) {
        console.warn("[resolveAreaId] unknown sea id:", id, { temp: t, hum: h, depth });
        return "NEUTRAL";
      }
      return id;
    }

    // 3) 陸上（湿度99も陸上）
    const tKey = pickTempBandKey(t);
    const hKey = pickHumBandKey(h);

    if (!tKey || !hKey) return "NEUTRAL";

    const row = LAND_MAP[tKey];
    const areaId = row ? row[hKey] : null;

    if (!areaId || areaId === "NEUTRAL") return "NEUTRAL";

    // 定義漏れガード
    if (!AREAS[areaId]) {
      console.warn("[resolveAreaId] unknown land id:", areaId, { temp: t, hum: h, tKey, hKey });
      return "NEUTRAL";
    }

    return areaId;
  }

  // 公開
  window.TSP_AREA = {
    resolveAreaId,
    isSeaAreaId,
    isLandAreaId,
  };
})();
