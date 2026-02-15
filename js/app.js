// FILE: js/app.js
/* =========================================================
 * js/app.js  v0.77-FX4 + stability fixpack
 *
 * 今回の修正（症状対応）：
 * - レジェンズが小さい/表示されない → スプライト初期化（サイズ/背景/表示）を安定化
 * - 歩行スピードが速すぎる → 速度を控えめに戻す
 * - 左向きのときだけ表情が出ない → 反転ルールを「右向きだけ左右反転」に固定
 * - 環境決定の冒険中表示が出ない → overlay の差し込み先を安定化
 * - 演出が画面いっぱいに出る → パーティクルを必ず #tab-home .scene にだけ出す
 * - カムバックが効かない → 未リボーン時の非表示 + クリック処理の再確認
 * - 試し撃ちボタンが消えて技名が全部ボタンになる → ワザUIを「試し撃ちボタン」固定で再描画
 * - 無属性なのにホームの「無属性環境にする」が出る → rank===neutral で確実に非表示
 *
 * 重要方針：
 * - IDは絶対に変えない（HTML/CSSの既存ID前提）
 * - 既存仕様（記憶/リボーン/育成/演出/モーダル）はできる限り維持
 * ========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  function must(id) {
    const el = $(id);
    if (!el) throw new Error(`DOM missing: #${id}`);
    return el;
  }

  function safeText(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
  }

  // ===== lightweight UI notice (no native dialogs) =====
  let noticeModal = null;
  let toastEl = null;
  let toastTimer = null;

  function ensureToast() {
    if (toastEl) return toastEl;
    const el = document.createElement("div");
    el.id = "tspToast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "calc(84px + env(safe-area-inset-bottom, 0px))";
    el.style.transform = "translateX(-50%)";
    el.style.zIndex = "120";
    el.style.maxWidth = "92vw";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "14px";
    el.style.border = "1px solid rgba(255,255,255,0.14)";
    el.style.background = "rgba(15,18,28,0.92)";
    el.style.backdropFilter = "blur(10px)";
    el.style.color = "rgba(255,255,255,0.92)";
    el.style.fontSize = "13px";
    el.style.lineHeight = "1.45";
    el.style.boxShadow = "0 14px 28px rgba(0,0,0,0.35)";
    el.style.display = "none";
    el.style.whiteSpace = "pre-wrap";
    document.body.appendChild(el);
    toastEl = el;
    return el;
  }

  function toast(msg, ms = 1400) {
    try {
      const el = ensureToast();
      el.textContent = String(msg ?? "");
      el.style.display = "block";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = "none"; }, ms);
    } catch {
      console.error("toast failed", msg);
    }
  }

  function ensureNoticeModal() {
    if (noticeModal) return noticeModal;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal">
        <div id="nzTitle" class="modal-title">お知らせ</div>
        <div id="nzBody" style="color:var(--muted); font-size:13px; line-height:1.55; white-space:pre-wrap;"></div>
        <div class="modal-actions" style="margin-top:12px;">
          <button id="nzOkBtn">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeNotice();
    });

    noticeModal = modal;
    $("nzOkBtn").onclick = () => closeNotice();

    return noticeModal;
  }

  function openNotice(title, body) {
    const m = ensureNoticeModal();
    $("nzTitle").textContent = String(title ?? "お知らせ");
    $("nzBody").textContent = String(body ?? "");
    m.classList.add("active");
  }

  function closeNotice() {
    if (!noticeModal) return;
    noticeModal.classList.remove("active");
  }

  function showError(where, e) {
    const msg = (e && (e.message || String(e))) || "unknown";
    console.error(where, e);
    openNotice("エラー", `（${where}）\n${msg}`);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ===== Monster / sprite config =====
  const MONSTER = {
    id: "windragon",
    spritePath: "./assets/sprites/windragon.png",
    superBest: { temp: -45, hum: 5, waterDepth: 50 }
    // bestAreaId は必要ならここに付与（例：bestAreaId:"T2"）
  };

  const SHEET = {
    frameW: 24,
    frameH: 32,
    scale: 3,
    // 1..8 を (r,c) に変換（1-4:上段, 5-8:下段）
    frameToRC(i) {
      const idx = Math.max(1, Math.min(8, i)) - 1;
      return { r: Math.floor(idx / 4), c: idx % 4 };
    }
  };

  const WALK = {
    halfRangePx: 84,
    speedPxPerSec: 7.5, // ★速すぎ対策（以前より控えめ）
    facing: "right",
    x: 0,
    stepTimer: 0,
    stepFrame: 1,
    turnTimer: 0
  };

  const IDLE = { timer: 0, frame: 1 };

  // ===== Particle emit accumulators =====
  const FX = { superAcc: 0, bestAcc: 0, goodAcc: 0 };

  // ===== DOM refs =====
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;

  let sagaInput, soulTextInput, newSoulBtn, textRebornBtn;

  let tabBtns;
  let tabEls;

  let envAttributeLabel, growthTimer, growthPreview, comebackBtn;
  let homeNeutralBtn;

  let spriteMover, spriteViewport, spriteSheetLayer, spriteFxLayer;
  let scene; // ★必ず HOME の .scene

  let tempSlider, humiditySlider;
  let tempValue, humidityValue, lightValue, lightLabel;
  let envPreviewLabel, neutralBtn, applyEnvBtn;

  let lightBtn0, lightBtn50, lightBtn100;

  let speciesName, nicknameInput, nicknameApplyBtn, legendzAttribute;
  let hpStat, magicStat, counterStat, strikeStat, healStat;

  let skillSlots;
  let crystalList;

  // ===== Modals =====
  let comebackModal = null;
  let confirmModal = null;

  // ===== State =====
  let soul = null;
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  let secondsAccum = 0;
  let lastRafMs = null;
  let uiLocked = false;

  // ===== Skills event guard =====
  let skillsClickBound = false;

  // ★FX state tracking
  let lastRankKey = null;

  function lockUI(on) {
    uiLocked = on;
    if (tabBtns) tabBtns.forEach(b => (b.disabled = on));
    if (applyEnvBtn) applyEnvBtn.disabled = on;
    if (neutralBtn) neutralBtn.disabled = on;
    if (homeNeutralBtn) homeNeutralBtn.disabled = on;
  }

  function setUnrebornFlag(isUnreborn) {
    document.body.classList.toggle("unreborn", !!isUnreborn);
  }

  // ===== View / Tab =====
  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
    setUnrebornFlag(view === startView);
  }

  function activeTabKey() {
    const btn = tabBtns.find(b => b.classList.contains("active"));
    return (btn && btn.dataset) ? (btn.dataset.tab || "home") : "home";
  }

  function switchTab(key) {
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === key));
    Object.values(tabEls).forEach(el => el.classList.remove("active"));
    tabEls[key].classList.add("active");
  }

  // ===== Header =====
  function displayNickname(s) {
    const n = safeText(s && s.nickname);
    return n ? n : "未登録";
  }

  function setHeader() {
    if (!soul) {
      headerLine1.textContent = "";
      headerLine2.textContent = "";
      headerLine3.textContent = "未リボーン";
      return;
    }
    const saga = safeText(soul.sagaName);
    const sp = safeText(soul.speciesName);
    const nick = displayNickname(soul);

    headerLine1.textContent = `サーガ名：${saga}`;
    headerLine2.textContent = `種族名：${sp} / ニックネーム：${nick}`;
    headerLine3.textContent = "リボーン中";
  }

  function attrJp(attrCanonOrKey) {
    const meta = window.TSP_GAME && window.TSP_GAME.ATTR_META;
    const k = String(attrCanonOrKey || "neutral");
    return (meta && meta[k] && meta[k].jp) ? meta[k].jp : (k === "neutral" ? "無属性" : k);
  }

  function setHomeBackgroundByEnvAttr(envAttr) {
    if (!scene) return;
    scene.classList.remove("attr-none", "attr-volcano", "attr-tornado", "attr-earthquake", "attr-storm");
    switch (String(envAttr)) {
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
    legendzAttribute.textContent = attrJp(soul.attribute);

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

  // ===== Skills (dummy) =====
  const DUMMY_SKILLS = Array.from({ length: 15 }, (_, i) => ({
    id: `skill_${i + 1}`,
    name: `ワザ${String(i + 1).padStart(2, "0")}`,
    meta: (i % 3 === 0) ? "攻撃" : (i % 3 === 1 ? "補助" : "回復")
  }));

  function renderSkillsUI() {
    if (!skillSlots) return;
    skillSlots.innerHTML = "";
    DUMMY_SKILLS.forEach((sk, idx) => {
      const row = document.createElement("div");
      row.className = "skill-slot";
      row.innerHTML = `
        <div class="left">
          <div class="name">${sk.name}</div>
          <div class="meta">${sk.meta} / Slot ${idx + 1}</div>
        </div>
        <button type="button" class="try-btn" data-skill="${sk.id}">試し撃ち</button>
      `;
      skillSlots.appendChild(row);
    });
  }

  function bindSkillsClickOnce() {
    if (!skillSlots || skillsClickBound) return;
    skillsClickBound = true;

    skillSlots.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest(".try-btn");
      if (!btn) return;

      const id = btn.getAttribute("data-skill");
      const sk = DUMMY_SKILLS.find(s => s.id === id);
      if (!sk) return;

      openNotice("試し撃ち", `${sk.name} を試し撃ち！`);
    });
  }

  // ===== Env sliders =====
  function initSliders() {
    tempSlider.min = "0";
    tempSlider.max = String(window.TSP_GAME.TEMP_STEPS.length - 1);
    tempSlider.step = "1";

    humiditySlider.min = "0";
    humiditySlider.max = String(window.TSP_GAME.HUM_STEPS.length - 1);
    humiditySlider.step = "1";
  }

  function setLightDraft(value) {
    envDraft.light = value;
    lightValue.textContent = String(value);

    [lightBtn0, lightBtn50, lightBtn100].forEach(b => b.classList.remove("active"));
    if (value === 0) lightBtn0.classList.add("active");
    else if (value === 50) lightBtn50.classList.add("active");
    else lightBtn100.classList.add("active");
  }

  function readDraftFromSlidersOnly() {
    const t = window.TSP_GAME.TEMP_STEPS[Number(tempSlider.value)] ?? 0;
    const h = window.TSP_GAME.HUM_STEPS[Number(humiditySlider.value)] ?? 50;
    envDraft.temp = t;
    envDraft.hum = h;
  }

  function setSlidersFromDraft() {
    const tIdx = window.TSP_GAME.TEMP_STEPS.indexOf(Number(envDraft.temp));
    const hIdx = window.TSP_GAME.HUM_STEPS.indexOf(Number(envDraft.hum));
    tempSlider.value = String(Math.max(0, tIdx));
    humiditySlider.value = String(Math.max(0, hIdx));
  }

  function updateLightLabelByHumidity() {
    lightLabel.textContent = (Number(envDraft.hum) === 100) ? "水深" : "光量";
  }

  function refreshEnvUI() {
    tempValue.textContent = `${envDraft.temp}℃`;
    humidityValue.textContent = `${envDraft.hum}％`;
    updateLightLabelByHumidity();

    // ★予想環境は「属性のみ」
    const attr = window.TSP_GAME.envAttribute(envDraft.temp, envDraft.hum, envDraft.light);
    envPreviewLabel.textContent = (attr === "neutral") ? "無属性" : attrJp(attr);
  }

  // ===== Adventure apply =====
  async function playAdventureAndApply() {
    if (uiLocked) return;

    lockUI(true);

    // ★差し込み先を安定化（#tab-environment 内の .panel があればそこ、なければ section）
    const tabEnv = tabEls.environment;
    const host = tabEnv.querySelector(".panel") || tabEnv;

    const overlay = document.createElement("div");
    overlay.className = "adventure-overlay";
    overlay.textContent = "冒険中…";
    host.appendChild(overlay);

    await sleep(3000);

    try { overlay.remove(); } catch {}

    envApplied = { ...envDraft };
    secondsAccum = 0;

    // 環境確定後は必ず切替扱いにして、FXが出ない事故を防ぐ
    lastRankKey = null;

    switchTab("home");
    lockUI(false);

    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  // =========================================================
  // Sprite / Rendering
  // =========================================================
  function setupSpriteDomSizes() {
    // ★「小さくなる/見えない」事故の多くはここ（サイズ未設定/上書き）
    spriteViewport.style.width = (SHEET.frameW * SHEET.scale) + "px";
    spriteViewport.style.height = (SHEET.frameH * SHEET.scale) + "px";

    // シート全体 4*24=96, 2*32=64
    spriteSheetLayer.style.width = (96 * SHEET.scale) + "px";
    spriteSheetLayer.style.height = (64 * SHEET.scale) + "px";
    spriteSheetLayer.style.backgroundRepeat = "no-repeat";
    spriteSheetLayer.style.backgroundSize = `${96 * SHEET.scale}px ${64 * SHEET.scale}px`;
  }

  function setSpriteSheet() {
    // ★背景が消えて表示されない事故を防ぐ
    spriteSheetLayer.style.backgroundImage = `url("${MONSTER.spritePath}")`;
    spriteSheetLayer.style.backgroundPosition = "0px 0px";
    spriteSheetLayer.style.display = "block";
  }

  // ★右向きだけ左右反転（左向きは素のまま）
  function setFacing(direction) {
    spriteViewport.style.transform = (direction === "right") ? "scaleX(-1)" : "scaleX(1)";
  }

  function applyMoveX(xPx) {
    spriteMover.style.transform = `translateX(${xPx}px)`;
  }

  function renderFrame(frameIndex) {
    const rc = SHEET.frameToRC(frameIndex);
    const x = -(rc.c * SHEET.frameW * SHEET.scale);
    const y = -(rc.r * SHEET.frameH * SHEET.scale);
    spriteSheetLayer.style.backgroundPosition = `${x}px ${y}px`;
  }

  // ===== FX helpers =====
  function clearSceneFxClasses() {
    if (!scene) return;
    scene.classList.remove("fx-superbest", "fx-best", "fx-good", "fx-bad");
  }

  function removeParticles() {
    if (!scene) return;
    qsa("#tab-home .scene .tsp-particle").forEach(p => p.remove());
  }

  function clearFxAllHard() {
    if (spriteFxLayer) spriteFxLayer.innerHTML = "";
    clearSceneFxClasses();
    removeParticles();
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function spawnParticle({ text, xPct, yPct, cls, dur, dx, dy, rot, scale, sizePx }) {
    if (!scene) return;

    const p = document.createElement("div");
    p.className = `tsp-particle ${cls}`;
    p.textContent = text;
    p.style.left = `${xPct}%`;
    p.style.top = `${yPct}%`;
    p.style.setProperty("--tspDur", `${dur}s`);
    p.style.setProperty("--tspDX", `${dx}px`);
    p.style.setProperty("--tspDY", `${dy}px`);
    p.style.setProperty("--tspR", `${rot}deg`);
    p.style.setProperty("--tspS", `${scale}`);
    p.style.fontSize = `${sizePx}px`;

    scene.appendChild(p);

    const rmMs = Math.max(900, dur * 1000 + 220);
    setTimeout(() => { try { p.remove(); } catch {} }, rmMs);
  }

  function emitSuperbest(dtSec) {
    if (!scene) return;
    scene.classList.add("fx-superbest");

    FX.superAcc += dtSec;
    const interval = 0.06;
    while (FX.superAcc >= interval) {
      FX.superAcc -= interval;

      const count = 6;
      for (let i = 0; i < count; i++) {
        const isSpark = Math.random() > 0.52;
        const text = isSpark ? "✨" : "♪";

        spawnParticle({
          text,
          xPct: rand(2, 98),
          yPct: rand(2, 98),
          cls: "tsp-fly",
          dur: rand(1.0, 1.9),
          dx: rand(-140, 140),
          dy: rand(-220, 80),
          rot: rand(-30, 30),
          scale: rand(0.9, 1.35),
          sizePx: isSpark ? rand(16, 24) : rand(14, 22)
        });
      }
    }
  }

  function emitBest(dtSec) {
    if (!scene) return;
    scene.classList.add("fx-best");

    FX.bestAcc += dtSec;
    const interval = 0.12;
    while (FX.bestAcc >= interval) {
      FX.bestAcc -= interval;

      const count = 4;
      for (let i = 0; i < count; i++) {
        const isSpark = Math.random() > 0.86;
        const text = isSpark ? "✨" : "♪";

        spawnParticle({
          text,
          xPct: rand(4, 96),
          yPct: rand(-8, 6),
          cls: "tsp-fall",
          dur: rand(1.4, 2.2),
          dx: rand(-22, 22),
          dy: rand(220, 340),
          rot: rand(-12, 12),
          scale: rand(0.9, 1.2),
          sizePx: isSpark ? rand(16, 22) : rand(14, 20)
        });
      }
    }
  }

  function emitGood(dtSec) {
    if (!scene) return;
    scene.classList.add("fx-good");

    FX.goodAcc += dtSec;
    const interval = 0.45;
    while (FX.goodAcc >= interval) {
      FX.goodAcc -= interval;

      const count = 1 + (Math.random() > 0.7 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        spawnParticle({
          text: "♪",
          xPct: rand(8, 92),
          yPct: rand(-6, 10),
          cls: "tsp-drift",
          dur: rand(1.8, 2.6),
          dx: rand(-14, 14),
          dy: rand(160, 240),
          rot: rand(-14, 14),
          scale: rand(0.9, 1.15),
          sizePx: rand(13, 18)
        });
      }
    }
  }

  function applyBadFx() {
    if (!scene) return;
    scene.classList.add("fx-bad");
  }

  function centerSprite() {
    WALK.x = 0;
    applyMoveX(0);
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
      setFacing(WALK.facing);
      renderFrame(3); // 振り向き
      applyMoveX(WALK.x);
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
      WALK.stepFrame = (WALK.stepFrame === 1) ? 2 : 1; // 通常1/2
    }

    setFacing(WALK.facing);
    renderFrame(WALK.stepFrame);
    applyMoveX(WALK.x);
  }

  function updateHomeNeutralButtonVisibility(rankInfo) {
    if (!homeNeutralBtn) return;
    const R = window.TSP_GAME.Rank;
    const showIt = !!rankInfo && rankInfo.rank !== R.neutral;
    homeNeutralBtn.style.display = showIt ? "block" : "none";
  }

  function makeRankKey(info) {
    return `${String(info.rank)}|${String(info.envAttr)}|${String(info.areaId)}`;
  }

  function onRankChanged(newKey) {
    clearFxAllHard();
    FX.superAcc = 0;
    FX.bestAcc = 0;
    FX.goodAcc = 0;
    lastRankKey = newKey;
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now, soul.attribute);
    const R = window.TSP_GAME.Rank;

    // ★ホーム表示は「エリア名」優先（要求）
    if (info.rank === R.neutral) {
      envAttributeLabel.textContent = "無属性";
    } else {
      const areaName = safeText(info.areaName) || attrJp(info.envAttr);
      envAttributeLabel.textContent = `${areaName}（${rankLabel(info.rank)}）`;
    }

    setHomeBackgroundByEnvAttr(info.envAttr);

    const key = makeRankKey(info);
    if (key !== lastRankKey) onRankChanged(key);

    updateHomeNeutralButtonVisibility(info);

    // ランク別 表情・演出（左向き基準のシートなので、ここでは left を基準にしてOK）
    switch (info.rank) {
      case R.superbest:
        setFacing("left");
        renderFrame(7); // 喜び
        emitSuperbest(dtSec);
        centerSprite();
        break;

      case R.best:
        setFacing("left");
        renderFrame(7); // 喜び
        emitBest(dtSec);
        centerSprite();
        break;

      case R.good:
        tickIdle(dtSec);
        setFacing("left");
        renderFrame(IDLE.frame); // 通常1/2
        emitGood(dtSec);
        centerSprite();
        break;

      case R.normal:
        tickIdle(dtSec);
        setFacing("left");
        renderFrame(IDLE.frame); // 通常1/2
        centerSprite();
        break;

      case R.bad:
        setFacing("left");
        renderFrame(8); // ダウン
        applyBadFx();
        centerSprite();
        break;

      case R.neutral:
      default:
        // 無属性は歩行
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
      parts.push(`${jp}+${info.elemGrow}`);
    }

    growthPreview.textContent = parts.join(" / ");
  }

  // ===== Comeback modal =====
  let comebackModalBound = false;

  function ensureComebackModal() {
    if (comebackModal) return comebackModal;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title">ソウルドールの記憶</div>
        <textarea id="cbCodeArea" class="modal-code" readonly></textarea>
        <div class="modal-actions">
          <button id="cbCopyBtn">ソウルドールの記憶の保存(コピー)</button>
          <button id="cbRebornBtn">カムバックする</button>
          <button id="cbCloseBtn">育成に戻る</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeComebackModal();
    });

    comebackModal = modal;
    return modal;
  }

  function openComebackModal(code) {
    const m = ensureComebackModal();
    const area = $("cbCodeArea");
    area.value = code;

    if (!comebackModalBound) {
      comebackModalBound = true;

      $("cbCopyBtn").onclick = async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(area.value);
            toast("記憶をコピーしました");
          } else {
            area.focus();
            area.select();
            openNotice("コピー", "自動コピー非対応です。\n選択された状態なので手動でコピーしてください。");
          }
        } catch (e) {
          showError("copy", e);
        }
      };

      $("cbRebornBtn").onclick = () => {
        try {
          closeComebackModal();
          soul = null;
          setHeader();
          show(startView);
        } catch (e) {
          showError("cbRebornBtn", e);
        }
      };

      $("cbCloseBtn").onclick = () => closeComebackModal();
    }

    m.classList.add("active");
  }

  function closeComebackModal() {
    if (!comebackModal) return;
    comebackModal.classList.remove("active");
  }

  function doComeback() {
    if (!soul) return;
    const code = window.TSP_STATE.makeSoulCode(soul);
    openComebackModal(code);
  }

  // ===== Confirm modal (ムゾクセイ？ only) =====
  function ensureConfirmModal() {
    if (confirmModal) return confirmModal;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title">ムゾクセイ？</div>
        <div class="modal-actions" style="margin-top:12px;">
          <button id="cfYesBtn">はい</button>
          <button id="cfNoBtn" class="ghost">いいえ</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeConfirmModal();
    });

    confirmModal = modal;
    return modal;
  }

  function openConfirmModal(onYes) {
    const m = ensureConfirmModal();

    $("cfYesBtn").onclick = () => {
      try {
        closeConfirmModal();
        onYes && onYes();
      } catch (e) { showError("confirmYes", e); }
    };
    $("cfNoBtn").onclick = () => closeConfirmModal();

    m.classList.add("active");
  }

  function closeConfirmModal() {
    if (!confirmModal) return;
    confirmModal.classList.remove("active");
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
          showError("applyOneMinute", e);
        }
      }

      try {
        updateGrowthPreviewAndTimer();
        renderByCurrentEnv(dtSec);
      } catch (e) {
        showError("homeTickRender", e);
      }
    }

    requestAnimationFrame(rafLoop);
  }

  // ===== Neutral resets =====
  function resetToNeutralEnvApplied() {
    envApplied = { temp: 0, hum: 50, light: 50 };
    secondsAccum = 0;
    lastRankKey = null;

    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  function resetToNeutralEnvDraft() {
    envDraft = { temp: 0, hum: 50, light: 50 };
    setSlidersFromDraft();
    setLightDraft(50);
    refreshEnvUI();
  }

  // ===== Reborn pipeline =====
  function pipelineAfterReborn() {
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };
    secondsAccum = 0;

    setSlidersFromDraft();
    setLightDraft(50);
    refreshEnvUI();

    // ★スプライトの見えない/小さい事故を防ぐ順番
    setupSpriteDomSizes();
    setSpriteSheet();

    lastRafMs = null;

    WALK.x = 0;
    WALK.facing = "right";
    WALK.stepTimer = 0;
    WALK.stepFrame = 1;
    WALK.turnTimer = 0;

    IDLE.timer = 0;
    IDLE.frame = 1;

    FX.superAcc = 0;
    FX.bestAcc = 0;
    FX.goodAcc = 0;

    lastRankKey = null;

    setHeader();
    refreshStatsUI();
    refreshCrystalsUI();

    renderSkillsUI();
    bindSkillsClickOnce();

    show(mainView);
    switchTab("home");

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
          showError("tabSwitch", e);
        }
      });
    });

    newSoulBtn.addEventListener("click", () => {
      try {
        const saga = safeText(sagaInput.value);
        if (!saga) return openNotice("入力", "サーガ名を入力してください");
        soul = window.TSP_STATE.newSoulWindragon(saga);
        pipelineAfterReborn();
      } catch (e) {
        showError("newReborn", e);
      }
    });

    textRebornBtn.addEventListener("click", () => {
      try {
        const saga = safeText(sagaInput.value);
        if (!saga) return openNotice("入力", "サーガ名を入力してください");

        const code = safeText(soulTextInput.value);
        if (!code) return openNotice("記憶", "記憶が空です");

        const parsed = window.TSP_STATE.parseSoulCode(code);
        window.TSP_STATE.assertSagaMatch(parsed, saga);

        soul = parsed;
        pipelineAfterReborn();
      } catch (e) {
        showError("memoryReborn", e);
      }
    });

    comebackBtn.addEventListener("click", () => {
      try { doComeback(); }
      catch (e) { showError("comeback", e); }
    });

    if (homeNeutralBtn) {
      homeNeutralBtn.addEventListener("click", () => {
        try {
          if (!soul) return;
          openConfirmModal(() => {
            resetToNeutralEnvApplied();
            resetToNeutralEnvDraft();
            toast("無属性環境に戻しました");
          });
        } catch (e) {
          showError("homeNeutralBtn", e);
        }
      });
    }

    nicknameApplyBtn.addEventListener("click", () => {
      try {
        if (!soul) return;
        soul.nickname = safeText(nicknameInput.value);
        setHeader();
        toast("ニックネームを更新しました");
      } catch (e) {
        showError("nicknameApply", e);
      }
    });

    const onEnvInput = () => {
      try {
        readDraftFromSlidersOnly();
        refreshEnvUI();
      } catch (e) {
        showError("envInput", e);
      }
    };
    tempSlider.addEventListener("input", onEnvInput);
    humiditySlider.addEventListener("input", onEnvInput);

    neutralBtn.addEventListener("click", () => {
      try {
        resetToNeutralEnvDraft();
        toast("ドラフトを無属性に戻しました");
      } catch (e) { showError("neutralBtn", e); }
    });

    const bindLightBtn = (btn, val) => {
      btn.addEventListener("click", () => {
        try {
          setLightDraft(val);
          refreshEnvUI();
        } catch (e) {
          showError("lightBtn", e);
        }
      });
    };
    bindLightBtn(lightBtn0, 0);
    bindLightBtn(lightBtn50, 50);
    bindLightBtn(lightBtn100, 100);

    applyEnvBtn.addEventListener("click", async () => {
      try {
        await playAdventureAndApply();
      } catch (e) {
        lockUI(false);
        showError("applyEnvBtn", e);
      }
    });
  }

  // ===== Boot =====
  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    try {
      if (!window.TSP_STATE) throw new Error("TSP_STATEがありません（state.js未読込）");
      if (!window.TSP_GAME) throw new Error("TSP_GAMEがありません（game.js未読込）");

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
        crystal: must("tab-crystal")
      };

      envAttributeLabel = must("envAttributeLabel");
      growthTimer = must("growthTimer");
      growthPreview = must("growthPreview");
      comebackBtn = must("comebackBtn");
      homeNeutralBtn = $("homeNeutralBtn");

      spriteMover = must("spriteMover");
      spriteViewport = must("spriteViewport");
      spriteSheetLayer = must("spriteSheetLayer");
      spriteFxLayer = must("spriteFxLayer");

      // ★必ず HOME の scene に限定（画面全体に出る事故を防ぐ）
      scene = tabEls.home.querySelector(".scene");
      if (!scene) throw new Error("HOMEの .scene が見つかりません");

      tempSlider = must("tempSlider");
      humiditySlider = must("humiditySlider");
      tempValue = must("tempValue");
      humidityValue = must("humidityValue");
      lightValue = must("lightValue");
      lightLabel = must("lightLabel");

      envPreviewLabel = must("envPreviewLabel");
      neutralBtn = must("neutralBtn");
      applyEnvBtn = must("applyEnvBtn");

      lightBtn0 = must("lightBtn0");
      lightBtn50 = must("lightBtn50");
      lightBtn100 = must("lightBtn100");

      speciesName = must("speciesName");
      nicknameInput = must("nicknameInput");
      nicknameApplyBtn = must("nicknameApplyBtn");
      legendzAttribute = must("legendzAttribute");
      hpStat = must("hpStat");
      magicStat = must("magicStat");
      counterStat = must("counterStat");
      strikeStat = must("strikeStat");
      healStat = must("healStat");

      skillSlots = $("skillSlots");
      crystalList = must("crystalList");

      show(startView);
      setHeader();

      initSliders();

      envDraft = { temp: 0, hum: 50, light: 50 };
      envApplied = { ...envDraft };
      setSlidersFromDraft();
      setLightDraft(50);
      refreshEnvUI();

      setupSpriteDomSizes();
      setSpriteSheet();
      setFacing("left");
      renderFrame(1);
      applyMoveX(0);

      // ★未リボーン時に余計なボタンが見えないよう保険
      updateHomeNeutralButtonVisibility({ rank: window.TSP_GAME.Rank.neutral });

      renderSkillsUI();
      bindSkillsClickOnce();

      bindEvents();
      requestAnimationFrame(rafLoop);

    } catch (e) {
      booted = false;
      showError("boot", e);
    }
  }

  window.addEventListener("load", boot, { once: true });

})();
