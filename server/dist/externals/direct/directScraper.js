"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wuxiaworldScraper_1 = require("./wuxiaworldScraper");
const kissAnimeScraper_1 = require("./kissAnimeScraper");
const mangadexScraper_1 = require("./mangadexScraper");
const mangaHasuScraper_1 = require("./mangaHasuScraper");
const undergroundScraper_1 = require("./undergroundScraper");
const webnovelScraper_1 = require("./webnovelScraper");
function getHooks() {
    return [
        wuxiaworldScraper_1.getHook(),
        kissAnimeScraper_1.getHook(),
        mangadexScraper_1.getHook(),
        mangaHasuScraper_1.getHook(),
        undergroundScraper_1.getHook(),
        webnovelScraper_1.getHook()
    ];
}
exports.getHooks = getHooks;
//# sourceMappingURL=directScraper.js.map