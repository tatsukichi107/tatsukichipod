/* =========================================================
 * app.v076.js  v0.76-FULL (BOOT確実起動 + 完全復旧版)
 *
 * 前提：
 * - state.js: window.TSP_STATE が存在（newSoulWindragon / parseSoulCode / assertSagaMatch / makeSoulCode）
 * - game.js : window.TSP_GAME  が存在（TEMP_STEPS / HUM_STEPS / Rank / computeRank / computeMinutePreview / applyOneMinute / maxHP / envAttribute）
 * - index.html のDOM idは、これまでの分割版（4タブ/スプライトViewport/環境UI/カムバックUI）に準拠
 *
 * 主要仕様：
 * - 未リボーン：サーガ名入力 + 記憶からリボーン + 新たなソウルドール
 * - リボーン後：ホーム/環境/レジェンズ/クリスタル（下タブ）
 * - 環境：ドラフト→（予想環境表示）→環境決定→3秒冒険→反映→ホーム戻り
 * - 無属性：温度0湿度50（光無視）＝歩行アニメ、育成なし（ホームのみ）
 * - 水中：湿度100（光=水深、光足切り無視）
 * - 通常：光足切りあり（時間帯と一致しないと最悪環境）
 * - 成長：ホーム表示中のみ 1分ごと（回復→成長）
 *   最大HP増加時は currentHP も同時増加
 * - 表情/FX：
 *   超ベスト：喜び(7) + 派手（画面全体）✨♪粒
 *   ベスト：喜び(7) + 音符
 *   良好：通常1/2交互 + 音符
 *   普通：通常1/2交互
 *   最悪：ダウン(8)
 *   無属性：歩行（通常1/2）＋折返しで振り向き(3)0.5秒
 * - カムバック：モーダルで短縮コード表示 + コピー + 「カムバックする」（未リボーンへ） + 「育成に戻る」
 *   ※環境設定は保存しない（再リボーン時は無属性）
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
    // 超ベスト定義（ユーザー最新合意：-45/5）
    superBest: { temp: -45, hum: 5, waterDepth: 50 },
  };

  const SHEET = {
    frameW: 24,
    frameH: 32,
    scale: 3,
    // 1..8 → (r,c) (2x4)
    frameToRC(i) {
      const idx = Math.max(1, Math.min(8, i)) - 1;
      return { r: Math.floor(idx / 4), c: idx % 4 };
    }
  };

  // walk / idle timing
  const WALK = {
    halfRangePx: 84,     // 5～10歩くらいの往復に相当
    speedPxPerSec: 12,   // 落ち着き（速すぎ対策）
    facing: "right",     // right/left
    x: 0,
    stepTimer: 0,
    stepFrame: 1,        // 1 or 2
    turnTimer: 0         // 折り返し時の振り向き残り秒
  };

  const IDLE = {
    timer: 0,
    frame: 1
  };

  const SUPER_FX = { accum: 0 };

  // ===== DOM refs =====
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;

  // start
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

  // comeback modal (created dynamically)
  let comebackModal = null;

  // ===== State =====
  let soul = null;

  let envDraft = { temp: 0, hum: 50, light: 50 };
  let envApplied = { temp: 0, hum: 50, light: 50 };

  // elem grow counters (周期管理)
  const elemCounter = { fire: 0, wind: 0, earth: 0, water: 0 };

  // tick loop
  let secondsAccum = 0;
  let lastRafMs = null;

  // lock during adventure
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
    return btn?.dataset?.tab || "home";
  }

  function switchTab(key) {
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === key));
    Object.values(tabEls).forEach(el => el.classList.remove("active"));
    tabEls[key].classList.add("active");
  }

  // ===== Header =====
  function displayNickname(s) {
    const n = safeText(s?.nickname);
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

  // ===== Background by env attribute (CSS側で色を定義) =====
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

  function attrJp(attr) {
    return window.TSP_GAME.ATTR_META?.[attr]?.jp || (attr === "neutral" ? "無属性" : String(attr || ""));
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

    // light: 0/50/100
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

    // 「予想環境」は属性のみ表示（相性/理由は出さない）
    const attr = window.TSP_GAME.envAttribute(envDraft.temp, envDraft.hum);
    envPreviewLabel.textContent = attr === "neutral" ? "無属性" : attrJp(attr);
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
    secondsAccum = 0; // 反映直後はカウントリセット

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

      // 画面いっぱいに派手に（1回に複数）
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
    // 折り返し振り向き（0.5秒）
    if (WALK.turnTimer > 0) {
      WALK.turnTimer -= dtSec;
      // 振り向きは「右向き=非反転」「左向き=反転」
      const flipTurn = (WALK.facing === "left");
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

    // 全スプライトは左向き前提：
    // 右へ歩くとき：正向き（反転なし）
    // 左へ歩くとき：反転
    const flip = (WALK.facing === "left");
    renderFrame(WALK.stepFrame, flip);
    spriteViewport.style.left = `calc(50% + ${WALK.x}px)`;
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now, soul.attribute);
    const R = window.TSP_GAME.Rank;

    // ラベル（無属性は無属性のみ）
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

  // ===== Growth preview/timer (ホームのみ進む) =====
  function updateGrowthPreviewAndTimer() {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeMinutePreview(soul, MONSTER, envApplied, now, elemCounter);

    // 無属性は非表示（もしくは成長なし）
    if (info.rank === window.TSP_GAME.Rank.neutral) {
      growthTimer.textContent = "環境成長なし";
      growthPreview.textContent = "";
      return;
    }

    // 60秒カウントダウン
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
        // 上限などで0のときも +0 表示
        parts.push(`${jp}+0`);
      }
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

    // close by backdrop tap
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

    const copyBtn = $("cbCopyBtn");
    const rebornBtn = $("cbRebornBtn");
    const closeBtn = $("cbCloseBtn");

    copyBtn.onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(area.value);
          alert("記憶をコピーしました");
        } else {
          area.focus();
          area.select();
          alert("この端末は自動コピー非対応です。\nテキストを選択してコピーしてください。");
        }
      } catch (e) {
        alertErr("copy", e);
      }
    };

    // カムバックする＝未リボーンへ（イジェクト相当）
    rebornBtn.onclick = () => {
      try {
        closeComebackModal();
        soul = null;
        setHeader();
        show(startView);
        // 体感的に入力は残してよいので sagaInput / soulTextInput は保持
      } catch (e) {
        alertErr("cbRebornBtn", e);
      }
    };

    // 育成に戻る＝閉じるだけ
    closeBtn.onclick = () => {
      closeComebackModal();
    };

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

    // ホーム表示中のみ育成タイマー進行
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
    // 環境は保存しない → 常に無属性へ戻す
    resetToNeutralEnv();

    // sprite
    setSpriteSheet();

    // reset anim
    lastRafMs = null;
    WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
    IDLE.timer = 0; IDLE.frame = 1;

    setHeader();
    refreshStatsUI();
    refreshCrystalsUI();

    show(mainView);
    switchTab("home");
  }

  // ===== Bind events =====
  function bindEvents() {
    // tabs
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (uiLocked) return;
        try {
          switchTab(btn.dataset.tab);
          // ホーム戻りで即更新
          if (btn.dataset.tab === "home") {
            updateGrowthPreviewAndTimer();
            renderByCurrentEnv(0);
          }
        } catch (e) {
          alertErr("tabSwitch", e);
        }
      });
    });

    // start: new
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

    // start: memory
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

    // comeback
    comebackBtn.addEventListener("click", () => {
      try { doComeback(); }
      catch (e) { alertErr("comeback", e); }
    });

    // nickname
    nicknameApplyBtn.addEventListener("click", () => {
      try {
        if (!soul) return;
        soul.nickname = safeText(nicknameInput.value);
        setHeader();
      } catch (e) {
        alertErr("nicknameApply", e);
      }
    });

    // env sliders
    const onEnvInput = () => {
      try {
        readDraftFromSliders();
        refreshEnvUI();
      } catch (e)
      
  // ★ iPhone/Android差の事故を潰す：load固定
  window.addEventListener("load", boot);
})();
