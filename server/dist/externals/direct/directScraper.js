"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wuxiaworldScraper_1 = require("./wuxiaworldScraper");
const gogoAnimeScraper_1 = require("./gogoAnimeScraper");
const mangadexScraper_1 = require("./mangadexScraper");
const mangaHasuScraper_1 = require("./mangaHasuScraper");
const webnovelScraper_1 = require("./webnovelScraper");
const novelFullScraper_1 = require("./novelFullScraper");
const boxNovelScraper_1 = require("./boxNovelScraper");
function getHooks() {
    return [
        wuxiaworldScraper_1.getHook(),
        // site was shutdown
        // getKissAnimeHook(),
        gogoAnimeScraper_1.getHook(),
        mangadexScraper_1.getHook(),
        mangaHasuScraper_1.getHook(),
        // qidian underground seems to be closed down
        // getQUndergroundHook(),
        webnovelScraper_1.getHook(),
        boxNovelScraper_1.getHook(),
        novelFullScraper_1.getHook(),
    ];
}
exports.getHooks = getHooks;
//# sourceMappingURL=directScraper.js.map