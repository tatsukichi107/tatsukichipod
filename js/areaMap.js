/* =========================================================
   TalisPod v0.77+
   areaMap.js（module不使用）
   エリアID・名称・属性の定義（確定版）

   公開：
   window.TSP_AREAMAP = {
     ATTRIBUTES,  // VOLCANO/TORNADO/EARTHQUAKE/STORM
     AREAS        // areaId -> { id, name, attribute }
   }
   ========================================================= */
(function () {
  "use strict";

  const ATTRIBUTES = Object.freeze({
    VOLCANO: "VOLCANO",       // 火（ヴォルケーノ）
    TORNADO: "TORNADO",       // 風（トルネード）
    EARTHQUAKE: "EARTHQUAKE", // 土（アースクエイク）
    STORM: "STORM"            // 水（ストーム）
  });

  // エリア定義（ID→表示名→属性）
  const AREAS = Object.freeze({
    // --- 火（V） ---
    V1: { id: "V1", name: "火山", attribute: ATTRIBUTES.VOLCANO },
    V2: { id: "V2", name: "砂漠", attribute: ATTRIBUTES.VOLCANO },
    V3: { id: "V3", name: "乾燥帯", attribute: ATTRIBUTES.VOLCANO },
    V4: { id: "V4", name: "広葉樹林", attribute: ATTRIBUTES.VOLCANO },

    // --- 風（T） ---
    T1: { id: "T1", name: "成層圏", attribute: ATTRIBUTES.TORNADO },
    T2: { id: "T2", name: "山岳地帯", attribute: ATTRIBUTES.TORNADO },
    T3: { id: "T3", name: "高原", attribute: ATTRIBUTES.TORNADO },
    T4: { id: "T4", name: "針葉樹林", attribute: ATTRIBUTES.TORNADO },

    // --- 土（E） ---
    E1: { id: "E1", name: "地底", attribute: ATTRIBUTES.EARTHQUAKE },
    E2: { id: "E2", name: "熱帯雨林", attribute: ATTRIBUTES.EARTHQUAKE },
    E3: { id: "E3", name: "熱帯", attribute: ATTRIBUTES.EARTHQUAKE },
    E4: { id: "E4", name: "温帯草原", attribute: ATTRIBUTES.EARTHQUAKE },

    // --- 水（S：陸上寒冷）---
    S1: { id: "S1", name: "絶対零度", attribute: ATTRIBUTES.STORM },
    S2: { id: "S2", name: "極寒地帯", attribute: ATTRIBUTES.STORM },
    S3: { id: "S3", name: "寒帯", attribute: ATTRIBUTES.STORM },
    S4: { id: "S4", name: "寒帯草原", attribute: ATTRIBUTES.STORM },

    // --- 水中（湿度=100：水属性扱い）---
    // 北海（temp < 0）
    SN_SHALLOW: { id: "SN_SHALLOW", name: "北海浅瀬", attribute: ATTRIBUTES.STORM },
    SN_MID:     { id: "SN_MID",     name: "北海水中", attribute: ATTRIBUTES.STORM },
    SN_DEEP:    { id: "SN_DEEP",    name: "北海深海", attribute: ATTRIBUTES.STORM },

    // 南海（temp >= 0）
    SS_SHALLOW: { id: "SS_SHALLOW", name: "南海浅瀬", attribute: ATTRIBUTES.STORM },
    SS_MID:     { id: "SS_MID",     name: "南海水中", attribute: ATTRIBUTES.STORM },
    SS_DEEP:    { id: "SS_DEEP",    name: "南海深海", attribute: ATTRIBUTES.STORM }
  });

  window.TSP_AREAMAP = Object.freeze({
    ATTRIBUTES,
    AREAS
  });
})();
