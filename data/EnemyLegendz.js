/* ============================================================
 *  EnemyLegendz.js  –  Specific Enemy Definitions (v1.0)
 *  Global: window.TSP_ENEMY_LEGENDZ
 * ============================================================ */
(function () {
    "use strict";

    window.TSP_ENEMY_LEGENDZ = {
        "harpy": {
            speciesId: "harpy",
            speciesName: "ハーピー",
            speciesNameEn: "Harpy",
            spritePath: "./assets/sprites/harpy.png",
            attribute: "tornado",
            baseHP: 100,
            baseStats: { magic: 20, counter: 130, attack: 20, recover: 30 },
            moves: [
                "skill_harpy",      // ブリス
                "skill_basic_slap", // 小攻撃
                "skill_harpy",      // ブリス
                "skill_basic_slap", // 小攻撃
                "skill_salamander", // フレム
                "skill_basic_slap", // 小攻撃
                "skill_lizardman",  // ブレイドブロウガ
                "skill_basic_slap", // 小攻撃
                "skill_stormworm",   // キュア
                "skill_basic_slap", // 小攻撃
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_harpy", chance: 50, name: "ハーピーのカケラ" },
                { id: "fragment_hippogriff", chance: 30, name: "ヒポグリフのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "willowisp": {
            speciesId: "willowisp",
            speciesName: "ウィルオーウィスプ",
            speciesNameEn: "Will-o'-the-wisp",
            spritePath: "./assets/sprites/will o wisp.png",
            attribute: "volcano",
            baseHP: 120,
            baseStats: { magic: 110, counter: 50, attack: 20, recover: 30 },
            moves: [
                "skill_willowisp",  // 必殺技：プチフレム
                "skill_basic_slap", // 小攻撃
                "skill_salamander", // フレム
                "skill_basic_slap", // 小攻撃
                "skill_harpy",      // ブリス
                "skill_basic_slap", // 小攻撃
                "skill_lizardman",  // ブレイドブロウガ
                "skill_basic_slap", // 小攻撃
                "skill_stormworm",   // キュア
                "skill_basic_slap", // 小攻撃
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_salamander", chance: 30, name: "サラマンダーのカケラ" },
                { id: "fragment_willowisp", chance: 50, name: "ウィルオーウィスプのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "caitsith": {
            speciesId: "caitsith",
            speciesName: "ケットシー",
            speciesNameEn: "Cait Sith",
            spritePath: "./assets/sprites/cait sith.png",
            attribute: "earthquake",
            baseHP: 180,
            baseStats: { magic: 30, counter: 30, attack: 70, recover: 20 },
            moves: [
                "skill_caitsith",   // 必殺技：スタンプブロウガ
                "skill_basic_slap", // 小攻撃
                "skill_salamander", // フレム
                "skill_basic_slap", // 小攻撃
                "skill_harpy",      // ブリス
                "skill_basic_slap", // 小攻撃
                "skill_lizardman",  // ブレイドブロウガ
                "skill_basic_slap", // 小攻撃
                "skill_stormworm",   // キュア
                "skill_basic_slap", // 小攻撃
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_lizardman", chance: 30, name: "リザードマンのカケラ" },
                { id: "fragment_caitsith", chance: 50, name: "ケットシーのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "giantcrab": {
            speciesId: "giantcrab",
            speciesName: "ジャイアントクラブ",
            speciesNameEn: "Giant Crab",
            spritePath: "./assets/sprites/giant crab.png",
            attribute: "storm",
            baseHP: 80,
            baseStats: { magic: 30, counter: 50, attack: 20, recover: 60 },
            moves: [
                "skill_giantcrab",  // 必殺技：バブルキュア
                "skill_basic_slap", // 小攻撃
                "skill_salamander", // フレム
                "skill_basic_slap", // 小攻撃
                "skill_harpy",      // ブリス
                "skill_basic_slap", // 小攻撃
                "skill_lizardman",  // ブレイドブロウガ
                "skill_basic_slap", // 小攻撃
                "skill_stormworm",   // キュア
                "skill_basic_slap", // 小攻撃
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_stormworm", chance: 30, name: "ストームワームのカケラ" },
                { id: "fragment_giantcrab", chance: 50, name: "ジャイアントクラブのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        /* ===== Search-tier Enemies ===== */
        "wyvern": {
            speciesId: "wyvern",
            speciesName: "ワイバーン",
            speciesNameEn: "Wyvern",
            spritePath: "./assets/sprites/wyvern.png",
            attribute: "volcano",
            baseHP: 430,
            baseStats: { magic: 400, counter: 70, attack: 60, recover: 90 },
            moves: [
                "skill_wyvern",      // 必殺技：ファーンフレイド
                "skill_wyvern",      // ファーンフレイド
                "skill_salamander",  // フレム
                "skill_willowisp",   // プチフレム
                "skill_harpy",       // ブリス
                "skill_hippogriff",  // スターブリス
                "skill_lizardman",   // ブレイドブロウガ
                "skill_caitsith",    // スタンプブロウガ
                "skill_stormworm",   // キュア
                "skill_giantcrab",   // バブルキュア
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_blazedragon", chance: 30, name: "ブレイズドラゴンのカケラ" },
                { id: "fragment_wyvern", chance: 50, name: "ワイバーンのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "manticore": {
            speciesId: "manticore",
            speciesName: "マンティコア",
            speciesNameEn: "Manticore",
            spritePath: "./assets/sprites/manticore.png",
            attribute: "tornado",
            baseHP: 430,
            baseStats: { magic: 400, counter: 70, attack: 60, recover: 90 },
            moves: [
                "skill_manticore",   // 必殺技：ファングブリスト
                "skill_manticore",   // ファングブリスト
                "skill_salamander",  // フレム
                "skill_willowisp",   // プチフレム
                "skill_harpy",       // ブリス
                "skill_hippogriff",  // スターブリス
                "skill_lizardman",   // ブレイドブロウガ
                "skill_caitsith",    // スタンプブロウガ
                "skill_stormworm",   // キュア
                "skill_giantcrab",   // バブルキュア
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_assassinbug", chance: 30, name: "アサシンバグのカケラ" },
                { id: "fragment_manticore", chance: 50, name: "マンティコアのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "ogre": {
            speciesId: "ogre",
            speciesName: "オーガ",
            speciesNameEn: "Ogre",
            spritePath: "./assets/sprites/ogre.png",
            attribute: "earthquake",
            baseHP: 650,
            baseStats: { magic: 90, counter: 80, attack: 220, recover: 10 },
            moves: [
                "skill_orc",         // 必殺技：アーマーブロウザン
                "skill_orc",         // アーマーブロウザン
                "skill_salamander",  // フレム
                "skill_willowisp",   // プチフレム
                "skill_harpy",       // ブリス
                "skill_hippogriff",  // スターブリス
                "skill_lizardman",   // ブレイドブロウガ
                "skill_caitsith",    // スタンプブロウガ
                "skill_stormworm",   // キュア
                "skill_giantcrab",   // バブルキュア
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_dwarf", chance: 30, name: "ドワーフのカケラ" },
                { id: "fragment_orc", chance: 50, name: "オーガのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        "undine": {
            speciesId: "undine",
            speciesName: "ウンディーネ",
            speciesNameEn: "Undine",
            spritePath: "./assets/sprites/undine.png",
            attribute: "storm",
            baseHP: 430,
            baseStats: { magic: 400, counter: 70, attack: 60, recover: 90 },
            moves: [
                "skill_undine",      // 必殺技：ミルクキュアスト
                "skill_undine",      // ミルクキュアスト
                "skill_salamander",  // フレム
                "skill_willowisp",   // プチフレム
                "skill_harpy",       // ブリス
                "skill_hippogriff",  // スターブリス
                "skill_lizardman",   // ブレイドブロウガ
                "skill_caitsith",    // スタンプブロウガ
                "skill_stormworm",   // キュア
                "skill_giantcrab",   // バブルキュア
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap",
                "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_mazeoctopus", chance: 30, name: "メイズオクトパスのカケラ" },
                { id: "fragment_undine", chance: 50, name: "ウンディーネのカケラ" },
                { id: "crystal_cost", chance: 20, name: "コストクリスタル" }
            ]
        },
        /* ===== Legendary Kings ===== */
        "volcanoking": {
            speciesId: "volcanoking", speciesName: "ヴォルケーノキングドラゴン", speciesNameEn: "Volcano King Dragon",
            spritePath: "./assets/sprites/Volcano King Dragon.png", attribute: "volcano",
            baseHP: 2200, baseStats: { magic: 420, counter: 80, attack: 120, recover: 180 },
            moves: [
                "skill_volcanoking_base", "skill_volcanoking_base", "skill_volcanoking", "skill_blazedragon", "skill_wyvern",
                "skill_tornadoking", "skill_assassinbug", "skill_manticore", "skill_earthquakeking", "skill_orc", "skill_dwarf",
                "skill_stormking", "skill_undine", "skill_mazeoctopus", "skill_basic_slap", "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_volcanoking", chance: 100, name: "ヴォルケーノキングドラゴンのカケラ" },
                { id: "soul_volcano", chance: 100, name: "ヴォルケーノソウル" }
            ]
        },
        "tornadoking": {
            speciesId: "tornadoking", speciesName: "トルネードキングドラゴン", speciesNameEn: "Tornado King Dragon",
            spritePath: "./assets/sprites/wind king dragon.png", attribute: "tornado",
            baseHP: 1800, baseStats: { magic: 180, counter: 320, attack: 150, recover: 220 },
            moves: [
                "skill_tornadoking_base", "skill_tornadoking_base", "skill_volcanoking", "skill_blazedragon", "skill_wyvern",
                "skill_tornadoking", "skill_assassinbug", "skill_manticore", "skill_earthquakeking", "skill_orc", "skill_dwarf",
                "skill_stormking", "skill_undine", "skill_mazeoctopus", "skill_basic_slap", "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_tornadoking", chance: 100, name: "トルネードキングドラゴンのカケラ" },
                { id: "soul_tornado", chance: 100, name: "トルネードソウル" }
            ]
        },
        "earthquakeking": {
            speciesId: "earthquakeking", speciesName: "アースクエイクキングドラゴン", speciesNameEn: "Earthquake King Dragon",
            spritePath: "./assets/sprites/earth kingdragon.png", attribute: "earthquake",
            baseHP: 3800, baseStats: { magic: 150, counter: 110, attack: 280, recover: 70 },
            moves: [
                "skill_earthquakeking_base", "skill_earthquakeking_base", "skill_volcanoking", "skill_blazedragon", "skill_wyvern",
                "skill_tornadoking", "skill_assassinbug", "skill_manticore", "skill_earthquakeking", "skill_orc", "skill_dwarf",
                "skill_stormking", "skill_undine", "skill_mazeoctopus", "skill_basic_slap", "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_earthquakeking", chance: 100, name: "アースクエイクキングドラゴンのカケラ" },
                { id: "soul_earthquake", chance: 100, name: "アースクエイクソウル" }
            ]
        },
        "stormking": {
            speciesId: "stormking", speciesName: "ストームキングドラゴン", speciesNameEn: "Storm King Dragon",
            spritePath: "./assets/sprites/water kingdragon.png", attribute: "storm",
            baseHP: 1500, baseStats: { magic: 180, counter: 110, attack: 120, recover: 420 },
            moves: [
                "skill_stormking_base", "skill_stormking_base", "skill_volcanoking", "skill_blazedragon", "skill_wyvern",
                "skill_tornadoking", "skill_assassinbug", "skill_manticore", "skill_earthquakeking", "skill_orc", "skill_dwarf",
                "skill_stormking", "skill_undine", "skill_mazeoctopus", "skill_basic_slap", "skill_basic_slap"
            ],
            reward: [
                { id: "fragment_stormking", chance: 100, name: "ストームキングドラゴンのカケラ" },
                { id: "soul_storm", chance: 100, name: "ストームソウル" }
            ]
        },
        "jabberwock": {
            speciesId: "jabberwock", speciesName: "ジャバウォック", speciesNameEn: "Jabberwock",
            spritePath: "./assets/sprites/jabberwock.png", attribute: "necrom",
            baseHP: 6660, baseStats: { magic: 390, counter: 290, attack: 250, recover: 390 },
            moves: [
                // ネオ技 各3回
                "skill_volcanoking", "skill_volcanoking", "skill_volcanoking",
                "skill_tornadoking", "skill_tornadoking", "skill_tornadoking",
                "skill_earthquakeking", "skill_earthquakeking", "skill_earthquakeking",
                "skill_stormking", "skill_stormking", "skill_stormking",
                // 指定の上位技 
                "skill_blazedragon", "skill_orc", "skill_undine"
            ],
            reward: [
                { id: "crystal_king", chance: 100, name: "おうじゃのクリスタル" }
            ]
        }
    };

})();
