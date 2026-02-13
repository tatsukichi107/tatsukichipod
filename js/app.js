/* =========================================================
 * app.js（完全版・チェックポイント診断入り v0.76）
 *
 * 目的：
 * - 「新規/記憶でリボーンできない」＝処理途中で落ちて無反応になる問題を、
 *   スマホだけでも原因特定できるようにする。
 *
 * 仕様：
 * - 主要操作（新規/記憶/環境決定/カムバック）を try/catch で包む
 * - どこまで進んだか「チェックポイント」を画面下に表示
 * - 落ちたら alert で必ず理由を出す
 *
 * 注意：
 * - チェックポイント表示はデバッグ用。復旧したら消せる。
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ===== Debug: checkpoint banner =====
  let cpBox = null;
  function ensureCpBox() {
    if (cpBox) return cpBox;
    cpBox = document.createElement("div");
    cpBox.style.position = "fixed";
    cpBox.style.left = "0";
    cpBox.style.right = "0";
    cpBox.style.bottom = "0";
    cpBox.style.zIndex = "99999";
    cpBox.style.padding = "8px 10px";
    cpBox.style.fontSize = "12px";
    cpBox.style.lineHeight = "1.35";
    cpBox.style.color = "white";
    cpBox.style.background = "rgba(0,0,0,0.75)";
    cpBox.style.borderTop = "1px solid rgba(255,255,255,0.2)";
    cpBox.textContent = "CP: booting…";
    document.body.appendChild(cpBox);
    return cpBox;
  }
  function cp(msg) {
    ensureCpBox().textContent = "CP: " + msg;
  }
  function fail(where, err) {
    const m = (err && (err.message || String(err))) || "unknown error";
    cp(`FAIL @ ${where}: ${m}`);
    alert(`エラー発生（${where}）\n${m}`);
    console.error(where, err);
  }

  // ===== Hard requirements =====
  function must(id) {
    const el = $(id);
    if (!el) throw new Error(`DOM missing: #${id}`);
    return el;
  }
  function assertDeps() {
    if (!window.TSP_STATE) throw new Error("TSP_STATE is undefined（state.jsが読み込めていない可能性）");
    if (!window.TSP_GAME) throw new Error("TSP_GAME is undefined（game.jsが読み込めていない可能性）");
    if (!Array.isArray(window.TSP_GAME.TEMP_STEPS)) throw new Error("TSP_GAME.TEMP_STEPS がありません");
    if (!Array.isArray(window.TSP_GAME.HUM_STEPS)) throw new Error("TSP_GAME.HUM_STEPS がありません");
  }

  // ===== DOM refs =====
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;

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

  // 環境（ドラフト・反映）
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };

  // 成長カウンタ（属性ごとの周期）
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  // タイマー
  let secondsAccum = 0;
  let lastRafMs = null;

  // ===== Monster / Sprite =====
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

  // Walk/Idle state
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

  // FX emitter
  const superBestEmitter = { accum: 0 };

  // ===== View helpers =====
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

  function displayNickname(s) {
    const nick = String(s.nickname || "").trim();
    return nick ? nick : "未登録";
  }

  function setHeader() {
    if (!headerLine1 || !headerLine2 || !headerLine3) return;

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
    const l = lIdx === 0 ? 0 : lIdx === 1 ? 50 : 100;
    envDraft = { temp: t, hum: h, light: l };
  }

  function setSlidersFromDraft() {
    const tIdx = window.TSP_GAME.TEMP_STEPS.indexOf(envDraft.temp);
    const hIdx = window.TSP_GAME.HUM_STEPS.indexOf(envDraft.hum);
    tempSlider.value = String(Math.max(0, tIdx));
    humiditySlider.value = String(Math.max(0, hIdx));
    lightSlider.value = String(envDraft.light === 0 ? 0 : envDraft.light === 50 ? 1 : 2);
  }

  function updateLightLabelByHumidity() {
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
    cp("applyEnv: lockUI");
    lockUI(true);

    const tabEnv = tabEls.environment;
    const overlay = document.createElement("div");
    overlay.className = "adventure-overlay";
    overlay.textContent = "冒険中…";
    tabEnv.appendChild(overlay);

    cp("applyEnv: waiting 3s");
    await sleep(3000);

    overlay.remove();

    cp("applyEnv: commit envApplied");
    envApplied = { ...envDraft };

    switchTab("home");
    lockUI(false);

    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);

    cp("applyEnv: done");
  }

  // ===== Sprite render =====
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

    const flip = (WALK.facing === "right");
    renderFrame(WALK.stepFrame, flip);
    spriteViewport.style.left = `calc(50% + ${WALK.x}px)`;
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

  // ===== Comeback modal =====
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
    cp("comeback: makeSoulCode");
    const code = window.TSP_STATE.makeSoulCode(soul);
    openSoulModal(code);
    cp("comeback: opened");
  }

  async function copySoulCode() {
    const text = modalSoulText.value || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("記憶をコピーしました");
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
        try {
          window.TSP_GAME.applyOneMinute(soul, MONSTER, envApplied, new Date(), elemCounter);
          refreshStatsUI();
        } catch (e) {
          fail("applyOneMinute", e);
        }
      }

      try {
        updateGrowthPreviewAndTimer();
        renderByCurrentEnv(dtSec);
      } catch (e) {
        fail("homeTickRender", e);
      }
    }

    requestAnimationFrame(rafLoop);
  }

  // ===== Reborn pipelines =====
  function pipelineAfterReborn(where) {
    // where: "new" or "memory"
    cp(`${where}: CP1 envSetting read`);

    // envSetting は保存しない仕様なので、常に無属性へ戻す（＝再リボーン時は無属性固定）
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };

    cp(`${where}: CP2 init sliders`);
    initSliders();
    setSlidersFromDraft();
    refreshEnvUI();

    cp(`${where}: CP3 show main`);
    show(mainView);
    switchTab("home");

    cp(`${where}: CP4 sprite set`);
    setSpriteSheet();

    cp(`${where}: CP5 header/stats/crystal`);
    setHeader();
    refreshStatsUI();
    refreshCrystalsUI();

    cp(`${where}: CP6 timers/render`);
    secondsAccum = 0;
    lastRafMs = null;
    WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
    IDLE.timer = 0; IDLE.frame = 1;

    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);

    cp(`${where}: DONE`);
  }

  // ===== Bind events =====
  function bindEvents() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          switchTab(btn.dataset.tab);
          if (btn.dataset.tab === "home") {
            updateGrowthPreviewAndTimer();
            renderByCurrentEnv(0);
          }
        } catch (e) {
          fail("tabSwitch", e);
        }
      });
    });

    newSoulBtn.addEventListener("click", () => {
      try {
        cp("new: click");
        const saga = String(sagaInput.value || "").trim();
        if (!saga) return alert("サーガ名を入力してください");

        cp("new: call newSoulWindragon");
        soul = window.TSP_STATE.newSoulWindragon(saga);

        cp("new: pipeline");
        pipelineAfterReborn("new");
      } catch (e) {
        fail("newReborn", e);
      }
    });

    textRebornBtn.addEventListener("click", () => {
      try {
        cp("mem: click");
        const saga = String(sagaInput.value || "").trim();
        if (!saga) return alert("サーガ名を入力してください");

        const code = String(soulTextInput.value || "").trim();
        if (!code) return alert("記憶が空です");

        cp("mem: parseSoulCode");
        const parsed = window.TSP_STATE.parseSoulCode(code);

        cp("mem: assertSagaMatch");
        window.TSP_STATE.assertSagaMatch(parsed, saga);

        soul = parsed;

        cp("mem: pipeline");
        pipelineAfterReborn("mem");
      } catch (e) {
        fail("memoryReborn", e);
      }
    });

    comebackBtn.addEventListener("click", () => {
      try {
        if (!soul) return;
        doComeback();
      } catch (e) {
        fail("comeback", e);
      }
    });

    nicknameApplyBtn.addEventListener("click", () => {
      try {
        if (!soul) return;
        soul.nickname = String(nicknameInput.value || "").trim();
        setHeader();
      } catch (e) {
        fail("nicknameApply", e);
      }
    });

    tempSlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { fail("tempInput", e); }
    });
    humiditySlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { fail("humInput", e); }
    });
    lightSlider.addEventListener("input", () => {
      try { readDraftFromSliders(); refreshEnvUI(); }
      catch (e) { fail("lightInput", e); }
    });

    neutralBtn.addEventListener("click", () => {
      try {
        envDraft = { temp: 0, hum: 50, light: 50 };
        setSlidersFromDraft();
        refreshEnvUI();
      } catch (e) {
        fail("neutralBtn", e);
      }
    });

    applyEnvBtn.addEventList
