/* ============================================================
 *  battle.js  –  Strategic Round-based Battle Logic (v0.9)
 * ============================================================ */
(function () {
    "use strict";

    var $ = function (id) { return document.getElementById(id); };

    var selectionTimerId = null;
    var selectionTimeLeft = 30;

    var battleState = {
        active: false,
        round: 1,
        phase: "selection", // selection, execution, result
        player: {
            soul: null,
            hp: 0,
            maxHP: 0,
            name: "",
            spent: [], // indices of 15 moves used
            currentSelection: [] // indices [i1, i2, i3]
        },
        enemy: {
            data: null,
            hp: 0,
            maxHP: 0,
            spent: [],
            currentSelection: []
        },
        log: []
    };

    function startBattle(playerSoul, targetEnemyId) {
        if (battleState.active) return;
        battleState.active = true;

        // Reset Growth Timer to 01:00 (0 accumulated)
        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.resetTimer) {
            window.TSP_APP_UTIL.resetTimer();
        }

        // Hide Tabs, Hide Comeback
        var tabs = document.querySelector(".tabs");
        if (tabs) tabs.style.display = "none";
        if ($("btnComeback")) $("btnComeback").style.display = "none";

        // Pause BGM during battle
        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.pauseBGM) {
            window.TSP_APP_UTIL.pauseBGM();
        }

        // Setup Player
        battleState.player.soul = playerSoul;
        battleState.player.maxHP = window.TSP_GAME.maxHP(playerSoul);
        // Important: ensure battle HP is at least 1 or current soul HP
        battleState.player.hp = Math.max(1, playerSoul.currentHP || 0);
        battleState.player.name = playerSoul.nickname || playerSoul.speciesName;
        battleState.player.nameEn = playerSoul.speciesNameEn || playerSoul.speciesId; // Set English name for logs
        battleState.player.spent = [];
        battleState.player.currentSelection = [];

        // Setup Enemy
        var enemyId = targetEnemyId || "harpy";
        var ed = window.TSP_ENEMY_LEGENDZ[enemyId] || window.TSP_ENEMY_LEGENDZ["harpy"];
        battleState.enemy.data = ed;
        battleState.enemy.name = ed.speciesName; // Set name for logs
        battleState.enemy.nameEn = ed.speciesNameEn || "Harpy"; // Set English name for logs
        battleState.enemy.maxHP = ed.baseHP;
        battleState.enemy.hp = ed.baseHP;
        battleState.enemy.spent = [];
        battleState.enemy.currentSelection = [];

        battleState.round = 1;
        battleState.phase = "selection";
        battleState.log = [];

        // UI Reset - Hide ALL layers first to avoid flickering
        $("battleIntroLayer").style.display = "none";
        $("battleMainLayer").style.display = "none";
        $("battleSelectionLayer").style.display = "none";
        $("battleResultLayer").style.display = "none";
        $("crystalRewardScene").style.display = "none";
        $("defeatPenaltyBox").style.display = "none";

        // Reset Sprite State (Clean up previous animations & effects)
        var pS = $("playerSprite");
        var eS = $("enemySprite");
        pS.classList.remove("player-victory-pose");
        eS.classList.remove("enemy-annihilate");
        eS.style.opacity = "1";
        eS.style.filter = "none";
        eS.style.transform = "scale(1.8)";

        // Show Intro Layer
        $("battleIntroLayer").style.display = "flex";

        setTimeout(function () {
            $("battleIntroLayer").style.display = "none";
            $("battleMainLayer").style.display = "block";
            initSelectionPhase();
        }, 2000);

        $("battleModal").classList.add("show");
    }

    function initSelectionPhase() {
        battleState.phase = "selection";
        battleState.player.currentSelection = [];

        $("battleTitle").textContent = "ROUND " + battleState.round + " / 5";
        $("battleSelectionLayer").style.display = "block";
        $("selectionRoundInfo").textContent = "ROUND " + battleState.round + "/5: SELECT 3 ACTIONS (行動選択)";

        // Update Slots
        renderSelectionSlots();
        // Update Grid
        renderSkillGrid();
        // Update Main UI (HPs)
        refreshBattleUI();

        addLog("次の3つの行動を選択してください。\nSelect next 3 actions.");

        // Timer Setup
        clearInterval(selectionTimerId);
        selectionTimeLeft = 30;
        $("selectionTimer").textContent = selectionTimeLeft;
        selectionTimerId = setInterval(function () {
            selectionTimeLeft--;
            $("selectionTimer").textContent = selectionTimeLeft;
            if (selectionTimeLeft <= 0) {
                clearInterval(selectionTimerId);
                autoSelectSkills();
            }
        }, 1000);

        // Start Walking
        $("playerSprite").classList.add("sprite-walking");
        $("enemySprite").classList.add("sprite-walking");
    }

    function autoSelectSkills() {
        // Find indices of moves that are not in 'spent' and not null
        var moves = battleState.player.soul.moves;
        var available = [];
        for (var i = 0; i < moves.length; i++) {
            if (moves[i] && battleState.player.spent.indexOf(i) === -1) {
                available.push(i);
            }
        }
        // Take up to 3
        battleState.player.currentSelection = available.slice(0, 3);

        // Trigger execution directly to bypass button disabled-check
        confirmSkills();
    }

    function renderSelectionSlots() {
        for (var i = 0; i < 3; i++) {
            var slot = $("slot" + i);
            var mIdx = battleState.player.currentSelection[i];
            if (mIdx !== undefined) {
                var mid = battleState.player.soul.moves[mIdx];
                var sk = window.TSP_SKILL_DATA[mid];
                slot.textContent = sk ? sk.name : "???";
                slot.parentElement.style.borderColor = "var(--accent)";
            } else {
                slot.textContent = "—";
                slot.parentElement.style.borderColor = "var(--glass-border)";
            }
        }
        $("btnConfirmActions").disabled = (battleState.player.currentSelection.length < 3);
    }

    function renderSkillGrid() {
        var grid = $("battleSkillGrid");
        grid.innerHTML = "";

        var moves = battleState.player.soul.moves;
        moves.forEach(function (mid, idx) {
            var sk = mid ? window.TSP_SKILL_DATA[mid] : null;
            var btn = document.createElement("button");
            btn.className = "skill-btn";

            if (!sk) {
                btn.disabled = true;
                btn.innerHTML = "<div>—</div>";
            } else {
                var isSpent = battleState.player.spent.indexOf(idx) !== -1;
                var isSelected = battleState.player.currentSelection.indexOf(idx) !== -1;

                if (isSpent) {
                    btn.disabled = true;
                    btn.style.opacity = "0.3";
                    btn.style.filter = "grayscale(1)";
                }
                if (isSelected) btn.classList.add("selected");

                var am = window.TSP_GAME.ATTR_META[sk.attribute] || {};
                var label = (am.jp || sk.attribute) + " / " + (am.en || sk.attribute);
                var skNameDisp = sk.name + " / " + (sk.nameEn || sk.id);
                btn.innerHTML = `<div>${skNameDisp}</div><div style="font-size:0.5rem; color:${am.color || '#fff'}">${label}</div>`;

                btn.onclick = function () {
                    toggleSkillSelection(idx);
                };
            }
            grid.appendChild(btn);
        });
    }

    function toggleSkillSelection(idx) {
        var sIdx = battleState.player.currentSelection.indexOf(idx);
        if (sIdx !== -1) {
            battleState.player.currentSelection.splice(sIdx, 1);
        } else {
            if (battleState.player.currentSelection.length < 3) {
                battleState.player.currentSelection.push(idx);
            }
        }
        renderSelectionSlots();
        renderSkillGrid();
    }

    // Confirm Selection and Start Turn
    $("btnConfirmActions").onclick = confirmSkills;

    function confirmSkills() {
        clearInterval(selectionTimerId);
        $("battleSelectionLayer").style.display = "none";

        // Stop Walking
        $("playerSprite").classList.remove("sprite-walking");
        $("enemySprite").classList.remove("sprite-walking");

        // Enemy Selection (Randomly pick 3 indices from 0 to 14)
        battleState.enemy.currentSelection = [];
        var allIndices = [];
        for (var i = 0; i < 15; i++) allIndices.push(i);
        // Shuffle and take 3
        allIndices.sort(() => Math.random() - 0.5);
        battleState.enemy.currentSelection = allIndices.slice(0, 3);

        startExecution();
    };

    function startExecution() {
        var pairIdx = 0;
        addLog("--- ターン開始 / Turn Start ---");

        function nextPair() {
            if (pairIdx >= 3 || battleState.player.hp <= 0 || battleState.enemy.hp <= 0) {
                setTimeout(finishRound, 1000);
                return;
            }

            var pMid = battleState.player.soul.moves[battleState.player.currentSelection[pairIdx]];
            var eMid = battleState.enemy.data.moves[battleState.enemy.currentSelection[pairIdx]];
            var pSk = window.TSP_SKILL_DATA[pMid] || window.TSP_SKILL_DATA["skill_basic_slap"];
            var eSk = window.TSP_SKILL_DATA[eMid] || window.TSP_SKILL_DATA["skill_basic_slap"];

            // Step 1: Reveal Player Move (Handle Heal/Counter immediately)
            var pNameDisp = pSk.name + " (" + (pSk.nameEn || pSk.id) + ")";
            addLog("① " + battleState.player.name + ": " + pNameDisp + "\n" + battleState.player.nameEn + ": " + (pSk.nameEn || pSk.id));
            executeMoveLogic(pSk, eSk, true, true);

            setTimeout(() => {
                // Step 2: Reveal Enemy Move (Handle Heal/Counter immediately)
                var eNameDisp = eSk.name + " (" + (eSk.nameEn || eSk.id) + ")";
                addLog("② " + battleState.enemy.name + ": " + eNameDisp + "\n" + battleState.enemy.nameEn + ": " + (eSk.nameEn || eSk.id));
                executeMoveLogic(eSk, pSk, false, true);

                setTimeout(() => {
                    // Step 3: Player Acts (Damage) & Clear Skill Names
                    clearFloatingSkills();
                    executeMoveLogic(pSk, eSk, true, false);

                    setTimeout(() => {
                        // Step 4: Enemy Acts (Damage)
                        if (battleState.player.hp > 0 && battleState.enemy.hp > 0) {
                            executeMoveLogic(eSk, pSk, false, false);
                        }

                        pairIdx++;
                        battleState.player.spent.push(battleState.player.currentSelection[pairIdx - 1]);
                        battleState.enemy.spent.push(battleState.enemy.currentSelection[pairIdx - 1]);

                        setTimeout(nextPair, 2500);
                    }, 2200);
                }, 1500);
            }, 1000);
        }

        nextPair();
    }

    function executeMoveLogic(actorSk, targetSk, isPlayer, isRevealStep) {
        var actor = isPlayer ? battleState.player : battleState.enemy;
        var defender = isPlayer ? battleState.enemy : battleState.player;

        var isCounter = (actorSk.attribute === "tornado");
        var isMagic = (actorSk.attribute === "volcano");
        var isHeal = (actorSk.category === "heal");

        var defIsCounter = (targetSk.attribute === "tornado");

        if (isRevealStep) {
            showFloatingSkill(actorSk.nameEn || actorSk.id, isPlayer);
            if (isHeal) {
                addLog((isPlayer ? "★" : "≫") + actor.name + "の回復！ / " + actor.nameEn + "'s Heal!");
                var recoverStat = isPlayer ? (actor.soul.baseStats.recover + actor.soul.growStats.recover) : actor.data.baseStats.recover;

                // New logic: Stat * (Power/100) * (matchesAttr ? 1.5 : 1.0)
                var actorAttr = isPlayer ? actor.soul.attribute : actor.data.attribute;
                var bonus = (actorAttr === actorSk.attribute) ? 1.5 : 1.0;
                var heal = Math.floor(recoverStat * (actorSk.power / 100) * bonus);

                actor.hp = Math.min(actor.maxHP, actor.hp + heal);
                addLog(actor.name + "は " + heal + " 回復した！\n" + actor.nameEn + " recovered " + heal + " HP!");
                showFloatingNumber(heal, isPlayer, false);
                spawnHealingFX(isPlayer);
                refreshBattleUI();
            } else if (isCounter) {
                addLog((isPlayer ? "★" : "≫") + actor.name + "待機中... / " + actor.nameEn + " waiting...");
                var sprite = isPlayer ? $("playerSprite") : $("enemySprite");
                sprite.classList.add("sprite-walking");
            }
        } else {
            if (isHeal || isCounter) return;

            addLog((isPlayer ? "★" : "≫") + actor.name + "の行動！ / " + actor.nameEn + "'s action!");

            if (isMagic && defIsCounter) {
                addLog("！！ 反射発動！ /！！ REFLECTED!");
                playCounterReflectionEffect(actorSk, isPlayer);

                // Reflection uses defender's counter stat
                var defStat = (!isPlayer) ? (battleState.player.soul.baseStats["counter"] + battleState.player.soul.growStats["counter"]) : (battleState.enemy.data.baseStats["counter"]);

                // Bonus for reflector? Example didn't specify, but let's check move matching actor attr.
                // In reflection, the 'act' is the reflection. But actually, we apply the move's power.
                // For reflection, typically it uses the move's power but the reflector's stat and attribute bonus.
                var defAttr = (!isPlayer) ? battleState.player.soul.attribute : battleState.enemy.data.attribute;
                var bonus = (defAttr === "tornado") ? 1.5 : 1.0; // Reflector is always tornado
                var damage = Math.floor(defStat * (actorSk.power / 100) * bonus);

                actor.hp -= damage;
                addLog(actor.name + "に " + damage + " の反射ダメージ！\n" + actor.nameEn + " took " + damage + " reflected damage!");
                showFloatingNumber(damage, isPlayer, true);
                refreshBattleUI();
            } else {
                // Determine stat key based on skill attribute
                var statKey = "attack";
                if (actorSk.attribute === "volcano") statKey = "magic";
                else if (actorSk.attribute === "tornado") statKey = "counter";
                else if (actorSk.attribute === "earthquake") statKey = "attack";
                else if (actorSk.attribute === "storm") statKey = "recover";
                else if (actorSk.attribute === "neutral") statKey = "attack";

                var atkStat = isPlayer ? (actor.soul.baseStats[statKey] + actor.soul.growStats[statKey]) : actor.data.baseStats[statKey];

                var actorAttr = isPlayer ? actor.soul.attribute : actor.data.attribute;
                var bonus = (actorAttr === actorSk.attribute) ? 1.5 : 1.0;
                var damage = Math.floor(atkStat * (actorSk.power / 100) * bonus);

                defender.hp -= damage;
                addLog(defender.name + "に " + damage + " のダメージ！\n" + defender.nameEn + " took " + damage + " damage!");
                showFloatingNumber(damage, !isPlayer, true);
                playVisualEffect(actorSk, isPlayer);
                refreshBattleUI();
            }
            var sprite = isPlayer ? $("playerSprite") : $("enemySprite");
            sprite.classList.remove("sprite-walking");
        }
    }

    function playVisualEffect(sk, isPlayer) {
        var atkSprite = isPlayer ? $("playerSprite") : $("enemySprite");
        var defSprite = isPlayer ? $("enemySprite") : $("playerSprite");

        var isMelee = (sk.attribute === "earthquake");
        var isFireball = (sk.attribute === "volcano");
        var isPebble = (sk.id === "skill_basic_slap" || sk.attribute === "tornado" || sk.attribute === "storm");

        if (sk.category === "heal") {
            spawnHealingFX(isPlayer);
        } else if (isMelee) {
            var animClass = isPlayer ? "atk-melee-p" : "atk-melee-e";
            atkSprite.classList.add(animClass);
            setTimeout(() => atkSprite.classList.remove(animClass), 650);
        } else {
            var animClass = isPlayer ? "atk-cast-p" : "atk-cast-e";
            atkSprite.classList.add(animClass);
            setTimeout(() => atkSprite.classList.remove(animClass), 650);

            if (isFireball) spawnProjectile(isPlayer, "fx-projectile");
            else spawnProjectile(isPlayer, "fx-pebble");
        }

        if (sk.category !== "heal") {
            setTimeout(() => {
                defSprite.classList.add("hit-shake");
                defSprite.style.backgroundPosition = "-108px -48px";
                setTimeout(() => {
                    defSprite.classList.remove("hit-shake");
                    refreshBattleUI();
                }, 500);
            }, 300);
        }
    }

    function playCounterReflectionEffect(sk, isPlayer) {
        var atkSprite = isPlayer ? $("playerSprite") : $("enemySprite");
        var defSprite = isPlayer ? $("enemySprite") : $("playerSprite");
        var flash = $("counterFlashLayer");

        // 1. Attacker Casts Magic
        var castAnim = isPlayer ? "atk-cast-p" : "atk-cast-e";
        atkSprite.classList.add(castAnim);
        setTimeout(() => atkSprite.classList.remove(castAnim), 600);

        // 2. Fire projectile
        var p = document.createElement("div");
        p.className = (sk.attribute === "volcano") ? "fx-projectile" : "fx-pebble";
        $("battleArenaFX").appendChild(p);

        var startX = isPlayer ? 80 : 340;
        var endX = isPlayer ? 340 : 80;
        var y = 80;

        // Linear Move Towards Center
        var startTime = performance.now();
        var dur = 800;
        function step(now) {
            var progress = (now - startTime) / dur;
            if (progress < 0.5) {
                p.style.left = (startX + (endX - startX) * progress) + "px";
                p.style.top = y + "px";
                requestAnimationFrame(step);
            } else {
                // 3. DARK FLASH & REFLECT
                flash.classList.add("active");
                setTimeout(() => flash.classList.remove("active"), 700);

                // Reverse Projectile to Hit Attacker
                var revStartTime = performance.now();
                var revDur = 400;
                var revStartX = parseInt(p.style.left);
                var revEndX = startX;

                function revStep(rNow) {
                    var rProg = (rNow - revStartTime) / revDur;
                    if (rProg < 1) {
                        p.style.left = (revStartX + (revEndX - revStartX) * rProg) + "px";
                        requestAnimationFrame(revStep);
                    } else {
                        p.remove();
                        // Attacker Shakes (Hit by own magic)
                        atkSprite.classList.add("hit-shake");
                        atkSprite.style.backgroundPosition = "-108px -48px";
                        setTimeout(() => {
                            atkSprite.classList.remove("hit-shake");
                            refreshBattleUI();
                        }, 500);
                    }
                }
                requestAnimationFrame(revStep);
            }
        }
        requestAnimationFrame(step);
    }


    function spawnProjectile(isPlayer, className) {
        var p = document.createElement("div");
        p.className = className;
        var fxLayer = $("battleArenaFX");
        fxLayer.appendChild(p);

        var startX = isPlayer ? 80 : 340;
        var endX = isPlayer ? 340 : 80;
        var y = 80;

        p.style.top = y + "px";
        p.style.left = startX + "px";

        // Simple linear animation
        var startTime = performance.now();
        var dur = 500;
        function step(now) {
            var progress = (now - startTime) / dur;
            if (progress < 1) {
                var curX = startX + (endX - startX) * progress;
                p.style.left = curX + "px";
                requestAnimationFrame(step);
            } else {
                p.remove();
            }
        }
        requestAnimationFrame(step);
    }

    function spawnHealingFX(isPlayer) {
        var fxLayer = $("battleArenaFX");
        var x = isPlayer ? 80 : 340;
        for (var i = 0; i < 5; i++) {
            var s = document.createElement("div");
            s.className = "fx-heal-spark";
            s.style.left = (x + (Math.random() - 0.5) * 40) + "px";
            s.style.top = (80 + (Math.random() - 0.5) * 40) + "px";
            fxLayer.appendChild(s);

            var startY = 80;
            var targetY = 40;
            s.animate([
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(-40px)', opacity: 0 }
            ], {
                duration: 800 + Math.random() * 400,
                fill: 'forwards',
                easing: 'ease-out'
            }).onfinish = function () { s.remove(); };
        }
    }

    function showFloatingSkill(text, isPlayer) {
        var el = document.createElement("div");
        el.className = "floating-skill";
        el.textContent = text;
        $("battleArenaFX").appendChild(el);

        var x = isPlayer ? 60 : 320;
        var y = 40;
        el.style.left = x + "px";
        el.style.top = y + "px";
    }

    function clearFloatingSkills() {
        var skills = document.querySelectorAll(".floating-skill");
        skills.forEach(s => {
            s.style.opacity = "0";
            setTimeout(() => s.remove(), 300);
        });
    }

    function showFloatingNumber(num, isPlayer, isDamage) {
        var el = document.createElement("div");
        el.className = "floating-num " + (isDamage ? "damage" : "heal");
        el.textContent = (isDamage ? "-" : "+") + num;
        $("battleArenaFX").appendChild(el);

        var x = isPlayer ? 80 : 340;
        var y = 60;
        el.style.left = x + "px";
        el.style.top = y + "px";

        setTimeout(() => el.remove(), 1500);
    }

    function finishRound() {
        if (battleState.player.hp <= 0 || battleState.enemy.hp <= 0 || battleState.round >= 5) {
            endBattle();
        } else {
            battleState.round++;
            initSelectionPhase();
        }
    }

    function endBattle() {
        battleState.phase = "result";
        var isWin = false;

        if (battleState.player.hp > 0 && battleState.enemy.hp <= 0) isWin = true;
        else if (battleState.player.hp <= 0) isWin = false;
        else {
            isWin = (battleState.player.hp >= battleState.enemy.hp);
        }

        if (isWin) {
            performVictorySequence();
        } else {
            showResultUI(false);
        }
    }

    function performVictorySequence() {
        var enemySprite = $("enemySprite");
        var playerSprite = $("playerSprite");

        // 0. Ensure all walking and effects are cleared
        enemySprite.classList.remove("sprite-walking");
        playerSprite.classList.remove("sprite-walking");
        clearFloatingSkills();

        // 1. Enemy Annihilation (Flashing & Fading)
        enemySprite.classList.add("enemy-annihilate");

        // 2. Player Victory Joy Dance
        playerSprite.classList.add("player-victory-pose");
        var joyToggle = false;
        var joyCount = 0;
        var joyTimer = setInterval(function () {
            joyToggle = !joyToggle;
            // Frame 7 (72, 48) is Joy, Frame 1 (0, 0) is Normal
            playerSprite.style.backgroundPosition = joyToggle ? "-72px -48px" : "0px 0px";
            joyCount++;
            if (joyCount >= 8) clearInterval(joyTimer);
        }, 250);

        setTimeout(function () {
            playerSprite.classList.remove("player-victory-pose");
            showResultUI(true);
        }, 2200);
    }

    function showResultUI(isWin) {
        $("battleResultLayer").style.display = "flex";
        $("battleResultHeader").textContent = isWin ? "VICTORY!" : "DEFEAT...";
        $("battleResultHeader").style.color = isWin ? "#4ade80" : "#f87171";

        if (isWin) {
            handleVictory();
        } else {
            handleDefeat();
        }

        // Auto Close after 5 seconds
        setTimeout(function () {
            if ($("battleResultLayer").style.display === "flex") {
                $("btnBattleClose").click();
            }
        }, 5000);
    }

    function handleVictory() {
        $("crystalRewardScene").style.display = "flex";
        $("defeatPenaltyBox").style.display = "none";

        var rewardList = battleState.enemy.data.reward || [];
        var gottenRewards = [];

        rewardList.forEach(function (r) {
            var rand = Math.random() * 100;
            if (rand < r.chance) {
                gottenRewards.push(r);
                if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.gainSpecificCrystal) {
                    window.TSP_APP_UTIL.gainSpecificCrystal(r.id);
                }
            }
        });

        if (gottenRewards.length > 0) {
            var lines = gottenRewards.map(r => "【" + r.name + "】");
            var enLines = gottenRewards.map(r => "[" + (r.nameEn || r.id) + "]");
            $("rewardText").innerHTML = lines.join("<br>") + " を獲得！<br><span style='font-size:0.8rem;'>" + enLines.join("<br>") + " found!</span>";
        } else {
            $("rewardText").innerHTML = "何も見つからなかった...<br>Nothing found.";
        }

        // Update soul current HP
        if (battleState.player.soul) {
            battleState.player.soul.currentHP = battleState.player.hp;
        }
    }

    function handleDefeat() {
        $("crystalRewardScene").style.display = "none";
        $("defeatPenaltyBox").style.display = "block";

        // Penalty: 20% HP and Neutralize
        if (battleState.player.soul) {
            battleState.player.soul.currentHP = Math.floor(battleState.player.maxHP * 0.2);
            // External call to neutralize environment if possible, or just mock it here
            if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.neutralizeEnvironment) {
                window.TSP_APP_UTIL.neutralizeEnvironment();
            }
        }
    }

    function refreshBattleUI() {
        // Player (Sync with global header)
        if (battleState.player.soul) {
            battleState.player.soul.currentHP = Math.max(0, Math.floor(battleState.player.hp));
            // Real-time synchronization with the global header HP bar
            if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.refreshHeader) {
                window.TSP_APP_UTIL.refreshHeader();
            }
        }

        // Enemy
        $("enemyName").textContent = battleState.enemy.data.speciesName;
        $("enemyHPText").textContent = Math.max(0, Math.floor(battleState.enemy.hp)) + " / " + battleState.enemy.maxHP;
        var ePct = (battleState.enemy.hp / battleState.enemy.maxHP) * 100;
        $("enemyHPBar").style.width = Math.max(0, ePct) + "%";

        // Sprites
        var pData = window.TSP_LEGENDZ_DATA[battleState.player.soul.speciesId];
        var pS = $("playerSprite");
        var eS = $("enemySprite");

        pS.style.backgroundImage = "url('" + pData.spritePath + "')";
        if (!pS.classList.contains("sprite-walking") && !pS.classList.contains("player-victory-pose")) {
            pS.style.backgroundPosition = "0px 0px"; // Idle
        }

        eS.style.backgroundImage = "url('" + battleState.enemy.data.spritePath + "')";
        if (!eS.classList.contains("sprite-walking") && !eS.classList.contains("enemy-annihilate")) {
            eS.style.backgroundPosition = "0px 0px"; // Idle
        }
    }

    function addLog(msg) {
        battleState.log.push(msg);
        if (battleState.log.length > 20) battleState.log.shift();

        var logBox = $("battleLog");
        logBox.innerHTML = battleState.log.map(t => `<div>${t}</div>`).join("");
        logBox.scrollTop = logBox.scrollHeight;
    }

    $("btnBattleClose").onclick = function () {
        battleState.active = false; // MUST reset flag to allow next battle

        $("battleModal").classList.remove("show");
        // Restore Tabs, Restore Comeback
        var tabs = document.querySelector(".tabs");
        if (tabs) tabs.style.display = "flex";
        if ($("btnComeback")) $("btnComeback").style.display = "block";

        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.saveAndRefresh) {
            window.TSP_APP_UTIL.saveAndRefresh();
        }

        // Reset session growth after battle
        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.resetSessionGrowth) {
            window.TSP_APP_UTIL.resetSessionGrowth();
        }

        // Resume BGM after battle
        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.resumeBGM) {
            window.TSP_APP_UTIL.resumeBGM();
        }
        // Stop battle BGM
        if (window.TSP_APP_UTIL && window.TSP_APP_UTIL.stopBattleBGM) {
            window.TSP_APP_UTIL.stopBattleBGM();
        }
    };

    window.TSP_BATTLE = {
        start: startBattle,
        isActive: function () { return battleState.active; },
        getEnemyId: function () {
            return (battleState.active && battleState.enemy.data) ? battleState.enemy.data.speciesId : null;
        }
    };

})();
