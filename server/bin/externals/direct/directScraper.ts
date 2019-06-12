import {Hook} from "../types";
import {getHook as getWWHook} from "./wuxiaworldScraper";
import {getHook as getKissAnimeHook} from "./kissAnimeScraper";
import {getHook as getMangaDexHook} from "./mangadexScraper";
import {getHook as getMangaHasuHook} from "./mangaHasuScraper";
import {getHook as getQUndergroundHook} from "./undergroundScraper";
import {getHook as getWebnovelHook} from "./webnovelScraper";

export function getHooks(): Hook[] {
    return [
        getWWHook(),
        getKissAnimeHook(),
        getMangaDexHook(),
        getMangaHasuHook(),
        getQUndergroundHook(),
        getWebnovelHook()
    ];
}
