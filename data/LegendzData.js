/* ============================================================
 *  LegendzData.js  –  Legendz species definitions
 *  Global: window.TSP_LEGENDZ_DATA
 * ============================================================ */
(function () {
    "use strict";

    window.TSP_LEGENDZ_DATA = {
        /* === Wind === */
        "windragon": {
            speciesId: "windragon",
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
            speciesId: "ranshiin",
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
        }
    };
})();
