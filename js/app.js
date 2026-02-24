/* ============================================================
 *  app.js  –  UI control, events, rafLoop, effects
 *  Depends on: TSP_STATE, TSP_AREAMAP, TSP_AREA, TSP_GAME,
 *              TSP_LEGENDZ_DATA, TSP_SKILL_DATA, TSP_CRYSTAL_DATA
 * ============================================================ */
(function () {
    "use strict";

    /* =========================================================
     *  State
     * ========================================================= */
    var soul = null;
    var activeTab = "home";
    var uiLocked = false;
    var lastRafMs = 0;
    var secondsAccum = 0;
    var minuteCounter = 0;  // total minutes elapsed

    var envDraft = { temp: 0, hum: 50, light: 50 };
    var envApplied = { temp: 0, hum: 50, light: 50 };

    var elemCounter = { magic: 0, counter: 0, attack: 0, recover: 0 };
    var sessionGrowth = { hp: 0, magic: 0, counter: 0, attack: 0, recover: 0 };

    var LS_KEY = "talis_pod_save";
    var LS_SAGA_KEY = "talis_pod_saga_name";

    /* Current monster reference (from LegendzData) */
    function getMonster() {
        if (!soul) return null;
        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
        return ld || {
            id: soul.speciesId,
            spritePath: "./assets/sprites/windragon.png",
            superBest: { temp: -45, hum: 5, waterDepth: 50 },
            bestAreaId: "T2"
        };
    }

    /* =========================================================
     *  DOM Refs
     * ========================================================= */
    var $ = function (id) { return document.getElementById(id); };

    /* =========================================================
     *  LocalStorage (v0.8)
     * ========================================================= */
    function saveGame() {
        if (!soul) return;
        try {
            localStorage.setItem(LS_KEY, TSP_STATE.makeSoulCode(soul));
        } catch (e) {
            console.error("[TalisPod] save failed:", e);
        }
    }

    function loadGame() {
        try {
            var code = localStorage.getItem(LS_KEY);
            if (code) return TSP_STATE.parseSoulCode(code);
        } catch (e) {
            console.warn("[TalisPod] load failed:", e);
        }
        return null;
    }

    function clearSave() {
        try { localStorage.removeItem(LS_KEY); } catch (e) { }
    }

    /* =========================================================
     *  Toast / Modals
     * ========================================================= */
    function showToast(msg) {
        var c = $("toastContainer");
        var t = document.createElement("div");
        t.className = "toast";
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(function () { t.remove(); }, 1400);
    }

    function showNoticeModal(title, msg) {
        $("noticeModalTitle").textContent = title;
        $("noticeModalMsg").textContent = msg;
        $("noticeModal").classList.add("show");
    }

    function hideNoticeModal() {
        $("noticeModal").classList.remove("show");
    }

    function showConfirmModal(title, msg, onYes) {
        $("confirmModalTitle").textContent = title;
        $("confirmModalMsg").textContent = msg;
        $("confirmModal").classList.add("show");
        $("confirmYes").onclick = function () {
            $("confirmModal").classList.remove("show");
            if (onYes) onYes();
        };
        $("confirmNo").onclick = function () {
            $("confirmModal").classList.remove("show");
        };
    }

    /* =========================================================
     *  Adventure Overlay
     * ========================================================= */
    function showAdventureOverlay(cb, txtJp, txtEn) {
        uiLocked = true;
        $("adventureTextJp").textContent = txtJp || "冒険先へ移動中...";
        $("adventureTextEn").textContent = txtEn || "Travelling to destination...";
        $("adventureOverlay").classList.add("show");
        setTimeout(function () {
            $("adventureOverlay").classList.remove("show");
            uiLocked = false;
            if (cb) cb();
        }, 3000);
    }

    /* =========================================================
     *  Comeback Modal
     * ========================================================= */
    function showComebackModal() {
        if (!soul) {
            showNoticeModal("エラー", "Soul Doll が見つかりません。");
            return;
        }
        var code = TSP_STATE.makeSoulCode(soul);
        $("comebackCode").value = code;
        $("comebackSaga").textContent = "Saga: " + soul.sagaName;
        $("comebackModal").classList.add("show");
    }

    function hideComebackModal() {
        $("comebackModal").classList.remove("show");
        $("comebackCode").value = "";
    }

    function copyComebackCode() {
        var ta = $("comebackCode");
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, 99999); // For mobile

        var success = false;
        try {
            // Priority 1: Modern API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(ta.value).then(function () {
                    showToast("コピーしました！ / Copied!");
                });
                success = true;
            }
        } catch (err) { }

        // Priority 2: Fallback to execCommand if modern API failed/unavailable
        if (!success) {
            try {
                var successful = document.execCommand('copy');
                if (successful) {
                    showToast("コピーしました！ / Copied!");
                } else {
                    showToast("コピーに失敗しました / Copy failed");
                }
            } catch (err) {
                showToast("コピーに失敗しました / Copy failed");
            }
        }
    }

    /* =========================================================
     *  Legendz Preview (Enlarged)
     * ========================================================= */
    function showLdzPreview() {
        var mon = getMonster();
        if (!mon) return;
        var sprite = $("ldzPreviewSprite");
        sprite.style.backgroundImage = "url('" + mon.spritePath + "')";
        sprite.style.backgroundSize = "144px 96px";
        var rc = frameToRC(ldzWalkFrame);
        sprite.style.backgroundPosition = (-rc.c * 36) + "px " + (-rc.r * 48) + "px";

        // Show species name (Bilingual)
        var sName = mon.speciesName || "不明";
        var sNameEn = mon.speciesNameEn || "Unknown";
        $("ldzPreviewDesc").innerHTML = `<div style="font-weight:800; font-size:1.1rem; margin-bottom:10px;">${sName} <span style="font-size:0.8rem; opacity:0.7;">(${sNameEn})</span></div>`
            + (mon.desc || "詳細データなし");

        $("ldzPreviewModal").classList.add("show");
    }

    function hideLdzPreview() {
        $("ldzPreviewModal").classList.remove("show");
    }

    /* =========================================================
     *  Crystal Actions
     * ========================================================= */
    var activeCrystalId = null;

    function showSkillDetail(skID) {
        var sk = window.TSP_SKILL_DATA[skID];
        if (!sk) return;

        var attrJp = (TSP_GAME.ATTR_META[sk.attribute] || {}).jp || sk.attribute;
        var attrEn = sk.attribute.charAt(0).toUpperCase() + sk.attribute.slice(1);

        var title = `${sk.name} (${sk.nameEn})`;
        var msg = `${sk.desc}\n\n` +
            `属性 / Attr: ${attrJp} (${attrEn})\n` +
            `威力 / Power: ${sk.power}`;

        showNoticeModal(title, msg);
    }

    function showCrystalActionModal(cid) {
        activeCrystalId = cid;
        var cd = window.TSP_CRYSTAL_DATA[cid];
        if (!cd) return;

        $("caTitle").innerHTML = `${cd.name} <span style="font-size:0.75rem; opacity:0.6;">(${cd.nameEn})</span>`;

        var descHtml = cd.desc || "説明文なし";
        if (cd.descEn) descHtml += `<br><span style='font-style:italic; opacity:0.7; font-size:0.8rem;'>(${cd.descEn})</span>`;

        // Add skill info if learnable
        if (cd.skillId && window.TSP_SKILL_DATA[cd.skillId]) {
            var sk = window.TSP_SKILL_DATA[cd.skillId];
            descHtml += `<div class="mt-8 p-8" style="background:rgba(255,255,255,0.05); border-radius:4px; border-left:3px solid var(--accent); cursor:pointer;" onclick="TSP_APP_UTIL.showSkillDetail('${cd.skillId}')">
                <span style="font-size:0.75rem; color:var(--accent); font-weight:800;">LEARNABLE SKILL (Tap for Detail)</span><br>
                <span style="font-weight:700;">${sk.name}</span> <span style="font-size:0.7rem;">(${sk.nameEn})</span>
            </div>`;
        }

        $("caDesc").innerHTML = descHtml;
        $("caEffect").textContent = "効果 / Effect: " + cd.effect;

        // "Learn" is only for fragments with skillId
        $("btnCaLearn").style.display = cd.skillId ? "block" : "none";
        // Remove View button as per user request
        $("btnCaView").style.display = "none";

        $("crystalActionModal").classList.add("show");
    }

    function hideCrystalActionModal() {
        $("crystalActionModal").classList.remove("show");
    }

    function doUseCrystal() {
        if (!soul || !activeCrystalId) return;
        var cd = window.TSP_CRYSTAL_DATA[activeCrystalId];
        if (!cd) return;

        if (soul.crystals[activeCrystalId] > 0) {
            soul.crystals[activeCrystalId]--;
            cd.applyEffect(soul);
            showToast(cd.name + " を使用しました！");
            refreshCrystalTab();
            refreshStatsUI();
            saveGame();
            hideCrystalActionModal();
        }
    }

    function showSkillSlotPicker() {
        if (!soul || !activeCrystalId) return;
        var cd = window.TSP_CRYSTAL_DATA[activeCrystalId];
        if (!cd || !cd.skillId) return;

        var container = $("skillSlotList");
        container.innerHTML = "";

        for (var i = 0; i < 15; i++) {
            (function (index) {
                var mid = soul.moves[index];
                var sk = mid ? window.TSP_SKILL_DATA[mid] : null;

                var item = document.createElement("div");
                item.className = "slot-picker-item";
                item.innerHTML = `
                    <span class="slot-num">${index + 1}</span>
                    <span class="skill-name">${sk ? sk.name : "（空き）"}</span>
                    <span class="btn btn-sm btn-primary">セット</span>
                `;
                item.onclick = function () {
                    doLearnCrystalSkill(index);
                };
                container.appendChild(item);
            })(i);
        }

        $("skillSlotPickerModal").classList.add("show");
    }

    function hideSkillSlotPicker() {
        $("skillSlotPickerModal").classList.remove("show");
    }

    function doLearnCrystalSkill(slotIndex) {
        if (!soul || !activeCrystalId) return;
        var cd = window.TSP_CRYSTAL_DATA[activeCrystalId];
        if (!cd || !cd.skillId) return;

        var sk = window.TSP_SKILL_DATA[cd.skillId];
        if (!sk) return;

        showConfirmModal("スキル習得", `スロット ${slotIndex + 1} に ${sk.name} をセットしますか？`, function () {
            if (soul.crystals[activeCrystalId] > 0) {
                soul.crystals[activeCrystalId]--;
                soul.moves[slotIndex] = cd.skillId;
                showToast(sk.name + " を習得しました！");

                refreshCrystalTab();
                refreshLegendzTab();
                saveGame();

                hideSkillSlotPicker();
                hideCrystalActionModal();
            }
        });
    }

    /* =========================================================
     *  View Switching
     * ========================================================= */
    function showStartView() {
        $("startView").style.display = "flex";
        $("mainView").style.display = "none";
        $("headerInfo").style.display = "none";
        $("btnComeback").style.display = "none";

        // Restore Saga Name from cache
        var savedSaga = localStorage.getItem(LS_SAGA_KEY);
        if (savedSaga) {
            $("inputSagaName").value = savedSaga;
        }

        // Only clear code, NOT saga name
        $("inputSoulCode").value = "";
    }

    function showMainView() {
        $("startView").style.display = "none";
        $("mainView").style.display = "flex";
        $("headerInfo").style.display = "block";
        $("btnComeback").style.display = "block";

        // Save Saga Name to cache
        var sagaName = ($("inputSagaName").value || "").trim();
        if (sagaName) {
            localStorage.setItem(LS_SAGA_KEY, sagaName);
        }

        // Only clear code
        $("inputSoulCode").value = "";

        refreshHeader();
        refreshStatsUI();
        switchTab("home");
    }

    /* =========================================================
     *  Tab Switching
     * ========================================================= */
    function switchTab(tab) {
        activeTab = tab;
        var panes = document.querySelectorAll(".tab-pane");
        for (var i = 0; i < panes.length; i++) {
            panes[i].classList.remove("active");
        }
        $("tab-" + tab).classList.add("active");

        var btns = document.querySelectorAll(".tab-nav button");
        for (var j = 0; j < btns.length; j++) {
            btns[j].classList.remove("active");
        }
        $("tabBtn-" + tab).classList.add("active");

        // Refresh tab-specific content
        if (tab === "home") {
            refreshHomeUI();
        } else if (tab === "legendz") {
            refreshLegendzTab();
        } else if (tab === "crystal") {
            refreshCrystalTab();
        } else if (tab === "env") {
            refreshEnvTab();
        }
    }

    /* =========================================================
     *  Header
     * ========================================================= */
    function refreshHeader() {
        if (!soul) return;
        var mon = getMonster(); // This gives us LD entry
        var am = TSP_GAME.ATTR_META[soul.attribute] || {};
        var mhp = TSP_GAME.maxHP(soul);

        $("headerSaga").textContent = soul.sagaName;
        $("headerNickname").textContent = soul.nickname || "未登録";

        // Species & Attribute bilingual
        var spName = soul.speciesName;
        var spNameEn = mon ? mon.speciesNameEn : "Legendz";
        var atName = am.jp || "無属性";
        var atNameEn = am.en || "Neutral";

        $("headerSpeciesFull").textContent = spName + " / " + spNameEn + " (" + atName + " / " + atNameEn + ")";

        // HP Update
        var hpPct = mhp > 0 ? (soul.currentHP / mhp * 100) : 0;
        $("headerHPBar").style.width = Math.max(0, Math.min(100, hpPct)) + "%";
        $("headerHPText").textContent = soul.currentHP + " / " + mhp;

        // HP Danger Alert
        if (soul.currentHP <= mhp * 0.2 && soul.currentHP > 0) {
            $("headerHPBar").parentElement.classList.add("hp-danger");
        } else {
            $("headerHPBar").parentElement.classList.remove("hp-danger");
        }
    }

    /* =========================================================
     *  Sprite
     * ========================================================= */
    var spriteEl = null;
    var walkPos = 0;
    var walkDir = 1;
    var walkAccum = 0;
    var idleFrame = 1;
    var idleAccum = 0;
    var ldzWalkFrame = 1;
    var ldzWalkAccum = 0;
    var turnFrameTimer = 0;

    function frameToRC(i) {
        return { r: Math.floor((i - 1) / 4), c: (i - 1) % 4 };
    }

    function setSpriteFrame(frame) {
        if (!spriteEl) return;
        var rc = frameToRC(frame);
        var mon = getMonster();
        if (mon && mon.spritePath) {
            spriteEl.style.backgroundImage = "url('" + mon.spritePath + "')";
        }
        spriteEl.style.backgroundSize = "144px 96px";
        spriteEl.style.width = "36px";
        spriteEl.style.height = "48px";
        spriteEl.style.backgroundPosition = (-rc.c * 36) + "px " + (-rc.r * 48) + "px";
    }

    function tickIdle(dtSec) {
        idleAccum += dtSec;
        if (idleAccum >= 0.6) {
            idleAccum = 0;
            idleFrame = (idleFrame === 1) ? 2 : 1;
            setSpriteFrame(idleFrame);
        }
    }

    function tickLegendzSprite(dtSec) {
        var preview = $("ldzSpritePreview");
        if (!preview) return;
        ldzWalkAccum += dtSec;
        if (ldzWalkAccum >= 0.6) {
            ldzWalkAccum = 0;
            // Cycle between 1 and 2 (normal frames)
            ldzWalkFrame = (ldzWalkFrame === 1) ? 2 : 1;
            var rc = frameToRC(ldzWalkFrame);
            var pos = (-rc.c * 36) + "px " + (-rc.r * 48) + "px";
            preview.style.backgroundPosition = pos;

            var largePreview = $("ldzPreviewSprite");
            if (largePreview && $("ldzPreviewModal").classList.contains("show")) {
                largePreview.style.backgroundPosition = pos;
            }
        }
    }

    function tickWalk(dtSec) {
        walkAccum += dtSec;
        if (turnFrameTimer > 0) {
            turnFrameTimer -= dtSec;
            setSpriteFrame(3); // Upper-left 3rd frame
            return; // Pause movement while turning
        }

        // Interval for movement
        if (walkAccum >= 0.15) {
            walkAccum = 0;
            walkPos += walkDir * 4;

            if (walkPos > 42) {
                walkPos = 42;
                walkDir = -1;
                turnFrameTimer = 0.6;
            }
            if (walkPos < -42) {
                walkPos = -42;
                walkDir = 1;
                turnFrameTimer = 0.6;
            }

            // Left-facing sprite (Natural facing is left)
            spriteEl.style.transform = (walkDir === 1) ? "scale(1.5) scaleX(-1)" : "scale(1.5)";
            spriteEl.style.left = "calc(50% + " + walkPos + "px - 18px)";

            idleAccum += 0.15;
            // Half speed for frame switching (0.6s interval)
            if (idleAccum >= 0.6) {
                idleAccum = 0;
                idleFrame = (idleFrame === 1) ? 2 : 1;
            }
            setSpriteFrame(idleFrame);
        }
    }

    /* =========================================================
     *  Effects / Particles
     * ========================================================= */
    var currentRankFx = "";
    var fxAccum = 0;

    function clearFxAllHard() {
        var scene = $("scene");
        var parts = scene.querySelectorAll(".tsp-particle");
        for (var i = 0; i < parts.length; i++) parts[i].remove();
        scene.className = "scene";
        fxAccum = 0;
    }

    function spawnParticle(scene, type, emoji, dur) {
        var p = document.createElement("div");
        p.className = "tsp-particle " + type;
        p.textContent = emoji;
        p.style.setProperty("--dur", dur + "s");

        if (type === "tsp-fly") {
            var angle = Math.random() * Math.PI * 2;
            var dist = 60 + Math.random() * 120;
            p.style.setProperty("--dx", (Math.cos(angle) * dist) + "px");
            p.style.setProperty("--dy", (Math.sin(angle) * dist) + "px");
            // Scatter widely if it's a fly particle
            p.style.left = (10 + Math.random() * 80) + "%";
            p.style.top = (20 + Math.random() * 60) + "%";
        } else if (type === "tsp-fall") {
            p.style.left = (Math.random() * 100) + "%";
            p.style.top = "-5%";
            p.style.setProperty("--dy", (180 + Math.random() * 60) + "px");
        } else if (type === "tsp-drift") {
            p.style.left = (20 + Math.random() * 60) + "%";
            p.style.top = (40 + Math.random() * 30) + "%";
            var dx = -30 + Math.random() * 60;
            var dy = -40 - Math.random() * 40;
            p.style.setProperty("--dx", dx + "px");
            p.style.setProperty("--dy", dy + "px");
            p.style.setProperty("--dx2", (dx * 1.5) + "px");
            p.style.setProperty("--dy2", (dy * 1.5) + "px");
        }

        scene.appendChild(p);
        setTimeout(function () { p.remove(); }, dur * 1000 + 220);
    }

    function renderEffects(dtSec, rank) {
        var scene = $("scene");
        fxAccum += dtSec;

        if (rank === "superbest") {
            if (fxAccum >= 0.05) {
                fxAccum = 0;
                var emojis = ["✨", "🌟", "🌈", "🎶", "♪", "💖"];
                for (var i = 0; i < 4; i++) {
                    var em = emojis[Math.floor(Math.random() * emojis.length)];
                    spawnParticle(scene, "tsp-fly", em, 1.5 + Math.random() * 0.5);
                }
            }
        } else if (rank === "best") {
            if (fxAccum >= 0.12) {
                fxAccum = 0;
                for (var j = 0; j < 4; j++) {
                    spawnParticle(scene, "tsp-fall", "♪", 2.0);
                }
            }
        } else if (rank === "good") {
            if (fxAccum >= 0.45) {
                fxAccum = 0;
                var n = 1 + Math.floor(Math.random() * 2);
                for (var k = 0; k < n; k++) {
                    spawnParticle(scene, "tsp-drift", "♪", 3.0);
                }
            }
        }
    }

    /* =========================================================
     *  Scene Render
     * ========================================================= */
    function renderByCurrentEnv(dtSec) {
        if (!soul) return;
        var mon = getMonster();
        var rc = TSP_GAME.computeRank(mon, envApplied, new Date(), soul.attribute);
        var rank = rc.rank;

        // Update scene area class
        var scene = $("scene");
        var areaClass = "area-" + rc.areaId;
        if (!scene.classList.contains(areaClass)) {
            // remove old area classes
            var cls = scene.className.split(/\s+/).filter(function (c) { return !c.startsWith("area-") && !c.startsWith("fx-"); });
            cls.push(areaClass);
            // rank fx class
            if (rank === "bad") cls.push("fx-bad");
            else if (rank === "superbest") cls.push("fx-superbest");
            scene.className = cls.join(" ");
        }

        // If rank changed, reset effects
        if (rank !== currentRankFx) {
            clearFxAllHard();
            // Re-add area class
            scene.classList.add(areaClass);
            if (rank === "bad") scene.classList.add("fx-bad");
            else if (rank === "superbest") scene.classList.add("fx-superbest");
            currentRankFx = rank;

            // Reset sprite (start moving left = natural facing)
            walkPos = 0;
            walkDir = -1;
            spriteEl.style.left = "calc(50% - 18px)";
            spriteEl.style.transform = "scale(1.5)";
        }

        // Sprite behavior per rank
        if (rank === "superbest" || rank === "best") {
            setSpriteFrame(7);
            spriteEl.style.left = "calc(50% - 18px)";
            spriteEl.style.transform = "scale(1.5)";
        } else if (rank === "bad") {
            setSpriteFrame(8);
            spriteEl.style.left = "calc(50% - 18px)";
            spriteEl.style.transform = "scale(1.5)";
        } else if (rank === "neutral") {
            tickWalk(dtSec);
        } else {
            tickIdle(dtSec);
            spriteEl.style.left = "calc(50% - 18px)";
            spriteEl.style.transform = "scale(1.5)";
        }

        // Render particles
        renderEffects(dtSec, rank);
    }

    /* =========================================================
     *  Home Tab UI
     * ========================================================= */
    function refreshHomeUI() {
        if (!soul) return;
        var mon = getMonster();
        var now = new Date();
        var rc = TSP_GAME.computeRank(mon, envApplied, now, soul.attribute);
        var mhp = TSP_GAME.maxHP(soul);

        // Area & rank
        $("homeAreaName").textContent = rc.areaName + " / " + rc.areaNameEn;
        var rankEl = $("homeRankName");
        rankEl.textContent = rc.rank.toUpperCase();
        rankEl.className = "info-value rank-" + rc.rank;

        // Timer
        if (rc.rank === "neutral") {
            $("homeTimer").textContent = "No Growth";
        } else {
            var remaining = Math.max(0, 60 - secondsAccum);
            var mm = Math.floor(remaining / 60);
            var ss = Math.floor(remaining % 60);
            $("homeTimer").textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
        }

        // Growth preview
        var preview = TSP_GAME.computeMinutePreview(soul, mon, envApplied, now, elemCounter);
        var gpDiv = $("homeGrowthPreview");
        gpDiv.innerHTML = "";
        if (preview.noGrowth) {
            gpDiv.innerHTML = '<span class="growth-tag">成長なし / No Growth</span>';
        } else {
            if (preview.heal > 0) gpDiv.innerHTML += '<span class="growth-tag heal">Heal +' + preview.heal + '</span>';
            if (preview.hpGrow > 0) gpDiv.innerHTML += '<span class="growth-tag positive">HP +' + preview.hpGrow + '</span>';
            if (preview.hpDmg > 0) gpDiv.innerHTML += '<span class="growth-tag negative">HP -' + preview.hpDmg + '</span>';
            var skeys = TSP_GAME.STAT_KEYS;
            for (var i = 0; i < skeys.length; i++) {
                var k = skeys[i];
                if (preview.statGrows[k]) {
                    gpDiv.innerHTML += '<span class="growth-tag positive">' + (TSP_GAME.STAT_JP[k] || k) + ' +' + preview.statGrows[k] + '</span>';
                }
            }
        }

        // Neutral reset button
        $("btnNeutralReset").style.display = (rc.rank !== "neutral") ? "block" : "none";
        // Search button
        $("btnSearch").style.display = (rc.rank !== "neutral") ? "block" : "none";

        updateSessionGrowthUI();
    }

    function updateSessionGrowthUI() {
        var container = $("homeSessionGrowth");
        if (!container) return;

        var hasGrowth = sessionGrowth.hp > 0 || sessionGrowth.magic > 0 || sessionGrowth.counter > 0 || sessionGrowth.attack > 0 || sessionGrowth.recover > 0;

        if (!hasGrowth) {
            container.innerHTML = '<div class="session-growth-empty">冒険を開始すると記録されます</div>';
            return;
        }

        container.innerHTML = "";
        if (sessionGrowth.hp > 0) container.innerHTML += `<div class="session-growth-tag hp">HP +${sessionGrowth.hp}</div>`;

        var skeys = TSP_GAME.STAT_KEYS;
        for (var i = 0; i < skeys.length; i++) {
            var k = skeys[i];
            if (sessionGrowth[k] > 0) {
                container.innerHTML += `<div class="session-growth-tag ${k}">${TSP_GAME.STAT_JP[k]} +${sessionGrowth[k]}</div>`;
            }
        }
    }

    function resetSessionGrowth() {
        sessionGrowth = { hp: 0, magic: 0, counter: 0, attack: 0, recover: 0 };
        updateSessionGrowthUI();
    }

    function triggerGrowthAnim(result) {
        var labels = [];
        if (result.hpGrow > 0) labels.push({ text: "HP +" + result.hpGrow, type: "positive" });
        if (result.heal > 0) labels.push({ text: "Heal +" + result.heal, type: "heal" });
        if (result.hpDmg > 0) labels.push({ text: "HP -" + result.hpDmg, type: "negative" });

        var skeys = TSP_GAME.STAT_KEYS;
        for (var i = 0; i < skeys.length; i++) {
            var k = skeys[i];
            if (result.statGrows[k]) {
                labels.push({ text: (TSP_GAME.STAT_JP[k] || k) + " +" + result.statGrows[k], type: "positive" });
                sessionGrowth[k] += result.statGrows[k];
            }
        }

        if (result.hpGrow > 0) sessionGrowth.hp += result.hpGrow;

        labels.forEach(function (lab, idx) {
            createFloatingText("growthAnimHome", lab.text, lab.type, idx);
            createFloatingText("growthAnimLdz", lab.text, lab.type, idx);
        });
    }

    function createFloatingText(containerId, text, type, index) {
        var container = $(containerId);
        if (!container) return;

        var el = document.createElement("div");
        el.className = "floating-growth-text " + type;
        el.textContent = text;
        el.style.animationDelay = (index * 0.4) + "s";

        container.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 3000);
    }

    function refreshStatsUI() {
        refreshHeader();
        refreshHomeUI();
        if (activeTab === "legendz") refreshLegendzTab();
    }

    function updateGrowthPreviewAndTimer() {
        if (!soul || activeTab !== "home") return;
        var mon = getMonster();
        var now = new Date();
        var rc = TSP_GAME.computeRank(mon, envApplied, now, soul.attribute);

        if (rc.rank === "neutral") {
            $("homeTimer").textContent = "No Growth";
        } else {
            var remaining = Math.max(0, 60 - secondsAccum);
            var mm = Math.floor(remaining / 60);
            var ss = Math.floor(remaining % 60);
            $("homeTimer").textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
        }
    }

    /* =========================================================
     *  Env Tab
     * ========================================================= */
    function refreshEnvTab() {
        var tempSlider = $("tempSlider");
        var humSlider = $("humSlider");

        var ti = parseInt(tempSlider.value || "10");
        var hi = parseInt(humSlider.value || "10");
        envDraft.temp = TSP_GAME.TEMP_STEPS[ti] != null ? TSP_GAME.TEMP_STEPS[ti] : 0;
        envDraft.hum = TSP_GAME.HUM_STEPS[hi] != null ? TSP_GAME.HUM_STEPS[hi] : 50;

        $("tempValue").textContent = envDraft.temp + "°C";
        $("humValue").textContent = envDraft.hum + "%";

        var isSea = (envDraft.hum >= 100);
        $("lightLabel").textContent = isSea ? "水深 / Water Depth" : "光量 / Light";

        var lightBtns = document.querySelectorAll(".light-btn");
        for (var i = 0; i < lightBtns.length; i++) {
            var btn = lightBtns[i];
            var v2 = parseInt(btn.dataset.val);
            btn.classList.toggle("active", v2 === envDraft.light);

            if (isSea) {
                if (v2 === 0) btn.innerHTML = '<div style="font-size:0.85rem">浅瀬</div><div style="font-size:0.6rem">Shallow</div>';
                else if (v2 === 50) btn.innerHTML = '<div style="font-size:0.85rem">水中</div><div style="font-size:0.6rem">Mid</div>';
                else btn.innerHTML = '<div style="font-size:0.85rem">深海</div><div style="font-size:0.6rem">Deep</div>';
            } else {
                if (v2 === 0) btn.innerHTML = '<div style="font-size:0.85rem">0 (暗)</div><div style="font-size:0.6rem">Dark</div>';
                else if (v2 === 50) btn.innerHTML = '<div style="font-size:0.85rem">50</div><div style="font-size:0.6rem">Normal</div>';
                else btn.innerHTML = '<div style="font-size:0.85rem">100 (明)</div><div style="font-size:0.6rem">Bright</div>';
            }
        }

        // Prediction
        var areaId = window.TSP_AREA.resolveAreaId(envDraft.temp, envDraft.hum, envDraft.light);
        var area = window.TSP_AREAMAP.AREAS[areaId];
        var attr = area ? area.attr : "neutral";
        var am = TSP_GAME.ATTR_META[attr] || {};
        $("envPreviewArea").textContent = (am.jp || "無属性") + " / " + (am.en || "Neutral");
    }

    /* =========================================================
     *  Legendz Tab
     * ========================================================= */
    function refreshLegendzTab() {
        if (!soul) return;
        var mon = getMonster();
        var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
        var am = TSP_GAME.ATTR_META[soul.attribute] || {};
        var mhp = TSP_GAME.maxHP(soul);

        // Species + attribute
        $("ldzSpecies").textContent = soul.speciesName;
        var attrBadge = $("ldzAttrBadge");
        attrBadge.textContent = (am.jp || soul.attribute) + " / " + (am.en || soul.attribute);
        attrBadge.className = "attr-badge " + soul.attribute;

        // Nickname
        $("ldzNicknameInput").value = soul.nickname || "";

        // Sprite preview (Walking right)
        var preview = $("ldzSpritePreview");
        if (mon && mon.spritePath) {
            preview.style.backgroundImage = "url('" + mon.spritePath + "')";
            preview.style.backgroundSize = "144px 96px";
            // Flip right
            preview.style.transform = "scaleX(-1)";
            var rc = frameToRC(ldzWalkFrame);
            preview.style.backgroundPosition = (-rc.c * 36) + "px " + (-rc.r * 48) + "px";
        }

        // HP
        $("ldzHP").textContent = soul.currentHP + " / " + mhp;
        var hpPct = mhp > 0 ? (soul.currentHP / mhp * 100) : 0;
        $("ldzHPBar").style.width = hpPct + "%";

        // Stats
        var skeys = TSP_GAME.STAT_KEYS;
        for (var i = 0; i < skeys.length; i++) {
            var k = skeys[i];
            var total = soul.baseStats[k] + soul.growStats[k];
            var maxG = ld ? ld.maxGrowStats[k] : 630;
            var cap = soul.baseStats[k] + maxG;
            $("ldzStat-" + k).textContent = total;
        }

        // Skills
        refreshSkillSlots();
    }

    function refreshSkillSlots() {
        if (!soul) return;
        var container = $("ldzSkillSlots");
        container.innerHTML = "";
        for (var i = 0; i < 15; i++) {
            var mid = soul.moves[i];
            var slot = document.createElement("div");
            slot.className = "skill-slot";

            if (mid && window.TSP_SKILL_DATA && window.TSP_SKILL_DATA[mid]) {
                var sk = window.TSP_SKILL_DATA[mid];

                // 1. Attribute Badge (Left)
                var badge = document.createElement("span");
                badge.className = "skill-attr-badge attr-badge " + sk.attribute;
                badge.textContent = (TSP_GAME.ATTR_META[sk.attribute] || {}).jp || sk.attribute;
                slot.appendChild(badge);

                // 2. Skill Name (Center)
                var nameWrap = document.createElement("div");
                nameWrap.style.flex = "1";
                nameWrap.style.paddingLeft = "8px";

                var nameEl = document.createElement("div");
                nameEl.className = "skill-name";
                nameEl.textContent = sk.name;
                nameWrap.appendChild(nameEl);

                var nameEnEl = document.createElement("div");
                nameEnEl.className = "skill-name-en";
                nameEnEl.textContent = sk.nameEn + " (Pow: " + sk.power + ")";
                nameWrap.appendChild(nameEnEl);

                slot.appendChild(nameWrap);

                // 3. Test Fire Button (Right)
                var testBtn = document.createElement("button");
                testBtn.className = "skill-test-btn";
                testBtn.innerHTML = "🔍";
                testBtn.onclick = (function (sId) {
                    return function () {
                        showSkillDetail(sId);
                    };
                })(sk.id);
                slot.appendChild(testBtn);
            } else {
                var emptyEl = document.createElement("span");
                emptyEl.className = "skill-empty";
                emptyEl.style.marginLeft = "45px";
                emptyEl.textContent = "— empty —";
                slot.appendChild(emptyEl);
            }

            container.appendChild(slot);
        }
    }

    /* =========================================================
     *  Crystal Tab (v0.8)
     * ========================================================= */
    function refreshCrystalTab() {
        if (!soul) return;
        var container = $("crystalList");
        container.innerHTML = "";

        var crystals = soul.crystals || {};
        var keys = Object.keys(crystals).filter(function (k) { return crystals[k] > 0; });

        if (keys.length === 0) {
            container.innerHTML = '<div class="crystal-empty">クリスタルを所持していません<br>No crystals yet</div>';
            return;
        }

        // Available groups
        var groupNames = {
            "cost": "コスト / COST",
            "volcano": "ヴォルケーノ / VOLCANO",
            "tornado": "トルネード / TORNADO",
            "earthquake": "アースクエイク / EARTHQUAKE",
            "storm": "ストーム / STORM"
        };
        var orderedGroups = ["cost", "volcano", "tornado", "earthquake", "storm"];

        orderedGroups.forEach(function (groupKey) {
            var groupCrystals = keys.filter(function (cid) {
                var cd = window.TSP_CRYSTAL_DATA[cid];
                return cd && cd.group === groupKey;
            });

            if (groupCrystals.length > 0) {
                var groupEl = document.createElement("div");
                groupEl.className = "crystal-group";

                var header = document.createElement("div");
                header.className = "crystal-group-header";
                header.innerHTML = `
                    <span>${groupNames[groupKey]}</span>
                `;
                header.onclick = function () {
                    groupEl.classList.toggle("open");
                };

                var content = document.createElement("div");
                content.className = "crystal-group-content";

                groupCrystals.forEach(function (cid) {
                    var cd = window.TSP_CRYSTAL_DATA[cid];
                    var item = document.createElement("div");
                    item.className = "crystal-item";
                    item.innerHTML = `
                        <div class="crystal-item-name-box">
                            <div class="name">${cd.name}</div>
                            <div class="name-en">${cd.nameEn}</div>
                        </div>
                        <span class="qty">x${crystals[cid]}</span>
                    `;
                    item.onclick = function () {
                        showCrystalActionModal(cid);
                    };
                    content.appendChild(item);
                });

                groupEl.appendChild(header);
                groupEl.appendChild(content);
                container.appendChild(groupEl);
            }
        });
    }

    /* =========================================================
     *  rafLoop
     * ========================================================= */
    var rafStarted = false;

    function rafLoop(msNow) {
        var dtSec = Math.min(0.05, (msNow - lastRafMs) / 1000);
        lastRafMs = msNow;

        if (soul && activeTab === "home") {
            secondsAccum += dtSec;
            if (secondsAccum >= 60) {
                secondsAccum -= 60;
                minuteCounter++;
                var mon = getMonster();
                var growth = TSP_GAME.applyOneMinute(soul, mon, envApplied, new Date(), elemCounter);
                triggerGrowthAnim(growth);
                refreshStatsUI();
                saveGame();
            }
            updateGrowthPreviewAndTimer();
            renderByCurrentEnv(dtSec);
        } else if (soul && activeTab === "legendz") {
            tickLegendzSprite(dtSec);
        }

        requestAnimationFrame(rafLoop);
    }

    function ensureRafLoop() {
        if (!rafStarted) {
            rafStarted = true;
            lastRafMs = performance.now();
            requestAnimationFrame(rafLoop);
        }
    }

    /* =========================================================
     *  Reborn Actions
     * ========================================================= */
    function doNewReborn() {
        var sagaName = ($("inputSagaName").value || "").trim();
        if (!sagaName) {
            showNoticeModal("入力エラー", "サーガ名を入力してください。");
            return;
        }

        soul = TSP_STATE.newSoulWindragon(sagaName);

        // Giveaway sample crystals for testing
        soul.crystals["crystal_cost"] = 2;
        soul.crystals["fragment_salamander"] = 5;
        soul.crystals["fragment_blazedragon"] = 3;
        soul.crystals["fragment_harpy"] = 5;
        soul.crystals["fragment_tornadoking"] = 1;

        envDraft = { temp: 0, hum: 50, light: 50 };
        envApplied = { temp: 0, hum: 50, light: 50 };
        elemCounter = { magic: 0, counter: 0, attack: 0, recover: 0 };
        secondsAccum = 0;
        minuteCounter = 0;
        resetSessionGrowth();

        saveGame();
        showMainView();
        ensureRafLoop();
        showToast("Soul Doll を発見しました！ ウインドラゴンが目を覚ます...");
    }

    function doCodeReborn() {
        var sagaName = ($("inputSagaName").value || "").trim();
        var code = ($("inputSoulCode").value || "").trim();
        if (!sagaName) {
            showNoticeModal("入力エラー", "サーガ名を入力してください。");
            return;
        }
        if (!code) {
            showNoticeModal("入力エラー", "Soul Doll コードを入力してください。");
            return;
        }

        try {
            var s = TSP_STATE.parseSoulCode(code);
            TSP_STATE.assertSagaMatch(s, sagaName);
            soul = s; // Validate first, then assign to global
        } catch (e) {
            showNoticeModal("復元エラー", e.message);
            return;
        }

        envDraft = { temp: 0, hum: 50, light: 50 };
        envApplied = { temp: 0, hum: 50, light: 50 };
        elemCounter = { magic: 0, counter: 0, attack: 0, recover: 0 };
        secondsAccum = 0;
        minuteCounter = 0;
        resetSessionGrowth();

        saveGame();
        showMainView();
        ensureRafLoop();
        showToast("Soul Doll の記憶が蘇りました！");
    }

    /* =========================================================
     *  Neutral Reset
     * ========================================================= */
    function doNeutralReset() {
        showConfirmModal(
            "ムゾクセイ？",
            "Reset environment to neutral?",
            function () {
                envApplied = { temp: 0, hum: 50, light: 50 };
                envDraft = { temp: 0, hum: 50, light: 50 };
                secondsAccum = 0;
                resetSessionGrowth();

                // Reset UI controls
                $("tempSlider").value = 10;
                $("humSlider").value = 10;

                // Reset Light buttons
                var lbs = document.querySelectorAll(".light-btn");
                lbs.forEach(function (b) {
                    b.classList.remove("active");
                    if (b.dataset.val === "50") b.classList.add("active");
                });

                clearFxAllHard();
                refreshHomeUI();
                refreshEnvTab();
                saveGame();
                showToast("環境を無属性に戻しました");
            }
        );
    }

    /* =========================================================
     *  Apply Environment
     * ========================================================= */
    function doApplyEnv() {
        if (uiLocked) return;
        showAdventureOverlay(function () {
            envApplied = {
                temp: envDraft.temp,
                hum: envDraft.hum,
                light: envDraft.light
            };
            secondsAccum = 0;
            clearFxAllHard();
            currentRankFx = "";
            sessionGrowth = { hp: 0, magic: 0, counter: 0, attack: 0, recover: 0 };
            switchTab("home");
            refreshStatsUI();
            saveGame();
            showToast("冒険先に到着しました！");
        });
    }

    function doResetEnv() {
        envDraft = { temp: 0, hum: 50, light: 50 };
        $("tempSlider").value = 10;
        $("humSlider").value = 10;
        envDraft.light = 50;
        refreshEnvTab();
        showToast("環境設定をリセットしました");
    }

    /* =========================================================
     *  Nickname
     * ========================================================= */
    function doNicknameChange() {
        if (!soul) return;
        var val = ($("ldzNicknameInput").value || "").trim();
        soul.nickname = val;
        soul.updatedAt = Date.now();
        refreshHeader();
        saveGame();
        showToast("ニックネームを更新しました");
    }

    /* =========================================================
     *  Comeback → Go to Reborn
     * ========================================================= */
    function goToReborn() {
        hideComebackModal();
        // Clear current session
        soul = null;
        resetSessionGrowth();
        showStartView();
    }



    /* =========================================================
     *  Search (Battle / Item)
     * ========================================================= */
    function doSearch() {
        if (!soul || uiLocked) return;

        var mon = getMonster();
        var rc = TSP_GAME.computeRank(mon, envApplied, new Date(), soul.attribute);
        if (rc.rank === "neutral") return;

        showAdventureOverlay(function () {
            var rand = Math.random() * 100;
            if (rand < 60) {
                // Battle (60%)
                showBattleModal("野生のレジェンズが現れた！ / Wild Encounter!", "野生のレジェンズと遭遇しました！<br>(バトルの詳細は後ほど実装されます。現在は自動的に終了します)<br><br>A wild Legend has appeared!<br>(Battle logic coming soon. Ending encounter for now.)");
            } else if (rand < 80) {
                // Cost Crystal (20%)
                gainCrystal("crystal_cost");
                showBattleModal("発見！ / Found!", "コストクリスタルを発見しました！<br><br>Found a Cost Crystal!");
            } else {
                // Attribute Weak Crystal (20%)
                var weakCid = getWeakCrystalId(rc.envAttr);
                if (weakCid) {
                    gainCrystal(weakCid);
                    var cd = window.TSP_CRYSTAL_DATA[weakCid];
                    var nameJp = cd ? cd.name : weakCid;
                    var nameEn = cd ? cd.nameEn : weakCid;
                    showBattleModal("発見！ / Found!", `${nameJp} を発見しました！<br><br>Found ${nameEn}!`);
                } else {
                    showBattleModal("何も見つからなかった... / Nothing Found", "周りを調べましたが、何も見つかりませんでした。<br><br>Looked around but found nothing.");
                }
            }
        }, "竜王を探しています...", "Searching for the Dragon King...");
    }

    function gainCrystal(cid) {
        if (!soul) return;
        soul.crystals[cid] = (soul.crystals[cid] || 0) + 1;
        saveGame();
    }

    function getWeakCrystalId(envAttr) {
        var map = {
            volcano: "fragment_salamander",
            tornado: "fragment_harpy",
            earthquake: "fragment_lizardman",
            storm: "fragment_stormworm"
        };
        return map[envAttr] || null;
    }

    function showBattleModal(title, msg) {
        $("battleTitle").innerHTML = title;
        $("battleMsg").innerHTML = msg;
        $("battleModal").classList.add("show");
    }

    function hideBattleModal() {
        $("battleModal").classList.remove("show");
    }

    /* =========================================================
     *  Boot
     * ========================================================= */
    function boot() {
        spriteEl = $("sprite");

        // Tab buttons
        var tabNames = ["home", "env", "legendz", "crystal"];
        for (var i = 0; i < tabNames.length; i++) {
            (function (tn) {
                $("tabBtn-" + tn).addEventListener("click", function () {
                    if (uiLocked) return;
                    switchTab(tn);
                });
            })(tabNames[i]);
        }

        // Start view buttons
        $("btnNewReborn").addEventListener("click", doNewReborn);
        $("btnCodeReborn").addEventListener("click", doCodeReborn);

        // Comeback
        $("btnComeback").addEventListener("click", showComebackModal);
        $("btnComebackClose").addEventListener("click", hideComebackModal);
        $("btnComebackCopy").addEventListener("click", copyComebackCode);
        $("btnComebackReborn").addEventListener("click", goToReborn);

        // Notice modal
        $("noticeModalOk").addEventListener("click", hideNoticeModal);

        // Env sliders
        $("tempSlider").max = TSP_GAME.TEMP_STEPS.length - 1;
        $("tempSlider").value = 10; // 0°C
        $("humSlider").max = TSP_GAME.HUM_STEPS.length - 1;
        $("humSlider").value = 10; // 50%

        $("tempSlider").addEventListener("input", refreshEnvTab);
        $("humSlider").addEventListener("input", refreshEnvTab);

        // Light buttons
        var lightBtns = document.querySelectorAll(".light-btn");
        for (var lb = 0; lb < lightBtns.length; lb++) {
            lightBtns[lb].addEventListener("click", function () {
                envDraft.light = parseInt(this.dataset.val);
                refreshEnvTab();
            });
        }

        // Env actions
        $("btnApplyEnv").addEventListener("click", doApplyEnv);
        $("btnResetEnv").addEventListener("click", doResetEnv);

        // Neutral reset
        $("btnNeutralReset").addEventListener("click", doNeutralReset);

        // Search
        $("btnSearch").addEventListener("click", doSearch);
        $("btnBattleClose").addEventListener("click", hideBattleModal);

        // Nickname
        $("btnNicknameApply").addEventListener("click", doNicknameChange);

        // Legendz Preview
        $("ldzSpritePreview").addEventListener("click", showLdzPreview);
        $("btnLdzPreviewClose").addEventListener("click", hideLdzPreview);
        $("ldzPreviewClose").addEventListener("click", hideLdzPreview);

        // Crystal Actions
        $("btnCaCancel").addEventListener("click", hideCrystalActionModal);
        $("btnCaView").addEventListener("click", hideCrystalActionModal); // For now just close
        $("btnCaUse").addEventListener("click", doUseCrystal);
        $("btnCaLearn").addEventListener("click", showSkillSlotPicker);
        $("btnSlotPickerCancel").addEventListener("click", hideSkillSlotPicker);

        // Initial screen
        showStartView();
    }

    // Expose utilities for inline access
    window.TSP_APP_UTIL = {
        showSkillDetail: showSkillDetail
    };

    // DOM Ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})();
