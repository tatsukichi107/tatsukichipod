/* ============================================================
 *  state.js  –  Soul Doll code encode / decode & soul helpers
 *  Global: window.TSP_STATE
 * ============================================================ */
(function () {
    "use strict";

    /* ---------- helpers ---------- */
    function b64urlEncode(bytes) {
        var bin = "";
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function b64urlDecode(str) {
        str = str.replace(/-/g, "+").replace(/_/g, "/");
        while (str.length % 4) str += "=";
        var bin = atob(str);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    /* ---------- sanitize ---------- */
    function sanitizeSoulText(raw) {
        if (!raw || typeof raw !== "string") return "";
        // remove zero-width chars
        raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");
        // full-width colon → half-width
        raw = raw.replace(/\uff1a/g, ":");
        // remove line breaks / extra spaces
        raw = raw.replace(/[\r\n\s]+/g, "");
        // extract code from pasted sentences like "Memory: SOUL1:xxx"
        var m = raw.match(/SOUL[12]:[A-Za-z0-9_\-]+/);
        if (m) return m[0];
        return raw;
    }

    /* ---------- default moves (15 slots) ---------- */
    function emptyMoves() {
        return [null, null, null, null, null,
            null, null, null, null, null,
            null, null, null, null, null];
    }

    /* ---------- new soul ---------- */
    function newSoulWindragon(sagaName) {
        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA["windragon"];
        var base = ld || {
            speciesId: "windragon",
            speciesName: "ウインドラゴン",
            attribute: "tornado",
            baseHP: 400,
            baseStats: { magic: 60, counter: 100, attack: 60, recover: 20 },
            defaultMoves: ["skill_wind_01"]
        };

        var moves = emptyMoves();
        if (base.defaultMoves) {
            for (var i = 0; i < base.defaultMoves.length && i < 15; i++) {
                moves[i] = base.defaultMoves[i] || null;
            }
        }

        return {
            version: 1,
            sagaName: sagaName,
            speciesId: base.speciesId,
            speciesName: base.speciesName,
            attribute: base.attribute,
            nickname: "",
            baseHP: base.baseHP,
            baseStats: {
                magic: base.baseStats.magic,
                counter: base.baseStats.counter,
                attack: base.baseStats.attack,
                recover: base.baseStats.recover
            },
            growHP: 0,
            growStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            currentHP: base.baseHP,
            crystals: { "crystal_cost": 3 },
            moves: moves,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /* ---------- V2 Encoding Dictionaries ---------- */
    /*  Index → Base36 code mapping (used for SOUL2: compact save codes)
     *  IMPORTANT: Never reorder or remove entries — only append new ones.
     *  Legend:  0="0", 1="1", … 9="9", 10="a", 11="b", … 35="z"
     */
    var HEX_DICTS = {
        legendz: [
            /* 0 */ "windragon",
            /* 1 */ "ranshiin",
            /* 2 */ "blazedragon",
            /* 3 */ "werewolf",
            /* 4 */ "mermaid",
            /* 5 */ "devourcrocodile",
            /* 6 */ "harpy",
            /* 7 */ "caitsith",
            /* 8 */ "hellhound"
        ],
        skills: [
            /* 0  */ "skill_basic_slap",
            /* 1  */ "skill_harpy",
            /* 2  */ "skill_hippogriff",
            /* 3  */ "skill_manticore",
            /* 4  */ "skill_assassinbug",
            /* 5  */ "skill_tornadoking",
            /* 6  */ "skill_tornadoking_base",
            /* 7  */ "skill_wing_tornado",
            /* 8  */ "skill_salamander",
            /* 9  */ "skill_willowisp",
            /* a  */ "skill_wyvern",
            /* b  */ "skill_blazedragon",
            /* c  */ "skill_volcanoking",
            /* d  */ "skill_volcanoking_base",
            /* e  */ "skill_blazedragon_ult",
            /* f  */ "skill_lizardman",
            /* g  */ "skill_caitsith",
            /* h  */ "skill_dwarf",
            /* i  */ "skill_orc",
            /* j  */ "skill_earthquakeking",
            /* k  */ "skill_earthquakeking_base",
            /* l  */ "skill_werewolf_ult",
            /* m  */ "skill_stormworm",
            /* n  */ "skill_giantcrab",
            /* o  */ "skill_mazeoctopus",
            /* p  */ "skill_undine",
            /* q  */ "skill_stormking",
            /* r  */ "skill_stormking_base",
            /* s  */ "skill_mermaid_ult",
            /* t  */ "skill_jabberwock",
            /* u  */ "skill_devourcrocodile_ult",
            /* v  */ "skill_harpy_ult",
            /* w  */ "skill_caitsith_ult",
            /* x  */ "skill_hellhound_ult"
        ],
        crystals: [
            /* 0  */ "crystal_cost",
            /* 1  */ "fragment_salamander",
            /* 2  */ "fragment_willowisp",
            /* 3  */ "fragment_wyvern",
            /* 4  */ "fragment_blazedragon",
            /* 5  */ "fragment_volcanoking",
            /* 6  */ "fragment_harpy",
            /* 7  */ "fragment_hippogriff",
            /* 8  */ "fragment_manticore",
            /* 9  */ "fragment_assassinbug",
            /* a  */ "fragment_tornadoking",
            /* b  */ "fragment_lizardman",
            /* c  */ "fragment_caitsith",
            /* d  */ "fragment_dwarf",
            /* e  */ "fragment_orc",
            /* f  */ "fragment_earthquakeking",
            /* g  */ "fragment_stormworm",
            /* h  */ "fragment_giantcrab",
            /* i  */ "fragment_mazeoctopus",
            /* j  */ "fragment_undine",
            /* k  */ "fragment_stormking",
            /* l  */ "soul_volcano",
            /* m  */ "soul_tornado",
            /* n  */ "soul_earthquake",
            /* o  */ "soul_storm",
            /* p  */ "crystal_king"
        ]
    };

    function encodeHex(type, str) {
        if (!str) return "";
        var arr = HEX_DICTS[type];
        var idx = arr.indexOf(str);
        if (idx < 0) return str;
        return idx.toString(36);
    }

    function decodeHex(type, str) {
        if (!str) return null;
        var idx = parseInt(str, 36);
        var arr = HEX_DICTS[type];
        if (!isNaN(idx) && idx >= 0 && idx < arr.length) return arr[idx];
        return str;
    }

    /* ---------- encode ---------- */
    function makeSoulCode(soul) {
        var gsArr = [soul.growStats.magic, soul.growStats.counter, soul.growStats.attack, soul.growStats.recover];
        var mvArr = (soul.moves || emptyMoves()).map(function (m) { return encodeHex("skills", m); });
        var crArr = [];
        for (var k in soul.crystals) {
            if (soul.crystals[k] > 0) {
                crArr.push(encodeHex("crystals", k) + ":" + soul.crystals[k]);
            }
        }
        var ulArr = (soul.unlockedLegendz || []).map(function (l) { return encodeHex("legendz", l); });

        var payload = [
            2, // version
            soul.sagaName,
            soul.nickname || "",
            encodeHex("legendz", soul.speciesId),
            soul.currentHP,
            soul.growHP,
            gsArr,
            crArr,
            mvArr,
            ulArr
        ];

        var json = JSON.stringify(payload);
        var bytes = new TextEncoder().encode(json);
        return "SOUL2:" + b64urlEncode(bytes);
    }

    /* ---------- decode ---------- */
    function parseSoulCode(code) {
        code = sanitizeSoulText(code);
        if (!code) throw new Error("Soul Doll コードが空です");
        var prefix = code.indexOf(":");
        if (prefix < 0) throw new Error("不正なコード形式です");
        var header = code.substring(0, prefix);
        var b64 = code.substring(prefix + 1);
        var bytes = b64urlDecode(b64);
        var json = new TextDecoder().decode(bytes);
        var p;
        try {
            p = JSON.parse(json);
        } catch (e) {
            throw new Error("コードの解析に失敗しました");
        }
        if (header === "SOUL2") return parseV2Payload(p);
        return inflateSoulFromPayload(p);
    }

    /* ---------- inflate V2 ---------- */
    function parseV2Payload(p) {
        var base = window.TSP_LEGENDZ_DATA[decodeHex("legendz", p[3])] || window.TSP_LEGENDZ_DATA["windragon"];
        var gs = p[6] || [0, 0, 0, 0];
        var cr = {};
        if (p[7]) {
            for (var i = 0; i < p[7].length; i++) {
                var pts = p[7][i].split(":");
                cr[decodeHex("crystals", pts[0])] = parseInt(pts[1], 10);
            }
        }
        var mv = emptyMoves();
        if (p[8]) {
            for (var i = 0; i < 15; i++) {
                mv[i] = decodeHex("skills", p[8][i]);
            }
        }
        var ulArr = [];
        if (p[9]) {
            ulArr = p[9].map(function (l) { return decodeHex("legendz", l); });
        }
        return {
            version: parseInt(p[0]) || 2,
            sagaName: p[1] || "",
            speciesId: base.speciesId,
            speciesName: base.speciesName,
            attribute: base.attribute,
            nickname: p[2] || "",
            baseHP: base.baseHP,
            baseStats: {
                magic: base.baseStats.magic,
                counter: base.baseStats.counter,
                attack: base.baseStats.attack,
                recover: base.baseStats.recover
            },
            growHP: parseInt(p[5]) || 0,
            growStats: {
                magic: gs[0] || 0,
                counter: gs[1] || 0,
                attack: gs[2] || 0,
                recover: gs[3] || 0
            },
            currentHP: parseInt(p[4]) || base.baseHP,
            crystals: cr,
            moves: mv,
            unlockedLegendz: ulArr,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /* ---------- inflate ---------- */
    function inflateSoulFromPayload(p) {
        var speciesId = p.sp || "windragon";
        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[speciesId];
        var base = ld || {
            speciesId: speciesId,
            speciesName: "ウインドラゴン",
            attribute: "tornado",
            baseHP: 400,
            baseStats: { magic: 60, counter: 100, attack: 60, recover: 20 }
        };

        var gs = p.gs || {};
        var moves = p.mv || emptyMoves();
        while (moves.length < 15) moves.push(null);

        return {
            version: p.v || 1,
            sagaName: p.s || "",
            speciesId: base.speciesId,
            speciesName: base.speciesName,
            attribute: base.attribute,
            nickname: p.nn || "",
            baseHP: base.baseHP,
            baseStats: {
                magic: base.baseStats.magic,
                counter: base.baseStats.counter,
                attack: base.baseStats.attack,
                recover: base.baseStats.recover
            },
            growHP: p.ghp || 0,
            growStats: {
                magic: gs.magic || 0,
                counter: gs.counter || 0,
                attack: gs.attack || 0,
                recover: gs.recover || 0
            },
            currentHP: p.chp || base.baseHP,
            crystals: p.cr || {},
            moves: moves,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /* ---------- saga match ---------- */
    function assertSagaMatch(soul, saga) {
        if (!soul || !saga) throw new Error("サーガ名が入力されていません");
        if (soul.sagaName !== saga) {
            throw new Error("サーガ名が一致しません。正しい名前を入力してください。");
        }
    }

    /* ---------- public API ---------- */
    window.TSP_STATE = {
        newSoulWindragon: newSoulWindragon,
        makeSoulCode: makeSoulCode,
        parseSoulCode: parseSoulCode,
        assertSagaMatch: assertSagaMatch,
        sanitizeSoulText: sanitizeSoulText
    };
})();
