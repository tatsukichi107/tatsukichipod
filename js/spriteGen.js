/* ============================================================
 *  spriteGen.js  –  Procedural sprite generator (fallback)
 *  Creates a 96×64 sprite sheet (4col × 2row, 24×32 each)
 *  as a data URL, used when PNG asset is not available.
 *  Global: window.TSP_SPRITE_GEN
 * ============================================================ */
(function () {
    "use strict";

    /* Generate a simple pixel-art dragon sprite sheet */
    function generateWindragonSheet() {
        var W = 96, H = 64;
        var FW = 24, FH = 32;
        var canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        var ctx = canvas.getContext("2d");

        // colors
        var body = "#4ade80";
        var bodyDk = "#16a34a";
        var belly = "#bbf7d0";
        var eye = "#1e1e1e";
        var wing = "#38bdf8";
        var wingDk = "#0284c7";

        function px(x, y, c) {
            ctx.fillStyle = c;
            ctx.fillRect(x, y, 1, 1);
        }

        function drawDragon(ox, oy, opts) {
            opts = opts || {};
            var bodyC = opts.dark ? bodyDk : body;

            // Body (8×10 block, centered in 24×32)
            var bx = ox + 8, by = oy + 10;
            for (var dy = 0; dy < 10; dy++) {
                for (var dx = 0; dx < 8; dx++) {
                    px(bx + dx, by + dy, bodyC);
                }
            }

            // Belly
            for (var dy2 = 3; dy2 < 8; dy2++) {
                for (var dx2 = 2; dx2 < 6; dx2++) {
                    px(bx + dx2, by + dy2, belly);
                }
            }

            // Head (6×5, on top)
            var hx = ox + 9, hy = oy + 5;
            for (var dy3 = 0; dy3 < 5; dy3++) {
                for (var dx3 = 0; dx3 < 6; dx3++) {
                    px(hx + dx3, hy + dy3, bodyC);
                }
            }

            // Eyes
            px(hx + 1, hy + 2, eye);
            px(hx + 4, hy + 2, eye);

            // Horn
            px(hx + 1, hy - 1, wing);
            px(hx + 4, hy - 1, wing);

            // Wings
            if (!opts.noWings) {
                var wy = by + 1;
                // left wing
                px(bx - 1, wy, wing);
                px(bx - 2, wy - 1, wing);
                px(bx - 3, wy - 2, wingDk);
                if (opts.wingsUp) {
                    px(bx - 2, wy - 2, wing);
                    px(bx - 3, wy - 3, wingDk);
                }
                // right wing
                px(bx + 8, wy, wing);
                px(bx + 9, wy - 1, wing);
                px(bx + 10, wy - 2, wingDk);
                if (opts.wingsUp) {
                    px(bx + 9, wy - 2, wing);
                    px(bx + 10, wy - 3, wingDk);
                }
            }

            // Legs
            var ly = by + 10;
            px(bx + 2, ly, bodyDk);
            px(bx + 2, ly + 1, bodyDk);
            px(bx + 5, ly, bodyDk);
            px(bx + 5, ly + 1, bodyDk);

            if (opts.legUp) {
                // lift right leg
                px(bx + 5, ly, "transparent");
            }

            // Tail
            px(bx + 7, by + 8, bodyDk);
            px(bx + 8, by + 9, bodyDk);
            px(bx + 9, by + 10, wing);

            // Mouth (joy)
            if (opts.joy) {
                px(hx + 2, hy + 3, "#fbbf24");
                px(hx + 3, hy + 3, "#fbbf24");
            }

            // Down
            if (opts.down) {
                // closed eyes
                px(hx + 1, hy + 2, bodyDk);
                px(hx + 4, hy + 2, bodyDk);
                // sweat drop
                px(hx + 6, hy + 1, "#60a5fa");
            }
        }

        // Frame 1: idle1 (row0 col0)
        drawDragon(0, 0, {});

        // Frame 2: idle2 (row0 col1) - wings up
        drawDragon(24, 0, { wingsUp: true });

        // Frame 3: turn (row0 col2)
        drawDragon(48, 0, { dark: true });

        // Frame 4: walk (row0 col3) - leg up
        drawDragon(72, 0, { legUp: true });

        // Frame 5: walk2 (row1 col0)
        drawDragon(0, 32, { legUp: true, wingsUp: true });

        // Frame 6: attack (row1 col1)
        drawDragon(24, 32, { wingsUp: true, dark: true });

        // Frame 7: joy (row1 col2)
        drawDragon(48, 32, { wingsUp: true, joy: true });

        // Frame 8: down (row1 col3)
        drawDragon(72, 32, { noWings: true, down: true });

        return canvas.toDataURL("image/png");
    }

    /* Apply fallback sprite only when the real PNG fails to load */
    function applyFallbackSprites() {
        if (!window.TSP_LEGENDZ_DATA) return;
        var fallback = null; // lazy-generate only if needed
        var data = window.TSP_LEGENDZ_DATA;
        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            (function (entry) {
                if (!entry.spritePath || entry.spritePath.indexOf("data:") === 0) return;
                var img = new Image();
                img.onerror = function () {
                    console.warn("[TalisPod] Sprite not found: " + entry.spritePath + " → using fallback");
                    if (!fallback) fallback = generateWindragonSheet();
                    entry.spritePath = fallback;
                };
                img.src = entry.spritePath;
            })(data[key]);
        }
    }

    window.TSP_SPRITE_GEN = {
        generateWindragonSheet: generateWindragonSheet,
        applyFallbackSprites: applyFallbackSprites
    };

    // Auto-apply on load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyFallbackSprites);
    } else {
        applyFallbackSprites();
    }
})();
