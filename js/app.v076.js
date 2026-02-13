(function () {
  "use strict";

  function cp(msg) {
    let box = document.getElementById("CPBOX");
    if (!box) {
      box = document.createElement("div");
      box.id = "CPBOX";
      box.style.position = "fixed";
      box.style.bottom = "0";
      box.style.left = "0";
      box.style.right = "0";
      box.style.background = "#000";
      box.style.color = "#0f0";
      box.style.fontSize = "12px";
      box.style.padding = "6px";
      box.style.zIndex = "99999";
      document.body.appendChild(box);
    }
    box.textContent = "CP: " + msg;
  }

  cp("BOOT START");

  document.addEventListener("DOMContentLoaded", function () {
    cp("DOM READY");

    const startView = document.getElementById("startView");
    const mainView = document.getElementById("mainView");
    const newSoulBtn = document.getElementById("newSoulBtn");
    const textRebornBtn = document.getElementById("textRebornBtn");

    if (!startView || !mainView || !newSoulBtn || !textRebornBtn) {
      cp("DOM MISSING");
      return;
    }

    cp("DOM OK");

    function showMain() {
      startView.classList.remove("active");
      mainView.classList.add("active");
      cp("VIEW SWITCHED");
    }

    newSoulBtn.addEventListener("click", function () {
      cp("NEW CLICK");
      showMain();
    });

    textRebornBtn.addEventListener("click", function () {
      cp("MEMORY CLICK");
      showMain();
    });

    cp("EVENT BOUND");
  });

})();
