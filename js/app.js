/* =========================================================
 * app.js（生存確認版 vCHECK-1）
 *
 * 目的：
 * - この端末で「app.jsが実行されているか？」を確実に判定する
 * - ボタン（新規/記憶）のクリックが app.js 側で拾えているか判定する
 * - TSP_STATE / TSP_GAME が存在するか、主要関数があるかを表示する
 *
 * 注意：
 * - これは診断用の最小版（ゲーム本体は動きません）
 * - ここで「動いてる」ことが確認できたら、完全版app.jsへ戻す
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function banner(text, bg = "#10b981") {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.right = "0";
    el.style.bottom = "0";
    el.style.zIndex = "99999";
    el.style.padding = "10px 12px";
    el.style.fontSize = "13px";
    el.style.lineHeight = "1.3";
    el.style.color = "white";
    el.style.background = bg;
    el.style.borderTop = "1px solid rgba(255,255,255,0.2)";
    el.textContent = text;
    document.body.appendChild(el);
    return el;
  }

  function safeStr(v) {
    try { return String(v); } catch { return "[unprintable]"; }
  }

  // 画面下に常駐バナー（「JSが実行された」証拠）
  const stamp = `app.js 生存確認版 実行中 / ${new Date().toLocaleString()}`;
  const b = banner(stamp);

  // グローバルエラーも画面に出す
  window.addEventListener("error", (e) => {
    banner("JS ERROR: " + safeStr(e.message), "#ef4444");
  });

  window.addEventListener("unhandledrejection", (e) => {
    banner("PROMISE ERROR: " + safeStr(e.reason), "#ef4444");
  });

  function reportDeps() {
    const st = window.TSP_STATE;
    const gm = window.TSP_GAME;

    const lines = [];
    lines.push(`TSP_STATE: ${st ? "OK" : "NG"}`);
    lines.push(`TSP_GAME : ${gm ? "OK" : "NG"}`);

    if (st) {
      const fns = [
        "newSoulWindragon",
        "makeSoulCode",
        "parseSoulCode",
        "assertSagaMatch",
      ];
      for (const fn of fns) {
        lines.push(`STATE.${fn}: ${typeof st[fn] === "function" ? "OK" : "NG"}`);
      }
    }

    if (gm) {
      lines.push(`GAME.TEMP_STEPS: ${Array.isArray(gm.TEMP_STEPS) ? "OK" : "NG"}`);
      lines.push(`GAME.HUM_STEPS : ${Array.isArray(gm.HUM_STEPS) ? "OK" : "NG"}`);
      lines.push(`GAME.Rank      : ${gm.Rank ? "OK" : "NG"}`);
    }

    banner(lines.join(" / "), "#3b82f6");
  }

  function bindCheckButtons() {
    const sagaInput = $("sagaInput");
    const newSoulBtn = $("newSoulBtn");
    const textRebornBtn = $("textRebornBtn");
    const soulTextInput = $("soulTextInput");

    if (!sagaInput || !newSoulBtn || !textRebornBtn || !soulTextInput) {
      banner("DOM不足：sagaInput/newSoulBtn/textRebornBtn/soulTextInput のどれかが見つかりません", "#ef4444");
      return;
    }

    // クリックが拾えてるか確認（必ず反応を出す）
    newSoulBtn.addEventListener("click", () => {
      banner("CLICK: 新たなソウルドールを見つける（JSがクリックを拾いました）", "#a855f7");

      try {
        const saga = (sagaInput.value || "").trim();
        if (!saga) {
          alert("サーガ名が空です（生存確認版）");
          return;
        }

        if (!window.TSP_STATE || typeof window.TSP_STATE.newSoulWindragon !== "function") {
          alert("TSP_STATE.newSoulWindragon が見つかりません（state.jsとの不一致）");
          return;
        }

        const s = window.TSP_STATE.newSoulWindragon(saga);
        alert("新規生成OK（生存確認版）\n種族名: " + safeStr(s?.speciesName) + "\nサーガ名: " + safeStr(s?.sagaName));
      } catch (e) {
        alert("新規生成で例外: " + safeStr(e?.message || e));
        throw e;
      }
    });

    textRebornBtn.addEventListener("click", () => {
      banner("CLICK: 記憶からリボーンする（JSがクリックを拾いました）", "#a855f7");

      try {
        const saga = (sagaInput.value || "").trim();
        if (!saga) {
          alert("サーガ名が空です（生存確認版）");
          return;
        }

        const code = (soulTextInput.value || "").trim();
        if (!code) {
          alert("記憶コードが空です（生存確認版）");
          return;
        }

        if (!window.TSP_STATE) {
          alert("TSP_STATE が見つかりません（state.jsが読めてない）");
          return;
        }

        const parseFn =
          (typeof window.TSP_STATE.parseSoulCode === "function") ? window.TSP_STATE.parseSoulCode : null;

        const matchFn =
          (typeof window.TSP_STATE.assertSagaMatch === "function") ? window.TSP_STATE.assertSagaMatch : null;

        if (!parseFn) {
          alert("TSP_STATE.parseSoulCode が見つかりません（state.jsとの不一致）");
          return;
        }
        if (!matchFn) {
          alert("TSP_STATE.assertSagaMatch が見つかりません（state.jsとの不一致）");
          return;
        }

        const parsed = parseFn(code);
        matchFn(parsed, saga);

        alert("記憶リボーンOK（生存確認版）\n種族名: " + safeStr(parsed?.speciesName) + "\nサーガ名: " + safeStr(parsed?.sagaName));
      } catch (e) {
        alert("記憶リボーンで例外: " + safeStr(e?.message || e));
        throw e;
      }
    });

    banner("イベント接続OK：新規/記憶ボタンのクリック監視中", "#10b981");
  }

  function boot() {
    reportDeps();
    bindCheckButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
