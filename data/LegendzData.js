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

        /* === Fire === */
        "blazedragon": {
            speciesId: "blazedragon",
            speciesName: "ブレイズドラゴン",
            speciesNameEn: "Blaze Dragon",
            spritePath: "./assets/sprites/blazedragon.png",
            attribute: "volcano",
            baseHP: 500,
            baseStats: { magic: 80, counter: 50, attack: 100, recover: 30 },
            maxGrowHP: 5500,
            maxGrowStats: { magic: 600, counter: 500, attack: 700, recover: 500 },
            superBest: { temp: 999, hum: 0 },
            bestAreaId: "V1",
            defaultMoves: ["skill_fire_01", null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "火山の奥深くに眠る伝説の炎竜。灼熱のブレスで全てを焼き尽くす。\n(A legendary fire dragon sleeping deep within a volcano. It burns everything to ashes with its scorching breath.)"
        },

        /* === Earth === */
        "earthgolem": {
            speciesId: "earthgolem",
            speciesName: "アースゴーレム",
            speciesNameEn: "Earth Golem",
            spritePath: "./assets/sprites/earthgolem.png",
            attribute: "earthquake",
            baseHP: 600,
            baseStats: { magic: 30, counter: 40, attack: 120, recover: 50 },
            maxGrowHP: 6000,
            maxGrowStats: { magic: 400, counter: 400, attack: 800, recover: 600 },
            superBest: { temp: 35, hum: 95 },
            bestAreaId: "E2",
            defaultMoves: ["skill_earth_01", null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "大地の力を宿した巨人。地震を起こし敵を圧倒する。\n(A giant imbued with the power of the earth. It overwhelms enemies by causing earthquakes.)"
        },

        /* === Water === */
        "aquaserpent": {
            speciesId: "aquaserpent",
            speciesName: "アクアサーペント",
            speciesNameEn: "Aqua Serpent",
            spritePath: "./assets/sprites/aquaserpent.png",
            attribute: "storm",
            baseHP: 450,
            baseStats: { magic: 90, counter: 70, attack: 50, recover: 80 },
            maxGrowHP: 5200,
            maxGrowStats: { magic: 700, counter: 550, attack: 500, recover: 700 },
            superBest: { temp: -273, hum: 100, waterDepth: 100 },
            bestAreaId: "SND",
            defaultMoves: ["skill_water_01", null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "深海に棲む水蛇。嵐のような激流を纏い、敵を飲み込む。\n(A water serpent dwelling in the deep sea. It cloaks itself in storm-like currents to swallow enemies.)"
        },

        /* === Spiritual === */
        "holyunicorn": {
            speciesId: "holyunicorn",
            speciesName: "ホーリーユニコーン",
            speciesNameEn: "Holy Unicorn",
            spritePath: "./assets/sprites/holyunicorn.png",
            attribute: "spiritual",
            baseHP: 380,
            baseStats: { magic: 110, counter: 80, attack: 40, recover: 100 },
            maxGrowHP: 4800,
            maxGrowStats: { magic: 750, counter: 600, attack: 450, recover: 750 },
            superBest: { temp: 25, hum: 50 },
            bestAreaId: "E4",
            defaultMoves: ["skill_spiritual_01", null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "聖なる光を纏うユニコーン。その角は万物を浄化する。"
        },

        /* === Necrom === */
        "darkwraith": {
            speciesId: "darkwraith",
            speciesName: "ダークレイス",
            speciesNameEn: "Dark Wraith",
            spritePath: "./assets/sprites/darkwraith.png",
            attribute: "necrom",
            baseHP: 350,
            baseStats: { magic: 120, counter: 90, attack: 70, recover: 10 },
            maxGrowHP: 4500,
            maxGrowStats: { magic: 800, counter: 650, attack: 600, recover: 300 },
            superBest: { temp: -35, hum: 0 },
            bestAreaId: "T1",
            defaultMoves: ["skill_necrom_01", null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "黄泉の闇より現れる亡霊。触れた者の生命を吸い取る。"
        },

        /* ---------- Great Dragon Kings (Boss) ---------- */
        "king_fire": {
            speciesId: "king_fire",
            speciesName: "炎龍王バーサーカー",
            speciesNameEn: "Fire Dragon King Berserker",
            spritePath: "./assets/sprites/king_fire.png",
            attribute: "volcano",
            baseHP: 2000,
            baseStats: { magic: 200, counter: 150, attack: 300, recover: 100 },
            maxGrowHP: 0,
            maxGrowStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            superBest: null,
            bestAreaId: null,
            defaultMoves: ["skill_fire_01", "skill_fire_02", "skill_fire_03", null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "四大龍王の一角。灼熱の炎で世界を焼き尽くさんとする。"
        },
        "king_wind": {
            speciesId: "king_wind",
            speciesName: "風龍王ゼファー",
            speciesNameEn: "Wind Dragon King Zephyr",
            spritePath: "./assets/sprites/king_wind.png",
            attribute: "tornado",
            baseHP: 1800,
            baseStats: { magic: 180, counter: 250, attack: 200, recover: 120 },
            maxGrowHP: 0,
            maxGrowStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            superBest: null,
            bestAreaId: null,
            defaultMoves: ["skill_wind_01", "skill_wind_02", "skill_wind_03", null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "四大龍王の一角。真空の刃は何物をも切り裂く。"
        },
        "king_earth": {
            speciesId: "king_earth",
            speciesName: "地龍王テラ",
            speciesNameEn: "Earth Dragon King Terra",
            spritePath: "./assets/sprites/king_earth.png",
            attribute: "earthquake",
            baseHP: 2500,
            baseStats: { magic: 150, counter: 100, attack: 350, recover: 150 },
            maxGrowHP: 0,
            maxGrowStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            superBest: null,
            bestAreaId: null,
            defaultMoves: ["skill_earth_01", "skill_earth_02", "skill_earth_03", null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "四大龍王の一角。大地そのものが彼の身体である。"
        },
        "king_water": {
            speciesId: "king_water",
            speciesName: "水龍王リヴァイア",
            speciesNameEn: "Water Dragon King Levia",
            spritePath: "./assets/sprites/king_water.png",
            attribute: "storm",
            baseHP: 2200,
            baseStats: { magic: 250, counter: 180, attack: 200, recover: 200 },
            maxGrowHP: 0,
            maxGrowStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            superBest: null,
            bestAreaId: null,
            defaultMoves: ["skill_water_01", "skill_water_02", "skill_water_03", null, null,
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "四大龍王の一角。海の底から全てを呑み込む大津波を呼ぶ。"
        },

        /* ---------- Demon King ---------- */
        "jabberwock": {
            speciesId: "jabberwock",
            speciesName: "魔王ジャバウォック",
            speciesNameEn: "Demon King Jabberwock",
            spritePath: "./assets/sprites/jabberwock.png",
            attribute: "necrom",
            baseHP: 5000,
            baseStats: { magic: 400, counter: 300, attack: 500, recover: 300 },
            maxGrowHP: 0,
            maxGrowStats: { magic: 0, counter: 0, attack: 0, recover: 0 },
            superBest: null,
            bestAreaId: null,
            defaultMoves: ["skill_necrom_01", "skill_fire_03", "skill_wind_03",
                "skill_earth_03", "skill_water_03",
                null, null, null, null, null,
                null, null, null, null, null],
            desc: "世界を闇に染めんとする魔王。四大龍王を従え、全レジェンズの頂点に君臨する。"
        }
    };
})();
