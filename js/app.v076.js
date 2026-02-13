/* =========================================================
 * app.v076.js  v0.76-stable (BOOT確実起動版)
 * 変更点：
 * - boot起動を window.addEventListener("load", boot); に固定
 *   → iPhone / Android / GitHub Pages 環境差での未起動防止
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  function must(id) {
    const el = $(id);
    if (!el) throw new Error(`DOM missing: #${id}`);
    return el;
  }

  function alertErr(where, e) {
    const msg = (e && (e.message || String(e))) || "unknown";
    alert(`エラー（${where}）\n${msg}`);
    console.error(where, e);
  }

  // ===== DOM refs =====
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;
  let sagaInput, soulTextInput, newSoulBtn, textRebornBtn;
  let tabBtns, tabEls;
  let envAttributeLabel, growthTimer, growthPreview, comebackBtn;
  let spriteViewport, spriteSheetLayer, spriteFxLayer;
  let scene;

  let tempSlider, humiditySlider, lightSlider;
  let tempValue, humidityValue, lightValue, lightLabel;
  let envPreviewLabel, neutralBtn, applyEnvBtn;

  let speciesName, nicknameInput, nicknameApplyBtn, legendzAttribute;
  let hpStat, magicStat, counterStat, strikeStat, healStat;
  let crystalList;

  // ===== State =====
  let soul = null;
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  let secondsAccum = 0;
  let lastRafMs = null;
  let uiLocked = false;

  const MONSTER = {
    id: "windragon",
    spritePath: "./assets/sprites/windragon.png",
    superBest: { temp: -45, hum: 5, waterDepth: 50 },
  };

  const SHEET = {
    frameW: 24,
    frameH: 32,
    scale: 3,
    frameToRC(i) {
      const idx = Math.max(1, Math.min(8, i)) - 1;
      return { r: Math.floor(idx / 4), c: idx % 4 };
    }
  };

  const WALK = {
    halfRangePx: 84,
    speedPxPerSec: 12,
    facing: "right",
    x: 0,
    stepTimer: 0,
    stepFrame: 1,
    turnTimer: 0
  };

  const IDLE = { timer: 0, frame: 1 };
  const superBestEmitter = { accum: 0 };

  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
  }

  function switchTab(key) {
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === key));
    Object.values(tabEls).forEach(el => el.classList.remove("active"));
    tabEls[key].classList.add("active");
  }

  function setHeader() {
    if (!soul) {
      headerLine1.textContent = "";
      headerLine2.textContent = "";
      headerLine3.textContent = "未リボーン";
      return;
    }
    headerLine1.textContent = `サーガ名：${soul.sagaName}`;
    headerLine2.textContent =
      `種族名：${soul.speciesName} / ニックネーム：${soul.nickname || "未登録"}`;
    headerLine3.textContent = "リボーン中";
  }

  function pipelineAfterReborn() {
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };

    show(mainView);
    switchTab("home");

    secondsAccum = 0;
    lastRafMs = null;
    setHeader();
  }

  function bindEvents() {

    newSoulBtn.addEventListener("click", () => {
      try {
        const saga = String(sagaInput.value || "").trim();
        if (!saga) return alert("サーガ名を入力してください");

        soul = window.TSP_STATE.newSoulWindragon(saga);
        pipelineAfterReborn();
      } catch (e) {
        alertErr("newReborn", e);
      }
    });

    textRebornBtn.addEventListener("click", () => {
      try {
        const saga = String(sagaInput.value || "").trim();
        if (!saga) return alert("サーガ名を入力してください");

        const code = String(soulTextInput.value || "").trim();
        if (!code) return alert("記憶が空です");

        const parsed = window.TSP_STATE.parseSoulCode(code);
        window.TSP_STATE.assertSagaMatch(parsed, saga);
        soul = parsed;
        pipelineAfterReborn();
      } catch (e) {
        alertErr("memoryReborn", e);
      }
    });

    comebackBtn.addEventListener("click", () => {
      try {
        const code = window.TSP_STATE.makeSoulCode(soul);
        alert("ソウルドールの記憶\n\n" + code);
      } catch (e) {
        alertErr("comeback", e);
      }
    });
  }

  function boot() {
    try {
      if (!window.TSP_STATE) throw new Error("TSP_STATE未読込");
      if (!window.TSP_GAME) throw new Error("TSP_GAME未読込");

      startView = must("startView");
      mainView = must("mainView");

      headerLine1 = must("headerLine1");
      headerLine2 = must("headerLine2");
      headerLine3 = must("headerLine3");

      sagaInput = must("sagaInput");
      soulTextInput = must("soulTextInput");
      newSoulBtn = must("newSoulBtn");
      textRebornBtn = must("textRebornBtn");

      tabBtns = qsa(".tab-btn");
      tabEls = {
        home: must("tab-home"),
        environment: must("tab-environment"),
        legendz: must("tab-legendz"),
        crystal: must("tab-crystal"),
      };

      comebackBtn = must("comebackBtn");

      show(startView);
      setHeader();

      bindEvents();

    } catch (e) {
      alertErr("boot", e);
    }
  }

  // ★ 確実起動
  window.addEventListener("load", boot);

})();
