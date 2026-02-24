/* ============================================================
 *  CrystalData.js  –  Crystal definitions
 *  Global: window.TSP_CRYSTAL_DATA
 * ============================================================ */
(function () {
    "use strict";

    window.TSP_CRYSTAL_DATA = {

        /* ===== COST ===== */
        "crystal_cost": {
            id: "crystal_cost",
            group: "cost",
            name: "コストクリスタル",
            nameEn: "Cost Crystal",
            attribute: "neutral",
            rarity: "epic",
            desc: "使用すると体力を全回復し、10分間自然エンカウントが発生しなくなる。",
            descEn: "Fully restores HP and prevents random encounters for 10 minutes.",
            effect: "HP全回復 + エンカウント無効(10分) / Full Heal + No Encounters (10m)",
            applyEffect: function (soul) {
                soul.currentHP = window.TSP_GAME.maxHP(soul);
                // Encounter silence logic would be handled in movement/battle logic
            }
        },

        /* ===== Volcano (Magic) ===== */
        "fragment_salamander": {
            id: "fragment_salamander", group: "volcano",
            name: "サラマンダーのカケラ", nameEn: "Salamander Fragment",
            attribute: "volcano", rarity: "common", skillId: "skill_salamander",
            desc: "火の精霊の力が宿ったカケラ。マホウの力を高める。",
            descEn: "A fragment of the fire spirit. Increases Magic power.",
            effect: "マホウ / Magic +10",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.magic : 999;
                soul.growStats.magic = Math.min(soul.growStats.magic + 10, cap);
            }
        },
        "fragment_willowisp": {
            id: "fragment_willowisp", group: "volcano",
            name: "ウィルオーウィスプのカケラ", nameEn: "Will-o'-the-wisp Fragment",
            attribute: "volcano", rarity: "common", skillId: "skill_willowisp",
            desc: "浮遊する怪火のカケラ。マホウの力をさらに高める。",
            descEn: "A fragment of a floating ghost light. Further increases Magic power.",
            effect: "マホウ / Magic +20",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.magic : 999;
                soul.growStats.magic = Math.min(soul.growStats.magic + 20, cap);
            }
        },
        "fragment_wyvern": {
            id: "fragment_wyvern", group: "volcano",
            name: "ワイバーンのカケラ", nameEn: "Wyvern Fragment",
            attribute: "volcano", rarity: "rare", skillId: "skill_wyvern",
            desc: "飛竜の翼のカケラ。強力な魔力が宿っている。",
            descEn: "A wing fragment of a wyvern. Imbued with powerful magic.",
            effect: "マホウ / Magic +30",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.magic : 999;
                soul.growStats.magic = Math.min(soul.growStats.magic + 30, cap);
            }
        },
        "fragment_blazedragon": {
            id: "fragment_blazedragon", group: "volcano",
            name: "ブレイズドラゴンのカケラ", nameEn: "Blaze Dragon Fragment",
            attribute: "volcano", rarity: "rare", skillId: "skill_blazedragon",
            desc: "炎を統べる龍のカケラ。マホウの極致へ近づける。",
            descEn: "A fragment of the fire ruler dragon. Brings one closer to magical mastery.",
            effect: "マホウ / Magic +40",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.magic : 999;
                soul.growStats.magic = Math.min(soul.growStats.magic + 40, cap);
            }
        },
        "fragment_volcanoking": {
            id: "fragment_volcanoking", group: "volcano",
            name: "ヴォルケーノキングドラゴンのカケラ", nameEn: "Volcano King Fragment",
            attribute: "volcano", rarity: "epic", skillId: "skill_volcanoking",
            desc: "伝説の火龍王のカケラ。究極のマホウを授ける。",
            descEn: "A fragment of the legendary Fire King Dragon. Grants ultimate magic.",
            effect: "マホウ / Magic +50",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.magic : 999;
                soul.growStats.magic = Math.min(soul.growStats.magic + 50, cap);
            }
        },

        /* ===== Tornado (Counter) ===== */
        "fragment_harpy": {
            id: "fragment_harpy", group: "tornado",
            name: "ハーピーのカケラ", nameEn: "Harpy Fragment",
            attribute: "tornado", rarity: "common", skillId: "skill_harpy",
            desc: "翼を持つ乙女のカケラ。カウンターの精度を上げる。",
            descEn: "A fragment of a winged maiden. Improves counter accuracy.",
            effect: "カウンター / Counter +10",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.counter : 999;
                soul.growStats.counter = Math.min(soul.growStats.counter + 10, cap);
            }
        },
        "fragment_hippogriff": {
            id: "fragment_hippogriff", group: "tornado",
            name: "ヒポグリフのカケラ", nameEn: "Hippogriff Fragment",
            attribute: "tornado", rarity: "common", skillId: "skill_hippogriff",
            desc: "半鳥半獣のカケラ。カウンターの威力を高める。",
            descEn: "A fragment of a half-bird, half-beast. Increases counter power.",
            effect: "カウンター / Counter +20",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.counter : 999;
                soul.growStats.counter = Math.min(soul.growStats.counter + 20, cap);
            }
        },
        "fragment_manticore": {
            id: "fragment_manticore", group: "tornado",
            name: "マンティコアのカケラ", nameEn: "Manticore Fragment",
            attribute: "tornado", rarity: "rare", skillId: "skill_manticore",
            desc: "毒尾を持つ獣のカケラ。鋭い反撃を可能にする。",
            descEn: "A fragment of a beast with a poisonous tail. Enables sharp counters.",
            effect: "カウンター / Counter +30",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.counter : 999;
                soul.growStats.counter = Math.min(soul.growStats.counter + 30, cap);
            }
        },
        "fragment_assassinbug": {
            id: "fragment_assassinbug", group: "tornado",
            name: "アサシンバグのカケラ", nameEn: "Assassin Bug Fragment",
            attribute: "tornado", rarity: "rare", skillId: "skill_assassinbug",
            desc: "奇襲を得意とする虫のカケラ。回避と反撃を強化する。",
            descEn: "A fragment of an insect specialized in ambushes. Enhances evasion and counter.",
            effect: "カウンター / Counter +40",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.counter : 999;
                soul.growStats.counter = Math.min(soul.growStats.counter + 40, cap);
            }
        },
        "fragment_tornadoking": {
            id: "fragment_tornadoking", group: "tornado",
            name: "トルネードキングドラゴンのカケラ", nameEn: "Tornado King Fragment",
            attribute: "tornado", rarity: "epic", skillId: "skill_tornadoking",
            desc: "嵐を支配する龍王のカケラ。究極の反撃力を授ける。",
            descEn: "A fragment of the Dragon King who rules the storm. Grants ultimate counter power.",
            effect: "カウンター / Counter +50",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.counter : 999;
                soul.growStats.counter = Math.min(soul.growStats.counter + 50, cap);
            }
        },

        /* ===== Earthquake (Attack) ===== */
        "fragment_lizardman": {
            id: "fragment_lizardman", group: "earthquake",
            name: "リザードマンのカケラ", nameEn: "Lizardman Fragment",
            attribute: "earthquake", rarity: "common", skillId: "skill_lizardman",
            desc: "トカゲの戦士のカケラ。物理的な破壊力を高める。",
            descEn: "A fragment of a lizard warrior. Increases physical destruction power.",
            effect: "ダゲキ / Attack +10",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.attack : 999;
                soul.growStats.attack = Math.min(soul.growStats.attack + 10, cap);
            }
        },
        "fragment_caitsith": {
            id: "fragment_caitsith", group: "earthquake",
            name: "ケットシーのカケラ", nameEn: "Cait Sith Fragment",
            attribute: "earthquake", rarity: "common", skillId: "skill_caitsith",
            desc: "妖精猫のカケラ。ダゲキの威力をさらに高める。",
            descEn: "A fragment of a fairy cat. Further increases Attack power.",
            effect: "ダゲキ / Attack +20",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.attack : 999;
                soul.growStats.attack = Math.min(soul.growStats.attack + 20, cap);
            }
        },
        "fragment_dwarf": {
            id: "fragment_dwarf", group: "earthquake",
            name: "ドワーフのカケラ", nameEn: "Dwarf Fragment",
            attribute: "earthquake", rarity: "rare", skillId: "skill_dwarf",
            desc: "頑強な戦士のカケラ。重い一撃を可能にする。",
            descEn: "A fragment of a sturdy warrior. Enables heavy strikes.",
            effect: "ダゲキ / Attack +30",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.attack : 999;
                soul.growStats.attack = Math.min(soul.growStats.attack + 30, cap);
            }
        },
        "fragment_orc": {
            id: "fragment_orc", group: "earthquake",
            name: "オークのカケラ", nameEn: "Orc Fragment",
            attribute: "earthquake", rarity: "rare", skillId: "skill_orc",
            desc: "猪突猛進する獣人のカケラ。ダゲキを極める力を宿す。",
            descEn: "A fragment of a rampaging orc. Imbued with power to master Attack.",
            effect: "ダゲキ / Attack +40",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.attack : 999;
                soul.growStats.attack = Math.min(soul.growStats.attack + 40, cap);
            }
        },
        "fragment_earthquakeking": {
            id: "fragment_earthquakeking", group: "earthquake",
            name: "アースクエイクキングドラゴンのカケラ", nameEn: "Earthquake King Fragment",
            attribute: "earthquake", rarity: "epic", skillId: "skill_earthquakeking",
            desc: "地響きと共に現れる龍王のカケラ。究極のダゲキ力を授ける。",
            descEn: "A fragment of the Dragon King who appears with tremors. Grants ultimate Attack power.",
            effect: "ダゲキ / Attack +50",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.attack : 999;
                soul.growStats.attack = Math.min(soul.growStats.attack + 50, cap);
            }
        },

        /* ===== Storm (Recover) ===== */
        "fragment_stormworm": {
            id: "fragment_stormworm", group: "storm",
            name: "ストームワームのカケラ", nameEn: "Storm Worm Fragment",
            attribute: "storm", rarity: "common", skillId: "skill_stormworm",
            desc: "嵐を好む虫のカケラ。生命の再生を助ける。",
            descEn: "A fragment of an insect that favors storms. Aids in life regeneration.",
            effect: "カイフク / Recover +10",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.recover : 999;
                soul.growStats.recover = Math.min(soul.growStats.recover + 10, cap);
            }
        },
        "fragment_giantcrab": {
            id: "fragment_giantcrab", group: "storm",
            name: "ジャイアントクラブのカケラ", nameEn: "Giant Crab Fragment",
            attribute: "storm", rarity: "common", skillId: "skill_giantcrab",
            desc: "巨大な甲羅を持つ蟹のカケラ。カイフク力を高める。",
            descEn: "A fragment of a crab with a giant shell. Increases Recover power.",
            effect: "カイフク / Recover +20",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.recover : 999;
                soul.growStats.recover = Math.min(soul.growStats.recover + 20, cap);
            }
        },
        "fragment_mazeoctopus": {
            id: "fragment_mazeoctopus", group: "storm",
            name: "メイズオクトパスのカケラ", nameEn: "Maze Octopus Fragment",
            attribute: "storm", rarity: "rare", skillId: "skill_mazeoctopus",
            desc: "迷宮に潜むタコのカケラ。癒やしの効率を高める。",
            descEn: "A fragment of an octopus lurking in labyrinths. Improves healing efficiency.",
            effect: "カイフク / Recover +30",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.recover : 999;
                soul.growStats.recover = Math.min(soul.growStats.recover + 30, cap);
            }
        },
        "fragment_undine": {
            id: "fragment_undine", group: "storm",
            name: "ウンディーネのカケラ", nameEn: "Undine Fragment",
            attribute: "storm", rarity: "rare", skillId: "skill_undine",
            desc: "水の精霊のカケラ。カイフクを極める力を宿す。",
            descEn: "A fragment of the water spirit. Imbued with power to master Recover.",
            effect: "カイフク / Recover +40",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.recover : 999;
                soul.growStats.recover = Math.min(soul.growStats.recover + 40, cap);
            }
        },
        "fragment_stormking": {
            id: "fragment_stormking", group: "storm",
            name: "ストームキングドラゴンのカケラ", nameEn: "Storm King Fragment",
            attribute: "storm", rarity: "epic", skillId: "skill_stormking",
            desc: "大海を統べる龍王のカケラ。究極のカイフク力を授ける。",
            descEn: "A fragment of the Dragon King who rules the ocean. Grants ultimate Recover power.",
            effect: "カイフク / Recover +50",
            applyEffect: function (soul) {
                var ld = window.TSP_LEGENDZ_DATA && window.TSP_LEGENDZ_DATA[soul.speciesId];
                var cap = ld ? ld.maxGrowStats.recover : 999;
                soul.growStats.recover = Math.min(soul.growStats.recover + 50, cap);
            }
        }
    };
})();
