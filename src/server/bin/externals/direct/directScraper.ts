import { Hook } from "../types";
import { getHook as getWWHook } from "./wuxiaworldScraper";
import { getHook as getGogoAnimeHook } from "./gogoAnimeScraper";
import { getHook as getMangaHasuHook } from "./mangaHasuScraper";
import { getHook as getWebnovelHook } from "./webnovelScraper";
import { getHook as getNovelFullHook } from "./novelFullScraper";
import { getHook as getBoxnovelHook } from "./boxNovelScraper";
import { getHook as getOpenLibraryHook } from "./openLibraryScraper";

export function getHooks(): Hook[] {
  return [
    getWWHook(),
    // site was shutdown
    // getKissAnimeHook(),
    getGogoAnimeHook(),
    // getMangaDexHook(),
    getMangaHasuHook(),
    // qidian underground seems to be closed down
    // getQUndergroundHook(),
    getWebnovelHook(),
    getBoxnovelHook(),
    getNovelFullHook(),
    getOpenLibraryHook(),
  ];
}
