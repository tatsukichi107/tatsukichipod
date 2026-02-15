/* =========================================================
   talispod / js/app.js
   ID固定（あなたの最新HTMLに完全一致）＆復旧版
   - リボーン系ID：sagaInput / soulTextInput / textRebornBtn / newSoulBtn
   - 未リボーン時：tabs + comebackBtn 非表示
   - 冒険中（3秒）オーバーレイ：JSでDOM生成して表示
   - スプライト拡大はCSS側を尊重（JSで小さく固定しない）
   - 歩行速度を落ち着かせる（30fps）
   - 左向きでも表情が消えないように反転は sheetLayer のみ
   - 環境表情＆演出（♪✨/ズーン）を app.js 側で再実装
   ========================================================= */
(function () {
  "use strict";

  // ---------- utils ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const id = (x) => document.getElementById(x);
  const isArr = Array.isArray;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => new Date();

  // ---------- DOM ----------
  const DOM = {
    // views
    startView: null,
    mainView: null,
    tabs: null,
    comebackBtn: null,

    // start view (fixed IDs)
    sagaInput: null,
    soulTextInput: null,
    textRebornBtn: null,
    newSoulBtn: null,

    // tabs
    tabBtns: [],
    tabPanels: [],

    // header lines (optional)
    headerLine1: null,
    headerLine2: null,
    headerLine3: null,

    // env controls
    tempSlider: null,
    humiditySlider: null,
    tempValue: null,
    humidityValue: null,
    lightLabel: null,
    lightValue: null,
    lightBtns: [],
    envPreviewLabel: null,
    applyEnvBtn: null,
    neutralBtn: null,

    // home
    envAttributeLabel: null,
    growthTimer: null,
    growthPreview: null,
    homeNeutralBtn: null,
    scene: null,

    // legendz
    speciesName: null,
    legendzAttribute: null,
    nicknameInput: null,
    nicknameApplyBtn: null,
    hpStat: null,
    magicStat: null,
    counterStat: null,
    strikeStat: null,
    healStat: null,
    skillSlots: null,

    // sprite
    spriteMover: null,
    spriteViewport: null,
    spriteSheetLayer: null,
    spriteFxLayer: null
  };

  function bindDom() {
    DOM.startView = id("startView");
    DOM.mainView = id("mainView");
    DOM.tabs = $("nav.tabs");
    DOM.comebackBtn = id("comebackBtn");

    // fixed (your latest HTML)
    DOM.sagaInput = id("sagaInput");
    DOM.soulTextInput = id("soulTextInput");
    DOM.textRebornBtn = id("textRebornBtn");
    DOM.newSoulBtn = id("newSoulBtn");

    DOM.tabBtns = $$(".tab-btn[data-tab]");
    DOM.tabPanels = $$(".tab-content[id^='tab-']");

    DOM.headerLine1 = id("headerLine1");
    DOM.headerLine2 = id("headerLine2");
    DOM.headerLine3 = id("headerLine3");

    DOM.tempSlider = id("tempSlider");
    DOM.humiditySlider = id("humiditySlider");
    DOM.tempValue = id("tempValue");
    DOM.humidityValue = id("humidityValue");
    DOM.lightLabel = id("lightLabel");
    DOM.lightValue = id("lightValue");
    DOM.lightBtns = $$(".light-btn[data-light]");
    DOM.envPreviewLabel = id("envPreviewLabel");
    DOM.applyEnvBtn = id("applyEnvBtn");
    DOM.neutralBtn = id("neutralBtn");

    DOM.envAttributeLabel = id("envAttributeLabel");
    DOM.growthTimer = id("growthTimer");
    DOM.growthPreview = id("growthPreview");
    DOM.homeNeutralBtn = id("homeNeutralBtn");
    DOM.scene = $(".scene");

    DOM.speciesName = id("speciesName");
    DOM.legendzAttribute = id("legendzAttribute");
    DOM.nicknameInput = id("nicknameInput");
    DOM.nicknameApplyBtn = id("nicknameApplyBtn");
    DOM.hpStat = id("hpStat");
    DOM.magicStat = id("magicStat");
    DOM.counterStat = id("counterStat");
    DOM.strikeStat = id("strikeStat");
    DOM.healStat = id("healStat");
    DOM.skillSlots = id("skillSlots");

    DOM.spriteMover = id("spriteMover");
    DOM.spriteViewport = id("spriteViewport");
    DOM.spriteSheetLayer = id("spriteSheetLayer");
    DOM.spriteFxLayer = id("spriteFxLayer");
  }

  // ---------- steps (fallback) ----------
  const FALLBACK_TEMP_STEPS = Object.freeze([
    -273,
    -45, -40, -35, -30, -25, -20, -15, -10, -5,
    0,
    5, 10, 15, 20, 25, 30, 35, 40, 45,
    999
  ]);
  const FALLBACK_HUM_STEPS = Object.freeze([
    0,
    5, 10, 15, 20, 25, 30, 35, 40, 45,
    50,
    55, 60, 65, 70, 75,
    80, 85,
    90, 95,
    99,
    100
  ]);
  const FALLBACK_LIGHT = Object.freeze([0, 50, 100]);

  function getSteps() {
    const G = window.TSP_GAME || {};
    const temp = (isArr(G.TEMP_STEPS) && G.TEMP_STEPS.length) ? G.TEMP_STEPS : FALLBACK_TEMP_STEPS;
    const hum  = (isArr(G.HUM_STEPS) && G.HUM_STEPS.length) ? G.HUM_STEPS : FALLBACK_HUM_STEPS;
    const light = (isArr(G.LIGHT_OPTIONS) && G.LIGHT_OPTIONS.length) ? G.LIGHT_OPTIONS : FALLBACK_LIGHT;
    return { temp, hum, light };
  }

  function nearestIndex(arr, v) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const d = Math.abs(Number(arr[i]) - Number(v));
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // ---------- storage ----------
  const LS_KEY = "TALISPOD_SOUL_V077";

  function loadSoul() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return obj;
    } catch (_) { return null; }
  }

  function saveSoul(soul) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(soul)); } catch (_) {}
  }

  function makeDefaultSoul() {
    return {
      sagaName: "",
      nickname: "",
      isReborn: false,

      legendzId: "windragon",
      speciesName: "ウインドラゴン",
      attribute: "TORNADO",

      baseStats: { hp: 400, magic: 60, counter: 100, strike: 60, heal: 20 },
      grow:      { hp: 0,   magic: 0,  counter: 0,   strike: 0,  heal: 0  },
      currentHp: 400,

      superBest: { temp: -45, hum: 5, light: 0 },

      wazaSlots: Array.from({ length: 15 }, (_, i) => ({ name: `ワザ${i + 1}` }))
    };
  }

  // ---------- soul code ----------
  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64urlDecode(b64url) {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return decodeURIComponent(escape(atob(b64 + pad)));
  }

  function encodeSoulCode(soul) {
    const pack = {
      v: 77,
      s: soul.sagaName || "",
      n: soul.nickname || "",
      id: soul.legendzId || "windragon",
      sp: soul.speciesName || "ウインドラゴン",
      a: soul.attribute || "TORNADO",
      b: soul.baseStats || {},
      g: soul.grow || {},
      ch: Number.isFinite(soul.currentHp) ? soul.currentHp : (soul.baseStats?.hp || 400),
      sb: soul.superBest || null,
      w: (isArr(soul.wazaSlots) ? soul.wazaSlots : []).map(x => x?.name || "")
    };
    return "SOUL:" + b64urlEncode(JSON.stringify(pack));
  }

  function decodeSoulCode(code) {
    try {
      const t = String(code || "").trim();
      if (!t.startsWith("SOUL:")) return null;
      const json = b64urlDecode(t.slice(5));
      const pack = JSON.parse(json);
      if (!pack || typeof pack !== "object") return null;

      const soul = makeDefaultSoul();
      soul.sagaName = pack.s || "";
      soul.nickname = pack.n || "";
      soul.legendzId = pack.id || "windragon";
      soul.speciesName = pack.sp || "ウインドラゴン";
      soul.attribute = pack.a || "TORNADO";
      soul.baseStats = pack.b || soul.baseStats;
      soul.grow = pack.g || soul.grow;
      soul.currentHp = Number.isFinite(pack.ch) ? pack.ch : (Number(soul.baseStats?.hp) || 400);
      soul.superBest = pack.sb || soul.superBest;

      const names = isArr(pack.w) ? pack.w : [];
      soul.wazaSlots = Array.from({ length: 15 }, (_, i) => ({ name: names[i] || `ワザ${i + 1}` }));

      soul.isReborn = true;
      return soul;
    } catch (_) { return null; }
  }

  // ---------- app state ----------
  const APP = {
    soul: null,

    envDraft: { temp: 0, hum: 50, light: 50 },
    envActive: { temp: 0, hum: 50, light: 50 },

    // animation
    animTimer: null,
    fxTimer: null,

    face: 1,
    frame: 0,

    walkX: 0,
    walkDir: 1,
    walkRange: 70,     // px around center
    stepPx: 0.8,       // slower than before
    turning: 0,        // frames for turn face

    // fx state
    fxMode: "NONE",
    fxFlash: 0
  };

  // ---------- toast ----------
  let toastTimer = null;
  function showMiniToast(text) {
    let el = id("tspToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tspToast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "86px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "12px";
      el.style.background = "rgba(0,0,0,0.78)";
      el.style.color = "#fff";
      el.style.fontSize = "14px";
      el.style.zIndex = "99999";
      el.style.maxWidth = "92vw";
      el.style.textAlign = "center";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = "1";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 1200);
  }

  // ---------- confirm modal (無属性) ----------
  function ensureConfirmModal() {
    let modal = id("tspConfirm");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "tspConfirm";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "rgba(0,0,0,0.55)";
    modal.style.zIndex = "100000";

    const card = document.createElement("div");
    card.style.width = "min(360px, 92vw)";
    card.style.borderRadius = "16px";
    card.style.background = "#141418";
    card.style.color = "#fff";
    card.style.padding = "16px";
    card.style.boxShadow = "0 12px 40px rgba(0,0,0,0.35)";

    const title = document.createElement("div");
    title.style.fontSize = "18px";
    title.style.fontWeight = "800";
    title.style.marginBottom = "12px";
    title.textContent = "ムゾクセイ？";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.justifyContent = "flex-end";

    const noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.textContent = "いいえ";
    noBtn.style.padding = "10px 14px";
    noBtn.style.borderRadius = "12px";
    noBtn.style.border = "1px solid rgba(255,255,255,0.16)";
    noBtn.style.background = "transparent";
    noBtn.style.color = "#fff";

    const yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.textContent = "はい";
    yesBtn.style.padding = "10px 14px";
    yesBtn.style.borderRadius = "12px";
    yesBtn.style.border = "0";
    yesBtn.style.background = "rgba(255,255,255,0.92)";
    yesBtn.style.color = "#111";

    row.appendChild(noBtn);
    row.appendChild(yesBtn);

    card.appendChild(title);
    card.appendChild(row);
    modal.appendChild(card);
    document.body.appendChild(modal);

    modal._noBtn = noBtn;
    modal._yesBtn = yesBtn;
    return modal;
  }

  function confirmNeutral(onYes) {
    const modal = ensureConfirmModal();
    modal.style.display = "flex";
    const close = () => { modal.style.display = "none"; };
    modal._noBtn.onclick = () => close();
    modal._yesBtn.onclick = () => { close(); onYes && onYes(); };
  }

  // ---------- adventure overlay (3s) ----------
  function ensureAdventureOverlay() {
    let ov = id("tspAdventureOverlay");
    if (ov) return ov;

    ov = document.createElement("div");
    ov.id = "tspAdventureOverlay";
    ov.style.position = "fixed";
    ov.style.inset = "0";
    ov.style.display = "none";
    ov.style.alignItems = "center";
    ov.style.justifyContent = "center";
    ov.style.background = "rgba(0,0,0,0.55)";
    ov.style.zIndex = "100001";
    ov.style.backdropFilter = "blur(2px)";
    ov.style.webkitBackdropFilter = "blur(2px)";

    const card = document.createElement("div");
    card.style.width = "min(360px, 92vw)";
    card.style.borderRadius = "18px";
    card.style.background = "#121216";
    card.style.color = "#fff";
    card.style.padding = "16px 18px";
    card.style.boxShadow = "0 12px 40px rgba(0,0,0,0.35)";
    card.style.textAlign = "center";

    const title = document.createElement("div");
    title.textContent = "冒険中…";
    title.style.fontSize = "18px";
    title.style.fontWeight = "900";
    title.style.marginBottom = "10px";

    const dots = document.createElement("div");
    dots.style.display = "flex";
    dots.style.justifyContent = "center";
    dots.style.gap = "8px";
    dots.style.margin = "10px 0 2px";

    function makeDot(delay) {
      const d = document.createElement("div");
      d.style.width = "10px";
      d.style.height = "10px";
      d.style.borderRadius = "999px";
      d.style.background = "rgba(255,255,255,0.9)";
      d.style.opacity = "0.35";
      d.style.animation = `tspDot 0.9s ${delay}s infinite ease-in-out`;
      return d;
    }
    dots.appendChild(makeDot(0));
    dots.appendChild(makeDot(0.15));
    dots.appendChild(makeDot(0.3));

    const note = document.createElement("div");
    note.textContent = "レジェンズを連れて環境へ…";
    note.style.marginTop = "10px";
    note.style.fontSize = "13px";
    note.style.color = "rgba(255,255,255,0.75)";

    card.appendChild(title);
    card.appendChild(dots);
    card.appendChild(note);
    ov.appendChild(card);
    document.body.appendChild(ov);

    // keyframes injected once
    if (!id("tspAnimStyle")) {
      const st = document.createElement("style");
      st.id = "tspAnimStyle";
      st.textContent = `
        @keyframes tspDot {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes tspFloatUp {
          0% { transform: translate3d(0,0,0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(var(--dx, 0px), var(--dy, -80px), 0) scale(var(--sc, 1)); opacity: 0; }
        }
        @keyframes tspFall {
          0% { transform: translate3d(var(--dx,0px), -20px, 0) scale(var(--sc,1)); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(var(--dx,0px), calc(100vh + 20px), 0) scale(var(--sc,1)); opacity: 0; }
        }
        @keyframes tspSwoon {
          0% { transform: translate3d(0,0,0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(var(--dx, 0px), 140px, 0); opacity: 0; }
        }
      `;
      document.head.appendChild(st);
    }

    return ov;
  }

  function showAdventure(ms = 3000) {
    const ov = ensureAdventureOverlay();
    ov.style.display = "flex";
    lockInputs(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        ov.style.display = "none";
        lockInputs(false);
        resolve();
      }, ms);
    });
  }

  function lockInputs(lock) {
    // Disable key controls (env apply etc.)
    const nodes = [
      DOM.applyEnvBtn, DOM.neutralBtn, DOM.homeNeutralBtn,
      ...DOM.lightBtns,
      DOM.tempSlider, DOM.humiditySlider,
      ...DOM.tabBtns,
      DOM.nicknameInput, DOM.nicknameApplyBtn
    ].filter(Boolean);

    nodes.forEach(n => {
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") {
        n.disabled = !!lock;
      } else {
        n.disabled = !!lock;
        n.style.pointerEvents = lock ? "none" : "";
        n.style.opacity = lock ? "0.7" : "";
      }
    });
  }

  // ---------- view control ----------
  function setView(isReborn) {
    if (!DOM.startView || !DOM.mainView) return;

    if (isReborn) {
      DOM.startView.classList.remove("active");
      DOM.mainView.classList.add("active");
      if (DOM.tabs) DOM.tabs.style.display = "flex";
      if (DOM.comebackBtn) DOM.comebackBtn.style.display = "inline-flex";
    } else {
      DOM.mainView.classList.remove("active");
      DOM.startView.classList.add("active");
      if (DOM.tabs) DOM.tabs.style.display = "none";
      if (DOM.comebackBtn) DOM.comebackBtn.style.display = "none";
    }
  }

  // ---------- tab control ----------
  function showTab(key) {
    DOM.tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === key));
    DOM.tabPanels.forEach(panel => panel.classList.toggle("active", panel.id === `tab-${key}`));

    if (key === "home") {
      startAnim();
      startFx();
    } else {
      stopAnim();
      stopFx();
    }
  }

  // ---------- env helpers ----------
  function setLightActive(v) {
    DOM.lightBtns.forEach(b => b.classList.toggle("active", Number(b.dataset.light) === Number(v)));
  }

  function updateDraftFromUI() {
    const { temp, hum } = getSteps();

    if (DOM.tempSlider) {
      const i = clamp(parseInt(DOM.tempSlider.value, 10) || 0, 0, temp.length - 1);
      APP.envDraft.temp = Number(temp[i]);
    }
    if (DOM.humiditySlider) {
      const i = clamp(parseInt(DOM.humiditySlider.value, 10) || 0, 0, hum.length - 1);
      APP.envDraft.hum = Number(hum[i]);
    }

    const act = DOM.lightBtns.find(b => b.classList.contains("active"));
    APP.envDraft.light = act ? Number(act.dataset.light) : 50;

    if (DOM.lightLabel) DOM.lightLabel.textContent = (APP.envDraft.hum === 100) ? "水深" : "光量";
    if (DOM.lightValue) DOM.lightValue.textContent = String(APP.envDraft.light);
  }

  function updateEnvLabels() {
    if (DOM.tempValue) DOM.tempValue.textContent = `${APP.envDraft.temp}℃`;
    if (DOM.humidityValue) DOM.humidityValue.textContent = `${APP.envDraft.hum}％`;
    if (DOM.lightLabel) DOM.lightLabel.textContent = (APP.envDraft.hum === 100) ? "水深" : "光量";
    if (DOM.lightValue) DOM.lightValue.textContent = String(APP.envDraft.light);
  }

  function updateEnvPreview() {
    if (!DOM.envPreviewLabel) return;
    const G = window.TSP_GAME;
    if (G && typeof G.previewAttribute === "function") {
      const p = G.previewAttribute(APP.envDraft, now());
      DOM.envPreviewLabel.textContent = (p && p.label) ? p.label : "無属性";
    } else {
      DOM.envPreviewLabel.textContent = "無属性";
    }
  }

  function initSliders() {
    const { temp, hum } = getSteps();
    if (DOM.tempSlider) {
      DOM.tempSlider.min = "0";
      DOM.tempSlider.max = String(Math.max(0, temp.length - 1));
      DOM.tempSlider.step = "1";
      DOM.tempSlider.value = String(nearestIndex(temp, APP.envDraft.temp));
    }
    if (DOM.humiditySlider) {
      DOM.humiditySlider.min = "0";
      DOM.humiditySlider.max = String(Math.max(0, hum.length - 1));
      DOM.humiditySlider.step = "1";
      DOM.humiditySlider.value = String(nearestIndex(hum, APP.envDraft.hum));
    }
    setLightActive(APP.envDraft.light);
    updateDraftFromUI();
    updateEnvLabels();
    updateEnvPreview();
  }

  async function applyEnvWithAdventure() {
    updateDraftFromUI();
    updateEnvLabels();
    updateEnvPreview();

    await showAdventure(3000);

    APP.envActive = { temp: APP.envDraft.temp, hum: APP.envDraft.hum, light: APP.envDraft.light };
    refreshHomeEnvLabel();
    showTab("home");
  }

  function setNeutralDraftOnly() {
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    initSliders();
    showMiniToast("無属性に戻したよ");
  }

  function setNeutralDraftAndActive() {
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };
    initSliders();
    refreshHomeEnvLabel();
    showMiniToast("無属性に戻したよ");
  }

  // ---------- home label ----------
  function refreshHomeEnvLabel() {
    if (!DOM.envAttributeLabel) return;

    const G = window.TSP_GAME;
    if (!G || typeof G.rankEnv !== "function" || !APP.soul) {
      DOM.envAttributeLabel.textContent = "無属性";
      if (DOM.growthTimer) DOM.growthTimer.textContent = "環境成長なし";
      return;
    }

    const info = G.rankEnv(APP.soul, APP.envActive, now()) || {};
    const label = info.rankKey === "NEUTRAL"
      ? "無属性"
      : (info.areaName || info.envAttrLabel || "未知");

    DOM.envAttributeLabel.textContent = label;
    if (DOM.growthTimer) DOM.growthTimer.textContent = (info.rankKey === "NEUTRAL") ? "環境成長なし" : "育成中";

    // scene highlight (inline minimal; do not fight CSS too much)
    if (DOM.scene) {
      // let CSS classes handle base colors; we only add subtle flash for ranks in FX loop
      DOM.scene.dataset.rank = info.rankKey || "NEUTRAL";
      DOM.scene.dataset.attr = info.envAttr || info.envAttrKey || "";
    }
  }

  // ---------- legendz UI ----------
  function renderHeaderLines() {
    // Header 3 lines:
    // 1) サーガ名
    // 2) 種族名 or ニックネーム
    // 3) リボーン状態
    if (!DOM.headerLine1 || !DOM.headerLine2 || !DOM.headerLine3) return;

    if (!APP.soul || !APP.soul.isReborn) {
      DOM.headerLine1.textContent = "";
      DOM.headerLine2.textContent = "";
      DOM.headerLine3.textContent = "";
      return;
    }

    const saga = APP.soul.sagaName || "-";
    const nickname = (APP.soul.nickname && String(APP.soul.nickname).trim()) ? String(APP.soul.nickname).trim() : "";
    const species = APP.soul.speciesName || "-";
    const line2 = nickname ? nickname : species;

    DOM.headerLine1.textContent = `サーガ名：${saga}`;
    DOM.headerLine2.textContent = nickname ? `ニックネーム：${line2}` : `ニックネーム：${species}`;
    DOM.headerLine3.textContent = "リボーン中";
  }

  function renderLegendz() {
    if (!APP.soul) return;

    renderHeaderLines();

    if (DOM.speciesName) DOM.speciesName.textContent = APP.soul.speciesName || "-";
    if (DOM.legendzAttribute) {
      const G = window.TSP_GAME;
      const label = (G && G.ATTR_LABEL && APP.soul.attribute && G.ATTR_LABEL[APP.soul.attribute])
        ? G.ATTR_LABEL[APP.soul.attribute]
        : (APP.soul.attribute || "-");
      DOM.legendzAttribute.textContent = label;
    }

    const base = APP.soul.baseStats || {};
    const grow = APP.soul.grow || {};
    const maxHp = Number(base.hp || 0) + Number(grow.hp || 0);
    const curHp = Number.isFinite(APP.soul.currentHp) ? APP.soul.currentHp : Number(base.hp || 0);

    if (DOM.hpStat) DOM.hpStat.textContent = `${curHp}/${maxHp}`;
    if (DOM.magicStat) DOM.magicStat.textContent = String(Number(base.magic || 0) + Number(grow.magic || 0));
    if (DOM.counterStat) DOM.counterStat.textContent = String(Number(base.counter || 0) + Number(grow.counter || 0));
    if (DOM.strikeStat) DOM.strikeStat.textContent = String(Number(base.strike || 0) + Number(grow.strike || 0));
    if (DOM.healStat) DOM.healStat.textContent = String(Number(base.heal || 0) + Number(grow.heal || 0));

    if (DOM.nicknameInput) DOM.nicknameInput.value = APP.soul.nickname || "";

    if (DOM.skillSlots) {
      const slots = isArr(APP.soul.wazaSlots) ? APP.soul.wazaSlots : [];
      DOM.skillSlots.innerHTML = "";
      for (let i = 0; i < 15; i++) {
        const name = slots[i]?.name || `ワザ${i + 1}`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skill-slot";
        btn.textContent = name;

        // 試し撃ち：ブラウザ標準ダイアログを避ける（チェックボックス問題対策）
        btn.addEventListener("click", () => showMiniToast(`試し撃ち：${name}`));

        DOM.skillSlots.appendChild(btn);
      }
    }
  }

  // ---------- sprite helpers ----------
  function spriteUrl() {
    const idv = APP.soul?.legendzId || "windragon";
    return `assets/sprites/${idv}.png`;
  }

  function ensureSpriteBase() {
    if (!DOM.spriteViewport || !DOM.spriteSheetLayer) return;

    // DO NOT force scale/size here (CSS may upscale).
    // We only ensure the viewport clips properly and sheet is set.
    DOM.spriteViewport.style.overflow = "hidden";
    DOM.spriteViewport.style.borderRadius = "0";

    DOM.spriteSheetLayer.style.backgroundImage = `url("${spriteUrl()}")`;
    DOM.spriteSheetLayer.style.backgroundRepeat = "no-repeat";
    DOM.spriteSheetLayer.style.backgroundSize = "96px 64px";
    DOM.spriteSheetLayer.style.imageRendering = "pixelated";
    DOM.spriteSheetLayer.style.transformOrigin = "top left";
    DOM.spriteSheetLayer.style.willChange = "transform, background-position";
  }

  function setFace(face, moveDir) {
    const f = clamp(face, 1, 8);
    APP.face = f;
    if (!DOM.spriteSheetLayer) return;

    const idx = f - 1;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = col * 24;
    const y = row * 32;

    DOM.spriteSheetLayer.style.backgroundPosition = `-${x}px -${y}px`;

    // IMPORTANT:
    // All sheets are LEFT-facing.
    // Right movement => normal (no flip), Left movement => flip.
    // Apply flip only to sheetLayer, so CSS scaling on parent remains intact.
    const needFlip = (moveDir < 0); // walking left: show mirrored to face left? (sheets are left-facing)
    // Actually: sheet is left-facing. When moving RIGHT, we need to face right => flip.
    const flip = (moveDir > 0) ? -1 : 1;

    DOM.spriteSheetLayer.style.transform = `scaleX(${flip})`;
  }

  function placeSprite() {
    const mover = DOM.spriteMover;
    if (!mover) return;
    mover.style.transform = `translateX(${APP.walkX}px)`;
  }

  // ---------- env rank (from game.js if available) ----------
  function rankInfo() {
    const G = window.TSP_GAME;
    if (!G || typeof G.rankEnv !== "function" || !APP.soul) {
      return { rankKey: "NEUTRAL", envAttrLabel: "無属性" };
    }
    const info = G.rankEnv(APP.soul, APP.envActive, now()) || {};
    if (!info.rankKey) info.rankKey = "NEUTRAL";
    return info;
  }

  // normalize to v0.7+ names
  function rankKeyNormalized(k) {
    const key = String(k || "").toUpperCase();
    // accept both old and new
    if (key === "SUPER_BEST") return "SUPER_BEST";
    if (key === "BEST") return "BEST";
    if (key === "GOOD") return "GOOD";
    if (key === "NORMAL") return "NORMAL";
    if (key === "WORST") return "WORST";
    if (key === "NEUTRAL") return "NEUTRAL";

    // some code paths might return Japanese-ish keys
    if (key.includes("SUPER")) return "SUPER_BEST";
    if (key.includes("BEST")) return "BEST";
    if (key.includes("GOOD")) return "GOOD";
    if (key.includes("NORMAL")) return "NORMAL";
    if (key.includes("WORST")) return "WORST";

    return "NEUTRAL";
  }

  // ---------- animation ----------
  function stopAnim() {
    if (APP.animTimer) {
      clearInterval(APP.animTimer);
      APP.animTimer = null;
    }
  }

  function startAnim() {
    stopAnim();
    if (!DOM.spriteViewport || !DOM.spriteSheetLayer) return;

    ensureSpriteBase();

    APP.walkX = 0;
    APP.walkDir = 1;
    APP.frame = 0;
    APP.turning = 0;

    // 30fps for calmer feel
    APP.animTimer = setInterval(() => {
      const info = rankInfo();
      const r = rankKeyNormalized(info.rankKey);

      if (r === "WORST") {
        // down
        setFace(8, APP.walkDir);
        APP.walkX = 0;
      } else if (r === "SUPER_BEST" || r === "BEST") {
        // joy fixed
        setFace(7, APP.walkDir);
        APP.walkX = 0;
      } else if (r === "GOOD") {
        // good: idle face 1/2 and light notes (fx handles)
        setFace((Math.floor(APP.frame / 15) % 2) ? 2 : 1, 1);
        APP.walkX = 0;
      } else if (r === "NORMAL") {
        // normal: idle face 1/2
        setFace((Math.floor(APP.frame / 15) % 2) ? 2 : 1, 1);
        APP.walkX = 0;
      } else {
        // NEUTRAL walking: add turn face at bounce
        if (APP.turning > 0) {
          setFace(3, APP.walkDir);
          APP.turning--;
        } else {
          setFace((Math.floor(APP.frame / 15) % 2) ? 2 : 1, APP.walkDir);
        }

        APP.walkX += APP.walkDir * APP.stepPx;

        if (APP.walkX >= APP.walkRange) {
          APP.walkX = APP.walkRange;
          APP.walkDir = -1;
          APP.turning = 15; // 0.5s at 30fps
        } else if (APP.walkX <= -APP.walkRange) {
          APP.walkX = -APP.walkRange;
          APP.walkDir = 1;
          APP.turning = 15;
        }
      }

      placeSprite();
      APP.frame++;
    }, 1000 / 30);
  }

  // ---------- FX (♪✨ / ズーン) ----------
  function stopFx() {
    if (APP.fxTimer) {
      clearInterval(APP.fxTimer);
      APP.fxTimer = null;
    }
    APP.fxMode = "NONE";
    APP.fxFlash = 0;
    clearSceneInlineFx();
    clearFxLayer();
  }

  function clearFxLayer() {
    if (!DOM.spriteFxLayer) return;
    DOM.spriteFxLayer.innerHTML = "";
  }

  function clearSceneInlineFx() {
    if (!DOM.scene) return;
    DOM.scene.style.filter = "";
    DOM.scene.style.boxShadow = "";
    DOM.scene.style.backgroundImage = "";
  }

  function spawnFxSymbol(symbol, mode) {
    // mode: "float" (around legendz) or "fall" (screen rain) or "swoon"
    const root = document.body; // screen-wide (more impact)
    const el = document.createElement("div");
    el.textContent = symbol;

    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.zIndex = "9999";
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.fontWeight = "900";
    el.style.textShadow = "0 2px 10px rgba(0,0,0,0.25)";

    const size = mode === "swoon" ? (18 + Math.random() * 10) : (16 + Math.random() * 18);
    el.style.fontSize = `${size}px`;

    const vw = Math.max(320, window.innerWidth || 320);
    const vh = Math.max(480, window.innerHeight || 480);

    if (mode === "fall") {
      const x = Math.random() * vw;
      el.style.left = `${x}px`;
      el.style.top = `-30px`;
      el.style.opacity = "0";
      el.style.setProperty("--dx", `${(Math.random() * 40 - 20).toFixed(0)}px`);
      el.style.setProperty("--sc", `${(0.8 + Math.random() * 1.2).toFixed(2)}`);
      el.style.animation = `tspFall ${ (2.2 + Math.random() * 1.6).toFixed(2) }s linear`;
    } else if (mode === "swoon") {
      // bottom-ish and drop with gloom
      const x = vw * (0.2 + Math.random() * 0.6);
      const y = vh * (0.35 + Math.random() * 0.2);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = "0";
      el.style.setProperty("--dx", `${(Math.random() * 40 - 20).toFixed(0)}px`);
      el.style.animation = `tspSwoon ${ (1.6 + Math.random() * 0.8).toFixed(2) }s ease-out`;
    } else {
      // float around the legendz area (approx: around center above tabs)
      const baseX = vw / 2;
      const baseY = vh * 0.42;
      const x = baseX + (Math.random() * 180 - 90);
      const y = baseY + (Math.random() * 140 - 70);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = "0";
      el.style.setProperty("--dx", `${(Math.random() * 120 - 60).toFixed(0)}px`);
      el.style.setProperty("--dy", `${(-80 - Math.random() * 120).toFixed(0)}px`);
      el.style.setProperty("--sc", `${(0.8 + Math.random() * 1.2).toFixed(2)}`);
      el.style.animation = `tspFloatUp ${ (1.4 + Math.random() * 1.0).toFixed(2) }s ease-out`;
    }

    root.appendChild(el);
    el.addEventListener("animationend", () => {
      try { el.remove(); } catch (_) {}
    });
  }

  function updateSceneFlash(rank) {
    if (!DOM.scene) return;

    // gentle base effects; we keep it inline so it works even if CSS side changed.
    if (rank === "SUPER_BEST") {
      // flashy: intermittent glow + subtle rainbow-ish sheen
      APP.fxFlash = (APP.fxFlash + 1) % 12;
      const on = APP.fxFlash < 6;
      DOM.scene.style.filter = on ? "brightness(1.15) saturate(1.25)" : "brightness(1.05) saturate(1.12)";
      DOM.scene.style.boxShadow = on ? "0 0 0 2px rgba(255,255,255,0.22), 0 0 32px rgba(255,255,255,0.18)" : "";
      DOM.scene.style.backgroundImage = "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.14), transparent 45%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.10), transparent 50%)";
    } else if (rank === "BEST") {
      APP.fxFlash = (APP.fxFlash + 1) % 18;
      const on = APP.fxFlash < 8;
      DOM.scene.style.filter = on ? "brightness(1.10) saturate(1.18)" : "brightness(1.03) saturate(1.08)";
      DOM.scene.style.boxShadow = on ? "0 0 0 2px rgba(255,255,255,0.16), 0 0 22px rgba(255,255,255,0.12)" : "";
      DOM.scene.style.backgroundImage = "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.10), transparent 48%), radial-gradient(circle at 70% 75%, rgba(255,255,255,0.08), transparent 55%)";
    } else if (rank === "GOOD") {
      DOM.scene.style.filter = "brightness(1.03) saturate(1.06)";
      DOM.scene.style.boxShadow = "";
      DOM.scene.style.backgroundImage = "";
    } else if (rank === "WORST") {
      DOM.scene.style.filter = "brightness(0.78) saturate(0.9)";
      DOM.scene.style.boxShadow = "inset 0 0 0 999px rgba(0,0,0,0.20)";
      DOM.scene.style.backgroundImage = "";
    } else {
      DOM.scene.style.filter = "";
      DOM.scene.style.boxShadow = "";
      DOM.scene.style.backgroundImage = "";
    }
  }

  function startFx() {
    stopFx();
    // 6~10fps-ish tick for effects
    APP.fxTimer = setInterval(() => {
      const info = rankInfo();
      const rank = rankKeyNormalized(info.rankKey);
      updateSceneFlash(rank);

      if (rank === "SUPER_BEST") {
        // screen-filling celebration
        for (let i = 0; i < 2; i++) spawnFxSymbol("♪", "fall");
        for (let i = 0; i < 2; i++) spawnFxSymbol("✨", "float");
        if (Math.random() < 0.25) spawnFxSymbol("✨", "fall");
      } else if (rank === "BEST") {
        // notes raining, sparkle background
        for (let i = 0; i < 2; i++) spawnFxSymbol("♪", "fall");
        if (Math.random() < 0.35) spawnFxSymbol("♪", "float");
      } else if (rank === "GOOD") {
        // light notes around
        if (Math.random() < 0.35) spawnFxSymbol("♪", "float");
      } else if (rank === "WORST") {
        // gloom
        if (Math.random() < 0.25) spawnFxSymbol("ズーン", "swoon");
      }
    }, 140);
  }

  // ---------- reborn flows ----------
  function rebornNew() {
    const saga = DOM.sagaInput ? String(DOM.sagaInput.value || "").trim() : "";
    if (!saga) { showMiniToast("サーガ名を入力してね"); return; }

    const soul = makeDefaultSoul();
    soul.sagaName = saga;
    soul.nickname = "";
    soul.isReborn = true;

    APP.soul = soul;
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };

    saveSoul(APP.soul);

    setView(true);
    showTab("home");
    initSliders();
    refreshHomeEnvLabel();
    renderLegendz();
  }

  function rebornFromMemory() {
    const saga = DOM.sagaInput ? String(DOM.sagaInput.value || "").trim() : "";
    const code = DOM.soulTextInput ? String(DOM.soulTextInput.value || "").trim() : "";
    if (!saga) { showMiniToast("サーガ名を入力してね"); return; }
    if (!code) { showMiniToast("記憶を貼ってね"); return; }

    const soul = decodeSoulCode(code);
    if (!soul) { showMiniToast("記憶が空です / 不正です"); return; }
    if (soul.sagaName !== saga) { showMiniToast("リボーン失敗（サーガ名が一致しません）"); return; }

    APP.soul = soul;
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };

    const maxHp = Number(APP.soul.baseStats?.hp || 400) + Number(APP.soul.grow?.hp || 0);
    if (!Number.isFinite(APP.soul.currentHp)) APP.soul.currentHp = maxHp;

    saveSoul(APP.soul);

    setView(true);
    showTab("home");
    initSliders();
    refreshHomeEnvLabel();
    renderLegendz();
  }

  // ---------- events ----------
  function wireEvents() {
    // start view
    if (DOM.newSoulBtn) DOM.newSoulBtn.addEventListener("click", rebornNew);
    if (DOM.textRebornBtn) DOM.textRebornBtn.addEventListener("click", rebornFromMemory);

    // tabs
    DOM.tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.tab;
        if (!key) return;
        showTab(key);
      });
    });

    // sliders
    if (DOM.tempSlider) {
      DOM.tempSlider.addEventListener("input", () => {
        updateDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    }
    if (DOM.humiditySlider) {
      DOM.humiditySlider.addEventListener("input", () => {
        updateDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    }

    // light buttons
    DOM.lightBtns.forEach(b => {
      b.addEventListener("click", () => {
        setLightActive(Number(b.dataset.light));
        updateDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    });

    // env apply -> adventure overlay -> apply -> home
    if (DOM.applyEnvBtn) {
      DOM.applyEnvBtn.addEventListener("click", () => {
        applyEnvWithAdventure();
      });
    }

    // env neutral draft only
    if (DOM.neutralBtn) {
      DOM.neutralBtn.addEventListener("click", () => {
        setNeutralDraftOnly();
      });
    }

    // home neutral confirm -> also reset env tab values
    if (DOM.homeNeutralBtn) {
      DOM.homeNeutralBtn.addEventListener("click", () => {
        confirmNeutral(() => {
          setNeutralDraftAndActive();
        });
      });
    }

    // nickname
    if (DOM.nicknameApplyBtn) {
      DOM.nicknameApplyBtn.addEventListener("click", () => {
        if (!APP.soul) return;
        const v = DOM.nicknameInput ? String(DOM.nicknameInput.value || "") : "";
        APP.soul.nickname = v;
        saveSoul(APP.soul);
        showMiniToast("ニックネーム変更OK");
        renderLegendz();
      });
    }

    // comeback button behavior is handled elsewhere (state/game etc.) — we only show/hide via setView()
  }

  // ---------- boot ----------
  function boot() {
    bindDom();
    ensureAdventureOverlay(); // create once for later

    if (!DOM.startView || !DOM.mainView) return;

    // load soul
    APP.soul = loadSoul();

    if (APP.soul && APP.soul.isReborn) {
      setView(true);
      APP.envDraft = { temp: 0, hum: 50, light: 50 };
      APP.envActive = { temp: 0, hum: 50, light: 50 };

      initSliders();
      showTab("home");
      refreshHomeEnvLabel();
      renderLegendz();
    } else {
      setView(false);
      stopAnim();
      stopFx();
      renderHeaderLines();
    }

    wireEvents();

    // gentle retry for late-loaded TSP_GAME
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (DOM.mainView && DOM.mainView.classList.contains("active")) {
        initSliders();
        refreshHomeEnvLabel();
        renderLegendz();
        startAnim();
        startFx();
      }
      if (tries >= 10) clearInterval(t);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // expose minimal debug helpers (non-breaking)
  window.TSP_APP = window.TSP_APP || {};
  window.TSP_APP.getSoulCode = () => (APP.soul ? encodeSoulCode(APP.soul) : "");
  window.TSP_APP.getEnv = () => ({ draft: { ...APP.envDraft }, active: { ...APP.envActive } });
})();
