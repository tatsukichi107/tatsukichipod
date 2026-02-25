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
        var m = raw.match(/SOUL\d*:([A-Za-z0-9_\-]+)/);
        if (m) return "SOUL1:" + m[1];
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

    /* ---------- encode ---------- */
    function makeSoulCode(soul) {
        var payload = {
            v: 1,
            sp: soul.speciesId,
            s: soul.sagaName,
            nn: soul.nickname || "",
            chp: soul.currentHP,
            ghp: soul.growHP,
            gs: {
                magic: soul.growStats.magic,
                counter: soul.growStats.counter,
                attack: soul.growStats.attack,
                recover: soul.growStats.recover
            },
            cr: soul.crystals || {},
            mv: soul.moves || emptyMoves()
        };
        var json = JSON.stringify(payload);
        var bytes = new TextEncoder().encode(json);
        return "SOUL1:" + b64urlEncode(bytes);
    }

    /* ---------- decode ---------- */
    function parseSoulCode(code) {
        code = sanitizeSoulText(code);
        if (!code) throw new Error("Soul Doll コードが空です");
        var prefix = code.indexOf(":");
        if (prefix < 0) throw new Error("不正なコード形式です");
        var b64 = code.substring(prefix + 1);
        var bytes = b64urlDecode(b64);
        var json = new TextDecoder().decode(bytes);
        var p;
        try {
            p = JSON.parse(json);
        } catch (e) {
            throw new Error("コードの解析に失敗しました");
        }
        return inflateSoulFromPayload(p);
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
