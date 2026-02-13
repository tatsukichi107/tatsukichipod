/* =========================================================
 * app.v076.js  v0.76-stable
 *
 * 対象構成：
 * talispod/
 * ├─ index.html
 * ├─ css/app.css
 * ├─ js/state.js  (TSP_STATE)
 * ├─ js/game.js   (TSP_GAME)
 * └─ assets/sprites/windragon.png
 *
 * 仕様要点（v0.7系）
 * - 未リボーン画面：
 *   サーガの名を刻め / ソウルドールの記憶 / 記憶からリボーンする / 新たなソウルドールを見つける
 * - リボーン後：ホーム/環境/レジェンズ/クリスタル（下タブ）
 * - 環境設定：ドラフト操作→環境決定→3秒冒険→反映→ホームへ
 * - 無属性：温度0湿度50は無属性（光無視）、歩行アニメ、育成なし
 * - 通常環境：光は足切り（合わないと最悪環境）
 * - 湿度100：水中（光足切り無視。光=水深）
 * - 表情/アニメ：
 *   超ベスト：喜び（frame7）+派手エフェクト
 *   ベスト：喜び（frame7）+音符
 *   良好：通常1/2交互 +音符
 *   普通：通常1/2交互
 *   最悪：ダウン（frame8）
 *   無属性：歩行（通常1/2交互）+折返し時に振り向き0.5s
 * - 育成：ホーム表示中のみ1分ごとに判定（回復→成長）
 * - 最大HP増加時はcurrentHPも同時増加
 * - カムバック：短縮コード発行（環境は保存しない／ニックネームは保存）
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

  // tabs
  let tabBtns;
  let tabEls;

  // home
  let envAttributeLabel, growthTimer, growthPreview, comebackBtn;
  let spriteViewport, spriteSheetLayer, spriteFxLayer;
  let scene;

  // env
  let tempSlider, humiditySlider, lightSlider;
  let tempValue, humidityValue, lightValue, lightLabel;
  let envPreviewLabel, neutralBtn, applyEnvBtn;

  // legendz
  let speciesName, nicknameInput, nicknameApplyBtn, legendzAttribute;
  let hpStat, magicStat, counterStat, strikeStat, healStat;

  // crystal
  let crystalList;

  // ===== State =====
  let soul = null;
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };

  // elem grow counters
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  // tick loop
  let secondsAccum = 0;
  let lastRafMs = null;

  // adventure lock
  let uiLocked = false;

  // ===== Monster / sprite config =====
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

  // walk / idle
  const WALK = {
    halfRangePx: 84,
    speedPxPerSec: 12, // 落ち着き重視（以前の半分くらい）
    facing: "right",
    x: 0,
    stepTimer: 0,
    stepFrame: 1,
    turnTimer: 0
  };
  const IDLE = { timer: 0, frame: 1 };

  // superbest FX
  const superBestEmitter = { accum: 0 };

  // ===== Helpers =====
  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
  }

  function activeTabKey() {
    const btn = tabBtns.find(b => b.classList.contains("active"));
    return btn?.dataset?.tab || "home";
  }

  function switchTab(key) {
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === key));
    Object.values(tabEls).forEach(el => el.classList.remove("active"));
    tabEls[key].classList.add("active");
  }

  function lockUI(on) {
    uiLocked = on;
    tabBtns.forEach(b => (b.disabled = on));
    applyEnvBtn.disabled = on;
    neutralBtn.disabled = on;
  }

  function displayNickname(s) {
    const n = String(s?.nickname || "").trim();
    return n ? n : "未登録";
  }

  function setHeader() {
    if (!soul) {
      headerLine1.textContent = "";
      headerLine2.textContent = "";
      headerLine3.textContent = "未リボーン";
      return;
    }
    const saga = String(soul.sagaName || "").trim();
    const sp = String(soul.speciesName || "").trim();
    const nick = displayNickname(soul);

    headerLine1.textContent = `サーガ名：${saga}`;
    headerLine2.textContent = `種族名：${sp} / ニックネーム：${nick}`;
    headerLine3.textContent = "リボーン中";
  }

  // ===== Background by env attribute =====
  function setHomeBackgroundByEnvAttr(envAttr) {
    if (!scene) return;
    scene.classList.remove("attr-none", "attr-volcano", "attr-tornado", "attr-earthquake", "attr-storm");
    switch (envAttr) {
      case "volcano": scene.classList.add("attr-volcano"); break;
      case "tornado": scene.classList.add("attr-tornado"); break;
      case "earthquake": scene.classList.add("attr-earthquake"); break;
      case "storm": scene.classList.add("attr-storm"); break;
      default: scene.classList.add("attr-none");
    }
  }

  function rankLabel(rank) {
    const R = window.TSP_GAME.Rank;
    switch (rank) {
      case R.superbest: return "超ベスト環境";
      case R.best: return "ベスト環境";
      case R.good: return "良好環境";
      case R.normal: return "普通環境";
      case R.bad: return "最悪環境";
      default: return "無属性環境";
    }
  }

  // ===== Stats UI =====
  function refreshStatsUI() {
    if (!soul) return;

    speciesName.textContent = soul.speciesName;
    nicknameInput.value = soul.nickname || "";
    legendzAttribute.textContent = window.TSP_GAME.ATTR_META[soul.attribute]?.jp || soul.attribute;

    const mx = window.TSP_GAME.maxHP(soul);
    hpStat.textContent = `${soul.currentHP}/${mx}`;

    magicStat.textContent = String(soul.baseStats.fire + soul.growStats.fire);
    counterStat.textContent = String(soul.baseStats.wind + soul.growStats.wind);
    strikeStat.textContent = String(soul.baseStats.earth + soul.growStats.earth);
    healStat.textContent = String(soul.baseStats.water + soul.growStats.water);
  }

  function refreshCrystalsUI() {
    if (!soul) return;
    const c = soul.crystals || {};
    crystalList.innerHTML = `
      <div>ヴォルケーノ：${c.volcano || 0}</div>
      <div>トルネード：${c.tornado || 0}</div>
      <div>アースクエイク：${c.earthquake || 0}</div>
      <div>ストーム：${c.storm || 0}</div>
    `;
  }

  // ===== Env sliders =====
  function initSliders() {
    tempSlider.min = "0";
    tempSlider.max = String(window.TSP_GAME.TEMP_STEPS.length - 1);
    tempSlider.step = "1";

    humiditySlider.min = "0";
    humiditySlider.max = String(window.TSP_GAME.HUM_STEPS.length - 1);
    humiditySlider.step = "1";

    lightSlider.min = "0";
    lightSlider.max = "2";
    lightSlider.step = "1";
  }

  function readDraftFromSliders() {
    const t = window.TSP_GAME.TEMP_STEPS[Number(tempSlider.value)] ?? 0;
    const h = window.TSP_GAME.HUM_STEPS[Number(humiditySlider.value)] ?? 50;
    const lIdx = Number(lightSlider.value);
    const l = lIdx === 0 ? 0 : (lIdx === 1 ? 50 : 100);
    envDraft = { temp: t, hum: h, light: l };
  }

  function setSlidersFromDraft() {
    const tIdx = window.TSP_GAME.TEMP_STEPS.indexOf(Number(envDraft.temp));
    const hIdx = window.TSP_GAME.HUM_STEPS.indexOf(Number(envDraft.hum));
    tempSlider.value = String(Math.max(0, tIdx));
    humiditySlider.value = String(Math.max(0, hIdx));
    lightSlider.value = String(envDraft.light === 0 ? 0 : (envDraft.light === 50 ? 1 : 2));
  }

  function updateLightLabelByHumidity() {
    lightLabel.textContent = (Number(envDraft.hum) === 100) ? "水深" : "光量";
  }

  function refreshEnvUI() {
    tempValue.textContent = `${envDraft.temp}℃`;
    humidityValue.textContent = `${envDraft.hum}％`;
    lightValue.textContent = String(envDraft.light);
    updateLightLabelByHumidity();

    const attr = window.TSP_GAME.envAttribute(envDraft.temp, envDraft.hum);
    envPreviewLabel.textContent = window.TSP_GAME.ATTR_META[attr]?.jp || "無属性";
  }

  // ===== Adventure apply =====
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function playAdventureAndApply() {
    if (uiLocked) return;

    lockUI(true);

    const tabEnv = tabEls.environment;
    const overlay = document.createElement("div");
    overlay.className = "adventure-overlay";
    overlay.textContent = "冒険中…";
    tabEnv.appendChild(overlay);

    await sleep(3000);

    overlay.remove();

    envApplied = { ...envDraft };

    switchTab("home");
    lockUI(false);

    secondsAccum = 0; // 反映直後は分計測をリセット
    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  // ===== Sprite =====
  function setSpriteSheet() {
    spriteSheetLayer.style.backgroundImage = `url("${MONSTER.spritePath}")`;
  }

  function renderFrame(frameIndex, flipX) {
    const { r, c } = SHEET.frameToRC(frameIndex);
    const x = -(c * SHEET.frameW * SHEET.scale);
    const y = -(r * SHEET.frameH * SHEET.scale);

    spriteSheetLayer.style.backgroundPosition = `${x}px ${y}px`;
    spriteViewport.style.transform = `translateX(-50%) scaleX(${flipX ? -1 : 1})`;
  }

  function clearFxAll() {
    spriteFxLayer.innerHTML = "";
    if (scene) scene.classList.remove("superbest-burst");
    qsa(".superbest-particle").forEach(n => n.remove());
  }

  function setNoteFx() {
    spriteFxLayer.innerHTML = "";
    const n = document.createElement("div");
    n.className = "fx-note-only";
    n.textContent = "♪";
    n.style.left = "50%";
    n.style.bottom = "-6px";
    n.style.transform = "translateX(-50%)";
    spriteFxLayer.appendChild(n);
  }

  function setSuperBestFx(dtSec) {
    if (!scene) return;
    scene.classList.add("superbest-burst");

    superBestEmitter.accum += dtSec;
    const interval = 0.10;

    while (superBestEmitter.accum >= interval) {
      superBestEmitter.accum -= interval;

      for (let k = 0; k < 3; k++) {
        const p = document.createElement("div");
        p.className = "superbest-particle";
        p.textContent = Math.random() > 0.55 ? "✨" : "♪";
        p.style.left = `${Math.floor(Math.random() * 96)}%`;
        p.style.top = `${Math.floor(Math.random() * 96)}%`;
        scene.appendChild(p);
        setTimeout(() => { try { p.remove(); } catch {} }, 1700);
      }
    }
  }

  function centerSprite() {
    spriteViewport.style.left = "50%";
    WALK.x = 0;
  }

  function tickIdle(dtSec) {
    IDLE.timer += dtSec;
    if (IDLE.timer >= 0.5) {
      IDLE.timer -= 0.5;
      IDLE.frame = (IDLE.frame === 1) ? 2 : 1;
    }
  }

  function tickWalk(dtSec) {
    if (WALK.turnTimer > 0) {
      WALK.turnTimer -= dtSec;
      const flipTurn = (WALK.facing === "right");
      renderFrame(3, flipTurn); // 振り向き
      spriteViewport.style.left = `calc(50% + ${WALK.x}px)`;
      return;
    }

    const dir = (WALK.facing === "right") ? 1 : -1;
    WALK.x += WALK.speedPxPerSec * dtSec * dir;

    if (WALK.x > WALK.halfRangePx) {
      WALK.x = WALK.halfRangePx;
      WALK.facing = "left";
      WALK.turnTimer = 0.5;
      WALK.stepTimer = 0;
    } else if (WALK.x < -WALK.halfRangePx) {
      WALK.x = -WALK.halfRangePx;
      WALK.facing = "right";
      WALK.turnTimer = 0.5;
      WALK.stepTimer = 0;
    }

    WALK.stepTimer += dtSec;
    if (WALK.stepTimer >= 0.5) {
      WALK.stepTimer -= 0.5;
      WALK.stepFrame = (WALK.stepFrame === 1) ? 2 : 1;
    }

    // 全スプライトは左向き前提：
    // 右へ歩くときは正向き（反転なし）、
    // 左へ歩くときは反転版を表示
    const flip = (WALK.facing === "left");
    renderFrame(WALK.stepFrame, flip);
    spriteViewport.style.left = `calc(50% + ${WALK.x}px)`;
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now, soul.attribute);
    const R = window.TSP_GAME.Rank;

    const attrJp = window.TSP_GAME.ATTR_META[info.envAttr]?.jp || "無属性";
    const rankJp = rankLabel(info.rank);

    if (info.rank === R.neutral) envAttributeLabel.textContent = "無属性";
    else envAttributeLabel.textContent = `${attrJp}（${rankJp}）`;

    setHomeBackgroundByEnvAttr(info.envAttr);
    clearFxAll();

    switch (info.rank) {
      case R.superbest:
        renderFrame(7, false);
        setSuperBestFx(dtSec);
        centerSprite();
        break;
      case R.best:
        renderFrame(7, false);
        setNoteFx();
        centerSprite();
        break;
      case R.good:
        tickIdle(dtSec);
        renderFrame(IDLE.frame, false);
        setNoteFx();
        centerSprite();
        break;
      case R.normal:
        tickIdle(dtSec);
        renderFrame(IDLE.frame, false);
        centerSprite();
        break;
      case R.bad:
        renderFrame(8, false);
        centerSprite();
        break;
      case R.neutral:
      default:
        tickWalk(dtSec);
        break;
    }
  }

  // ===== Growth preview =====
  function updateGrowthPreviewAndTimer() {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeMinutePreview(soul, MONSTER, envApplied, now, elemCounter);

    if (info.rank === window.TSP_GAME.Rank.neutral) {
      growthTimer.textContent = "環境成長なし";
      growthPreview.textContent = "";
      return;
    }

    const sec = Math.max(0, Math.floor(60 - secondsAccum));
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    growthTimer.textContent = `${mm}:${ss}`;

    const parts = [];
    if (info.heal > 0) parts.push(`回復+${info.heal}`);
    if (info.hpDmg > 0) parts.push(`HP-${info.hpDmg}`);
    parts.push(`HP+${info.hpGrow}`);

    if (info.elemKey) {
      const jp = { fire: "マホウ", wind: "カウンター", earth: "ダゲキ", water: "カイフク" }[info.elemKey];
      if (info.elemGrow > 0) parts.push(`${jp}+${info.elemGrow}`);
      else {
        // 上限などで0になるケースも表示
        const remain = window.TSP_GAME.LIMITS.elemGrowMax - (soul.growStats?.[info.elemKey] ?? 0);
        if (remain <= 0) parts.push(`${jp}+0`);
      }
    }
    growthPreview.textContent = parts.join(" / ");
  }

  // ===== Comeback (dialog-less minimal: use prompt style via alert/clipboard) =====
  // ※今はモーダルUIを使わず、未リボーン欄へ貼り付ける運用でもOKにする
  function doComeback() {
    if (!soul) return;
    const code = window.TSP_STATE.makeSoulCode(soul);

    // 可能ならクリップボード
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        alert("ソウルドールの記憶をコピーしました\n未リボーン画面の「ソウルドールの記憶」に貼り付けてください");
      }).catch(() => {
        alert("ソウルドールの記憶（手動コピー）\n\n" + code);
      });
    } else {
      alert("ソウルドールの記憶（手動コピー）\n\n" + code);
    }
  }

  // ===== Loop =====
  function rafLoop(msNow) {
    if (lastRafMs == null) lastRafMs = msNow;
    const dtSec = Math.min(0.05, (msNow - lastRafMs) / 1000);
    lastRafMs = msNow;

    const tab = activeTabKey();

    if (soul && tab === "home") {
      secondsAccum += dtSec;

      if (secondsAccum >= 60) {
        secondsAccum -= 60;
        try {
          window.TSP_GAME.applyOneMinute(soul, MONSTER, envApplied, new Date(), elemCounter);
          refreshStatsUI();
        } catch (e) {
          alertErr("applyOneMinute", e);
        }
      }

      try {
        updateGrowthPreviewAndTimer();
        renderByCurrentEnv(dtSec);
      } catch (e) {
        alertErr("homeTickRender", e);
      }
    }

    requestAnimationFrame(rafLoop);
  }

  // ===== Reborn pipelines =====
  function pipelineAfterReborn() {
    // 環境は保存しない → 常に無属性へ戻す
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };

    initSliders();
    setSlidersFromDraft();
    refreshEnvUI();

    show(mainView);
    switchTab("home");

    // sprite
    setSpriteSheet();

    // reset timers
    secondsAccum = 0;
    lastRafMs = null;
    WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
    IDLE.timer = 0; IDLE.frame = 1;

    setHeader();
    refreshStatsUI();
    refreshCrystalsUI();
    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  // ===== Bind events =====
  function bindEvents() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (uiLocked) return;
        try {
          switchTab(btn.dataset.tab);
          if (btn.dataset.tab === "home") {
            updateGrowthPreviewAndTimer();
            renderByCurrentEnv(0);
          }
        } catch (e) {
          alertErr("tabSwitch", e);
        }
      });
    });

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
      try { doComeback(); }
      catch (e) { alertErr("comeback", e); }
    });

    nicknameApplyBtn.addEventListener("click", () => {
      try {
        if (!soul) return;
        soul.nickname = String(nicknameInput.value || "").trim();
        setHeader();
      } catch (e) {
        alertErr("nicknameApply", e);
      }
    });

    tempSlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { alertErr("tempInput", e); }
    });
    humiditySlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { alertErr("humInput", e); }
    });
    lightSlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { alertErr("lightInput", e); }
    });

    neutralBtn.addEventListener("click", () => {
      try {
        envDraft = { temp: 0, hum: 50, light: 50 };
        setSlidersFromDraft();
        refreshEnvUI();
      } catch (e) {
        alertErr("neutralBtn", e);
      }
    });

    applyEnvBtn.addEventListener("click", async () => {
      try { await playAdventureAndApply(); }
      catch (e) {
        lockUI(false);
        alertErr("applyEnvBtn", e);
      }
    });
  }

  // ===== Boot =====
  function boot() {
    try {
      // deps
      if (!window.TSP_STATE) throw new Error("TSP_STATEがありません（state.js未読込）");
      if (!window.TSP_GAME) throw new Error("TSP_GAMEがありません（game.js未読込）");

      // views
      startView = must("startView");
      mainView = must("mainView");

      // header
      headerLine1 = must("headerLine1");
      headerLine2 = must("headerLine2");
      headerLine3 = must("headerLine3");

      // start
      sagaInput = must("sagaInput");
      soulTextInput = must("soulTextInput");
      newSoulBtn = must("newSoulBtn");
      textRebornBtn = must("textRebornBtn");

      // tabs
      tabBtns = qsa(".tab-btn");
      tabEls = {
        home: must("tab-home"),
        environment: must("tab-environment"),
        legendz: must("tab-legendz"),
        crystal: must("tab-crystal"),
      };

      // home
      envAttributeLabel = must("envAttributeLabel");
      growthTimer = must("growthTimer");
      growthPreview = must("growthPreview");
      comebackBtn = must("comebackBtn");

      spriteViewport = must("spriteViewport");
      spriteSheetLayer = must("spriteSheetLayer");
      spriteFxLayer = must("spriteFxLayer");
      scene = qs(".scene");

      // env
      tempSlider = must("tempSlider");
      humiditySlider = must("humiditySlider");
      lightSlider = must("lightSlider");
      tempValue = must("tempValue");
      humidityValue = must("humidityValue");
      lightValue = must("lightValue");
      lightLabel = must("lightLabel");
      envPreviewLabel = must("envPreviewLabel");
      neutralBtn = must("neutralBtn
