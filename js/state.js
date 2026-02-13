/* =========================================================
 * state.js（短縮ソウルドールコード版 / QR廃止）
 *
 * 役割：
 * - 新規ソウルドール生成
 * - カムバック用：短縮コード生成（SOUL-1.<payload>.<crc32>）
 * - 再リボーン用：短縮コード解析＋整形
 *
 * 仕様：
 * - 環境設定は保存しない（復帰時は必ず無属性：temp0 hum50 light50）
 * - ニックネームは保存する
 * - コピペ運用前提（手打ち想定なし）
 *
 * 互換対策：
 * - game.js が参照しがちな別名も保持（grow / stats など）
 *   → 最大HP NaN回避の保険
 * ========================================================= */

(function () {
  "use strict";

  const TSP_STATE = {};

  // ===== モンスター定義（今はwindragonのみ）=====
  const MONSTERS = {
    windragon: {
      monsterId: "windragon",
      speciesName: "ウインドラゴン",
      attribute: "tornado",
      weakAttr: "earthquake",
      baseHP: 400,
      baseStats: { fire: 60, wind: 100, earth: 60, water: 20 },
      defaultMoves: Array.from({ length: 15 }, () => "NONE"),
    },
  };

  const NEUTRAL_ENV = { temp: 0, hum: 50, light: 50 };

  // =========================================================
  // Base64URL（UTF-8対応）
  // =========================================================
  function bytesToB64u(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64uToBytes(b64u) {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    const padded = b64 + "=".repeat(padLen);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function utf8Encode(str) {
    return new TextEncoder().encode(str);
  }

  function utf8Decode(bytes) {
    return new TextDecoder().decode(bytes);
  }

  // =========================================================
  // CRC32
  // =========================================================
  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function crc32Hex8(bytes) {
    const v = crc32(bytes);
    return v.toString(16).padStart(8, "0");
  }

  // =========================================================
  // 互換フィールド付与（game.jsの期待ズレ対策）
  // =========================================================
  function applyCompatAliases(soul) {
    // grow（よくある参照名）
    soul.grow = soul.grow || {};
    soul.grow.hp = Number.isFinite(soul.growHP) ? soul.growHP : 0;
    soul.grow.fire = Number.isFinite(soul.growStats?.fire) ? soul.growStats.fire : 0;
    soul.grow.wind = Number.isFinite(soul.growStats?.wind) ? soul.growStats.wind : 0;
    soul.grow.earth = Number.isFinite(soul.growStats?.earth) ? soul.growStats.earth : 0;
    soul.grow.water = Number.isFinite(soul.growStats?.water) ? soul.growStats.water : 0;

    // stats（合算を期待する実装がある場合）
    soul.stats = soul.stats || {};
    soul.stats.fire = (soul.baseStats?.fire || 0) + (soul.growStats?.fire || 0);
    soul.stats.wind = (soul.baseStats?.wind || 0) + (soul.growStats?.wind || 0);
    soul.stats.earth = (soul.baseStats?.earth || 0) + (soul.growStats?.earth || 0);
    soul.stats.water = (soul.baseStats?.water || 0) + (soul.growStats?.water || 0);

    // hp（max/currentをまとめて持ってほしそうな実装対策）
    soul.hp = soul.hp || {};
    soul.hp.base = soul.baseHP;
    soul.hp.grow = soul.growHP;
    soul.hp.current = soul.currentHP;

    return soul;
  }

  // =========================================================
  // ソウル生成
  // =========================================================
  TSP_STATE.newSoulWindragon = function (sagaName) {
    const m = MONSTERS.windragon;
    if (!m) throw new Error("monster定義が見つかりません");

    const soul = {
      version: 1,
      sagaName: String(sagaName || "").trim(),
      monsterId: m.monsterId,

      speciesName: m.speciesName,
      nickname: "",

      attribute: m.attribute,
      weakAttr: m.weakAttr,

      baseHP: m.baseHP,
      baseStats: { ...m.baseStats },

      growHP: 0,
      growStats: { fire: 0, wind: 0, earth: 0, water: 0 },

      currentHP: m.baseHP,

      crystals: { volcano: 0, tornado: 0, earthquake: 0, storm: 0 },

      moves: [...m.defaultMoves],

      envSetting: { ...NEUTRAL_ENV },
    };

    return applyCompatAliases(soul);
  };

  // =========================================================
  // 短縮コード：SOUL-1.<payload>.<crc32>
  // =========================================================
  TSP_STATE.makeSoulCode = function (soul) {
    if (!soul) throw new Error("ソウルがありません");

    const payloadObj = {
      s: String(soul.sagaName || ""),
      m: String(soul.monsterId || "windragon"),
      n: String(soul.nickname || ""),
      ch: Number(soul.currentHP || 0),
      g: [
        Number(soul.growHP || 0),
        Number(soul.growStats?.fire || 0),
        Number(soul.growStats?.wind || 0),
        Number(soul.growStats?.earth || 0),
        Number(soul.growStats?.water || 0),
      ],
      c: [
        Number(soul.crystals?.volcano || 0),
        Number(soul.crystals?.tornado || 0),
        Number(soul.crystals?.earthquake || 0),
        Number(soul.crystals?.storm || 0),
      ],
      w: Array.isArray(soul.moves) ? soul.moves.slice(0, 15) : Array.from({ length: 15 }, () => "NONE"),
    };

    const json = JSON.stringify(payloadObj);
    const jsonBytes = utf8Encode(json);
    const payload = bytesToB64u(jsonBytes);

    const sig = crc32Hex8(utf8Encode(payload));
    return `SOUL-1.${payload}.${sig}`;
  };

  // =========================================================
  // コード解析
  // =========================================================
  TSP_STATE.parseSoulCode = function (code) {
    const raw = String(code || "").trim();
    if (!raw) throw new Error("コードが空です");

    const normalized = raw.replace(/\s+/g, "");

    if (!normalized.startsWith("SOUL-1.")) {
      throw new Error("コード形式が違います（SOUL-1 ではありません）");
    }

    const parts = normalized.split(".");
    if (parts.length !== 3) {
      throw new Error("コード形式が壊れています（区切りが不正）");
    }

    const prefix = parts[0];
    const payload = parts[1];
    const sig = parts[2];

    if (prefix !== "SOUL-1") throw new Error("コードバージョンが不正です");

    const expect = crc32Hex8(utf8Encode(payload));
    if (sig !== expect) {
      throw new Error("コードが壊れているか改変されています（チェック不一致）");
    }

    let obj;
    try {
      const jsonBytes = b64uToBytes(payload);
      const json = utf8Decode(jsonBytes);
      obj = JSON.parse(json);
    } catch {
      throw new Error("コードの復号に失敗しました");
    }

    const sagaName = String(obj.s || "").trim();
    const monsterId = String(obj.m || "").trim();
    const nickname = String(obj.n || "");
    const currentHP = Number(obj.ch || 0);

    if (!sagaName) throw new Error("コードにサーガ名がありません");
    if (!monsterId) throw new Error("コードにモンスターIDがありません");

    const def = MONSTERS[monsterId];
    if (!def) throw new Error("未対応のモンスターIDです");

    const g = Array.isArray(obj.g) ? obj.g : [0, 0, 0, 0, 0];
    const c = Array.isArray(obj.c) ? obj.c : [0, 0, 0, 0];
    const w = Array.isArray(obj.w) ? obj.w.slice(0, 15) : def.defaultMoves;

    const soul = {
      version: 1,
      sagaName,
      monsterId,

      speciesName: def.speciesName,
      nickname,

      attribute: def.attribute,
      weakAttr: def.weakAttr,

      baseHP: def.baseHP,
      baseStats: { ...def.baseStats },

      growHP: Number(g[0] || 0),
      growStats: {
        fire: Number(g[1] || 0),
        wind: Number(g[2] || 0),
        earth: Number(g[3] || 0),
        water: Number(g[4] || 0),
      },

      currentHP: currentHP,

      crystals: {
        volcano: Number(c[0] || 0),
        tornado: Number(c[1] || 0),
        earthquake: Number(c[2] || 0),
        storm: Number(c[3] || 0),
      },

      moves: w.length === 15 ? w : w.concat(Array.from({ length: Math.max(0, 15 - w.length) }, () => "NONE")),

      envSetting: { ...NEUTRAL_ENV },
    };

    if (!Number.isFinite(soul.currentHP) || soul.currentHP < 1) soul.currentHP = 1;

    return applyCompatAliases(soul);
  };

  // =========================================================
  // サーガ名一致チェック
  // =========================================================
  TSP_STATE.assertSagaMatch = function (soul, inputSagaName) {
    const a = String(soul?.sagaName || "").trim();
    const b = String(inputSagaName || "").trim();
    if (!a || !b) throw new Error("サーガ名が不正です");
    if (a !== b) throw new Error("サーガ名が一致しないためリボーン失敗");
  };

  window.TSP_STATE = TSP_STATE;
})();
