/* =========================================================
   TalisPod app.js（DOM一致版）
   - startView / mainView の表示切替
   - nav.tabs を未リボーン時に非表示
   - タブ：.tab-btn[data-tab] → #tab-{key} を active 切替
   - スライダー：TSP_GAME.TEMP_STEPS/HUM_STEPS を優先、無ければfallback
   - リボーン：新規 / 記憶から
   - 環境：下書き(draft)→決定(apply)（3.2秒後に反映＆ホームへ）
   - 無属性：環境タブは即戻す / ホームは確認ダイアログ「ムゾクセイ？」
   - スプライト：24x32切り抜き、表情番号の座標固定、移動方向で反転
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

    // start (unreborn)
    sagaNameInput: null,
    memoryCodeInput: null,
    btnFindNewSoul: null,
    btnRebornFromMemory: null,

    // tabs buttons
    tabBtns: [],
    tabPanels: [],

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
    neutralBtn: null, // env tab: 無属性に戻す（即）

    // home
    envAttributeLabel: null,
    growthTimer: null,
    growthPreview: null,
    homeNeutralBtn: null, // home: 無属性環境にする（確認）

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

    DOM.sagaNameInput = id("sagaNameInput");
    DOM.memoryCodeInput = id("memoryCodeInput");
    DOM.btnFindNewSoul = id("btnFindNewSoul");
    DOM.btnRebornFromMemory = id("btnRebornFromMemory");

    DOM.tabBtns = $$(".tab-btn[data-tab]");
    DOM.tabPanels = $$(".tab-content[id^='tab-']");

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

  // ---------- fallback steps ----------
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
    } catch (_) {
      return null;
    }
  }

  function saveSoul(soul) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(soul));
    } catch (_) {}
  }

  function makeDefaultSoul() {
    return {
      sagaName: "",
      nickname: "",                 // 新規は未登録
      isReborn: false,

      legendzId: "windragon",
      speciesName: "ウインドラゴン",
      attribute: "TORNADO",

      baseStats: { hp: 400, magic: 60, counter: 100, strike: 60, heal: 20 },
      grow:      { hp: 0,   magic: 0,  counter: 0,   strike: 0,  heal: 0  },
      currentHp: 400,

      // 超ベスト（暫定：-45/5、光は陸上では無視扱いでもOK）
      superBest: { temp: -45, hum: 5, light: 0 },

      // 仮スロット（名前だけ保存）
      wazaSlots: Array.from({ length: 15 }, (_, i) => ({ name: `ワザ${i + 1}` }))
    };
  }

  // ---------- soul code (SOUL: base64url) ----------
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
    } catch (_) {
      return null;
    }
  }

  // ---------- app state ----------
  const APP = {
    soul: null,

    envDraft: { temp: 0, hum: 50, light: 50 },
    envActive: { temp: 0, hum: 50, light: 50 },

    // sprite anim
    animTimer: null,
    face: 1,
    walkX: 0,
    walkDir: 1,
    walkRange: 70,
    // pace
    stepPx: 1.9,
    frame: 0,
    turning: 0
  };

  // ---------- view control ----------
  function setView(isReborn) {
    if (!DOM.startView || !DOM.mainView) return;

    if (isReborn) {
      DOM.startView.classList.remove("active");
      DOM.mainView.classList.add("active");
      if (DOM.tabs) DOM.tabs.style.display = "flex";
      // start view には触れる要素があっても良いが、表示は切る
    } else {
      DOM.mainView.classList.remove("active");
      DOM.startView.classList.add("active");
      if (DOM.tabs) DOM.tabs.style.display = "none";
    }
  }

  // ---------- tab control ----------
  function showTab(key) {
    // buttons
    DOM.tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === key);
    });
    // panels
    DOM.tabPanels.forEach(panel => {
      const idv = panel.id || "";
      const matches = idv === `tab-${key}`;
      panel.classList.toggle("active", matches);
    });

    // anim control
    if (key === "home") startAnim();
    else stopAnim();
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

    // light from active button
    const act = DOM.lightBtns.find(b => b.classList.contains("active"));
    APP.envDraft.light = act ? Number(act.dataset.light) : (Number.isFinite(APP.envDraft.light) ? APP.envDraft.light : 50);

    // water: hum=100 → label water depth
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
      // fallback: hum==100 → ストーム / else 無属性
      DOM.envPreviewLabel.textContent = (APP.envDraft.hum === 100) ? "ストーム" : "無属性";
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

    // light buttons default
    setLightActive(APP.envDraft.light);
    updateDraftFromUI();
    updateEnvLabels();
    updateEnvPreview();
  }

  function applyEnv() {
    APP.envActive = { temp: APP.envDraft.temp, hum: APP.envDraft.hum, light: APP.envDraft.light };
    refreshHomeEnvLabel();
    startAnim();
  }

  function setNeutralDraftAndActive() {
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };
    initSliders();
    refreshHomeEnvLabel();
    startAnim();
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

    const info = G.rankEnv(APP.soul, APP.envActive, now());

    // ここは「エリア名表示」に寄せる（エリアが無い場合は属性名）
    const label = info.rankKey === "NEUTRAL"
      ? "無属性"
      : (info.areaName || info.envAttrLabel || "未知");

    DOM.envAttributeLabel.textContent = label;

    // 育成タイマー表記（本格育成は別ロジックがある想定なので、ここでは最低限）
    if (DOM.growthTimer) {
      DOM.growthTimer.textContent = (info.rankKey === "NEUTRAL") ? "環境成長なし" : "育成中";
    }
  }

  // ---------- legendz UI ----------
  function renderLegendz() {
    if (!APP.soul) return;

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

    if (DOM.nicknameInput) {
      DOM.nicknameInput.value = APP.soul.nickname || "";
    }

    // waza slots
    if (DOM.skillSlots) {
      const slots = isArr(APP.soul.wazaSlots) ? APP.soul.wazaSlots : [];
      DOM.skillSlots.innerHTML = "";
      for (let i = 0; i < 15; i++) {
        const name = slots[i]?.name || `ワザ${i + 1}`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skill-slot";
        btn.textContent = name;

        // 「試し撃ち」復活（alertは使わない）
        btn.addEventListener("click", () => {
          showMiniToast(`試し撃ち：${name}`);
        });

        DOM.skillSlots.appendChild(btn);
      }
    }
  }

  // ---------- mini toast (no native alert) ----------
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
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, 1200);
  }

  // ---------- confirm modal (home neutral) ----------
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
    title.id = "tspConfirmTitle";
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
    modal._yesBtn.onclick = () => {
      close();
      onYes && onYes();
    };
  }

  // ---------- sprite ----------
  function spriteUrl() {
    const idv = APP.soul?.legendzId || "windragon";
    return `assets/sprites/${idv}.png`;
  }

  function ensureSpriteBase() {
    if (!DOM.spriteViewport || !DOM.spriteSheetLayer) return;

    // viewport: MUST clip
    DOM.spriteViewport.style.width = "24px";
    DOM.spriteViewport.style.height = "32px";
    DOM.spriteViewport.style.overflow = "hidden";
    DOM.spriteViewport.style.borderRadius = "0"; // 角丸OFF

    // sheet layer
    DOM.spriteSheetLayer.style.width = "96px";
    DOM.spriteSheetLayer.style.height = "64px";
    DOM.spriteSheetLayer.style.backgroundImage = `url("${spriteUrl()}")`;
    DOM.spriteSheetLayer.style.backgroundRepeat = "no-repeat";
    DOM.spriteSheetLayer.style.backgroundSize = "96px 64px";
    DOM.spriteSheetLayer.style.imageRendering = "pixelated";
    DOM.spriteSheetLayer.style.transformOrigin = "top left";
  }

  function setFace(face, moveDir) {
    // face: 1..8
    const f = clamp(face, 1, 8);
    APP.face = f;

    if (!DOM.spriteSheetLayer) return;

    const idx = f - 1;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = col * 24;
    const y = row * 32;

    DOM.spriteSheetLayer.style.backgroundPosition = `-${x}px -${y}px`;

    // sheets are LEFT-facing
    // moving RIGHT => flip to face right
    // moving LEFT  => normal (face left)
    const flip = moveDir > 0 ? -1 : 1;
    DOM.spriteSheetLayer.style.transform = `scaleX(${flip})`;
  }

  function placeSprite() {
    const mover = DOM.spriteMover;
    if (!mover) return;
    mover.style.transform = `translateX(${APP.walkX}px)`;
  }

  function stopAnim() {
    if (APP.animTimer) {
      clearInterval(APP.animTimer);
      APP.animTimer = null;
    }
  }

  function currentRank() {
    const G = window.TSP_GAME;
    if (!G || typeof G.rankEnv !== "function" || !APP.soul) {
      return { rankKey: "NEUTRAL", rankLabel: "無属性環境" };
    }
    return G.rankEnv(APP.soul, APP.envActive, now());
  }

  function startAnim() {
    stopAnim();
    if (!DOM.spriteViewport || !DOM.spriteSheetLayer) return;

    ensureSpriteBase();

    APP.walkX = 0;
    APP.walkDir = 1;
    APP.frame = 0;
    APP.turning = 0;

    APP.animTimer = setInterval(() => {
      const r = currentRank();

      // 表情決定
      if (r.rankKey === "WORST") {
        // 最悪：ダウン
        setFace(8, APP.walkDir);
        APP.walkX = 0;
      } else if (r.rankKey === "SUPER_BEST" || r.rankKey === "BEST") {
        // ベスト以上：喜び（演出はCSS/FX側）
        setFace(7, APP.walkDir);
        APP.walkX = 0;
      } else if (r.rankKey === "NEUTRAL") {
        // 無属性：歩行＋折返しで振り向き
        if (APP.turning > 0) {
          setFace(3, APP.walkDir);
          APP.turning--;
        } else {
          setFace((Math.floor(APP.frame / 30) % 2) ? 2 : 1, APP.walkDir);
        }

        APP.walkX += APP.walkDir * APP.stepPx;

        if (APP.walkX >= APP.walkRange) {
          APP.walkX = APP.walkRange;
          APP.walkDir = -1;
          APP.turning = 30; // 0.5秒
        } else if (APP.walkX <= -APP.walkRange) {
          APP.walkX = -APP.walkRange;
          APP.walkDir = 1;
          APP.turning = 30;
        }
      } else {
        // 良好/普通：その場で 1/2
        setFace((Math.floor(APP.frame / 30) % 2) ? 2 : 1, 1);
        APP.walkX = 0;
      }

      placeSprite();
      APP.frame++;
    }, 1000 / 60);
  }

  // ---------- reborn flows ----------
  function rebornNew() {
    const saga = DOM.sagaNameInput ? String(DOM.sagaNameInput.value || "").trim() : "";
    if (!saga) {
      showMiniToast("サーガ名を入力してね");
      return;
    }
    const soul = makeDefaultSoul();
    soul.sagaName = saga;
    soul.nickname = "";       // 未登録
    soul.isReborn = true;

    APP.soul = soul;

    // 起動時は無属性固定
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };

    saveSoul(APP.soul);

    setView(true);
    showTab("home");
    initSliders();
    refreshHomeEnvLabel();
    renderLegendz();
    startAnim();
  }

  function rebornFromMemory() {
    const saga = DOM.sagaNameInput ? String(DOM.sagaNameInput.value || "").trim() : "";
    const code = DOM.memoryCodeInput ? String(DOM.memoryCodeInput.value || "").trim() : "";
    if (!saga) {
      showMiniToast("サーガ名を入力してね");
      return;
    }
    if (!code) {
      showMiniToast("記憶コードを貼ってね");
      return;
    }

    const soul = decodeSoulCode(code);
    if (!soul) {
      showMiniToast("記憶が空です / 不正です");
      return;
    }
    if (soul.sagaName !== saga) {
      showMiniToast("リボーン失敗（サーガ名が一致しません）");
      return;
    }

    // 環境は保存しない＝無属性に戻す
    APP.soul = soul;
    APP.envDraft = { temp: 0, hum: 50, light: 50 };
    APP.envActive = { temp: 0, hum: 50, light: 50 };

    // HP補完
    const maxHp = Number(APP.soul.baseStats?.hp || 400) + Number(APP.soul.grow?.hp || 0);
    if (!Number.isFinite(APP.soul.currentHp)) APP.soul.currentHp = maxHp;

    saveSoul(APP.soul);

    setView(true);
    showTab("home");
    initSliders();
    refreshHomeEnvLabel();
    renderLegendz();
    startAnim();
  }

  // ---------- events ----------
  function wireEvents() {
    // start buttons
    if (DOM.btnFindNewSoul) DOM.btnFindNewSoul.addEventListener("click", rebornNew);
    if (DOM.btnRebornFromMemory) DOM.btnRebornFromMemory.addEventListener("click", rebornFromMemory);

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

    // env apply (3.2 sec adventure)
    if (DOM.applyEnvBtn) {
      DOM.applyEnvBtn.addEventListener("click", () => {
        // 先にdraft確定
        updateDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();

        // 3.2秒後に反映＆ホームへ
        setTimeout(() => {
          applyEnv();
          showTab("home");
        }, 3200);
      });
    }

    // env neutral (instant reset draft only)
    if (DOM.neutralBtn) {
      DOM.neutralBtn.addEventListener("click", () => {
        APP.envDraft = { temp: 0, hum: 50, light: 50 };
        initSliders();
        showMiniToast("無属性に戻したよ");
      });
    }

    // home neutral (confirm, and also reset env tab sliders)
    if (DOM.homeNeutralBtn) {
      DOM.homeNeutralBtn.addEventListener("click", () => {
        confirmNeutral(() => {
          setNeutralDraftAndActive();
          showMiniToast("無属性に戻したよ");
        });
      });
    }

    // nickname apply
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
  }

  // ---------- boot ----------
  function boot() {
    bindDom();

    // 必須DOMが無い場合でも落とさない（ただし表示は難しい）
    if (!DOM.startView || !DOM.mainView) return;

    APP.soul = loadSoul();

    if (APP.soul && APP.soul.isReborn) {
      setView(true);
      // 環境は常に無属性で開始（仕様）
      APP.envDraft = { temp: 0, hum: 50, light: 50 };
      APP.envActive = { temp: 0, hum: 50, light: 50 };

      initSliders();
      showTab("home");
      refreshHomeEnvLabel();
      renderLegendz();
      startAnim();
    } else {
      setView(false);
      stopAnim();
      // 未リボーン時：tabsは必ず消す
      if (DOM.tabs) DOM.tabs.style.display = "none";
    }

    wireEvents();

    // game.jsが遅れて完成する環境でも、スライダーだけ後追いできるように軽く再初期化
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (DOM.mainView && DOM.mainView.classList.contains("active")) {
        initSliders();
        refreshHomeEnvLabel();
        renderLegendz();
      }
      if (tries >= 8) clearInterval(t);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
