/* =========================================================
 * js/app.v076.js  v0.76-FULL (Center fix + Moonwalk fix)
 *
 * 変更点（今回の要望分だけ）:
 * 1) レジェンズが右寄りになる問題を修正
 *    - 位置は常に left:50% を固定
 *    - 移動は translateX(x) のみで行う（calc(50%+x) を廃止）
 *    - 反転(scaleX)は“絵レイヤー”にのみ適用し、位置レイヤーにはかけない
 *
 * 2) ムーンウォーク（移動方向と向きが逆）を修正
 *    - 右へ歩くとき：右向きに見えるように flip を切替
 *    - 左へ歩くとき：左向きに見えるように flip を切替
 *
 * ※それ以外は前回の完全復旧版の仕様を維持
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

  function safeText(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
  }

  function alertErr(where, e) {
    const msg = (e && (e.message || String(e))) || "unknown";
    alert(`エラー（${where}）\n${msg}`);
    console.error(where, e);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

  const WALK = {
    halfRangePx: 84,
    speedPxPerSec: 12,
    facing: "right",  // right / left
    x: 0,
    stepTimer: 0,
    stepFrame: 1,
    turnTimer: 0
  };

  const IDLE = { timer: 0, frame: 1 };
  const SUPER_FX = { accum: 0 };

  // ===== DOM refs =====
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;

  let sagaInput, soulTextInput, newSoulBtn, textRebornBtn;

  let tabBtns;
  let tabEls;

  let envAttributeLabel, growthTimer, growthPreview, comebackBtn;
  let spriteViewport, spriteSheetLayer, spriteFxLayer;
  let scene;

  let tempSlider, humiditySlider, lightSlider;
  let tempValue, humidityValue, lightValue, lightLabel;
  let envPreviewLabel, neutralBtn, applyEnvBtn;

  let speciesName, nicknameInput, nicknameApplyBtn, legendzAttribute;
  let hpStat, magicStat, counterStat, strikeStat, healStat;

  let crystalList;

  // comeback modal
  let comebackModal = null;

  // ===== State =====
  let soul = null;
  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  let secondsAccum = 0;
  let lastRafMs = null;
  let uiLocked = false;

  function lockUI(on) {
    uiLocked = on;
    if (tabBtns) tabBtns.forEach(b => (b.disabled = on));
    if (applyEnvBtn) applyEnvBtn.disabled = on;
    if (neutralBtn) neutralBtn.disabled = on;
  }

  // ===== View / Tab =====
  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
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

  function attrJp(attr) {
    const meta = window.TSP_GAME && window.TSP_GAME.ATTR_META;
    if (attr === "neutral") return "無属性";
    return (meta && meta[attr] && meta[attr].jp) ? meta[attr].jp : String(attr || "");
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
    envPreviewLabel.textContent = (attr === "neutral") ? "無属性" : attrJp(attr);
  }

  // ===== Adventure apply =====
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
    secondsAccum = 0;

    switchTab("home");
    lockUI(false);

    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  // =========================================================
  // Sprite helpers（今回の修正核心）
  //
  // 位置：spriteViewport に translateX(x) を適用
  // 中心：spriteViewport は left:50% を固定
  // 反転：spriteSheetLayer に scaleX(-1) を適用（位置レイヤーにかけない）
  // =========================================================
  function ensureViewportCenteringBase() {
    // CSSがどうでも、JSで確実に center 基準を作る
    spriteViewport.style.position = "relative";
    spriteViewport.style.left = "50%";
    // 中心合わせ（-50%）と移動（x）は viewport で管理
    // 反転は sheet layer で管理する
  }

  function setSpriteSheet() {
    spriteSheetLayer.style.backgroundImage = `url("${MONSTER.spritePath}")`;
  }

  function applyViewportTransform(xPx) {
    // 位置：常に中心(-50%) + 移動(x)
    spriteViewport.style.transform = `translateX(calc(-50% + ${xPx}px))`;
  }

  function applyFlipToSheetLayer(flipX) {
    // 反転は「絵レイヤー」だけに
    spriteSheetLayer.style.transformOrigin = "center";
    spriteSheetLayer.style.transform = flipX ? "scaleX(-1)" : "scaleX(1)";
  }

  function renderFrame(frameIndex, flipX) {
    const rc = SHEET.frameToRC(frameIndex);
    const x = -(rc.c * SHEET.frameW * SHEET.scale);
    const y = -(rc.r * SHEET.frameH * SHEET.scale);
    spriteSheetLayer.style.backgroundPosition = `${x}px ${y}px`;

    // ★今回の変更：反転はsheetLayerのみ
    applyFlipToSheetLayer(!!flipX);
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

  function emitSuperBestFx(dtSec) {
    if (!scene) return;
    scene.classList.add("superbest-burst");

    SUPER_FX.accum += dtSec;
    const interval = 0.10;

    while (SUPER_FX.accum >= interval) {
      SUPER_FX.accum -= interval;
      for (let k = 0; k < 4; k++) {
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
    WALK.x = 0;
    applyViewportTransform(0);
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

      // 折返し振り向き：向いている方向に合わせる（見た目）
      // ★ムーンウォーク修正に合わせて flip 条件も統一
      // 「全スプライトは左向き前提」なので、
      // 左向きで見せたいとき＝非反転
      // 右向きで見せたいとき＝反転
      const flipTurn = (WALK.facing === "right"); // 右向きに見せたいなら反転
      renderFrame(3, flipTurn);
      applyViewportTransform(WALK.x);
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

    // ★ムーンウォーク修正（ここが核心）
    // 「全スプライトは左向き前提」なので：
    // - 左へ歩く → 左向きに見せる → 非反転
    // - 右へ歩く → 右向きに見せる → 反転
    const flip = (WALK.facing === "right");
    renderFrame(WALK.stepFrame, flip);

    applyViewportTransform(WALK.x);
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now, soul.attribute);
    const R = window.TSP_GAME.Rank;

    if (info.rank === R.neutral) {
      envAttributeLabel.textContent = "無属性";
    } else {
      const a = attrJp(info.envAttr);
      envAttributeLabel.textContent = `${a}（${rankLabel(info.rank)}）`;
    }

    setHomeBackgroundByEnvAttr(info.envAttr);
    clearFxAll();

    switch (info.rank) {
      case R.superbest:
        renderFrame(7, false);
        emitSuperBestFx(dtSec);
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
      parts.push(`${jp}+${info.elemGrow}`);
    }

    growthPreview.textContent = parts.join(" / ");
  }

  // ===== Comeback modal =====
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

    $("cbCopyBtn").onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(area.value);
          alert("記憶をコピーしました");
        } else {
          area.focus();
          area.select();
          alert("自動コピー非対応です。選択してコピーしてください。");
        }
      } catch (e) {
        alertErr("copy", e);
      }
    };

    $("cbRebornBtn").onclick = () => {
      try {
        closeComebackModal();
        soul = null;
        setHeader();
        show(startView);
      } catch (e) {
        alertErr("cbRebornBtn", e);
      }
    };

    $("cbCloseBtn").onclick = () => closeComebackModal();

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

  // ===== Reborn pipeline =====
  function resetToNeutralEnv() {
    envDraft = { temp: 0, hum: 50, light: 50 };
    envApplied = { ...envDraft };
    secondsAccum = 0;

    setSlidersFromDraft();
    refreshEnvUI();
    updateGrowthPreviewAndTimer();
    renderByCurrentEnv(0);
  }

  function pipelineAfterReborn() {
    resetToNeutralEnv();
    setSpriteSheet();

    lastRafMs = null;
    WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
    IDLE.timer = 0; IDLE.frame = 1;

    // 中心基準固定（今回追加）
    ensureViewportCenteringBase();
    applyViewportTransform(0);

    setHeader();
    refreshStatsUI();
    refreshCrystalsUI();

    show(mainView);
    switchTab("home");
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
        const saga = safeText(sagaInput.value);
        if (!saga) return alert("サーガ名を入力してください");
        soul = window.TSP_STATE.newSoulWindragon(saga);
        pipelineAfterReborn();
      } catch (e) {
        alertErr("newReborn", e);
      }
    });

    textRebornBtn.addEventListener("click", () => {
      try {
        const saga = safeText(sagaInput.value);
        if (!saga) return alert("サーガ名を入力してください");

        const code = safeText(soulTextInput.value);
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
        soul.nickname = safeText(nicknameInput.value);
        setHeader();
      } catch (e) {
        alertErr("nicknameApply", e);
      }
    });

    const onEnvInput = () => {
      try {
        readDraftFromSliders();
        refreshEnvUI();
      } catch (e) {
        alertErr("envInput", e);
      }
    };
    tempSlider.addEventListener("input", onEnvInput);
    humiditySlider.addEventListener("input", onEnvInput);
    lightSlider.addEventListener("input", onEnvInput);

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
      try {
        await playAdventureAndApply();
      } catch (e) {
        lockUI(false);
        alertErr("applyEnvBtn", e);
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
        crystal: must("tab-crystal"),
      };

      envAttributeLabel = must("envAttributeLabel");
      growthTimer = must("growthTimer");
      growthPreview = must("growthPreview");
      comebackBtn = must("comebackBtn");

      spriteViewport = must("spriteViewport");
      spriteSheetLayer = must("spriteSheetLayer");
      spriteFxLayer = must("spriteFxLayer");
      scene = qs(".scene");

      tempSlider = must("tempSlider");
      humiditySlider = must("humiditySlider");
      lightSlider = must("lightSlider");
      tempValue = must("tempValue");
      humidityValue = must("humidityValue");
      lightValue = must("lightValue");
      lightLabel = must("lightLabel");
      envPreviewLabel = must("envPreviewLabel");
      neutralBtn = must("neutralBtn");
      applyEnvBtn = must("applyEnvBtn");

      speciesName = must("speciesName");
      nicknameInput = must("nicknameInput");
      nicknameApplyBtn = must("nicknameApplyBtn");
      legendzAttribute = must("legendzAttribute");
      hpStat = must("hpStat");
      magicStat = must("magicStat");
      counterStat = must("counterStat");
      strikeStat = must("strikeStat");
      healStat = must("healStat");

      crystalList = must("crystalList");

      show(startView);
      setHeader();

      initSliders();
      envDraft = { temp: 0, hum: 50, light: 50 };
      envApplied = { ...envDraft };
      setSlidersFromDraft();
      refreshEnvUI();

      // sprite sizing
      spriteViewport.style.width = (SHEET.frameW * SHEET.scale) + "px";
      spriteViewport.style.height = (SHEET.frameH * SHEET.scale) + "px";
      spriteSheetLayer.style.width = (96 * SHEET.scale) + "px";
      spriteSheetLayer.style.height = (64 * SHEET.scale) + "px";
      spriteSheetLayer.style.backgroundRepeat = "no-repeat";
      spriteSheetLayer.style.backgroundSize = `${96 * SHEET.scale}px ${64 * SHEET.scale}px`;

      // ★中心基準を固定（今回追加）
      ensureViewportCenteringBase();
      applyViewportTransform(0);

      bindEvents();
      requestAnimationFrame(rafLoop);

    } catch (e) {
      booted = false;
      alertErr("boot", e);
    }
  }

  // 起動（安定優先：load）
  window.addEventListener("load", boot, { once: true });

})();
