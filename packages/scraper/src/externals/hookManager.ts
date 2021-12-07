import { CustomHook as CustomHookEntity, EmptyPromise } from "enterprise-core/dist/types";
import logger from "enterprise-core/dist/logger";
import { getHook as getWWHook } from "./direct/wuxiaworldScraper";
import { getHook as getGogoAnimeHook } from "./direct/gogoAnimeScraper";
import { getHook as getKissAnimeHook } from "./direct/kissAnimeScraper";
import { getHook as getMangaHasuHook } from "./direct/mangaHasuScraper";
import { getHook as getMangaDexHook } from "./direct/mangadexScraper";
import { getHook as getWebnovelHook } from "./direct/webnovelScraper";
import { getHook as getQUndergroundHook } from "./direct/undergroundScraper";
import { getHook as getNovelFullHook } from "./direct/novelFullScraper";
import { getHook as getBoxnovelHook } from "./direct/boxNovelScraper";
import { getHook as getOpenLibraryHook } from "./direct/openLibraryScraper";
import { ContentDownloader, Hook, NewsScraper, SearchScraper, TocScraper, TocSearchScraper } from "./types";
import { customHookStorage, hookStorage } from "enterprise-core/dist/database/storages/storage";
import { getListManagerHooks } from "./listManager";
import { MediaType, multiSingle } from "enterprise-core/dist/tools";
import { HookConfig } from "./custom/types";
import { createHook } from "./custom/customScraper";

function getRawHooks(): Hook[] {
  return [
    getWWHook(),
    // site was shutdown
    getKissAnimeHook(),
    getGogoAnimeHook(),
    getMangaDexHook(),
    getMangaHasuHook(),
    // qidian underground seems to be closed down
    getQUndergroundHook(),
    getWebnovelHook(),
    // getBoxnovelHook(), // already migrated
    getNovelFullHook(),
    getOpenLibraryHook(),
    ...getListManagerHooks(),
  ];
}

let loaded = false;
let loadedHooks: Hook[] = [];

const redirects: RegExp[] = [];
const tocScraper: Map<RegExp, TocScraper> = new Map();
const episodeDownloader: Map<RegExp, ContentDownloader> = new Map();
const tocDiscovery: Map<RegExp, TocSearchScraper> = new Map();
const newsAdapter: NewsScraper[] = [];
const searchAdapter: SearchScraper[] = [];
const nameHookMap = new Map<string, Hook>();
let timeoutId: NodeJS.Timeout | undefined;

export enum HookState {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

async function loadCustomHooks(): Promise<Hook[]> {
  const hooks: CustomHookEntity[] = await customHookStorage.getHooks();

  const loadedCustomHooks: Hook[] = [];

  for (const hookEntity of hooks) {
    if (hookEntity.hookState === HookState.DISABLED) {
      continue;
    }
    let hookConfig: HookConfig;
    try {
      hookConfig = JSON.parse(hookEntity.state);
    } catch (error) {
      logger.warn("Could not parse HookState of CustomHook " + hookEntity.name);
      continue;
    }

    const customHook = createHook(hookConfig);
    loadedCustomHooks.push({
      name: customHook.name,
      medium: customHook.medium,
      domainReg: customHook.domainReg,
      custom: true,
      disabled: false,
      contentDownloadAdapter: customHook.contentDownloadAdapter,
      newsAdapter: customHook.newsAdapter,
      redirectReg: customHook.redirectReg,
      searchAdapter: customHook.searchAdapter,
      tocAdapter: customHook.tocAdapter,
    });
  }
  return loadedCustomHooks;
}

async function loadRawHooks() {
  const hooks = getRawHooks();
  const storageHooks = await hookStorage.getAll();

  for (const hook of hooks) {
    const index = storageHooks.findIndex((value) => hook.name === value.name);

    if (index < 0) {
      await hookStorage.addScraperHook({
        id: 0,
        message: "Newly discovered Hook",
        name: hook.name,
        state: HookState.ENABLED,
      });
    } else {
      if (storageHooks[index].state === HookState.DISABLED) {
        disableHook(hook);
      }
      // remove all found storage hooks, so we can remove the superflous ones
      storageHooks.splice(index, 1);
    }
  }

  // remove any superflous hooks stored in storage
  await Promise.all(storageHooks.map((hook) => hookStorage.deleteScraperHook(hook.id)));
  return hooks;
}

export async function load(unloadedOnly = false): EmptyPromise {
  if (unloadedOnly && loaded) {
    return;
  }
  timeoutId = undefined;
  const hooks = await loadRawHooks();
  hooks.push(...(await loadCustomHooks()));

  // remove registered hooks
  redirects.length = 0;
  tocScraper.clear();
  episodeDownloader.clear();
  tocDiscovery.clear();
  newsAdapter.length = 0;
  searchAdapter.length = 0;
  nameHookMap.clear();

  loadedHooks = hooks;
  registerHooks(loadedHooks);

  loaded = true;

  if (!unloadedOnly && !timeoutId) {
    // set timeout if an timeout is not already set
    // and load again in a minute
    timeoutId = setTimeout(load, 60000);
  }
}

export class DisabledHookError extends Error {
  public constructor(name: string) {
    super("Called a function on the disabled Hook '" + name + "'");
    this.name = "DisabledHookError";
  }
}

function disableHook(hook: Hook): Hook {
  hook.disabled = true;

  // let every function property throw an error when called
  for (const [key, value] of Object.entries(hook)) {
    if (typeof value === "function") {
      const func = () => {
        throw new DisabledHookError(hook.name);
      };
      // some functions may have properties defined, so copy them
      for (const [funcKey, funcValue] of Object.entries(value)) {
        // @ts-expect-error
        func[funcKey] = funcValue;
      }
      // @ts-expect-error
      hook[key] = func;
    }
  }
  return hook;
}

function registerHooks(hook: Hook[] | Hook): void {
  multiSingle(hook, (value: Hook) => {
    if (!value.name) {
      throw Error("hook without name!");
    }
    if (nameHookMap.has(value.name)) {
      throw Error(`encountered hook with name '${value.name}' twice`);
    }
    nameHookMap.set(value.name, value);

    if (value.redirectReg) {
      redirects.push(value.redirectReg);
    }
    if (value.newsAdapter) {
      value.newsAdapter.hookName = value.name;
      newsAdapter.push(value.newsAdapter);
    }
    if (value.searchAdapter) {
      searchAdapter.push(value.searchAdapter);
    }
    if (value.domainReg) {
      if (value.tocAdapter) {
        value.tocAdapter.hookName = value.name;
        tocScraper.set(value.domainReg, value.tocAdapter);
      }

      if (value.contentDownloadAdapter) {
        value.contentDownloadAdapter.hookName = value.name;
        episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
      }

      if (value.tocSearchAdapter) {
        value.tocSearchAdapter.hookName = value.name;
        tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
      }
    }
    if (value.tocPattern && value.tocSearchAdapter) {
      value.tocSearchAdapter.hookName = value.name;
      tocDiscovery.set(value.tocPattern, value.tocSearchAdapter);
    }
  });
}

export function tocScraperEntries(): Array<[RegExp, TocScraper]> {
  return [...tocScraper.entries()];
}

export function tocDiscoveryEntries(): Array<[RegExp, TocSearchScraper]> {
  return [...tocDiscovery.entries()];
}

export function episodeDownloaderEntries(): Array<[RegExp, ContentDownloader]> {
  return [...episodeDownloader.entries()];
}

export function getSearcher(medium: MediaType): SearchScraper[] {
  return searchAdapter.filter((searcher) => searcher.medium & medium);
}

export function getNewsAdapter(): NewsScraper[] {
  return [...newsAdapter];
}

export function noRedirect(link: string): boolean {
  return !redirects.some((value) => value.test(link));
}

export function getHooks(): Hook[] {
  return [...loadedHooks];
}

export function getHook(name: string): Hook {
  const hook = nameHookMap.get(name);
  if (!hook) {
    throw Error(`there is no hook with name: '${name}'`);
  }
  return hook;
}
