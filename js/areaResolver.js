/* ============================================================
 *  areaResolver.js  –  Resolves areaId based on temp/hum/light (Optimized for fine-sliders)
 *  Depends on: TSP_AREAMAP
 *  Global: window.TSP_AREA
 * ============================================================ */
(function () {
    "use strict";

    // スライダーの値(TEMP_STEPSの値)を、表の0〜8行目に変換
    function getTempIndex(temp) {
        if (temp >= 999) return 0;
        if (temp >= 40) return 1;
        if (temp >= 35) return 2;
        if (temp >= 5) return 3;
        if (temp === 0) return 4;
        if (temp >= -30) return 5;
        if (temp === -35) return 6;
        if (temp >= -45) return 7;
        return 8; // -273
    }

    // スライダーの値(HUM_STEPSの値)を、表の0〜8列目に変換
    function getHumIndex(hum) {
        if (hum === 0) return 0;
        if (hum < 15) return 1;
        if (hum < 25) return 2;
        if (hum < 50) return 3;
        if (hum === 50) return 4;
        if (hum < 80) return 5;
        if (hum < 90) return 6;
        if (hum < 99) return 7;
        return 8; // 99 (100は別途処理)
    }

    function resolveAreaId(temp, hum, light) {
        var am = window.TSP_AREAMAP;

        // 1. 海 (湿度100)
        if (hum >= 100) {
            // 表の通り 0:浅瀬(SSS), 50:水中(SSM), 100:深海(SSD)
            var lightIdx = (light >= 100) ? 2 : (light >= 50 ? 1 : 0);
            var set = (temp >= 0) ? am.SEA_MAP.POS : am.SEA_MAP.NEG;
            return set[lightIdx];
        }

        // 2. 陸地グリッド (9x9)
        var tIdx = getTempIndex(temp);
        var hIdx = getHumIndex(hum);

        // 安全にグリッドから取得
        var row = am.LAND_GRID[tIdx];
        if (!row) return "NEUTRAL";
        var rid = row[hIdx];
        return rid || "NEUTRAL";
    }

    function isSeaAreaId(areaId) {
        var a = areaId;
        return a === "SSS" || a === "SSM" || a === "SSD" || a === "SNS" || a === "SNM" || a === "SND";
    }

    window.TSP_AREA = {
        resolveAreaId: resolveAreaId,
        isSeaAreaId: isSeaAreaId
    };
})();
