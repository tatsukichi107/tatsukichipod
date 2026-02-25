/* ============================================================
 *  game.js  –  Core game logic: rank, growth, constants
 *  Depends on: TSP_AREAMAP, TSP_AREA, TSP_LEGENDZ_DATA
 *  Global: window.TSP_GAME
 * ============================================================ */
(function () {
    "use strict";

    /* ---------- constants ---------- */
    var TEMP_STEPS = [-273, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 999];
    var HUM_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 100];

    var Rank = {
        SUPERBEST: "superbest",
        BEST: "best",
        GOOD: "good",
        NORMAL: "normal",
        BAD: "bad",
        NEUTRAL: "neutral"
    };

    /* Attribute display meta */
    var ATTR_META = {
        volcano: { jp: "ヴォルケーノ", en: "Volcano", growKey: "magic", opposite: "storm" },
        tornado: { jp: "トルネード", en: "Tornado", growKey: "counter", opposite: "earthquake" },
        earthquake: { jp: "アースクエイク", en: "Earthquake", growKey: "attack", opposite: "tornado" },
        storm: { jp: "ストーム", en: "Storm", growKey: "recover", opposite: "volcano" },
        spiritual: { jp: "スピリチュアル", en: "Spiritual", growKey: null, opposite: "necrom" },
        necrom: { jp: "ネクロム", en: "Necrom", growKey: null, opposite: "spiritual" },
        neutral: { jp: "無属性", en: "Neutral", growKey: null, opposite: null }
    };

    /* growth profile per rank */
    var GROWTH = {
        superbest: { hpGrow: 50, elemGrow: 20, interval: 1, healCap: 500, hpDmg: 0 },
        best: { hpGrow: 30, elemGrow: 10, interval: 1, healCap: 300, hpDmg: 0 },
        good: { hpGrow: 20, elemGrow: 10, interval: 2, healCap: 200, hpDmg: 0 },
        normal: { hpGrow: 10, elemGrow: 10, interval: 3, healCap: 100, hpDmg: 0 },
        bad: { hpGrow: 0, elemGrow: 10, interval: 5, healCap: 0, hpDmg: 10 },
        neutral: { hpGrow: 0, elemGrow: 0, interval: 0, healCap: 0, hpDmg: 0 }
    };

    /* stat display keys */
    var STAT_KEYS = ["magic", "counter", "attack", "recover"];
    var STAT_JP = { magic: "MAGIC", counter: "COUNTER", attack: "ATTACK", recover: "RECOVER" };

    /* ---------- time-linked light ---------- */
    function expectedLightByTime(dateObj) {
        var h = dateObj.getHours();
        if (h >= 6 && h <= 9) return 50;
        if (h >= 10 && h <= 15) return 100;
        return 0;
    }

    /* ---------- env attribute ---------- */
    function envAttribute(temp, hum, light) {
        var areaId = window.TSP_AREA.resolveAreaId(temp, hum, light);
        var area = window.TSP_AREAMAP.AREAS[areaId];
        return area ? area.attr : "neutral";
    }

    /* ---------- attribute affinity ---------- */
    function getAffinity(legendzAttr, envAttr) {
        if (envAttr === "neutral") return "neutral";
        // spiritual / necrom → always good against any env attribute
        if (legendzAttr === "spiritual" || legendzAttr === "necrom") return "good";
        if (legendzAttr === envAttr) return "good";
        var meta = ATTR_META[legendzAttr];
        if (meta && meta.opposite === envAttr) return "bad";
        return "normal";
    }

    /* ---------- computeRank ---------- */
    function computeRank(mon, envApplied, now, monAttrKey) {
        var temp = envApplied.temp;
        var hum = envApplied.hum;
        var light = envApplied.light;

        var areaId = window.TSP_AREA.resolveAreaId(temp, hum, light);
        var area = window.TSP_AREAMAP.AREAS[areaId];
        var eAttr = area ? area.attr : "neutral";
        var isSea = window.TSP_AREA.isSeaAreaId(areaId);
        var expLight = expectedLightByTime(now);

        var result = {
            rank: Rank.NEUTRAL,
            areaId: areaId,
            envAttr: eAttr,
            areaName: area ? area.name : "無属性",
            areaNameEn: area ? area.nameEn : "Neutral",
            isSea: isSea,
            lightExpected: expLight,
            lightOk: true
        };

        // 1. NEUTRAL
        if (areaId === "NEUTRAL") {
            result.rank = Rank.NEUTRAL;
            return result;
        }

        // 2. Sea areas
        if (isSea) {
            // Check superbest
            if (mon && mon.superBest) {
                var sb = mon.superBest;
                if (sb.waterDepth != null &&
                    temp === sb.temp && hum === sb.hum && light === sb.waterDepth) {
                    result.rank = Rank.SUPERBEST;
                    return result;
                }
            }
            // Check best
            if (mon && mon.bestAreaId && areaId === mon.bestAreaId) {
                result.rank = Rank.BEST;
                return result;
            }
            // Affinity
            var seaAff = getAffinity(monAttrKey, eAttr);
            if (seaAff === "good") result.rank = Rank.GOOD;
            else if (seaAff === "bad") result.rank = Rank.BAD;
            else result.rank = Rank.NORMAL;
            return result;
        }

        // 3. Land areas
        // 3a. Light mismatch (Highest priority for land)
        if (light !== expLight) {
            result.rank = Rank.BAD;
            result.lightOk = false;
            return result;
        }

        // 3b. SuperBest (Temp & Hum matching)
        if (mon && mon.superBest) {
            var sb = mon.superBest;
            if (temp === sb.temp && hum === sb.hum) {
                result.rank = Rank.SUPERBEST;
                return result;
            }
        }

        // 3c. BestArea
        if (mon && mon.bestAreaId && areaId === mon.bestAreaId) {
            result.rank = Rank.BEST;
            return result;
        }

        // 3d. Affinity
        var landAff = getAffinity(monAttrKey, eAttr);
        if (landAff === "good") result.rank = Rank.GOOD;
        else if (landAff === "bad") result.rank = Rank.BAD;
        else result.rank = Rank.NORMAL;
        return result;
    }

    /* ---------- maxHP helper ---------- */
    function maxHP(soul) {
        return soul.baseHP + soul.growHP;
    }

    /* ---------- growth preview ---------- */
    function computeMinutePreview(soul, mon, envApplied, now, elemCounter) {
        var rc = computeRank(mon, envApplied, now, soul.attribute);
        var gp = GROWTH[rc.rank];
        if (!gp || rc.rank === Rank.NEUTRAL) {
            return { rank: rc, heal: 0, hpGrow: 0, statGrows: {}, hpDmg: 0, noGrowth: true };
        }

        // Safety: If Rank is BAD and HP <= 10, stop all growth/damage to prevent fainting
        if (rc.rank === Rank.BAD && soul.currentHP <= 10) {
            return { rank: rc, heal: 0, hpGrow: 0, statGrows: {}, hpDmg: 0, noGrowth: true };
        }

        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
        var maxGHP = ld ? ld.maxGrowHP : 9999;
        var maxGS = ld ? ld.maxGrowStats : { magic: 9999, counter: 9999, attack: 9999, recover: 9999 };

        var heal = (gp.healCap > 0) ? Math.min(gp.healCap, maxHP(soul) - soul.currentHP) : 0;
        var hpGrow = (soul.growHP < maxGHP) ? gp.hpGrow : 0;

        // stat growth: only the stat matching environment attribute
        var statGrows = {};
        var growKey = (ATTR_META[rc.envAttr] || {}).growKey;
        if (growKey) {
            var cnt = (elemCounter[growKey] || 0) + 1;
            if (cnt >= gp.interval && soul.growStats[growKey] < maxGS[growKey]) {
                statGrows[growKey] = gp.elemGrow;
            }
        }

        return {
            rank: rc,
            heal: Math.max(0, heal),
            hpGrow: hpGrow,
            statGrows: statGrows,
            hpDmg: gp.hpDmg,
            noGrowth: false,
            interval: gp.interval
        };
    }

    /* ---------- apply one minute ---------- */
    function applyOneMinute(soul, mon, envApplied, now, elemCounter) {
        var rc = computeRank(mon, envApplied, now, soul.attribute);
        var gp = GROWTH[rc.rank];

        var result = {
            rank: rc,
            heal: 0,
            hpGrow: 0,
            statGrows: {},
            hpDmg: 0
        };

        if (!gp || rc.rank === Rank.NEUTRAL) return result;

        // Safety: If Rank is BAD and HP <= 10, skip growth/damage logic
        if (rc.rank === Rank.BAD && soul.currentHP <= 10) return result;

        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
        var maxGHP = ld ? ld.maxGrowHP : 9999;
        var maxGS = ld ? ld.maxGrowStats : { magic: 9999, counter: 9999, attack: 9999, recover: 9999 };
        var mhp = maxHP(soul);

        // 1. Heal
        if (gp.healCap > 0) {
            var heal = Math.min(gp.healCap, mhp - soul.currentHP);
            if (heal > 0) {
                soul.currentHP += heal;
                result.heal = heal;
            }
        }

        // 2. HP growth
        if (soul.growHP < maxGHP) {
            var addHP = Math.min(gp.hpGrow, maxGHP - soul.growHP);
            soul.growHP += addHP;
            soul.currentHP += addHP;
            result.hpGrow = addHP;
        }

        // 3. Stat growth (restricted to environment attribute stat)
        var growKey = (ATTR_META[rc.envAttr] || {}).growKey;
        if (growKey) {
            elemCounter[growKey] = (elemCounter[growKey] || 0) + 1;
            if (elemCounter[growKey] >= gp.interval) {
                elemCounter[growKey] = 0;
                if (soul.growStats[growKey] < maxGS[growKey]) {
                    var add = Math.min(gp.elemGrow, maxGS[growKey] - soul.growStats[growKey]);
                    soul.growStats[growKey] += add;
                    result.statGrows[growKey] = add;
                }
            }
        }

        // 4. Damage (bad only)
        if (gp.hpDmg > 0) {
            soul.currentHP -= gp.hpDmg;
            result.hpDmg = gp.hpDmg;
        }

        // 5. Clamp
        mhp = maxHP(soul);
        soul.currentHP = Math.max(0, Math.min(soul.currentHP, mhp));

        soul.updatedAt = Date.now();
        return result;
    }

    /* ---------- public ---------- */
    window.TSP_GAME = {
        Rank: Rank,
        TEMP_STEPS: TEMP_STEPS,
        HUM_STEPS: HUM_STEPS,
        ATTR_META: ATTR_META,
        GROWTH: GROWTH,
        STAT_KEYS: STAT_KEYS,
        STAT_JP: STAT_JP,
        expectedLightByTime: expectedLightByTime,
        envAttribute: envAttribute,
        computeRank: computeRank,
        maxHP: maxHP,
        computeMinutePreview: computeMinutePreview,
        applyOneMinute: applyOneMinute
    };
})();
