/* =========================================================
   TalisPod v0.77+
   areaMap.js（module不使用）
   エリア定義データ（ID / 名称 / 属性 / 種別）
   - file:// でも確実に動くように import/export を使わない
   - window.TSP_AREAMAP として公開
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     属性定義（英名は世界観の名称を優先）
     ======================================================= */
  const ATTRIBUTES = {
    VOLCANO: "VOLCANO",       // 火
    TORNADO: "TORNADO",       // 風
    EARTHQUAKE: "EARTHQUAKE", // 土
    STORM: "STORM"            // 水
  };

  /* =======================================================
     エリアマスタ（IDと名称をセットで覚える）
     ======================================================= */
  const AREAS = {
    /* ===== 火（VOLCANO）===== */
    V1: { id: "V1", name: "火山", attribute: ATTRIBUTES.VOLCANO, type: "land" },
    V2: { id: "V2", name: "砂漠", attribute: ATTRIBUTES.VOLCANO, type: "land" },
    V3: { id: "V3", name: "乾燥帯", attribute: ATTRIBUTES.VOLCANO, type: "land" },
    V4: { id: "V4", name: "広葉樹林", attribute: ATTRIBUTES.VOLCANO, type: "land" },

    /* ===== 風（TORNADO）===== */
    T1: { id: "T1", name: "成層圏", attribute: ATTRIBUTES.TORNADO, type: "land" },
    T2: { id: "T2", name: "山岳地帯", attribute: ATTRIBUTES.TORNADO, type: "land" },
    T3: { id: "T3", name: "高原", attribute: ATTRIBUTES.TORNADO, type: "land" },
    T4: { id: "T4", name: "針葉樹林", attribute: ATTRIBUTES.TORNADO, type: "land" },

    /* ===== 土（EARTHQUAKE）===== */
    E1: { id: "E1", name: "地底", attribute: ATTRIBUTES.EARTHQUAKE, type: "land" },
    E2: { id: "E2", name: "熱帯雨林", attribute: ATTRIBUTES.EARTHQUAKE, type: "land" },
    E3: { id: "E3", name: "熱帯", attribute: ATTRIBUTES.EARTHQUAKE, type: "land" },
    E4: { id: "E4", name: "温帯草原", attribute: ATTRIBUTES.EARTHQUAKE, type: "land" },

    /* ===== 水（STORM）陸上 ===== */
    S1: { id: "S1", name: "絶対零度", attribute: ATTRIBUTES.STORM, type: "land" },
    S2: { id: "S2", name: "極寒地帯", attribute: ATTRIBUTES.STORM, type: "land" },
    S3: { id: "S3", name: "寒帯", attribute: ATTRIBUTES.STORM, type: "land" },
    S4: { id: "S4", name: "寒帯草原", attribute: ATTRIBUTES.STORM, type: "land" },

    /* ===== 水中（南海）===== */
    SS_SHALLOW: { id: "SS_SHALLOW", name: "南海浅瀬", attribute: ATTRIBUTES.STORM, type: "sea", side: "south", depth: 0 },
    SS_MID:     { id: "SS_MID",     name: "南海水中", attribute: ATTRIBUTES.STORM, type: "sea", side: "south", depth: 50 },
    SS_DEEP:    { id: "SS_DEEP",    name: "南海深海", attribute: ATTRIBUTES.STORM, type: "sea", side: "south", depth: 100 },

    /* ===== 水中（北海）===== */
    SN_SHALLOW: { id: "SN_SHALLOW", name: "北海浅瀬", attribute: ATTRIBUTES.STORM, type: "sea", side: "north", depth: 0 },
    SN_MID:     { id: "SN_MID",     name: "北海水中", attribute: ATTRIBUTES.STORM, type: "sea", side: "north", depth: 50 },
    SN_DEEP:    { id: "SN_DEEP",    name: "北海深海", attribute: ATTRIBUTES.STORM, type: "sea", side: "north", depth: 100 }
  };

  function getAreaById(id) {
    return AREAS[id] || null;
  }
  function getAreaName(id) {
    return AREAS[id] ? AREAS[id].name : null;
  }
  function getAreaAttribute(id) {
    return AREAS[id] ? AREAS[id].attribute : null;
  }

  // 公開
  window.TSP_AREAMAP = {
    ATTRIBUTES,
    AREAS,
    getAreaById,
    getAreaName,
    getAreaAttribute
  };
})();
