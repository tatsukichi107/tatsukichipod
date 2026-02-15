/* =========================================================
   TalisPod app.js（module不使用）
   - boot時に TSP_GAME.TEMP_STEPS / HUM_STEPS が未定義でも落ちない
   - game.js が後から生えた/上書きされたケースでも再初期化できる
   - 画面上に簡易診断バー（紫）を1行表示（コンソール無し環境向け）

   依存（ある前提）：
   - window.TSP_AREAMAP（areaMap.js）
   - window.TSP_AREA（areaResolver.js）
   - window.TSP_GAME（game.js）
   ただし、どれが欠けても「落ちずにbootエラー表示」を目指す

   注意：
   - HTMLのIDは既存UIに合わせて「よくある名前」で拾う
     （存在しない場合でも落ちないようにガード）
   ========================================================= */
(function () {
  "use strict";

  // ----------------------------
  // Utilities
  // ----------------------------
  const $id = (id) => document.getElementById(id);
  const $q = (sel) => document.querySelector(sel);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const isArr = (v) => Array.isArray(v);
  const nowDate = () => new Date();

  // ----------------------------
  // On-screen diagnostic bar
  // ----------------------------
  function ensureDiagBar() {
    let bar = $id("tspDiagBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tspDiagBar";
      bar.style.position = "fixed";
      bar.style.left = "0";
      bar.style.right = "0";
      bar.style.top = "0";
      bar.style.zIndex = "99999";
      bar.style.padding = "6px 10px";
      bar.style.fontSize = "12px";
      bar.style.lineHeight = "1.2";
      bar.style.background = "rgba(128, 0, 255, 0.82)";
      bar.style.color = "#fff";
      bar.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      bar.style.whiteSpace = "nowrap";
      bar.style.overflow = "hidden";
      bar.style.textOverflow = "ellipsis";
      bar.style.pointerEvents = "none";
      document.body.appendChild(bar);
    }
    return bar;
  }

  function setDiag(text) {
    try {
      const bar = ensureDiagBar();
      bar.textContent = text;
    } catch (_) {
      // ignore
    }
  }

  // ----------------------------
  // Boot error display helper
  // ----------------------------
  function bootError(msg) {
    console.error("[boot]", msg);
    setDiag("エラー（boot） " + msg);

    const bootBox = $id("bootError") || $q(".boot-error") || null;
    if (bootBox) {
      bootBox.textContent = "エラー\n（boot）\n" + msg;
      bootBox.style.display = "block";
    } else {
      // 最低限の表示
      const div = document.createElement("pre");
      div.style.whiteSpace = "pre-wrap";
      div.style.padding = "12px";
      div.style.margin = "12px";
      div.style.borderRadius = "12px";
      div.style.background = "rgba(255,0,0,0.08)";
      div.style.color = "#b00020";
      div.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      div.textContent = "エラー\n（boot）\n" + msg;
      document.body.prepend(div);
    }
  }

  // ----------------------------
  // Fallback step arrays (絶対にundefinedにならない)
  // ----------------------------
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

  const FALLBACK_LIGHT_OPTIONS = Object.freeze([0, 50, 100]);

  function getGameStepsSafe() {
    const G = window.TSP_GAME;
    const tempSteps = (G && isArr(G.TEMP_STEPS) && G.TEMP_STEPS.length) ? G.TEMP_STEPS : FALLBACK_TEMP_STEPS;
    const humSteps = (G && isArr(G.HUM_STEPS) && G.HUM_STEPS.length) ? G.HUM_STEPS : FALLBACK_HUM_STEPS;
    const lightOptions = (G && isArr(G.LIGHT_OPTIONS) && G.LIGHT_OPTIONS.length) ? G.LIGHT_OPTIONS : FALLBACK_LIGHT_OPTIONS;

    return { tempSteps, humSteps, lightOptions };
  }

  // ----------------------------
  // Minimal state (localStorage)
  // ※既存state.jsがあっても壊さないよう、名前空間はTSP_APPにまとめる
  // ----------------------------
  const LS_KEY = "TALISPOD_SOUL_V077";

  function loadSoul() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function saveSoul(soul) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(soul));
    } catch (_) {
      // ignore
    }
  }

  function makeDefaultSoul() {
    // ウインドラゴン（要求済み初期値）
    return {
      sagaName: "",
      nickname: "",
      isReborn: false,
      legendzId: "windragon",
      speciesName: "ウインドラゴン",
      attribute: "TORNADO",
      baseStats: { hp: 400, magic: 60, counter: 100, strike: 60, heal: 20 },
      grow: { hp: 0, magic: 0, counter: 0, strike: 0, heal: 0 },
      currentHp: 400,
      // superBest（ここは個別に調整してOK。いまは暫定：-45/5 + 光(=陸上は無視、便宜上0)）
      superBest: { temp: -45, hum: 5, light: 0 },
      // 技スロット（仮データ）
      wazaSlots: Array.from({ length: 15 }, (_, i) => ({ name: "ワザ" + (i + 1), desc: "（仮）" })),
      // 記憶発行のためのランダムseed
      seed: Math.random().toString(36).slice(2, 10)
    };
  }

  // ----------------------------
  // Soul code (短縮・コピペ前提)
  // ----------------------------
  function encodeSoulCode(soul) {
    // 短縮用：JSONを小さくしてbase64url
    const pack = {
      v: 77,
      s: soul.sagaName || "",
      n: soul.nickname || "",
      id: soul.legendzId || "windragon",
      sp: soul.speciesName || "ウインドラゴン",
      a: soul.attribute || "TORNADO",
      b: soul.baseStats || {},
      g: soul.grow || {},
      ch: soul.currentHp,
      sb: soul.superBest || null,
      w: (isArr(soul.wazaSlots) ? soul.wazaSlots : []).map(x => x && x.name ? x.name : "（仮）")
    };
    const json = JSON.stringify(pack);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    return "SOUL:" + b64;
  }

  function decodeSoulCode(code) {
    try {
      const t = String(code || "").trim();
      if (!t.startsWith("SOUL:")) return null;
      const b64 = t.slice(5).replace(/-/g, "+").replace(/_/g, "/");
      // pad
      const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
      const json = decodeURIComponent(escape(atob(b64 + pad)));
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
      soul.currentHp = Number.isFinite(pack.ch) ? pack.ch : soul.baseStats.hp;
      soul.superBest = pack.sb || soul.superBest;

      // 15枠補完
      const names = isArr(pack.w) ? pack.w : [];
      soul.wazaSlots = Array.from({ length: 15 }, (_, i) => ({
        name: names[i] || ("ワザ" + (i + 1)),
        desc: "（仮）"
      }));

      soul.isReborn = true;
      return soul;
    } catch (_) {
      return null;
    }
  }

  // ----------------------------
  // DOM bindings (ゆるく拾う)
  // ----------------------------
  const DOM = {
    // screens
    screenUnreborn: null,
    screenReborn: null,

    // inputs/buttons
    inputSaga: null,
    inputNickname: null,
    btnRebornFromMemory: null,
    btnFindNewSoul: null,
    inputMemoryCode: null,

    // tabs
    tabBar: null,
    tabButtons: [],
    tabContents: [],

    // env UI
    tempSlider: null,
    humSlider: null,
    lightButtons: [],
    envDecideBtn: null,

    // labels
    labelTempVal: null,
    labelHumVal: null,
    labelLightVal: null,
    labelEnvPreview: null,
    labelHomeEnv: null,

    // sprite
    spriteViewport: null,
    spriteSheetLayer: null,
    spriteFxLayer: null,
    spriteMover: null,

    // comeback
    btnComeback: null,
    modal: null,
    modalCodeText: null,
    modalCopyBtn: null,
    modalRebornBtn: null,
    modalBackBtn: null,
    modalCloseBtn: null
  };

  function bindDom() {
    // screens（存在しない場合もあるのでガード）
    DOM.screenUnreborn = $id("screenUnreborn") || $q("#unreborn") || $q(".screen-unreborn");
    DOM.screenReborn = $id("screenReborn") || $q("#reborn") || $q(".screen-reborn");

    // inputs/buttons（未リボーン）
    DOM.inputSaga = $id("sagaNameInput") || $q('input[name="sagaName"]') || $q("#sagaName");
    DOM.inputMemoryCode = $id("memoryCodeInput") || $q('textarea[name="memoryCode"]') || $q("#memoryCode");
    DOM.btnRebornFromMemory = $id("btnRebornFromMemory") || $q("#rebornFromMemory");
    DOM.btnFindNewSoul = $id("btnFindNewSoul") || $q("#findNewSoul");

    // nickname input（レジェンズタブにある想定）
    DOM.inputNickname = $id("nicknameInput") || $q('input[name="nickname"]') || $q("#nickname");

    // tabs
    DOM.tabBar = $id("tabBar") || $q(".tab-bar");
    DOM.tabButtons = Array.from(document.querySelectorAll("[data-tab-btn]"));
    DOM.tabContents = Array.from(document.querySelectorAll("[data-tab-content]"));

    // env UI
    DOM.tempSlider = $id("tempSlider") || $q("#tempSlider");
    DOM.humSlider = $id("humiditySlider") || $q("#humiditySlider") || $q("#humSlider");
    DOM.lightButtons = Array.from(document.querySelectorAll("[data-light-btn]"));
    DOM.envDecideBtn = $id("btnEnvDecide") || $q("#envDecide");

    // labels
    DOM.labelTempVal = $id("tempVal") || $q("[data-temp-val]");
    DOM.labelHumVal = $id("humVal") || $q("[data-hum-val]");
    DOM.labelLightVal = $id("lightVal") || $q("[data-light-val]");
    DOM.labelEnvPreview = $id("envPreview") || $q("[data-env-preview]");
    DOM.labelHomeEnv = $id("homeEnvLabel") || $q("[data-home-env]");

    // sprite
    DOM.spriteViewport = $id("spriteViewport") || $q("#spriteViewport");
    DOM.spriteSheetLayer = $id("spriteSheetLayer") || $q("#spriteSheetLayer");
    DOM.spriteFxLayer = $id("spriteFxLayer") || $q("#spriteFxLayer");
    DOM.spriteMover = $id("spriteMover") || $q("#spriteMover");

    // comeback + modal
    DOM.btnComeback = $id("btnComeback") || $q("#comeBack") || $q("[data-comeback]");
    DOM.modal = $id("comebackModal") || $q("#comebackModal") || $q(".modal");
    DOM.modalCodeText = $id("comebackCodeText") || $q("#comebackCodeText") || $q("[data-modal-code]");
    DOM.modalCopyBtn = $id("btnCopyCode") || $q("#copyCode");
    DOM.modalRebornBtn = $id("btnDoComeback") || $q("#doComeback");
    DOM.modalBackBtn = $id("btnBackToGame") || $q("#backToGame");
    DOM.modalCloseBtn = $id("btnCloseModal") || $q("#closeModal");
  }

  // ----------------------------
  // App runtime state
  // ----------------------------
  const APP = {
    soul: null,
    envDraft: { temp: 0, hum: 50, light: 50 },
    envActive: { temp: 0, hum: 50, light: 50 },
    currentTab: "home",
    // sprite/anim
    faceIndex: 1,
    facing: "right",
    walkDir: 1,
    walkX: 0,
    walkSpeedPx: 0.35, // 落ち着いた歩行
    walkRangePx: 70,
    animTimer: null
  };

  // ----------------------------
  // Slider init (防御版)
  // ----------------------------
  function initSlidersSafely() {
    const { tempSteps, humSteps } = getGameStepsSafe();

    if (!DOM.tempSlider || !DOM.humSlider) {
      // 環境UIが無い構造でも落とさない
      setDiag(diagText("sliders:missing"));
      return;
    }

    // indexとして扱う
    DOM.tempSlider.min = "0";
    DOM.tempSlider.max = String(Math.max(0, tempSteps.length - 1));
    DOM.tempSlider.step = "1";

    DOM.humSlider.min = "0";
    DOM.humSlider.max = String(Math.max(0, humSteps.length - 1));
    DOM.humSlider.step = "1";

    // draftの値を index に反映
    DOM.tempSlider.value = String(findNearestIndex(tempSteps, APP.envDraft.temp));
    DOM.humSlider.value = String(findNearestIndex(humSteps, APP.envDraft.hum));

    updateEnvDraftFromUI();
    updateEnvLabels();
    updateEnvPreview();
  }

  function findNearestIndex(arr, value) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const d = Math.abs(Number(arr[i]) - Number(value));
      if (d < bestD) { bestD = d; bestI = i; }
    }
    return bestI;
  }

  function updateEnvDraftFromUI() {
    const { tempSteps, humSteps } = getGameStepsSafe();

    if (DOM.tempSlider && DOM.humSlider) {
      const ti = clamp(parseInt(DOM.tempSlider.value, 10) || 0, 0, tempSteps.length - 1);
      const hi = clamp(parseInt(DOM.humSlider.value, 10) || 0, 0, humSteps.length - 1);
      APP.envDraft.temp = Number(tempSteps[ti]);
      APP.envDraft.hum = Number(humSteps[hi]);
    }

    // 光（陸上）/水深（水中）
    // 既存UIがボタン式の想定：data-light-btn の value に 0/50/100
    const active = DOM.lightButtons.find(btn => btn.classList.contains("active"));
    if (active) {
      APP.envDraft.light = Number(active.getAttribute("data-light-value") || active.value || 50);
    } else if (Number.isFinite(APP.envDraft.light) === false) {
      APP.envDraft.light = 50;
    }

    // 水中の時は light を水深として扱う（0/50/100）
    if (APP.envDraft.hum === 100) {
      APP.envDraft.light = (APP.envDraft.light === 0 || APP.envDraft.light === 50 || APP.envDraft.light === 100) ? APP.envDraft.light : 50;
    }
  }

  function updateEnvLabels() {
    if (DOM.labelTempVal) DOM.labelTempVal.textContent = String(APP.envDraft.temp) + "℃";
    if (DOM.labelHumVal) DOM.labelHumVal.textContent = String(APP.envDraft.hum) + "%";

    // 表記：湿度100のときだけ水深
    if (DOM.labelLightVal) {
      const label = (APP.envDraft.hum === 100) ? (String(APP.envDraft.light) + "（水深）") : (String(APP.envDraft.light) + "W");
      DOM.labelLightVal.textContent = label;
    }
  }

  function updateEnvPreview() {
    const G = window.TSP_GAME;
    if (!DOM.labelEnvPreview) return;

    // 「予想環境」は属性のみ（ワクワク維持）
    if (G && typeof G.previewAttribute === "function") {
      const p = G.previewAttribute(APP.envDraft, nowDate());
      DOM.labelEnvPreview.textContent = p && p.label ? p.label : "無属性";
      return;
    }
    DOM.labelEnvPreview.textContent = "無属性";
  }

  function diagText(extra) {
    const G = window.TSP_GAME;
    const hasGame = !!G;
    const ts = hasGame && isArr(G.TEMP_STEPS) ? G.TEMP_STEPS.length : 0;
    const hs = hasGame && isArr(G.HUM_STEPS) ? G.HUM_STEPS.length : 0;
    return `TSP_GAME:${hasGame ? "OK" : "NG"} TEMP:${ts} HUM:${hs} ${extra || ""}`.trim();
  }

  // ----------------------------
  // Tabs (最低限)
  // ----------------------------
  function showTab(tabKey) {
    APP.currentTab = tabKey;

    // buttons
    DOM.tabButtons.forEach(btn => {
      const key = btn.getAttribute("data-tab-btn");
      btn.classList.toggle("active", key === tabKey);
    });

    // contents
    DOM.tabContents.forEach(p => {
      const key = p.getAttribute("data-tab-content");
      p.style.display = (key === tabKey) ? "block" : "none";
    });
  }

  function setTabsVisible(visible) {
    if (DOM.tabBar) DOM.tabBar.style.display = visible ? "flex" : "none";
    // もしヘッダー内にカムバックボタンがある設計なら一緒に隠す
    if (DOM.btnComeback) DOM.btnComeback.style.display = visible ? "inline-flex" : "none";
  }

  // ----------------------------
  // Sprite rendering (windragon 96x64, frame 24x32)
  // 1..8 表情：1通常,2差分,3振り向き,4魔法,5打撃,6被ダメ,7喜び,8ダウン
  // ----------------------------
  function spriteUrlForSoul(soul) {
    const id = (soul && soul.legendzId) ? soul.legendzId : "windragon";
    return `assets/sprites/${id}.png`;
  }

  function setSpriteFace(face, facing) {
    APP.faceIndex = clamp(face, 1, 8);
    APP.facing = (facing === "left") ? "left" : "right";

    if (!DOM.spriteSheetLayer || !DOM.spriteViewport) return;

    // 重要：切り抜き範囲
    DOM.spriteViewport.style.width = "24px";
    DOM.spriteViewport.style.height = "32px";
    DOM.spriteViewport.style.overflow = "hidden"; // ← これがないと「描写範囲が広い」になる

    // 背景
    const sheet = DOM.spriteSheetLayer;
    sheet.style.width = "96px";
    sheet.style.height = "64px";
    sheet.style.backgroundRepeat = "no-repeat";
    sheet.style.imageRendering = "pixelated";

    // 反転は最後に transform で
    sheet.style.transformOrigin = "top left";
    sheet.style.transform = (APP.facing === "left") ? "scaleX(-1)" : "scaleX(1)";

    // 1..8 → col,row
    const idx = APP.faceIndex - 1;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = col * 24;
    const y = row * 32;

    // 背景位置：左向き基準で座標指定（あなたのルール通り）
    sheet.style.backgroundPosition = `-${x}px -${y}px`;
  }

  function ensureSpriteImage() {
    if (!DOM.spriteSheetLayer) return;
    const url = spriteUrlForSoul(APP.soul);
    DOM.spriteSheetLayer.style.backgroundImage = `url("${url}")`;
    DOM.spriteSheetLayer.style.backgroundSize = "96px 64px";
  }

  function updateSpritePosition() {
    // spriteMover があるならそれを動かす。無ければ viewport を動かす
    const mover = DOM.spriteMover || DOM.spriteViewport;
    if (!mover) return;

    // 中央寄せ：viewportをコンテナ内中央に置けるならOKだが、
    // ここでは "translateX" で往復だけ付ける
    mover.style.position = mover.style.position || "relative";

    // 右向き＝正向き、左向き＝反転（sheet側）
    // 進行方向に合わせて反転する
    const isGoingRight = APP.walkDir > 0;
    setSpriteFace(APP.faceIndex, isGoingRight ? "right" : "left");

    mover.style.transform = `translateX(${APP.walkX}px)`;
  }

  function stopAnim() {
    if (APP.animTimer) {
      clearInterval(APP.animTimer);
      APP.animTimer = null;
    }
  }

  function startHomeAnim() {
    stopAnim();
    if (!DOM.spriteViewport || !DOM.spriteSheetLayer) return;

    // 往復距離（画面中心から5〜10歩相当）
    APP.walkRangePx = 70;
    APP.walkSpeedPx = 0.35;

    let frameTick = 0;
    let turning = 0; // 0=通常, >0=振り向き中の残りtick

    APP.walkDir = 1;
    APP.walkX = 0;

    APP.animTimer = setInterval(() => {
      // 表情ランクで切替
      const envRank = currentEnvRank();
      if (envRank.rankKey === "WORST") {
        APP.faceIndex = 8; // ダウン
        turning = 0;
      } else if (envRank.rankKey === "SUPER_BEST" || envRank.rankKey === "BEST") {
        APP.faceIndex = 7; // 喜び
        turning = 0;
      } else if (envRank.rankKey === "GOOD") {
        // 良好：通常1/2を0.5秒ごと（♪演出はCSS側想定）
        APP.faceIndex = (Math.floor(frameTick / 30) % 2) ? 2 : 1; // 60fps換算の簡易
        turning = 0;
      } else if (envRank.rankKey === "NEUTRAL") {
        // 無属性：歩行（通常1/2）＋折返しで振り向き0.5秒
        if (turning > 0) {
          APP.faceIndex = 3;
          turning--;
        } else {
          APP.faceIndex = (Math.floor(frameTick / 30) % 2) ? 2 : 1;
        }
      } else {
        // 普通
        APP.faceIndex = (Math.floor(frameTick / 30) % 2) ? 2 : 1;
        turning = 0;
      }

      // 歩行は無属性のみ（仕様）
      if (envRank.rankKey === "NEUTRAL") {
        APP.walkX += APP.walkDir * APP.walkSpeedPx * 6; // 見た目速度
        if (APP.walkX > APP.walkRangePx) {
          APP.walkX = APP.walkRangePx;
          APP.walkDir = -1;
          turning = 30; // 0.5秒相当（60fps基準）
        } else if (APP.walkX < -APP.walkRangePx) {
          APP.walkX = -APP.walkRangePx;
          APP.walkDir = 1;
          turning = 30;
        }
      } else {
        APP.walkX = 0;
        APP.walkDir = 1;
      }

      updateSpritePosition();
      frameTick++;
    }, 1000 / 60);
  }

  // ----------------------------
  // Environment rank helpers
  // ----------------------------
  function currentEnvRank() {
    const G = window.TSP_GAME;
    if (!G || typeof G.rankEnv !== "function" || !APP.soul) {
      return {
        rankKey: "NORMAL",
        rankLabel: "普通環境",
        areaName: "無属性",
        envAttrLabel: "無属性",
        lightOk: true
      };
    }
    return G.rankEnv(APP.soul, APP.envActive, nowDate());
  }

  function refreshHomeEnvLabel() {
    if (!DOM.labelHomeEnv || !APP.soul) return;

    const r = currentEnvRank();

    // ホームはエリア名＋ランク
    if (r.rankKey === "NEUTRAL") {
      DOM.labelHomeEnv.textContent = "無属性環境";
      return;
    }
    const areaName = r.areaName || "未知";
    const rankLabel = r.rankLabel || "";
    DOM.labelHomeEnv.textContent = `${areaName} / ${rankLabel}`;
  }

  // ----------------------------
  // Comeback modal (簡易)
  // ----------------------------
  function openModal(code) {
    if (!DOM.modal) return;
    DOM.modal.style.display = "block";
    if (DOM.modalCodeText) DOM.modalCodeText.value = code || "";

    // セマンティクス（ボタン文言がHTML側にある想定）
    setDiag(diagText("modal"));
  }

  function closeModal() {
    if (!DOM.modal) return;
    DOM.modal.style.display = "none";
  }

  function copyToClipboard(text) {
    // iOS/Android 互換のため、execCommand fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve();
    } catch (_) {
      return Promise.reject();
    }
  }

  // ----------------------------
  // Reborn flow
  // ----------------------------
  function showUnrebornScreen() {
    if (DOM.screenUnreborn) DOM.screenUnreborn.style.display = "block";
    if (DOM.screenReborn) DOM.screenReborn.style.display = "none";
    setTabsVisible(false);
    stopAnim();
  }

  function showRebornScreen() {
    if (DOM.screenUnreborn) DOM.screenUnreborn.style.display = "none";
    if (DOM.screenReborn) DOM.screenReborn.style.display = "block";
    setTabsVisible(true);
    showTab("home");
    ensureSpriteImage();
    setSpriteFace(1, "right");
    startHomeAnim();
    refreshHomeEnvLabel();
  }

  function doRebornNew() {
    const saga = DOM.inputSaga ? String(DOM.inputSaga.value || "").trim() : "";
    if (!saga) {
      bootError("サーガ名が空です");
      return;
    }
    APP.soul = makeDefaultSoul();
    APP.soul.sagaName = saga;
    APP.soul.isReborn = true;

    // 新規ウインドラゴンはニックネーム未登録（要望）
    APP.soul.nickname = "";

    APP.envActive = { temp: 0, hum: 50, light: 50 };
    APP.envDraft = { temp: 0, hum: 50, light: 50 };

    saveSoul(APP.soul);
    showRebornScreen();
  }

  function doRebornFromMemory() {
    const saga = DOM.inputSaga ? String(DOM.inputSaga.value || "").trim() : "";
    const code = DOM.inputMemoryCode ? String(DOM.inputMemoryCode.value || "").trim() : "";
    if (!saga) {
      bootError("サーガ名が空です");
      return;
    }
    const soul = decodeSoulCode(code);
    if (!soul) {
      bootError("記憶が空です / 不正です");
      return;
    }
    if (soul.sagaName !== saga) {
      bootError("リボーン失敗（サーガ名が一致しません）");
      return;
    }
    APP.soul = soul;

    // 記憶からのリボーンは「環境は保存しない」＝無属性に戻す（要望）
    APP.envActive = { temp: 0, hum: 50, light: 50 };
    APP.envDraft = { temp: 0, hum: 50, light: 50 };

    // HP補完（NaN回避）
    const maxHp = (APP.soul.baseStats && Number(APP.soul.baseStats.hp)) || 400;
    if (!Number.isFinite(APP.soul.currentHp)) APP.soul.currentHp = maxHp;

    saveSoul(APP.soul);
    showRebornScreen();
  }

  // ----------------------------
  // Env decide
  // ----------------------------
  function applyEnvDraft() {
    APP.envActive = { temp: APP.envDraft.temp, hum: APP.envDraft.hum, light: APP.envDraft.light };

    // ホーム更新
    refreshHomeEnvLabel();

    // 無属性なら育成タイマー非表示…等は既存UI側がやってる想定
    // ここではアニメ制御のみ
    startHomeAnim();
  }

  // ----------------------------
  // Event wiring
  // ----------------------------
  function wireEvents() {
    // Tab click
    DOM.tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-tab-btn");
        if (!key) return;
        showTab(key);
        // ホームに戻ったらアニメ再開
        if (key === "home") startHomeAnim();
        else stopAnim();
      });
    });

    // Slider change
    if (DOM.tempSlider) {
      DOM.tempSlider.addEventListener("input", () => {
        updateEnvDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    }
    if (DOM.humSlider) {
      DOM.humSlider.addEventListener("input", () => {
        updateEnvDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    }

    // Light buttons
    DOM.lightButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        DOM.lightButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateEnvDraftFromUI();
        updateEnvLabels();
        updateEnvPreview();
      });
    });

    // Env decide
    if (DOM.envDecideBtn) {
      DOM.envDecideBtn.addEventListener("click", () => {
        // 既存の冒険アニメ（3秒）をHTML/CSS側でやってる想定。
        // ここでは遅延して反映だけする（フリーズ回避）
        setDiag(diagText("env:decide"));
        const delayMs = 3200;
        setTimeout(() => {
          applyEnvDraft();
          showTab("home");
        }, delayMs);
      });
    }

    // Reborn buttons
    if (DOM.btnFindNewSoul) DOM.btnFindNewSoul.addEventListener("click", doRebornNew);
    if (DOM.btnRebornFromMemory) DOM.btnRebornFromMemory.addEventListener("click", doRebornFromMemory);

    // Nickname edit
    if (DOM.inputNickname) {
      DOM.inputNickname.addEventListener("input", () => {
        if (!APP.soul) return;
        APP.soul.nickname = String(DOM.inputNickname.value || "");
        saveSoul(APP.soul);
      });
    }

    // Comeback
    if (DOM.btnComeback) {
      DOM.btnComeback.addEventListener("click", () => {
        if (!APP.soul) return;
        // 記憶発行：環境は保存しない（＝コードには入れない／decode側で無属性に戻す）
        const code = encodeSoulCode(APP.soul);
        if (DOM.modalCodeText) DOM.modalCodeText.value = code;
        openModal(code);
      });
    }

    if (DOM.modalCopyBtn) {
      DOM.modalCopyBtn.addEventListener("click", async () => {
        const code = DOM.modalCodeText ? String(DOM.modalCodeText.value || "") : "";
        try {
          await copyToClipboard(code);
          setDiag(diagText("copied"));
        } catch (_) {
          setDiag(diagText("copy:fail"));
        }
      });
    }

    // カムバックする（未リボーンへ＝イジェクト的挙動）
    if (DOM.modalRebornBtn) {
      DOM.modalRebornBtn.addEventListener("click", () => {
        closeModal();
        // 未リボーンへ移動（コードは保持）
        if (APP.soul) {
          APP.soul.isReborn = false;
          saveSoul(APP.soul);
        }
        showUnrebornScreen();
      });
    }

    // 育成に戻る（ダイアログ閉じるだけ）
    if (DOM.modalBackBtn) {
      DOM.modalBackBtn.addEventListener("click", () => {
        closeModal();
      });
    }

    if (DOM.modalCloseBtn) {
      DOM.modalCloseBtn.addEventListener("click", () => closeModal());
    }
  }

  // ----------------------------
  // Boot sequence with retry
  // ----------------------------
  function boot() {
    bindDom();

    // まず診断
    setDiag(diagText("boot"));

    // soul load
    APP.soul = loadSoul();

    // 画面切替
    if (APP.soul && APP.soul.isReborn) {
      showRebornScreen();
    } else {
      showUnrebornScreen();
    }

    // slider init（防御）
    initSlidersSafely();

    // events
    wireEvents();

    // 後からTSP_GAMEが差し替わる/完成するケースに備えて、数回だけ再初期化
    let tries = 0;
    const retry = setInterval(() => {
      tries++;
      initSlidersSafely();
      setDiag(diagText("retry:" + tries));
      if (tries >= 8) clearInterval(retry);
    }, 250);

    // sprite
    if (APP.soul && APP.soul.isReborn) {
      ensureSpriteImage();
      setSpriteFace(1, "right");
      startHomeAnim();
      refreshHomeEnvLabel();
    }
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
