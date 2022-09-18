import { EmptyPromise } from "enterprise-core/dist/types";
import logger from "enterprise-core/dist/logger";
import { getHook as getWWHook } from "./direct/wuxiaworldScraper";
import { getHook as getGogoAnimeHook } from "./direct/gogoAnimeScraper";
import { getHook as getMangaHasuHook } from "./direct/mangaHasuScraper";
import { getHook as getMangaDexHook } from "./direct/mangadexScraper";
import { getHook as getWebnovelHook } from "./direct/webnovelScraper";
import { getHook as getQUndergroundHook } from "./direct/undergroundScraper";
import { getHook as getNovelFullHook } from "./direct/novelFullScraper";
import { getHook as getOpenLibraryHook } from "./direct/openLibraryScraper";
import { ContentDownloader, Hook, NewsScraper, SearchScraper, TocScraper, TocSearchScraper } from "./types";
import { customHookStorage, hookStorage } from "enterprise-core/dist/database/storages/storage";
import { getListManagerHooks } from "./listManager";
import { MediaType } from "enterprise-core/dist/tools";
import { HookConfig } from "./custom/types";
import { HookConfig as HookConfigV2 } from "./customv2/types";
import { createHook as createHookV2 } from "./customv2";
import { createHook } from "./custom/customScraper";
import { ValidationError } from "enterprise-core/dist/error";

function getRawHooks(): Hook[] {
  return [
    getWWHook(),
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
const disabledHooks = new Set<string>();
let timeoutId: NodeJS.Timeout | undefined;

export enum HookState {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

function isHookConfigV2(config: HookConfig | HookConfigV2): config is HookConfigV2 {
  return "version" in config && config.version === 2;
}

async function loadCustomHooks(): Promise<{ custom: Hook[]; disabled: Set<string> }> {
  const hooks = await customHookStorage.getHooks();

  const loadedCustomHooks: Hook[] = [];
  const disabled = new Set<string>();

  for (const hookEntity of hooks) {
    if (hookEntity.hookState === HookState.DISABLED) {
      disabled.add(hookEntity.name);
      continue;
    }
    let hookConfig: HookConfig | HookConfigV2;
    try {
      hookConfig = JSON.parse(hookEntity.state);
    } catch (error) {
      logger.warn("Could not parse HookState of CustomHook", { hook_name: hookEntity.name });
      continue;
    }

    let customHook;
    if (isHookConfigV2(hookConfig)) {
      customHook = createHookV2(hookConfig);
    } else {
      customHook = createHook(hookConfig);
    }
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
  return { custom: loadedCustomHooks, disabled };
}

async function loadRawHooks() {
  const hooks = getRawHooks();
  const storageHooks = [...(await hookStorage.getAll())];

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
  const customResult = await loadCustomHooks();
  hooks.push(...customResult.custom);

  // remove registered hooks, now that no asynchronous steps are left
  redirects.length = 0;
  tocScraper.clear();
  episodeDownloader.clear();
  tocDiscovery.clear();
  newsAdapter.length = 0;
  searchAdapter.length = 0;
  nameHookMap.clear();
  disabledHooks.clear();

  customResult.disabled.forEach((name) => disabledHooks.add(name));
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
  public constructor(name: string, called = true) {
    super(called ? "Called a function on the disabled Hook '" + name + "'" : name);
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

function registerHooks(hooks: readonly Hook[]): void {
  hooks.forEach((value: Hook) => {
    if (!value.name) {
      throw new ValidationError("hook without name!");
    }
    if (nameHookMap.has(value.name)) {
      throw new ValidationError(`encountered hook with name '${value.name}' twice`);
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
      value.searchAdapter.hookName = value.name;
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

export function getAllSearcher(): SearchScraper[] {
  return [...searchAdapter];
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

/**
 * Get the Hook with the given name.
 * Each hook has a unique name.
 *
 * @param name name of the hook
 * @returns a loaded hook
 * @throws DisabledHookError If the hook with the given name is disabled
 * @throws if no hook with the given name is loaded
 */
export function getHook(name: string): Hook {
  const hook = nameHookMap.get(name);
  if (!hook) {
    if (disabledHooks.has(name)) {
      throw new DisabledHookError(`trying to access disabled hook '${name}'`, false);
    }
    throw new ValidationError(`there is no hook with name: '${name}'`);
  }
  return hook;
}
