// FILE: js/state.js
/* =========================================================
 * state.js  v0.79-stable
 * - ソウルドール生成
 * - 記憶コード（SOUL1:）発行
 * - 記憶コード読み込み（改行/空白/ゼロ幅/全角記号耐性あり）
 * - サーガ名照合
 * ========================================================= */

(function () {
  "use strict";

  /* ===============================
     UTF-8 / Base64URL helpers
     =============================== */
  function utf8ToBytes(str) {
    return new TextEncoder().encode(str);
  }
  function bytesToUtf8(bytes) {
    return new TextDecoder().decode(bytes);
  }
  function b64Encode(bytes) {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function b64Decode(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function b64UrlEncode(bytes) {
    return b64Encode(bytes)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  function b64UrlDecode(b64url) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return b64Decode(b64);
  }

  /* ===============================
     Constants
     =============================== */
  const CODE_PREFIX = "SOUL1:";
  const SPECIES_ID = "windragon";

  const DEFAULT_LENGENDZ = Object.freeze({
    speciesId: SPECIES_ID,
    speciesName: "ウインドラゴン",
    attribute: "tornado",
    baseHP: 400,
    baseStats: { fire: 60, wind: 100, earth: 60, water: 20 },
    defaultMoves: Object.freeze(
      Array.from({ length: 15 }, (_, i) => `ワザ${i + 1}`)
    ),
  });

  function clampInt(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) n = min;
    n = Math.floor(n);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function shallowCopy(obj) {
    return Object.assign({}, obj);
  }

  /* ===============================
     新規ソウル生成
     =============================== */
  function makeNewSoulWindragon(sagaName) {
    const saga = String(sagaName || "").trim();
    if (!saga) throw new Error("サーガ名が空です");

    return {
      version: 1,
      sagaName: saga,

      speciesId: DEFAULT_LENGENDZ.speciesId,
      speciesName: DEFAULT_LENGENDZ.speciesName,
      attribute: DEFAULT_LENGENDZ.attribute,
      nickname: "",

      baseHP: DEFAULT_LENGENDZ.baseHP,
      baseStats: shallowCopy(DEFAULT_LENGENDZ.baseStats),

      growHP: 0,
      growStats: { fire: 0, wind: 0, earth: 0, water: 0 },

      currentHP: DEFAULT_LENGENDZ.baseHP,

      crystals: { volcano: 0, tornado: 0, earthquake: 0, storm: 0 },

      moves: DEFAULT_LENGENDZ.defaultMoves.slice(),

      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /* ===============================
     保存用正規化
     =============================== */
  function normalizeSoulForSave(soul) {
    if (!soul) throw new Error("ソウルがありません");

    const saga = String(soul.sagaName || "").trim();
    if (!saga) throw new Error("サーガ名が不正です");

    const growHP = clampInt(soul.growHP ?? 0, 0, 999999);

    const gs = soul.growStats || {};
    const growStats = {
      fire: clampInt(gs.fire ?? 0, 0, 999999),
      wind: clampInt(gs.wind ?? 0, 0, 999999),
      earth: clampInt(gs.earth ?? 0, 0, 999999),
      water: clampInt(gs.water ?? 0, 0, 999999),
    };

    const cr = soul.crystals || {};
    const crystals = {
      volcano: clampInt(cr.volcano ?? 0, 0, 999999),
      tornado: clampInt(cr.tornado ?? 0, 0, 999999),
      earthquake: clampInt(cr.earthquake ?? 0, 0, 999999),
      storm: clampInt(cr.storm ?? 0, 0, 999999),
    };

    const moves = Array.isArray(soul.moves)
      ? soul.moves.slice(0, 15)
      : DEFAULT_LENGENDZ.defaultMoves.slice();

    while (moves.length < 15) moves.push(`ワザ${moves.length + 1}`);

    const baseHP = DEFAULT_LENGENDZ.baseHP;
    const maxHP = baseHP + growHP;
    const currentHP = clampInt(soul.currentHP ?? maxHP, 0, maxHP);

    return {
      v: 1,
      sp: SPECIES_ID,
      s: saga,
      nn: String(soul.nickname || "").trim(),
      chp: currentHP,
      ghp: growHP,
      gs: growStats,
      cr: crystals,
      mv: moves,
    };
  }

  /* ===============================
     読み込み
     =============================== */
  function inflateSoulFromPayload(p) {
    if (!p || typeof p !== "object") throw new Error("記憶データが壊れています");
    if (p.v !== 1) throw new Error("記憶データのバージョンが不正です");
    if (p.sp !== SPECIES_ID) throw new Error("未対応の種族です");

    const soul = makeNewSoulWindragon(p.s);

    soul.nickname = String(p.nn || "").trim();
    soul.growHP = clampInt(p.ghp ?? 0, 0, 999999);

    const gs = p.gs || {};
    soul.growStats = {
      fire: clampInt(gs.fire ?? 0, 0, 999999),
      wind: clampInt(gs.wind ?? 0, 0, 999999),
      earth: clampInt(gs.earth ?? 0, 0, 999999),
      water: clampInt(gs.water ?? 0, 0, 999999),
    };

    const cr = p.cr || {};
    soul.crystals = {
      volcano: clampInt(cr.volcano ?? 0, 0, 999999),
      tornado: clampInt(cr.tornado ?? 0, 0, 999999),
      earthquake: clampInt(cr.earthquake ?? 0, 0, 999999),
      storm: clampInt(cr.storm ?? 0, 0, 999999),
    };

    soul.moves = Array.isArray(p.mv) ? p.mv.slice(0, 15) : soul.moves;

    const maxHP = soul.baseHP + soul.growHP;
    soul.currentHP = clampInt(p.chp ?? maxHP, 0, maxHP);

    soul.updatedAt = Date.now();
    return soul;
  }

  /* ===============================
     記憶コード生成
     =============================== */
  function makeSoulCode(soul) {
    const payload = normalizeSoulForSave(soul);
    const json = JSON.stringify(payload);
    const bytes = utf8ToBytes(json);
    const b64u = b64UrlEncode(bytes);
    return CODE_PREFIX + b64u;
  }

  /* ===============================
     記憶コード解析（耐性強化版）
     =============================== */
  function parseSoulCode(code) {
    let raw = String(code || "").trim();
    if (!raw) throw new Error("記憶が空です");

    const prefixes = ["SOUL1:", "SOUL:"];
    for (const p of prefixes) {
      if (raw.startsWith(p)) {
        raw = raw.slice(p.length);
        break;
      }
    }

    // 改行/空白/ゼロ幅文字除去
    let body = raw
      .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
      .replace(/＿/g, "_")
      .replace(/[－−‐-–—ー]/g, "-");

    let payload;
    try {
      const bytes = b64UrlDecode(body);
      const json = bytesToUtf8(bytes);
      payload = JSON.parse(json);
    } catch (e) {
      throw new Error("記憶の読み込みに失敗しました（形式が違うか壊れています）");
    }

    return inflateSoulFromPayload(payload);
  }

  /* ===============================
     サーガ照合
     =============================== */
  function assertSagaMatch(parsedSoul, sagaInput) {
    const inSaga = String(sagaInput || "").trim();
    if (!inSaga) throw new Error("サーガ名が空です");
    const savedSaga = String(parsedSoul?.sagaName || "").trim();
    if (savedSaga !== inSaga) throw new Error("サーガ名が一致しません（リボーン失敗）");
  }

  /* ===============================
     公開
     =============================== */
  window.TSP_STATE = {
    newSoulWindragon: makeNewSoulWindragon,
    makeSoulCode,
    parseSoulCode,
    assertSagaMatch,
  };

})();
