import {Hook} from "../types";
import {getHook as getWWHook} from "./wuxiaworldScraper";
import {getHook as getKissAnimeHook} from "./kissAnimeScraper";
import {getHook as getMangaDexHook} from "./mangadexScraper";
import {getHook as getMangaHasuHook} from "./mangaHasuScraper";
import {getHook as getWebnovelHook} from "./webnovelScraper";
import {getHook as getNovelFullHook} from "./fullNovelScraper";
import {getHook as getBoxnovelHook} from "./boxNovelScraper";

export function getHooks(): Hook[] {
    return [
        getWWHook(),
        getKissAnimeHook(),
        getMangaDexHook(),
        getMangaHasuHook(),
        // qidian underground seems to be closed down
        // getQUndergroundHook(),
        getWebnovelHook(),
        getBoxnovelHook(),
        getNovelFullHook(),
    ];
}
