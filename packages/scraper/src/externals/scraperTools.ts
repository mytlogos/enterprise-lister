import { ListScrapeResult } from "./listManager";
import { combiIndex, defaultNetworkTrack, getElseSet, hasProp } from "enterprise-core/dist/tools";
import { Episode, Uuid, SearchResult, EmptyPromise, Optional, NetworkTrack } from "enterprise-core/dist/types";
import logger from "enterprise-core/dist/logger";
import { ContentDownloader, DownloadContent, EpisodeContent, Hook, Toc, TocContent } from "./types";
import { Cache } from "enterprise-core/dist/cache";
import env from "enterprise-core/dist/env";
import { episodeStorage } from "enterprise-core/dist/database/storages/storage";
import { MissingResourceError } from "./errors";
import {
  episodeDownloaderEntries,
  getHook,
  getHooks,
  getSearcher,
  load,
  noRedirect,
  tocScraperEntries,
} from "./hookManager";
import request, { Response } from "./request";
import { ValidationError } from "enterprise-core/dist/error";
import { registerOnExitHandler } from "enterprise-core/dist/exit";
import { getStore, StoreKey } from "enterprise-core/dist/asyncStorage";

interface ScrapeableFilterResult {
  available: string[];
  unavailable: string[];
}

export const filterScrapeAble = async (urls: string[]): Promise<ScrapeableFilterResult> => {
  await checkHooks();

  const regs: RegExp[] = [];
  for (const hook of getHooks()) {
    if (hook.domainReg) {
      regs.push(hook.domainReg);
    }
  }
  const result: ScrapeableFilterResult = { available: [], unavailable: [] };

  for (const link of urls) {
    let found = false;
    for (const reg of regs) {
      if (reg.test(link)) {
        found = true;
        break;
      }
    }
    if (found) {
      result.available.push(link);
    } else {
      result.unavailable.push(link);
    }
  }
  return result;
};

export async function loadToc(link: string): Promise<Toc[]> {
  await checkHooks();
  const results = await Promise.allSettled(
    tocScraperEntries()
      .filter((value) => value[0].test(link))
      .map((value) => {
        const scraper = value[1];
        return scraper(link);
      }),
  );
  return (results.filter((result) => result.status === "fulfilled") as Array<PromiseFulfilledResult<Toc[]>>)
    .map((value: PromiseFulfilledResult<Toc[]>) => value.value)
    .flat();
}

export function checkTocContent(content: TocContent, allowMinusOne = false): void {
  if (!content) {
    throw new ValidationError("empty toc content");
  }

  const index = content.combiIndex;
  if (index == null || (index < 0 && (index !== -1 || !allowMinusOne))) {
    throw new ValidationError("invalid toc content, combiIndex invalid: '" + index + "'");
  }

  const totalIndex = content.totalIndex;
  if (
    totalIndex == null ||
    !Number.isInteger(totalIndex) ||
    (totalIndex < 0 && (totalIndex !== -1 || !allowMinusOne))
  ) {
    throw new ValidationError(`invalid toc content, totalIndex invalid: '${totalIndex}' of ${index}`);
  }
  const partialIndex = content.partialIndex;
  if (partialIndex != null && (partialIndex < 0 || !Number.isInteger(partialIndex))) {
    throw new ValidationError(`invalid toc content, partialIndex invalid: '${partialIndex}' of ${index}`);
  }
}

// TODO: 21.06.2019 save cache in database?
const cache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
const errorCache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });

// clear any timers
registerOnExitHandler(() => {
  cache.close();
  errorCache.close();
});

export interface ListScrapeEvent {
  external: { cookies: string; uuid: Uuid; userUuid: Uuid; type: number };
  lists: ListScrapeResult;
}

export enum ScrapeEvent {
  TOC = "toc",
  FEED = "feed",
  NEWS = "news",
  LIST = "list",
}

export class ScraperHelper {
  private readonly eventMap: Map<string, Array<(value: any) => undefined | EmptyPromise>> = new Map();

  public on(event: string, callback: (value: any) => undefined | EmptyPromise): void {
    const callbacks = getElseSet(this.eventMap, event, () => []);
    callbacks.push(callback);
  }

  public async emit(event: string, value: any): EmptyPromise {
    if (env.stopScrapeEvents) {
      logger.info("not emitting events");
      return Promise.resolve();
    }
    const callbacks = getElseSet(this.eventMap, event, () => []);
    // return a promise of all callbacks yielding a promise
    await Promise.all(callbacks.map((cb) => cb(value)).filter((cbValue) => cbValue));
  }

  public init(): void {
    load().catch();
  }

  public getHook(name: string): Hook {
    return getHook(name);
  }
}

export function checkHooks(): EmptyPromise {
  return load(true);
}

export async function search(title: string, medium: number): Promise<SearchResult[]> {
  await checkHooks();
  // use async to wrap possible errors in a promise
  const promises: Array<Promise<SearchResult[]>> = getSearcher(medium).map(async (searcher) => searcher(title, medium));

  const results = await Promise.allSettled(promises);
  return results
    .flat(1)
    .map((value) => {
      if (value.status === "fulfilled") {
        return value.value;
      }
      // log only non trivial error
      if (!(value.reason instanceof Error) || !["StatusCodeError", "DisabledHookError"].includes(value.reason.name)) {
        logger.error(value.reason);
      }
      return null;
    })
    .filter((value) => value) as unknown as SearchResult[];
}

export async function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]> {
  await checkHooks();
  const entries = episodeDownloaderEntries();

  const downloadContents: Map<number, DownloadContent> = new Map();

  for (const episode of episodes) {
    const indexKey = combiIndex(episode);

    if (!episode.releases.length) {
      downloadContents.set(indexKey, {
        episodeId: episode.id,
        title: "",
        content: [],
      });
      logger.warn("no releases available", { episode_id: episode.id });
      continue;
    }
    const downloadValue = downloadContents.get(indexKey);

    if (downloadValue?.content.length) {
      logger.warn("downloaded episode already", { episode_index: indexKey, episode_id: episode.id });
      continue;
    }
    let downloadedContent: Optional<EpisodeContent[]>;
    let releaseIndex = 0;
    let downloaderIndex = 0;

    while (!downloadedContent && releaseIndex !== episode.releases.length) {
      let downloaderEntry: Optional<[RegExp, ContentDownloader]>;

      const release = episode.releases[releaseIndex];

      if (release.locked) {
        releaseIndex++;
        continue;
      }

      for (; downloaderIndex < entries.length; downloaderIndex++) {
        const entry = entries[downloaderIndex];

        if (entry[0].test(release.url)) {
          downloaderEntry = entry;
          break;
        }
      }

      if (!downloaderEntry) {
        downloaderIndex = 0;
        releaseIndex++;
        continue;
      }

      let episodeContents: EpisodeContent[];
      try {
        episodeContents = await downloaderEntry[1](release.url);
      } catch (e) {
        if (
          e instanceof MissingResourceError ||
          (hasProp(e, "statusCode") && e.statusCode && (e.statusCode === 410 || e.statusCode === 404))
        ) {
          episodeStorage.deleteRelease(release).catch(logger.error);
        } else {
          logger.error(e);
        }
        downloaderIndex = 0;
        releaseIndex++;
        continue;
      }

      episodeContents = episodeContents.filter((value) => {
        if (value.locked && value.index === combiIndex(episode)) {
          release.locked = true;
          episodeStorage.updateRelease(release).catch(logger.error);
          return false;
        }
        return value.content.filter((s) => s).length;
      });

      if (!episodeContents.length) {
        downloaderIndex = 0;
        releaseIndex++;
        continue;
      }
      downloadedContent = episodeContents;
      break;
    }
    if (!downloadedContent?.length) {
      downloadContents.set(indexKey, {
        episodeId: episode.id,
        title: "",
        content: [],
      });
      logger.warn("nothing downloaded", { episode_id: episode.id });
    } else if (downloadedContent.length === 1) {
      const episodeContent = downloadedContent[0];
      downloadContents.set(indexKey, {
        title: episodeContent.episodeTitle,
        content: episodeContent.content,
        episodeId: episode.id,
      });
    } else {
      for (const episodeContent of downloadedContent) {
        const foundEpisode = episodes.find(
          (value) =>
            value.releases.find(
              (release) => release.title === episodeContent.episodeTitle || combiIndex(value) === episodeContent.index,
            ) != null,
        );
        if (foundEpisode) {
          downloadContents.set(indexKey, {
            title: episodeContent.episodeTitle,
            content: episodeContent.content,
            episodeId: foundEpisode.id,
          });
        } else {
          logger.warn("could not find any episode for downloaded content", {
            episode_title: episodeContent.episodeTitle,
            episode_index: episodeContent.index,
          });
        }
      }
    }
  }
  return [...downloadContents.values()];
}

function checkLinkWithInternet(link: string): Promise<Response> {
  return request.head({ url: link });
}

export function checkLink(link: string, linkKey?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (noRedirect(link)) {
      resolve(link);
      return;
    }
    if (linkKey) {
      const value: Optional<any> = cache.get(linkKey);

      if (value?.redirect && value.followed && value.redirect === link) {
        // refresh this entry, due to hit
        cache.ttl(linkKey);
        resolve(value.followed);
        return;
      }
      // i dont want the same error message again and again
      // if it occurs once it is highly likely it will come again, so just resolve with empty string
      const errorValue: Optional<any> = errorCache.get(linkKey);

      if (errorValue && errorValue === link) {
        errorCache.ttl(linkKey);
        resolve("");
        return;
      }
    }

    checkLinkWithInternet(link)
      .then((response) => {
        const href: string = response.request.uri.href;

        if (linkKey) {
          cache.set(linkKey, { redirect: link, followed: href });
        }

        resolve(href);
      })
      .catch((reason) => {
        if (reason?.statusCode && reason.statusCode === 404) {
          // TODO if resource does not exist what to do?
          if (linkKey) {
            cache.set(linkKey, { redirect: link, followed: "" });
          }
          resolve("");
          return;
        }
        if (linkKey) {
          const value: Optional<any> = errorCache.get(linkKey);

          if (!value || value !== link) {
            errorCache.set(linkKey, link);
            // FIXME 502 Bad Gateway error for some novelupdates short links
            //  such as 'https://www.novelupdates.com/extnu/2770610/',
            //  while i can acces it from browser just fine
            reject(reason);
            return;
          }
          errorCache.ttl(linkKey);
        }
        resolve("");
      });
  });
}

/**
 * Stores hookName in the asyncStorage as an used Hook.
 *
 * @param hookName name to store
 */
export function storeHookName(hookName: string) {
  const store = getStore();

  if (store) {
    const track: NetworkTrack = getElseSet(store, StoreKey.NETWORK, defaultNetworkTrack);
    track.hooksUsed.push(hookName);
  }
}

/**
 * Get hookNames of used hooks from the asyncStorage.
 */
export function getHookNames(store?: ReturnType<typeof getStore>): readonly string[] {
  if (!store) {
    store = getStore();
  }

  if (store) {
    const track = store.get(StoreKey.NETWORK);

    if (track) {
      return track.hooksUsed;
    }
  }
  return [];
}
