/* =========================================================
 * app.js（短縮コード対応 / QR廃止 / v0.71 UI改善）
 *
 * v0.71 変更点：
 * - 環境タブ：無属性ボタン配置変更（HTML/CSS側）
 * - 表記：「属性プレビュー」→「予想環境」（HTML側）
 * - カムバックモーダル：新ボタン「カムバックをやめる」
 *    - モーダルを閉じてゲーム続行（未リボーンに戻さない）
 * - 湿度=100 のときだけ「光量」→「水深」ラベル切替（既存）
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ===== DOM =====
  let startView, mainView, headerSub;
  let sagaInput, newSoulBtn, soulTextInput, textRebornBtn;

  let tabBtns, tabEls;

  // home
  let envAttributeLabel, growthTimer, growthPreview;
  let comebackBtn;
  let spriteViewport, spriteSheetLayer, spriteFxLayer;

  // env
  let tempSlider, humiditySlider, lightSlider;
  let tempValue, humidityValue, lightValue;
  let lightLabel;
  let envPreviewLabel, neutralBtn, applyEnvBtn;

  // legendz
  let speciesName, nicknameInput, nicknameApplyBtn, legendzAttribute;
  let hpStat, magicStat, counterStat, strikeStat, healStat;

  // crystal
  let crystalList;

  // modal
  let soulModal, modalSoulText, copySoulBtn, ejectBtn, cancelComebackBtn;

  // ===== State =====
  let soul = null;
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };

  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  let secondsAccum = 0;
  let lastRafMs = null;

  // Animation state
  const WALK = {
    halfRangePx: 80,
    speedPxPerSec: 20,
    facing: "right",
    x: 0,
    stepTimer: 0,
    stepFrame: 1,
    turnTimer: 0
  };

  const IDLE = { timer: 0, frame: 1 };

  const MONSTER = {
    id: "windragon",
    spritePath: "assets/sprites/windragon.png",
    superBest: { temp: -45, hum: 5, waterDepth: 50 }
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

  // FX emitter
  const superBestEmitter = { accum: 0 };

  // ===== Utilities =====
  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
  }

  function activeTabKey() {
    const btn = tabBtns.find((b) => b.classList.contains("active"));
    return btn?.dataset?.tab || "home";
  }

  function switchTab(key) {
    tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === key));
    Object.values(tabEls).forEach((t) => t.classList.remove("active"));
    tabEls[key].classList.add("active");
  }

  function displayNicknameLocal(s) {
    const nick = String(s.nickname || "").trim();
    if (!nick) return `${s.speciesName}（ニックネーム未登録）`;
    return nick;
  }

  function setHeader() {
    if (!soul) {
      headerSub.textContent = "未リボーン";
      return;
    }
    headerSub.textContent =
      `サーガ名：${soul.sagaName} / ニックネーム：${displayNicknameLocal(soul)} / リボーン中`;
  }

  function setHomeBackgroundByEnvAttr(envAttr) {
    const scene = document.querySelector(".scene");
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

  function rankLabelNew(rank) {
    const R = window.TSP_GAME.Rank;
    switch (rank) {
      case R.superbest: return "超ベスト環境";
      case R.best: return "ベスト環境";
      case R.good: return "良好環境";
      case R.normal: return "普通環境";
      case R.bad: return "最悪環境";
      case R.neutral:
      default: return "無属性環境";
    }
  }

  // ===== UI refresh =====
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

  function setSlidersFromDraft() {
    const tIdx = window.TSP_GAME.TEMP_STEPS.indexOf(envDraft.temp);
    const hIdx = window.TSP_GAME.HUM_STEPS.indexOf(envDraft.hum);
    tempSlider.value = String(Math.max(0, tIdx));
    humiditySlider.value = String(Math.max(0, hIdx));
    lightSlider.value = String(envDraft.light === 0 ? 0 : envDraft.light === 50 ? 1 : 2);
  }

  function readDraftFromSliders() {
    const t = window.TSP_GAME.TEMP_STEPS[Number(tempSlider.value)] ?? 0;
    const h = window.TSP_GAME.HUM_STEPS[Number(humiditySlider.value)] ?? 50;
    const lIdx = Number(lightSlider.value);
    const l = lIdx === 0 ? 0 : lIdx === 1 ? 50 : 100;
    envDraft = { temp: t, hum: h, light: l };
  }

  function updateLightLabelByHumidity() {
    if (!lightLabel) return;
    lightLabel.textContent = (Number(envDraft.hum) === 100) ? "水深" : "光量";
  }

  function refreshEnvUI() {
    tempValue.textContent = `${envDraft.temp}℃`;
    humidityValue.textContent = `${envDraft.hum}％`;
    lightValue.textContent = `${envDraft.light}`;

    updateLightLabelByHumidity();

    const attr = window.TSP_GAME.envAttribute(envDraft.temp, envDraft.hum);
    envPreviewLabel.textContent = window.TSP_GAME.ATTR_META[attr]?.jp || "無属性";
  }

  // ===== Adventure apply =====
  function lockUI(locked) {
    tabBtns.forEach((b) => (b.disabled = locked));
    applyEnvBtn.disabled = locked;
    neutralBtn.disabled = locked;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function playAdventureAndApply() {
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
    const scene = document.querySelector(".scene");
    if (scene) scene.classList.remove("superbest-burst");
    document.querySelectorAll(".superbest-particle").forEach((n) => n.remove());
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
    const scene = document.querySelector(".scene");
    if (!scene) return;

    scene.classList.add("superbest-burst");

    superBestEmitter.accum += dtSec;
    const interval = 0.12;

    while (superBestEmitter.accum >= interval) {
      superBestEmitter.accum -= interval;

      for (let k = 0; k < 2; k++) {
        const p = document.createElement("div");
        p.className = "superbest-particle";
        p.textContent = Math.random() > 0.5 ? "✨" : "♪";
        p.style.left = `${Math.floor(Math.random() * 96)}%`;
        p.style.top = `${Math.floor(Math.random() * 96)}%`;
        scene.appendChild(p);
        setTimeout(() => { try { p.remove(); } catch {} }, 1600);
      }
    }
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now);
    const R = window.TSP_GAME.Rank;

    const attrJp = window.TSP_GAME.ATTR_META[info.envAttr]?.jp || "無属性";
    const rankJp = rankLabelNew(info.rank);

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
      renderFrame(3, flipTurn);
    } else {
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

      const flip = (WALK.facing === "right");
      renderFrame(WALK.stepFrame, flip);
    }

    spriteViewport.style.left = `calc(50% + ${WALK.x}px)`;
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
      const remain = window.TSP_GAME.LIMITS.elemGrowMax - soul.growStats[info.elemKey];
      if (info.elemGrow > 0) parts.push(`${jp}+${info.elemGrow}`);
      else if (remain <= 0) parts.push(`${jp}+0`);
    }
    growthPreview.textContent = parts.join(" / ");
  }

  // ===== Modal (Comeback) =====
  function openSoulModal(code) {
    modalSoulText.value = code;
    soulModal.classList.remove("hidden");
    soulModal.setAttribute("aria-hidden", "false");
  }

  function closeSoulModal() {
    soulModal.classList.add("hidden");
    soulModal.setAttribute("aria-hidden", "true");
  }

  function doComeback() {
    if (!soul) return;
    const code = window.TSP_STATE.makeSoulCode(soul);
    openSoulModal(code);
  }

  async function copySoulCode() {
    const text = modalSoulText.value || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("コードをコピーしました");
    } catch {
      modalSoulText.focus();
      modalSoulText.select();
      alert("この画面でコピーしてください（クリップボードに保存できませんでした）");
    }
  }

  function eject() {
    closeSoulModal();
    soul = null;
    setHeader();
    show(startView);
  }

  // ★追加：カムバックをやめる（モーダルを閉じて続行）
  function cancelComeback() {
    closeSoulModal();
  }

  // ===== Tick loop =====
  function rafLoop(msNow) {
    if (lastRafMs == null) lastRafMs = msNow;
    const dtSec = Math.min(0.05, (msNow - lastRafMs) / 1000);
    lastRafMs = msNow;

    const tab = activeTabKey();

    if (soul && tab === "home") {
      secondsAccum += dtSec;
      if (secondsAccum >= 60) {
        secondsAccum -= 60;
        window.TSP_GAME.applyOneMinute(soul, MONSTER, envApplied, new Date(), elemCounter);
        refreshStatsUI();
      }
      updateGrowthPreviewAndTimer();
      renderByCurrentEnv(dtSec);
    }

    requestAnimationFrame(rafLoop);
  }

  // ===== Bind events =====
  function bindEvents() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
        if (btn.dataset.tab === "home") {
          updateGrowthPreviewAndTimer();
          renderByCurrentEnv(0);
        }
      });
    });

    newSoulBtn.addEventListener("click", () => {
      const saga = String(sagaInput.value || "").trim();
      if (!saga) return alert("サーガ名を入力してください");

      soul = window.TSP_STATE.newSoulWindragon(saga);

      envDraft = { ...soul.envSetting };
      envApplied = { ...soul.envSetting };

      secondsAccum = 0;
      lastRafMs = null;
      WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
      IDLE.timer = 0; IDLE.frame = 1;

      initSliders();
      setSlidersFromDraft();
      refreshEnvUI();

      show(mainView);
      switchTab("home");

      setSpriteSheet();
      setHeader();
      refreshStatsUI();
      refreshCrystalsUI();
      updateGrowthPreviewAndTimer();
      renderByCurrentEnv(0);
    });

    textRebornBtn.addEventListener("click", () => {
      const saga = String(sagaInput.value || "").trim();
      if (!saga) return alert("サーガ名を入力してください");

      try {
        const parsed = window.TSP_STATE.parseSoulCode(soulTextInput.value);
        window.TSP_STATE.assertSagaMatch(parsed, saga);
        soul = parsed;

        envDraft = { ...(soul.envSetting || { temp: 0, hum: 50, light: 50 }) };
        envApplied = { ...envDraft };

        secondsAccum = 0;
        lastRafMs = null;
        WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
        IDLE.timer = 0; IDLE.frame = 1;

        initSliders();
        setSlidersFromDraft();
        refreshEnvUI();

        show(mainView);
        switchTab("home");

        setSpriteSheet();
        setHeader();
        refreshStatsUI();
        refreshCrystalsUI();
        updateGrowthPreviewAndTimer();
        renderByCurrentEnv(0);
      } catch (e) {
        alert(e.message || String(e));
      }
    });

    comebackBtn.addEventListener("click", doComeback);

    nicknameApplyBtn.addEventListener("click", () => {
      if (!soul) return;
      soul.nickname = String(nicknameInput.value || "").trim();
      setHeader();
    });

    tempSlider.addEventListener("input", () => { readDraftFromSliders(); refreshEnvUI(); });
    humiditySlider.addEventListener("input", () => { readDraftFromSliders(); refreshEnvUI(); });
    lightSlider.addEventListener("input", () => { readDraftFromSliders(); refreshEnvUI(); });

    neutralBtn.addEventListener("click", () => {
      envDraft = { temp: 0, hum: 50, light: 50 };
      setSlidersFromDraft();
      refreshEnvUI();
    });

    applyEnvBtn.addEventListener("click", async () => {
      try {
        await playAdventureAndApply();
      } catch (e) {
        alert(e.message || String(e));
        lockUI(false);
      }
    });

    copySoulBtn.addEventListener("click", copySoulCode);
    ejectBtn.addEventListener("click", eject);

    // ★追加
    if (cancelComebackBtn) cancelComebackBtn.addEventListener("click", cancelComeback);
  }

  // ===== Boot =====
  function boot() {
    startView = $("startView");
    mainView = $("mainView");
    headerSub = $("headerSub");

    sagaInput = $("sagaInput");
    newSoulBtn = $("newSoulBtn");
    soulTextInput = $("soulTextInput");
    textRebornBtn = $("textRebornBtn");

    tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
    tabEls = {
      home: $("tab-home"),
      environment: $("tab-environment"),
      legendz: $("tab-legendz"),
      crystal: $("tab-crystal"),
    };

    envAttributeLabel = $("envAttributeLabel");
    growthTimer = $("growthTimer");
    growthPreview = $("growthPreview");
    comebackBtn = $("comebackBtn");

    spriteViewport = $("spriteViewport");
    spriteSheetLayer = $("spriteSheetLayer");
    spriteFxLayer = $("spriteFxLayer");

    tempSlider = $("tempSlider");
    humiditySlider = $("humiditySlider");
    lightSlider = $("lightSlider");
    tempValue = $("tempValue");
    humidityValue = $("humidityValue");
    lightValue = $("lightValue");
    lightLabel = $("lightLabel");
    envPreviewLabel = $("envPreviewLabel");
    neutralBtn = $("neutralBtn");
    applyEnvBtn = $("applyEnvBtn");

    speciesName = $("speciesName");
    nicknameInput = $("nicknameInput");
    nicknameApplyBtn = $("nicknameApplyBtn");
    legendzAttribute = $("legendzAttribute");
    hpStat = $("hpStat");
    magicStat = $("magicStat");
    counterStat = $("counterStat");
    strikeStat = $("strikeStat");
    healStat = $("healStat");

    crystalList = $("crystalList");

    soulModal = $("soulModal");
    modalSoulText = $("modalSoulText");
    copySoulBtn = $("copySoulBtn");
    ejectBtn = $("ejectBtn");
    cancelComebackBtn = $("cancelComebackBtn");

    show(startView);
    setHeader();

    initSliders();
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };
    setSlidersFromDraft();
    refreshEnvUI();

    bindEvents();
    requestAnimationFrame(rafLoop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
