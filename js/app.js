// FILE: js/app.js
/* =========================================================
 * js/app.js  v0.79-i18n-annotate (SAFE)
 *
 * 目的：
 * - UI日本語に英語を「併記」する（切替ではなく同時表示）
 * - 既存ID/class/DOM構造を絶対に変更しない（壊さない方針）
 *
 * 方針：
 * - 既存テキストはHTMLのまま残す
 * - 起動後に app.js が “表示だけ” を上書きして併記化する
 * - i18nはこのファイル内に集約し、他機能へ影響を最小化
 *
 * 追加ルール（ユーザー要望）：
 * - 単語： 「日本語 / English」
 * - 文章： 2段（日本語→英語）
 * - タブ等の簡単英単語：英語のみ（日本語なし）
 *
 * 既存機能：
 * - スプライト/環境/育成/モーダル/パーティクル/カムバック 等は維持
 * ========================================================= */

(function () {
  "use strict";

  // =========================
  // I18N MODE (ON/OFF)
  // =========================
  // 困ったら false にすると “併記処理だけ” を完全停止（セーブポイント復帰が楽）
  const I18N_MODE = true;

  // =========================
  // DOM helpers
  // =========================
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

  // =========================
  // Lightweight UI notice (no native dialogs)
  // =========================
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
      toastTimer = setTimeout(() => {
        el.style.display = "none";
      }, ms);
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

  // =========================================================
  // I18N (Annotation layer)  ★ここが今回の追加
  // =========================================================
  // SHORT: 英語のみ（タブなど）
  // WORD : 日本語 / English
  // SENT : 2段（日本語→英語）
  const I18N = {
    // tabs (SHORT)
    tabs: {
      home: "Home",
      environment: "Environment",
      legendz: "Legendz",
      crystal: "Crystal",
    },

    // header (WORD)
    header: {
      saga: { jp: "サーガ名", en: "Saga" },
      species: { jp: "種族名", en: "Species" },
      nickname: { jp: "ニックネーム", en: "Nickname" },
      unreborn: { jp: "未リボーン", en: "Unreborn" },
      reborn: { jp: "リボーン中", en: "Reborn" },
      comeback: { jp: "カムバック", en: "Comeback" },
    },

    // start view (SENT / WORD)
    start: {
      title1: { jp: "サーガの名を刻め", en: "Engrave the Saga Name" },
      sagaLabel: { jp: "サーガ名（後から変更できません）", en: "Saga name (cannot be changed later)" },
      title2: { jp: "ソウルドールの記憶からリボーン", en: "Reborn from Soul Doll Memory" },
      memoryLabel: { jp: "ソウルドールの記憶（SOUL:〜）", en: "Soul Doll Memory (SOUL:...)" },
      rebornFromMemory: { jp: "記憶からリボーンする", en: "Reborn from Memory" },
      title3: { jp: "新たなソウルドールを見つける", en: "Find a New Soul Doll" },
      newSoul: { jp: "ソウルドールを見つける", en: "Find Soul Doll" },
    },

    // environment (WORD)
    env: {
      forecast: { jp: "予想環境", en: "Forecast" },
      decide: { jp: "環境決定", en: "Apply" },
      resetDraft: { jp: "無属性に戻す", en: "Reset to Neutral" },
      makeNeutral: { jp: "無属性環境にする", en: "Set Neutral" },
      temperature: { jp: "温度", en: "Temperature" },
      humidity: { jp: "湿度", en: "Humidity" },
      light: { jp: "光量", en: "Light" },
      depth: { jp: "水深", en: "Depth" },
      neutral: { jp: "無属性", en: "Neutral" },
    },

    // legendz (WORD)
    legendz: {
      moves: { jp: "ワザ", en: "Moves" },
      slots15: { jp: "ワザスロット（15）", en: "Move Slots (15)" },
      changeNickname: { jp: "ニックネームを変更", en: "Change Nickname" },
      trial: { jp: "試し撃ち", en: "Try" },
    },

    // modal (WORD/SENT)
    modal: {
      error: { jp: "エラー", en: "Error" },
      notice: { jp: "お知らせ", en: "Notice" },
      confirmNeutral: { jp: "ムゾクセイ？", en: "Neutral?" },
      ok: { jp: "OK", en: "OK" },
      yes: { jp: "はい", en: "Yes" },
      no: { jp: "いいえ", en: "No" },
      memoryTitle: { jp: "ソウルドールの記憶", en: "Soul Doll Memory" },
      copy: { jp: "ソウルドールの記憶の保存(コピー)", en: "Copy Memory Code" },
      doComeback: { jp: "カムバックする", en: "Comeback" },
      back: { jp: "育成に戻る", en: "Back" },
    },

    // misc
    adventure: { jp: "冒険中…", en: "Adventuring..." },
    unregistered: { jp: "未登録", en: "Unregistered" },
  };

  function fmtWord(jp, en) {
    if (!I18N_MODE) return String(jp ?? "");
    const a = String(jp ?? "").trim();
    const b = String(en ?? "").trim();
    if (!a) return b;
    if (!b) return a;
    return `${a} / ${b}`;
  }

  function fmtSentence(jp, en) {
    if (!I18N_MODE) return String(jp ?? "");
    const a = String(jp ?? "").trim();
    const b = String(en ?? "").trim();
    if (!a) return b;
    if (!b) return a;
    return `${a}\n${b}`;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  function annotateTabsEnglishOnly() {
    if (!I18N_MODE) return;
    const buttons = qsa(".tab-btn");
    buttons.forEach((btn) => {
      const key = (btn.dataset && btn.dataset.tab) ? btn.dataset.tab : "";
      if (!key) return;

      const en = I18N.tabs[key];
      if (!en) return;

      // 既存の内部構造（.ico/.dot）がある場合は壊さない：テキスト部分だけ差し替え
      // 1) もし「単純テキストのみ」なら btn.textContent を置換
      // 2) もし子要素があるなら、"ホーム" 等のテキストノードっぽい部分を優先置換
      if (btn.children && btn.children.length > 0) {
        // よくある構造: <div class="ico">🏠</div><div>ホーム</div><div class="dot"></div>
        const labelDiv = Array.from(btn.children).find((c) => c && c.tagName === "DIV" && !c.classList.contains("ico") && !c.classList.contains("dot"));
        if (labelDiv) {
          labelDiv.textContent = en;
        } else {
          // fallback: 最後のテキストっぽいDIV
          const divs = Array.from(btn.children).filter(c => c && c.tagName === "DIV");
          const candidate = divs.length ? divs[divs.length - 1] : null;
          if (candidate && !candidate.classList.contains("dot") && !candidate.classList.contains("ico")) {
            candidate.textContent = en;
          }
        }
      } else {
        btn.textContent = en;
      }
    });
  }

  function annotateStaticLabels() {
    if (!I18N_MODE) return;

    // Start view headings/buttons (safe by query)
    // h2 in start-card order: title1, title2, title3
    const startCard = document.querySelector(".start-card");
    if (startCard) {
      const h2s = Array.from(startCard.querySelectorAll("h2"));
      if (h2s[0]) h2s[0].textContent = fmtSentence(I18N.start.title1.jp, I18N.start.title1.en);
      if (h2s[1]) h2s[1].textContent = fmtSentence(I18N.start.title2.jp, I18N.start.title2.en);
      // 3つ目は margin-top付いてる可能性がある
      if (h2s[2]) h2s[2].textContent = fmtSentence(I18N.start.title3.jp, I18N.start.title3.en);

      const sagaLabel = startCard.querySelector('label[for="sagaInput"]');
      if (sagaLabel) sagaLabel.textContent = fmtSentence(I18N.start.sagaLabel.jp, I18N.start.sagaLabel.en);

      const memLabel = startCard.querySelector('label[for="soulTextInput"]');
      if (memLabel) memLabel.textContent = fmtSentence(I18N.start.memoryLabel.jp, I18N.start.memoryLabel.en);

      const rebornBtn = $("textRebornBtn");
      if (rebornBtn) rebornBtn.textContent = fmtWord(I18N.start.rebornFromMemory.jp, I18N.start.rebornFromMemory.en);

      const newBtn = $("newSoulBtn");
      if (newBtn) newBtn.textContent = fmtWord(I18N.start.newSoul.jp, I18N.start.newSoul.en);
    }

    // Environment tab
    const envPreview = document.querySelector(".env-preview");
    if (envPreview) {
      // "予想環境：" の部分は構造が固定ではないので、先頭テキストだけ差し替える
      // 例: 予想環境：<strong id="envPreviewLabel">無属性</strong>
      const strong = $("envPreviewLabel");
      if (strong) {
        // strongは値だけ、prefixは親で
        const label = fmtWord(I18N.env.forecast.jp, I18N.env.forecast.en);
        // prefix保持: "label：" + strong
        envPreview.childNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) n.textContent = `${label}：`;
        });
      }
    }

    const neutralBtn = $("neutralBtn");
    if (neutralBtn) neutralBtn.textContent = fmtWord(I18N.env.resetDraft.jp, I18N.env.resetDraft.en);

    const applyBtn = $("applyEnvBtn");
    if (applyBtn) applyBtn.textContent = fmtWord(I18N.env.decide.jp, I18N.env.decide.en);

    const homeNeutralBtn = $("homeNeutralBtn");
    if (homeNeutralBtn) homeNeutralBtn.textContent = fmtWord(I18N.env.makeNeutral.jp, I18N.env.makeNeutral.en);

    // Comeback button label
    const cb = $("comebackBtn");
    if (cb) cb.textContent = fmtWord(I18N.header.comeback.jp, I18N.header.comeback.en);

    // Legendz tab: skills title if present
    const skillsH3 = document.querySelector(".skills h3");
    if (skillsH3) skillsH3.textContent = fmtWord(I18N.legendz.moves.jp, I18N.legendz.moves.en);
  }

  // =========================================================
  // Monster / sprite config
  // =========================================================
  const MONSTER = {
    id: "windragon",
    spritePath: "./assets/sprites/windragon.png",
    superBest: { temp: -45, hum: 5, waterDepth: 50 },
    // bestAreaId は game.js 側でフォールバック対応済み想定
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

  // ===== Particle emit accumulators =====
  const FX = {
    superAcc: 0,
    bestAcc: 0,
    goodAcc: 0,
    badAcc: 0, // ★最悪パラパラ用（CSS class tsp-darkfall）
  };

  // =========================================================
  // DOM refs
  // =========================================================
  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;

  let sagaInput, soulTextInput, newSoulBtn, textRebornBtn;

  let tabBtns;
  let tabEls;

  let envAttributeLabel, growthTimer, growthPreview, comebackBtn;
  let homeNeutralBtn;

  let spriteMover, spriteViewport, spriteSheetLayer, spriteFxLayer;
  let scene;

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

  // FX state tracking
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
    return n ? n : I18N_MODE ? fmtWord(I18N.unregistered.jp, I18N.unregistered.en) : "未登録";
  }

  function setHeader() {
    if (!soul) {
      headerLine1.textContent = "";
      headerLine2.textContent = "";
      headerLine3.textContent = I18N_MODE ? fmtWord(I18N.header.unreborn.jp, I18N.header.unreborn.en) : "未リボーン";
      return;
    }
    const saga = safeText(soul.sagaName);
    const sp = safeText(soul.speciesName);
    const nick = displayNickname(soul);

    const sagaLabel = fmtWord(I18N.header.saga.jp, I18N.header.saga.en);
    const spLabel = fmtWord(I18N.header.species.jp, I18N.header.species.en);
    const nnLabel = fmtWord(I18N.header.nickname.jp, I18N.header.nickname.en);

    headerLine1.textContent = `${sagaLabel}：${saga}`;
    headerLine2.textContent = `${spLabel}：${sp} / ${nnLabel}：${nick}`;
    headerLine3.textContent = I18N_MODE ? fmtWord(I18N.header.reborn.jp, I18N.header.reborn.en) : "リボーン中";
  }

  function attrJp(attr) {
    const meta = window.TSP_GAME && window.TSP_GAME.ATTR_META;
    if (attr === "neutral") return I18N_MODE ? fmtWord(I18N.env.neutral.jp, I18N.env.neutral.en) : "無属性";
    return (meta && meta[attr] && meta[attr].jp) ? meta[attr].jp : String(attr || "");
  }

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

  // ===== Skills (dummy) =====
  const DUMMY_SKILLS = Array.from({ length: 15 }, (_, i) => ({
    id: `skill_${i + 1}`,
    name: `ワザ${String(i + 1).padStart(2, "0")}`,
    meta: (i % 3 === 0) ? "攻撃" : (i % 3 === 1 ? "補助" : "回復"),
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
        <button type="button" class="try-btn" data-skill="${sk.id}">${I18N_MODE ? fmtWord(I18N.legendz.trial.jp, I18N.legendz.trial.en) : "試し撃ち"}</button>
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

      openNotice(I18N_MODE ? fmtWord("試し撃ち", "Try") : "試し撃ち", `${sk.name} を試し撃ち！`);
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
    const isSea = (Number(envDraft.hum) === 100);
    const jp = isSea ? I18N.env.depth.jp : I18N.env.light.jp;
    const en = isSea ? I18N.env.depth.en : I18N.env.light.en;
    lightLabel.textContent = I18N_MODE ? fmtWord(jp, en) : String(jp);
  }

  function refreshEnvUI() {
    // 単語は「日本語 / English」ではなく、値表示が主なのでタイトルだけでOK
    tempValue.textContent = `${envDraft.temp}℃`;
    humidityValue.textContent = `${envDraft.hum}％`;
    updateLightLabelByHumidity();

    const attr = window.TSP_GAME.envAttribute(envDraft.temp, envDraft.hum, envDraft.light);
    envPreviewLabel.textContent = (attr === "neutral") ? (I18N_MODE ? fmtWord(I18N.env.neutral.jp, I18N.env.neutral.en) : "無属性") : attrJp(attr);
  }

  // ===== Adventure apply =====
  async function playAdventureAndApply() {
    if (uiLocked) return;

    lockUI(true);

    const tabEnv = tabEls.environment;
    const overlay = document.createElement("div");
    overlay.className = "adventure-overlay";
    overlay.textContent = I18N_MODE ? fmtSentence(I18N.adventure.jp, I18N.adventure.en) : "冒険中…";
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
  // Sprite / Rendering
  // =========================================================
  function setSpriteSheet() {
    spriteSheetLayer.style.backgroundImage = `url("${MONSTER.spritePath}")`;
    spriteSheetLayer.style.transform = "";
    spriteMover.style.transform = "translateX(0px)";
    spriteViewport.style.transform = "scaleX(1)";
  }

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
    qsa(".tsp-particle, .tsp-darkfall").forEach(p => p.remove());
  }

  function clearFxAllHard() {
    spriteFxLayer.innerHTML = "";
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

  // 最悪：暗い絵文字がパラパラ（CSS .tsp-darkfall に委譲）
  function spawnDarkFall(dtSec) {
    if (!scene) return;
    scene.classList.add("fx-bad");

    FX.badAcc += dtSec;
    const interval = 0.25;
    while (FX.badAcc >= interval) {
      FX.badAcc -= interval;

      const text = (Math.random() > 0.5) ? "😵‍💫" : "💤";
      const xPct = rand(6, 94);
      const yPct = rand(-10, 6);
      const dx = rand(-20, 20);
      const dy = rand(180, 260);
      const dur = rand(1.6, 2.4);

      const p = document.createElement("div");
      p.className = "tsp-darkfall";
      p.textContent = text;
      p.style.left = `${xPct}%`;
      p.style.top = `${yPct}%`;
      p.style.setProperty("--tspDur", `${dur}s`);
      p.style.setProperty("--tspDX", `${dx}px`);
      p.style.setProperty("--tspDY", `${dy}px`);
      p.style.fontSize = `${rand(14, 20)}px`;

      scene.appendChild(p);

      const rmMs = Math.max(900, dur * 1000 + 240);
      setTimeout(() => { try { p.remove(); } catch {} }, rmMs);
    }
  }

  // 超ベスト：飛び交う（♪✨混在）
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

        const xPct = rand(2, 98);
        const yPct = rand(2, 98);

        const dx = rand(-140, 140);
        const dy = rand(-220, 80);
        const rot = rand(-30, 30);
        const dur = rand(1.0, 1.9);
        const scale = rand(0.9, 1.35);
        const sizePx = isSpark ? rand(16, 24) : rand(14, 22);

        spawnParticle({ text, xPct, yPct, cls: "tsp-fly", dur, dx, dy, rot, scale, sizePx });
      }
    }
  }

  // ベスト：♪が降り注ぐ
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

        const xPct = rand(4, 96);
        const yPct = rand(-8, 6);
        const dx = rand(-22, 22);
        const dy = rand(220, 340);
        const rot = rand(-12, 12);
        const dur = rand(1.4, 2.2);
        const scale = rand(0.9, 1.2);
        const sizePx = isSpark ? rand(16, 22) : rand(14, 20);

        spawnParticle({ text, xPct, yPct, cls: "tsp-fall", dur, dx, dy, rot, scale, sizePx });
      }
    }
  }

  // 良好：♪がパラパラ
  function emitGood(dtSec) {
    if (!scene) return;
    scene.classList.add("fx-good");

    FX.goodAcc += dtSec;
    const interval = 0.45;
    while (FX.goodAcc >= interval) {
      FX.goodAcc -= interval;

      const count = 1 + (Math.random() > 0.7 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const text = "♪";
        const xPct = rand(8, 92);
        const yPct = rand(-6, 10);
        const dur = rand(1.8, 2.6);
        const dx = rand(-14, 14);
        const dy = rand(160, 240);
        const rot = rand(-14, 14);
        const scale = rand(0.9, 1.15);
        const sizePx = rand(13, 18);

        spawnParticle({ text, xPct, yPct, cls: "tsp-drift", dur, dx, dy, rot, scale, sizePx });
      }
    }
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
      renderFrame(3);
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
      WALK.stepFrame = (WALK.stepFrame === 1) ? 2 : 1;
    }

    setFacing(WALK.facing);
    renderFrame(WALK.stepFrame);
    applyMoveX(WALK.x);
  }

  function updateHomeNeutralButtonVisibility(rankInfo) {
    if (!homeNeutralBtn) return;
    const R = window.TSP_GAME.Rank;
    const showIt = (rankInfo && rankInfo.rank !== R.neutral);
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
    FX.badAcc = 0;
    lastRankKey = newKey;
  }

  function renderByCurrentEnv(dtSec) {
    if (!soul) return;

    const now = new Date();
    const info = window.TSP_GAME.computeRank(MONSTER, envApplied, now, soul.attribute);
    const R = window.TSP_GAME.Rank;

    // HOME表示：エリア名優先（なければ属性）
    if (info.rank === R.neutral) {
      envAttributeLabel.textContent = I18N_MODE ? fmtWord(I18N.env.neutral.jp, I18N.env.neutral.en) : "無属性";
    } else {
      const areaName = safeText(info.areaName);
      const a = areaName ? areaName : attrJp(info.envAttr);
      envAttributeLabel.textContent = `${a}（${rankLabel(info.rank)}）`;
    }

    setHomeBackgroundByEnvAttr(info.envAttr);

    const key = makeRankKey(info);
    if (key !== lastRankKey) {
      onRankChanged(key);
    }

    updateHomeNeutralButtonVisibility(info);

    // ランク別 表情・演出
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
        spawnDarkFall(dtSec);
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
  let comebackModalBound = false;

  function ensureComebackModal() {
    if (comebackModal) return comebackModal;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title">${I18N_MODE ? fmtWord(I18N.modal.memoryTitle.jp, I18N.modal.memoryTitle.en) : "ソウルドールの記憶"}</div>
        <textarea id="cbCodeArea" class="modal-code" readonly></textarea>
        <div class="modal-actions">
          <button id="cbCopyBtn">${I18N_MODE ? fmtWord(I18N.modal.copy.jp, I18N.modal.copy.en) : "ソウルドールの記憶の保存(コピー)"}</button>
          <button id="cbRebornBtn">${I18N_MODE ? fmtWord(I18N.modal.doComeback.jp, I18N.modal.doComeback.en) : "カムバックする"}</button>
          <button id="cbCloseBtn">${I18N_MODE ? fmtWord(I18N.modal.back.jp, I18N.modal.back.en) : "育成に戻る"}</button>
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
            toast(I18N_MODE ? fmtWord("記憶をコピーしました", "Copied") : "記憶をコピーしました");
          } else {
            area.focus();
            area.select();
            openNotice(I18N_MODE ? fmtWord("コピー", "Copy") : "コピー", I18N_MODE ? fmtSentence("自動コピー非対応です。選択された状態なので手動でコピーしてください。", "Auto-copy is not supported. Please copy manually.") : "自動コピー非対応です。\n選択された状態なので手動でコピーしてください。");
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
        <div class="modal-title">${I18N_MODE ? fmtWord(I18N.modal.confirmNeutral.jp, I18N.modal.confirmNeutral.en) : "ムゾクセイ？"}</div>
        <div class="modal-actions" style="margin-top:12px;">
          <button id="cfYesBtn">${I18N_MODE ? fmtWord(I18N.modal.yes.jp, I18N.modal.yes.en) : "はい"}</button>
          <button id="cfNoBtn" class="ghost">${I18N_MODE ? fmtWord(I18N.modal.no.jp, I18N.modal.no.en) : "いいえ"}</button>
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

    setSpriteSheet();
    lastRafMs = null;

    WALK.x = 0; WALK.facing = "right"; WALK.stepTimer = 0; WALK.stepFrame = 1; WALK.turnTimer = 0;
    IDLE.timer = 0; IDLE.frame = 1;

    FX.superAcc = 0;
    FX.bestAcc = 0;
    FX.goodAcc = 0;
    FX.badAcc = 0;

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

    // ★i18n反映（リボーン後に表示される部分も含む）
    annotateTabsEnglishOnly();
    annotateStaticLabels();
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
        if (!saga) return openNotice(I18N_MODE ? fmtWord("入力", "Input") : "入力", I18N_MODE ? fmtSentence("サーガ名を入力してください", "Please enter the saga name.") : "サーガ名を入力してください");
        soul = window.TSP_STATE.newSoulWindragon(saga);
        pipelineAfterReborn();
      } catch (e) {
        showError("newReborn", e);
      }
    });

    textRebornBtn.addEventListener("click", () => {
      try {
        const saga = safeText(sagaInput.value);
        if (!saga) return openNotice(I18N_MODE ? fmtWord("入力", "Input") : "入力", I18N_MODE ? fmtSentence("サーガ名を入力してください", "Please enter the saga name.") : "サーガ名を入力してください");

        const code = safeText(soulTextInput.value);
        if (!code) return openNotice(I18N_MODE ? fmtWord("記憶", "Memory") : "記憶", I18N_MODE ? fmtSentence("記憶が空です", "Memory code is empty.") : "記憶が空です");

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
            toast(I18N_MODE ? fmtWord("無属性環境に戻しました", "Set to Neutral") : "無属性環境に戻しました");
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
        toast(I18N_MODE ? fmtWord("ニックネームを更新しました", "Nickname updated") : "ニックネームを更新しました");
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
        toast(I18N_MODE ? fmtWord("ドラフトを無属性に戻しました", "Draft reset") : "ドラフトを無属性に戻しました");
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
        lastRankKey = null;
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
        crystal: must("tab-crystal"),
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
      scene = document.querySelector(".scene");

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

      spriteViewport.style.width = (SHEET.frameW * SHEET.scale) + "px";
      spriteViewport.style.height = (SHEET.frameH * SHEET.scale) + "px";
      spriteSheetLayer.style.width = (96 * SHEET.scale) + "px";
      spriteSheetLayer.style.height = (64 * SHEET.scale) + "px";
      spriteSheetLayer.style.backgroundRepeat = "no-repeat";
      spriteSheetLayer.style.backgroundSize = `${96 * SHEET.scale}px ${64 * SHEET.scale}px`;

      setSpriteSheet();
      setFacing("left");
      renderFrame(1);
      applyMoveX(0);

      renderSkillsUI();
      bindSkillsClickOnce();

      bindEvents();

      // ★起動時にi18n反映（未リボーン画面含む）
      annotateTabsEnglishOnly();
      annotateStaticLabels();

      requestAnimationFrame(rafLoop);

    } catch (e) {
      booted = false;
      showError("boot", e);
    }
  }

  window.addEventListener("load", boot, { once: true });

})();
