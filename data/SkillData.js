/* ============================================================
 *  SkillData.js  –  Skill definitions (v1.1 Percentage Powers)
 *  Global: window.TSP_SKILL_DATA
 * ============================================================ */
(function () {
    "use strict";

    window.TSP_SKILL_DATA = {

        /* ===== Neutral / Common ===== */
        "skill_basic_slap": { id: "skill_basic_slap", shortId: "0", name: "小攻撃", nameEn: "Small Attack", attribute: "neutral", category: "attack", power: 50, desc: "通常弱攻撃。" },

        /* ===== Tornado ===== */
        "skill_harpy": { id: "skill_harpy", shortId: "1", name: "ブリス", nameEn: "Bliss", attribute: "tornado", category: "attack", power: 90, desc: "心地よい風で敵を翻弄する。" },
        "skill_hippogriff": { id: "skill_hippogriff", shortId: "2", name: "スターブリス", nameEn: "Star Bliss", attribute: "tornado", category: "attack", power: 120, desc: "星屑のように煌めく風の散弾。" },
        "skill_manticore": { id: "skill_manticore", shortId: "3", name: "ファングブリスト", nameEn: "Fang Blis-to", attribute: "tornado", category: "attack", power: 180, desc: "獣の牙のような烈風。" },
        "skill_assassinbug": { id: "skill_assassinbug", shortId: "4", name: "ビーブリス", nameEn: "Bee Bliss", attribute: "tornado", category: "attack", power: 270, desc: "蜂のような鋭い風の刺突。" },
        "skill_tornadoking": { id: "skill_tornadoking", shortId: "5", name: "ネオ・ライジングブライガ", nameEn: "Neo Rising Breiga", attribute: "tornado", category: "attack", power: 360, desc: "天を衝く巨大な竜巻が全てを飲み込む。" },
        "skill_tornadoking_base": { id: "skill_tornadoking_base", shortId: "6", name: "ライジングブライガ", nameEn: "Rising Breiga", attribute: "tornado", category: "attack", power: 360, desc: "竜巻を巻き起こす。" },
        "skill_wing_tornado": { id: "skill_wing_tornado", shortId: "7", name: "ウイングトルネード", nameEn: "Wing Tornado", attribute: "tornado", category: "attack", power: 300, desc: "ウインドラゴンの必殺技。" },

        /* ===== Volcano ===== */
        "skill_salamander": { id: "skill_salamander", shortId: "8", name: "フレム", nameEn: "Flame", attribute: "volcano", category: "attack", power: 90, desc: "小さな残り火を放つ。" },
        "skill_willowisp": { id: "skill_willowisp", shortId: "9", name: "プチフレム", nameEn: "Petit Flame", attribute: "volcano", category: "attack", power: 120, desc: "青白く揺らめく火球。" },
        "skill_wyvern": { id: "skill_wyvern", shortId: "a", name: "ファーンフレイド", nameEn: "Fern Flade", attribute: "volcano", category: "attack", power: 180, desc: "翼から扇状に広がる炎。" },
        "skill_blazedragon": { id: "skill_blazedragon", shortId: "b", name: "バーンフレム", nameEn: "Burn Flame", attribute: "volcano", category: "attack", power: 270, desc: "全てを焼き尽くす激しい火炎。" },
        "skill_volcanoking": { id: "skill_volcanoking", shortId: "c", name: "ネオ・ディアポロスブレイガ", nameEn: "Neo Diabolos Breiga", attribute: "volcano", category: "attack", power: 360, desc: "地獄の業火が世界を包み込む。" },
        "skill_volcanoking_base": { id: "skill_volcanoking_base", shortId: "d", name: "ディアポロスブレイガ", nameEn: "Diabolos Breiga", attribute: "volcano", category: "attack", power: 360, desc: "業火を放つ覇王の咆哮。" },
        "skill_blazedragon_ult": { id: "skill_blazedragon_ult", shortId: "e", name: "バーンフレム", nameEn: "Burn Flame EX", attribute: "volcano", category: "attack", power: 300, desc: "ブレイズドラゴンの必殺技。" },


        /* ===== Earthquake ===== */
        "skill_lizardman": { id: "skill_lizardman", shortId: "f", name: "ブレイドブロウガ", nameEn: "Blade Browga", attribute: "earthquake", category: "attack", power: 80, desc: "刃のような岩石で突く。" },
        "skill_caitsith": { id: "skill_caitsith", shortId: "g", name: "スタンプブロウガ", nameEn: "Stamp Browga", attribute: "earthquake", category: "attack", power: 100, desc: "巨大な足跡のように大地を叩く。" },
        "skill_dwarf": { id: "skill_dwarf", shortId: "h", name: "ボムブロウガ", nameEn: "Bomb Browga", attribute: "earthquake", category: "attack", power: 150, desc: "爆発を伴う岩石の連撃。" },
        "skill_orc": { id: "skill_orc", shortId: "i", name: "アーマーブロウザン", nameEn: "Armor Browzan", attribute: "earthquake", category: "attack", power: 200, desc: "鋼鉄のような硬さで突進する。" },
        "skill_earthquakeking": { id: "skill_earthquakeking", shortId: "j", name: "ネオ・グラビトンブロウデス", nameEn: "Neo Graviton Brow-death", attribute: "earthquake", category: "attack", power: 250, desc: "重力を歪めるほどの激震。" },
        "skill_earthquakeking_base": { id: "skill_earthquakeking_base", shortId: "k", name: "グラビトンブロウデス", nameEn: "Graviton Brow-death", attribute: "earthquake", category: "attack", power: 250, desc: "大地の怒り。" },
        "skill_werewolf_ult": { id: "skill_werewolf_ult", shortId: "l", name: "グランドブロウ", nameEn: "Grand Blow", attribute: "earthquake", category: "attack", power: 220, desc: "ウェアウルフの必殺技。" },


        /* ===== Storm ===== */
        "skill_stormworm": { id: "skill_stormworm", shortId: "m", name: "キュア", nameEn: "Cure", attribute: "storm", category: "heal", power: 90, desc: "優しい水で傷を癒やす。" },
        "skill_giantcrab": { id: "skill_giantcrab", shortId: "n", name: "バブルキュア", nameEn: "Bubble Cure", attribute: "storm", category: "heal", power: 120, desc: "泡の力で大幅に体力を戻す。" },
        "skill_mazeoctopus": { id: "skill_mazeoctopus", shortId: "o", name: "ダンスキュアリム", nameEn: "Dance Cure-rim", attribute: "storm", category: "heal", power: 180, desc: "踊るような水の流れで回復する。" },
        "skill_undine": { id: "skill_undine", shortId: "p", name: "ミルクキュアスト", nameEn: "Milk Cure-st", attribute: "storm", category: "heal", power: 270, desc: "真珠のような雫で完全な癒やしを与える。" },
        "skill_stormking": { id: "skill_stormking", shortId: "q", name: "ネオ・セラフィックギュルド", nameEn: "Neo Seraphic Guild", attribute: "storm", category: "heal", power: 360, desc: "聖なる奔流が全ての災厄を洗い流す。" },
        "skill_stormking_base": { id: "skill_stormking_base", shortId: "r", name: "セラフィックギュルド", nameEn: "Seraphic Guild", attribute: "storm", category: "heal", power: 360, desc: "全てを浄化する聖なる雫。" },
        "skill_mermaid_ult": { id: "skill_mermaid_ult", shortId: "s", name: "レインキュア", nameEn: "Rain Cure", attribute: "storm", category: "heal", power: 300, desc: "マーメイドの必殺技。" },

        "skill_devourcrocodile_ult": { id: "skill_devourcrocodile_ult", shortId: "u", name: "デヴォアキュアリム", nameEn: "Devour Curim", attribute: "storm", category: "attack", power: 250, desc: "デヴォアクロコダイルの必殺技。" },
        "skill_harpy_ult": { id: "skill_harpy_ult", shortId: "v", name: "ブリス", nameEn: "Bliss EX", attribute: "tornado", category: "attack", power: 250, desc: "ハーピーの必殺技。" },
        "skill_caitsith_ult": { id: "skill_caitsith_ult", shortId: "w", name: "スタンプブロウガ", nameEn: "Stamp Browga EX", attribute: "earthquake", category: "attack", power: 220, desc: "ケットシーの必殺技。" },
        "skill_hellhound_ult": { id: "skill_hellhound_ult", shortId: "x", name: "スピンフレイド", nameEn: "Spin Flade", attribute: "volcano", category: "attack", power: 250, desc: "ヘルハウンドの必殺技。" },

        "skill_jabberwock": { id: "skill_jabberwock", shortId: "t", name: "ヴェノム", nameEn: "Venom", attribute: "necrom", category: "attack", power: 450, desc: "全てを腐食させる終焉の毒。" }
    };
})();
