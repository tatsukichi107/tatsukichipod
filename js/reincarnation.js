/* ============================================================
 *  reincarnation.js  –  Legendz Reincarnation logic
 *  Global: window.TSP_REINCARNATION
 * ============================================================ */
(function() {
    "use strict";

    function getAvailableTargets() {
        var targets = [];
        var allKeys = Object.keys(window.TSP_LEGENDZ_DATA || {});
        allKeys.forEach(function(key) {
            var ld = window.TSP_LEGENDZ_DATA[key];
            if (ld && ld.reinCost && !ld.isSecret) {
                targets.push(key);
            }
        });
        return targets;
    }

    function buildReinListHTML(soul, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        if (!soul) return;

        var targets = getAvailableTargets();
        var unlocked = soul.unlockedLegendz || [];

        // Add a grid container similar to archive
        var grid = document.createElement("div");
        grid.className = "archive-grid";

        targets.forEach(function(key) {
            var ld = window.TSP_LEGENDZ_DATA[key];
            var isUnlocked = unlocked.indexOf(key) !== -1;

            var item = document.createElement("div");
            item.className = "archive-item"; // Reuse archive styling
            
            if (isUnlocked) {
                var spriteBox = document.createElement("div");
                spriteBox.className = "archive-sprite";
                spriteBox.style.backgroundImage = "url('" + ld.spritePath + "')";
                spriteBox.style.backgroundPosition = "-36px 0";
                item.appendChild(spriteBox);

                var nameEl = document.createElement("div");
                nameEl.className = "archive-name";
                nameEl.textContent = ld.speciesName;
                item.appendChild(nameEl);

                var nameEnEl = document.createElement("div");
                nameEnEl.className = "archive-name-en";
                nameEnEl.textContent = ld.speciesNameEn;
                item.appendChild(nameEnEl);
            } else {
                item.classList.add("locked");
                var lockedBox = document.createElement("div");
                lockedBox.className = "archive-sprite archive-locked-sprite";
                lockedBox.textContent = "NOW PRINTING";
                item.appendChild(lockedBox);

                var qName = document.createElement("div");
                qName.className = "archive-name";
                qName.textContent = "？？？";
                item.appendChild(qName);
            }

            // Click handler
            item.style.cursor = "pointer";
            item.onclick = function() {
                promptReincarnation(soul, key, isUnlocked);
            };

            grid.appendChild(item);
        });

        container.appendChild(grid);
    }

    function promptReincarnation(soul, targetId, isUnlocked) {
        var ld = window.TSP_LEGENDZ_DATA[targetId];
        var cost = ld.reinCost; // Array of {crystalId, qty}
        
        var canReincarnate = true;
        var costMsg = "";
        
        if (!isUnlocked && cost) {
            costMsg = "<div style='background:rgba(0,0,0,0.2); padding:8px; border-radius:4px; margin-bottom:10px;'><strong>【必要素材 / Required】</strong><br>";
            cost.forEach(function(c) {
                var cData = window.TSP_CRYSTAL_DATA[c.crystalId];
                var cName = cData ? cData.name : c.crystalId;
                var owned = soul.crystals[c.crystalId] || 0;
                var color = owned >= c.qty ? "var(--accent)" : "var(--danger)";
                costMsg += "・" + cName + " x" + c.qty + " <span style='color:" + color + "'>(所持/Owned: " + owned + ")</span><br>";
                if (owned < c.qty) canReincarnate = false;
            });
            costMsg += "</div>";
        } else {
            // Already unlocked, no cost
            costMsg = "<div style='color:var(--accent); font-weight:bold; margin-bottom:10px;'>既に解禁済みのため、素材なしで転生可能です。<br>Can reincarnate without materials.</div>";
        }

        var isSameSpecies = (soul.speciesId === targetId);
        var title = isUnlocked ? ld.speciesName : "？？？";
        
        if (!canReincarnate) {
            var msg = title + " への転生<br><br>" + costMsg + "<span style='color:var(--danger); font-weight:bold;'>素材が足りません。<br>Not enough materials.</span>";
            window.TSP_APP_UTIL.showNoticeModal("転生 / Reincarnation", msg);
        } else {
            var msg = title + " への転生<br><br>" + costMsg;
            if (isSameSpecies) {
                msg += "<strong style='color:var(--accent);'>同じレジェンズへの転生のため、ステータスのリセットのみ行われます。</strong><br><br>";
            }
            msg += "<strong>転生しますか？ / Reincarnate?</strong>";
            
            if (window.TSP_APP_UTIL.showConfirmModal) {
                window.TSP_APP_UTIL.showConfirmModal("転生確認 / Confirm", msg, function() {
                    // Second warning
                    var finalMsg = "<span style='color:var(--danger); font-weight:bold; font-size:1.1em;'>強さやワザはリセットされます。<br>Stats and skills will be reset.</span><br><br>本当によろしいですか？ / Are you sure?";
                    window.TSP_APP_UTIL.showConfirmModal("最終確認 / Final Warning", finalMsg, function() {
                        executeReincarnation(soul, targetId, isUnlocked);
                    });
                });
            } else {
                console.error("TSP_APP_UTIL.showConfirmModal is not defined.");
            }
        }
    }

    function executeReincarnation(soul, targetId, isUnlocked) {
        var ld = window.TSP_LEGENDZ_DATA[targetId];
        
        // 1. Play effect overlay
        var overlay = document.getElementById("reinEffectOverlay");
        if (overlay) {
            overlay.classList.add("active");
            
            if (window.TSP_APP_UTIL.pauseBGM) {
                window.TSP_APP_UTIL.pauseBGM();
            }
            
            // Wait for whiteout (1.5s based on CSS transition)
            setTimeout(function() {
                // 2. Consume cost if not unlocked
                if (!isUnlocked && ld.reinCost) {
                    ld.reinCost.forEach(function(c) {
                        soul.crystals[c.crystalId] = (soul.crystals[c.crystalId] || 0) - c.qty;
                        if (soul.crystals[c.crystalId] <= 0) delete soul.crystals[c.crystalId];
                    });
                }

                // 3. Reset stats
                soul.speciesId = targetId;
                soul.speciesName = ld.speciesName;
                soul.nickname = "";
                soul.attribute = ld.attribute; 
                soul.baseHP = ld.baseHP;
                soul.baseStats = {
                    magic: ld.baseStats.magic,
                    counter: ld.baseStats.counter,
                    attack: ld.baseStats.attack,
                    recover: ld.baseStats.recover
                };
                soul.growHP = 0;
                soul.growStats = { magic: 0, counter: 0, attack: 0, recover: 0 };
                soul.currentHP = ld.baseHP;
                
                // Set default moves
                var moves = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
                if (ld.defaultMoves) {
                    for (var i = 0; i < ld.defaultMoves.length && i < 15; i++) {
                        moves[i] = ld.defaultMoves[i] || null;
                    }
                }
                soul.moves = moves;

                // Mark as unlocked
                if (!soul.unlockedLegendz) soul.unlockedLegendz = [];
                if (soul.unlockedLegendz.indexOf(targetId) === -1) {
                    soul.unlockedLegendz.push(targetId);
                }
                
                // Call utilities to update game state
                if (window.TSP_APP_UTIL.neutralizeEnvironment) {
                    window.TSP_APP_UTIL.neutralizeEnvironment();
                }
                
                if (window.TSP_APP_UTIL.switchTab) {
                    window.TSP_APP_UTIL.switchTab("home");
                }
                
                if (window.TSP_APP_UTIL.saveAndRefresh) {
                    window.TSP_APP_UTIL.saveAndRefresh();
                }
                
                // 4. Hide overlay
                setTimeout(function() {
                    overlay.classList.remove("active");
                    
                    setTimeout(function() {
                        if (window.TSP_APP_UTIL.showToast) {
                            window.TSP_APP_UTIL.showToast("転生が完了しました！ / Reincarnation Complete!");
                        }
                    }, 1000);
                    
                }, 500); // Wait a half second before fading back in
                
            }, 1500); // 1.5s flash duration
        } else {
            console.error("Missing reinEffectOverlay element");
        }
    }

    // Expose Global
    window.TSP_REINCARNATION = {
        buildReinListHTML: buildReinListHTML
    };

})();
