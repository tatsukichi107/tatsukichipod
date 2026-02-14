/* =========================================================
 * state.js  v0.76-stable
 * - ソウルドール（育成データ）を生成
 * - 記憶コード（短縮）を発行/読み込み
 * - サーガ名照合（違うサーガ名ならリボーン失敗）
 *
 * 前提：
 * - 現時点は windragon（ウインドラゴン）1体を安定運用
 * - 環境設定は保存しない（再リボーン時は無属性固定）
 * ========================================================= */

(function () {
  "use strict";

  // ---------- UTF-8 / Base64URL helpers ----------
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
    return b64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64UrlDecode(b64url) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return b64Decode(b64);
  }

  // ---------- Constants ----------
  const CODE_PREFIX = "SOUL1:";
  const SPECIES_ID = "windragon";

  // 「レジェンズ」表記のこだわり：内部名は lengendz で統一（名前だけ）
  // ※プロパティ名としては soul を使う（既存実装との整合優先）
  const DEFAULT_LENGENDZ = Object.freeze({
    speciesId: SPECIES_ID,
    speciesName: "ウインドラゴン",
    attribute: "tornado", // 風＝トルネード
    baseHP: 400,
    baseStats: { fire: 60, wind: 100, earth: 60, water: 20 },
    defaultMoves: Object.freeze([
      "ワザ1", "ワザ2", "ワザ3", "ワザ4", "ワザ5",
      "ワザ6", "ワザ7", "ワザ8", "ワザ9", "ワザ10",
      "ワザ11", "ワザ12", "ワザ13", "ワザ14", "ワザ15"
    ]),
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

  function makeNewSoulWindragon(sagaName) {
    const saga = String(sagaName || "").trim();
    if (!saga) throw new Error("サーガ名が空です");

    const soul = {
      version: 1,

      // identity
      sagaName: saga,
      speciesId: DEFAULT_LENGENDZ.speciesId,
      speciesName: DEFAULT_LENGENDZ.speciesName,
      attribute: DEFAULT_LENGENDZ.attribute, // tornado
      nickname: "",

      // stats
      baseHP: DEFAULT_LENGENDZ.baseHP,
      baseStats: shallowCopy(DEFAULT_LENGENDZ.baseStats),

      // grow
      growHP: 0,
      growStats: { fire: 0, wind: 0, earth: 0, water: 0 },

      // current
      currentHP: DEFAULT_LENGENDZ.baseHP,

      // inventory
      crystals: { volcano: 0, tornado: 0, earthquake: 0, storm: 0 },

      // moves (15 fixed)
      moves: DEFAULT_LENGENDZ.defaultMoves.slice(),

      // metadata (任意)
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return soul;
  }

  function normalizeSoulForSave(soul) {
    if (!soul) throw new Error("ソウルがありません");

    const saga = String(soul.sagaName || "").trim();
    if (!saga) throw new Error("サーガ名が不正です");

    const nickname = String(soul.nickname || "").trim();

    const growHP = clampInt(soul.growHP ?? 0, 0, 999999);
    const growStats = soul.growStats || {};
    const g = {
      fire: clampInt(growStats.fire ?? 0, 0, 999999),
      wind: clampInt(growStats.wind ?? 0, 0, 999999),
      earth: clampInt(growStats.earth ?? 0, 0, 999999),
      water: clampInt(growStats.water ?? 0, 0, 999999),
    };

    const crystals = soul.crystals || {};
    const c = {
      volcano: clampInt(crystals.volcano ?? 0, 0, 999999),
      tornado: clampInt(crystals.tornado ?? 0, 0, 999999),
      earthquake: clampInt(crystals.earthquake ?? 0, 0, 999999),
      storm: clampInt(crystals.storm ?? 0, 0, 999999),
    };

    const moves = Array.isArray(soul.moves) ? soul.moves.slice(0, 15) : [];
    while (moves.length < 15) moves.push(`ワザ${moves.length + 1}`);
    const m = moves.map((x, i) => {
      const s = String(x ?? "").trim();
      return s ? s : `ワザ${i + 1}`;
    });

    // 最大HPは game.js 側で計算するが、currentHP の NaN防止だけここで整える
    const baseHP = DEFAULT_LENGENDZ.baseHP;
    const maxHP = baseHP + growHP;
    const currentHP = clampInt(soul.currentHP ?? maxHP, 0, maxHP);

    return {
      v: 1,
      sp: SPECIES_ID,
      s: saga,
      nn: nickname,
      chp: currentHP,
      ghp: growHP,
      gs: g,
      cr: c,
      mv: m,
    };
  }

  function inflateSoulFromPayload(p) {
    if (!p || typeof p !== "object") throw new Error("記憶データが壊れています");

    if (p.v !== 1) throw new Error("記憶データのバージョンが不正です");
    if (p.sp !== SPECIES_ID) throw new Error("このソウルドールは未対応の種族です");

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

    // moves
    const mv = Array.isArray(p.mv) ? p.mv.slice(0, 15) : DEFAULT_LENGENDZ.defaultMoves.slice();
    while (mv.length < 15) mv.push(`ワザ${mv.length + 1}`);
    soul.moves = mv.map((x, i) => {
      const s = String(x ?? "").trim();
      return s ? s : `ワザ${i + 1}`;
    });

    // currentHP（最大HP増加時は game.js 側で currentHP 同時増加のルールを扱う）
    const baseHP = soul.baseHP;
    const maxHP = baseHP + soul.growHP;
    soul.currentHP = clampInt(p.chp ?? maxHP, 0, maxHP);

    soul.updatedAt = Date.now();
    return soul;
  }

  function makeSoulCode(soul) {
    const payload = normalizeSoulForSave(soul);
    const json = JSON.stringify(payload);
    const bytes = utf8ToBytes(json);
    const b64u = b64UrlEncode(bytes);
    return CODE_PREFIX + b64u;
  }

  function parseSoulCode(code) {
    const raw = String(code || "").trim();
    if (!raw) throw new Error("記憶が空です");

    const body = raw.startsWith(CODE_PREFIX) ? raw.slice(CODE_PREFIX.length) : raw;
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

  function assertSagaMatch(parsedSoul, sagaInput) {
    const inSaga = String(sagaInput || "").trim();
    if (!inSaga) throw new Error("サーガ名が空です");
    const savedSaga = String(parsedSoul?.sagaName || "").trim();
    if (!savedSaga) throw new Error("記憶データのサーガ名が不正です");
    if (savedSaga !== inSaga) throw new Error("サーガ名が一致しません（リボーン失敗）");
  }

  // expose
  window.TSP_STATE = {
    newSoulWindragon: makeNewSoulWindragon,
    makeSoulCode,
    parseSoulCode,
    assertSagaMatch,
  };
})();