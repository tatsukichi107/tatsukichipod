/* =========================================================
 * app.js（v0.74：エラー可視化診断版）
 *
 * 追加：
 * - window.onerror で画面上にエラー表示
 * - boot失敗時もエラーを表示
 *
 * 既存ロジックはそのまま
 * ========================================================= */

(function () {
  "use strict";

  /* ========= ★ エラー可視化 ========= */
  window.addEventListener("error", function (e) {
    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.left = "0";
    box.style.right = "0";
    box.style.top = "0";
    box.style.background = "red";
    box.style.color = "white";
    box.style.padding = "10px";
    box.style.fontSize = "14px";
    box.style.zIndex = "9999";
    box.textContent = "JS ERROR: " + e.message;
    document.body.appendChild(box);
  });

  const $ = (id) => document.getElementById(id);

  let startView, mainView;
  let headerLine1, headerLine2, headerLine3;
  let sagaInput, newSoulBtn, soulTextInput, textRebornBtn;
  let tabBtns, tabEls;
  let comebackBtn;
  let soulModal, modalSoulText, copySoulBtn, ejectBtn, cancelComebackBtn;

  let soul = null;

  function show(view) {
    startView.classList.remove("active");
    mainView.classList.remove("active");
    view.classList.add("active");
  }

  function setHeader() {
    if (!headerLine1 || !headerLine2 || !headerLine3) return;

    if (!soul) {
      headerLine1.textContent = "";
      headerLine2.textContent = "";
      headerLine3.textContent = "未リボーン";
      return;
    }

    const saga = soul.sagaName || "";
    const species = soul.speciesName || "";
    const nick = soul.nickname && soul.nickname.trim() ? soul.nickname : "未登録";

    headerLine1.textContent = `サーガ名：${saga}`;
    headerLine2.textContent = `種族名：${species} / ニックネーム：${nick}`;
    headerLine3.textContent = "リボーン中";
  }

  function bindEvents() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        Object.values(tabEls).forEach((t) => t.classList.remove("active"));
        tabEls[btn.dataset.tab].classList.add("active");
      });
    });

    newSoulBtn.addEventListener("click", () => {
      const saga = sagaInput.value.trim();
      if (!saga) return alert("サーガ名を入力してください");

      soul = window.TSP_STATE.newSoulWindragon(saga);
      show(mainView);
      setHeader();
    });

    textRebornBtn.addEventListener("click", () => {
      const saga = sagaInput.value.trim();
      if (!saga) return alert("サーガ名を入力してください");

      const parsed = window.TSP_STATE.parseSoulCode(soulTextInput.value);
      window.TSP_STATE.assertSagaMatch(parsed, saga);

      soul = parsed;
      show(mainView);
      setHeader();
    });

    comebackBtn.addEventListener("click", () => {
      if (!soul) return;
      const code = window.TSP_STATE.makeSoulCode(soul);
      modalSoulText.value = code;
      soulModal.classList.remove("hidden");
    });

    copySoulBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(modalSoulText.value);
      alert("コピーしました");
    });

    ejectBtn.addEventListener("click", () => {
      soul = null;
      soulModal.classList.add("hidden");
      show(startView);
      setHeader();
    });

    cancelComebackBtn.addEventListener("click", () => {
      soulModal.classList.add("hidden");
    });
  }

  function boot() {
    startView = $("startView");
    mainView = $("mainView");

    headerLine1 = $("headerLine1");
    headerLine2 = $("headerLine2");
    headerLine3 = $("headerLine3");

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

    comebackBtn = $("comebackBtn");

    soulModal = $("soulModal");
    modalSoulText = $("modalSoulText");
    copySoulBtn = $("copySoulBtn");
    ejectBtn = $("ejectBtn");
    cancelComebackBtn = $("cancelComebackBtn");

    show(startView);
    setHeader();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", boot);

})();
