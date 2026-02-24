/* ============================================================
 *  areaMap.js  –  Area master data & grid mapping (v0.8 Finalized)
 *  Global: window.TSP_AREAMAP
 * ============================================================ */
(function () {
    "use strict";

    var AREAS = {
        // 火 (Fire)
        "V1": { id: "V1", name: "火山", nameEn: "Volcano", attr: "volcano" },
        "V2": { id: "V2", name: "砂漠", nameEn: "Desert", attr: "volcano" },
        "V3": { id: "V3", name: "乾燥帯", nameEn: "Dry Zone", attr: "volcano" },
        "V4": { id: "V4", name: "広葉樹林", nameEn: "Broadleaf Forest", attr: "volcano" },

        // 風 (Wind)
        "T1": { id: "T1", name: "成層圏", nameEn: "Stratosphere", attr: "tornado" },
        "T2": { id: "T2", name: "山岳地帯", nameEn: "Mountain Range", attr: "tornado" },
        "T3": { id: "T3", name: "高原", nameEn: "Plateau", attr: "tornado" },
        "T4": { id: "T4", name: "針葉樹林", nameEn: "Coniferous Forest", attr: "tornado" },

        // 土 (Earth)
        "E1": { id: "E1", name: "地底", nameEn: "Underground", attr: "earthquake" },
        "E2": { id: "E2", name: "熱帯雨林", nameEn: "Rainforest", attr: "earthquake" },
        "E3": { id: "E3", name: "熱帯", nameEn: "Tropical", attr: "earthquake" },
        "E4": { id: "E4", name: "温帯草原", nameEn: "Temperate Prairie", attr: "earthquake" },

        // 水 (Water)
        "S1": { id: "S1", name: "絶対零度", nameEn: "Absolute Zero", attr: "storm" },
        "S2": { id: "S2", name: "極寒地帯", nameEn: "Extreme Cold", attr: "storm" },
        "S3": { id: "S3", name: "寒帯", nameEn: "Cold Zone", attr: "storm" },
        "S4": { id: "S4", name: "寒帯草原", nameEn: "Subarctic Prairie", attr: "storm" },

        // 海 (Sea) - South
        "SSS": { id: "SSS", name: "南海浅瀬", nameEn: "South Sea Shallow", attr: "storm" },
        "SSM": { id: "SSM", name: "南海水中", nameEn: "South Sea Mid", attr: "storm" },
        "SSD": { id: "SSD", name: "南海深海", nameEn: "South Sea Deep", attr: "storm" },

        // 海 (Sea) - North
        "SNS": { id: "SNS", name: "北海浅瀬", nameEn: "North Sea Shallow", attr: "storm" },
        "SNM": { id: "SNM", name: "北海水中", nameEn: "North Sea Mid", attr: "storm" },
        "SND": { id: "SND", name: "北海深海", nameEn: "North Sea Deep", attr: "storm" },

        "NEUTRAL": { id: "NEUTRAL", name: "無属性", nameEn: "Neutral", attr: "neutral" }
    };

    // 表のグリッド通りのマッピング (9x9)
    var LAND_GRID = [
        // 999
        ["V1", "V2", "V3", "V3", "V3", "E3", "E3", "E2", "E1"],
        // 40-45
        ["V2", "V2", "V3", "V3", "V3", "E3", "E3", "E2", "E2"],
        // 35
        ["V3", "V3", "V3", "V3", "V3", "E3", "E3", "E3", "E3"],
        // 5-30
        ["V3", "V3", "V3", "V4", "V4", "E4", "E4", "E3", "E3"],
        // 0
        ["T3", "T3", "T3", "T4", "NEUTRAL", "E4", "E4", "E3", "E3"],
        // -5--30
        ["T3", "T3", "T3", "T4", "S4", "S4", "S3", "S3", "S3"],
        // -35
        ["T3", "T3", "T3", "T4", "S4", "S4", "S3", "S3", "S3"],
        // -40--45
        ["T2", "T2", "T3", "T3", "S3", "S3", "S3", "S2", "S2"],
        // -273
        ["T1", "T2", "T3", "T3", "S3", "S3", "S3", "S2", "S1"]
    ];

    // 海のマッピング (光量 0, 50, 100 に対応)
    var SEA_MAP = {
        "POS": ["SSS", "SSM", "SSD"],
        "NEG": ["SNS", "SNM", "SND"]
    };

    window.TSP_AREAMAP = {
        AREAS: AREAS,
        LAND_GRID: LAND_GRID,
        SEA_MAP: SEA_MAP
    };
})();
