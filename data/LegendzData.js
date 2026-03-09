/* ============================================================
 *  LegendzData.js  –  Legendz species definitions
 *  Global: window.TSP_LEGENDZ_DATA
 * ============================================================ */
(function () {
    "use strict";

    window.TSP_LEGENDZ_DATA = {
        /* === Wind === */
        "windragon": {
            speciesId: "windragon", shortId: "0",
            speciesName: "ウインドラゴン",
            speciesNameEn: "Wind Dragon",
            spritePath: "./assets/sprites/windragon.png",
            attribute: "tornado",
            baseHP: 400,
            baseStats: { magic: 60, counter: 100, attack: 60, recover: 20 },
            maxGrowHP: 5110,
            maxGrowStats: { magic: 630, counter: 630, attack: 630, recover: 630 },
            superBest: { temp: -45, hum: 5 },
            bestAreaId: "T2",
            defaultMoves: ["skill_wing_tornado", "skill_basic_slap", "skill_salamander", "skill_basic_slap", "skill_lizardman",
                "skill_basic_slap", "skill_stormworm", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap"],
            desc: "吹雪舞う寒い山に住むレジェンズ。翼で大風を起こすと、木々は倒れ、海は二つに割れるという。\n(A Legend who lives in cold, snowy mountains. It is said that when it creates a great wind with its wings, trees fall and the sea splits in two.)"
        },
        /* === Mysterious Windragon === */
        "ranshiin": {
            speciesId: "ranshiin", shortId: "1",
            speciesName: "ランシーン",
            speciesNameEn: "Ranshiin",
            spritePath: "./assets/sprites/ranshiin.png",
            attribute: "tornado",
            baseHP: 3200,
            baseStats: { magic: 120, counter: 340, attack: 90, recover: 110 },
            maxGrowHP: 6000,
            maxGrowStats: { magic: 999, counter: 999, attack: 999, recover: 999 },
            superBest: { temp: -45, hum: 0 },
            bestAreaId: "T2",
            defaultMoves: ["skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_wing_tornado"],
            desc: "体は黒色で金髪を束ねている謎のウインドラゴン。\n(A mysterious Windragon with a black body and tied-up blonde hair.)"
        },
        /* === Player Custom Legendz === */
        "blazedragon": {
            speciesId: "blazedragon", shortId: "2",
            speciesName: "ブレイズドラゴン",
            speciesNameEn: "Blaze Dragon",
            spritePath: "./assets/sprites/blaze dragon.png",
            attribute: "volcano",
            baseHP: 440,
            baseStats: { magic: 100, counter: 50, attack: 50, recover: 40 },
            maxGrowHP: 5110,
            maxGrowStats: { magic: 630, counter: 630, attack: 630, recover: 630 },
            superBest: { temp: 35, hum: 5 },
            bestAreaId: "V1",
            defaultMoves: ["skill_blazedragon_ult", "skill_basic_slap", "skill_salamander", "skill_basic_slap", "skill_lizardman",
                "skill_basic_slap", "skill_stormworm", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap"],
            desc: "灼熱の炎を操るドラゴン。"
        },
        "werewolf": {
            speciesId: "werewolf", shortId: "3",
            speciesName: "ウェアウルフ",
            speciesNameEn: "Werewolf",
            spritePath: "./assets/sprites/werewolf.png",
            attribute: "earthquake",
            baseHP: 440,
            baseStats: { magic: 50, counter: 50, attack: 70, recover: 20 },
            maxGrowHP: 5110,
            maxGrowStats: { magic: 630, counter: 630, attack: 630, recover: 630 },
            superBest: { temp: 20, hum: 65 },
            bestAreaId: "E2",
            defaultMoves: ["skill_werewolf_ult", "skill_basic_slap", "skill_salamander", "skill_basic_slap", "skill_lizardman",
                "skill_basic_slap", "skill_stormworm", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap"],
            desc: "大地を揺るがす剛腕を持つ狼男。"
        },
        "mermaid": {
            speciesId: "mermaid", shortId: "4",
            speciesName: "マーメイド",
            speciesNameEn: "Mermaid",
            spritePath: "./assets/sprites/mermaid.png",
            attribute: "storm",
            baseHP: 260,
            baseStats: { magic: 70, counter: 60, attack: 40, recover: 70 },
            maxGrowHP: 5110,
            maxGrowStats: { magic: 630, counter: 630, attack: 630, recover: 630 },
            superBest: { temp: 30, hum: 100, waterDepth: 0 },
            bestAreaId: "S2",
            defaultMoves: ["skill_mermaid_ult", "skill_basic_slap", "skill_salamander", "skill_basic_slap", "skill_lizardman",
                "skill_basic_slap", "skill_stormworm", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap",
                "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap", "skill_basic_slap"],
            desc: "癒しの雨を降らせる美しい人魚。"
        }
    };
})();
