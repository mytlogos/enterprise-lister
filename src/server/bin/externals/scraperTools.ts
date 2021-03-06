import { factory, getListManagerHooks, ListScrapeResult, ListType } from "./listManager";
import feedParserPromised from "feedparser-promised";
import {
  combiIndex,
  getElseSet,
  hasMediaType,
  ignore,
  isTocPart,
  max,
  maxValue,
  MediaType,
  multiSingle,
} from "../tools";
import {
  Episode,
  EpisodeNews,
  EpisodeRelease,
  ExternalUser,
  Uuid,
  JobRequest,
  LikeMedium,
  MilliTime,
  News,
  ScrapeName,
  SearchResult,
  SimpleEpisode,
  TocSearchMedium,
  EmptyPromise,
  Optional,
  NewsResult,
} from "../types";
import logger from "../logger";
import {
  ContentDownloader,
  DownloadContent,
  EpisodeContent,
  Hook,
  NewsScraper,
  SearchScraper,
  Toc,
  TocContent,
  TocEpisode,
  TocRequest,
  TocResult,
  TocScraper,
  TocSearchScraper,
  ExternalListResult,
} from "./types";
import * as directScraper from "./direct/directScraper";
import * as url from "url";
import { Cache } from "../cache";
import * as validate from "validate.js";
import request from "request";
import { FullResponse } from "cloudscraper";
import { queueFastRequestFullResponse } from "./queueManager";
import env from "../env";
import { sourceType } from "./direct/undergroundScraper";
import {
  episodeStorage,
  externalUserStorage,
  mediumInWaitStorage,
  mediumStorage,
  partStorage,
  storage,
} from "../database/storages/storage";
import { MissingResourceError, UrlError } from "./errors";

const redirects: RegExp[] = [];
const tocScraper: Map<RegExp, TocScraper> = new Map();
const episodeDownloader: Map<RegExp, ContentDownloader> = new Map();
const tocDiscovery: Map<RegExp, TocSearchScraper> = new Map();
const newsAdapter: NewsScraper[] = [];
const searchAdapter: SearchScraper[] = [];
const nameHookMap = new Map<string, Hook>();

interface ScrapeableFilterResult {
  available: string[];
  unavailable: string[];
}

export const filterScrapeAble = (urls: string): ScrapeableFilterResult => {
  checkHooks();

  const regs: RegExp[] = [];
  for (const entry of nameHookMap.entries()) {
    if (entry[1].domainReg) {
      regs.push(entry[1].domainReg);
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

export const scrapeNewsJob = async (name: string): Promise<NewsResult> => {
  const hook = nameHookMap.get(name);
  if (!hook) {
    throw Error("no hook found for name: " + name);
  }

  if (!hook.newsAdapter) {
    throw Error(`expected hook '${name}' to have newsAdapter`);
  }

  return scrapeNews(hook.newsAdapter);
};

export const scrapeNews = async (adapter: NewsScraper): Promise<NewsResult> => {
  if (!adapter.link || !validate.isString(adapter.link)) {
    throw Error("missing link on newsScraper");
  }
  logger.info(`Scraping for News with Adapter on '${adapter.link}'`);
  const rawNews = await adapter();

  if (rawNews && rawNews.episodes && rawNews.episodes.length) {
    logger.info(`Scraped ${rawNews.episodes.length} Episode News on '${adapter.link}'`);
    const episodeMap: Map<string, EpisodeNews[]> = rawNews.episodes.reduce((map, currentValue) => {
      const episodeNews = getElseSet(map, currentValue.mediumTitle + "%" + currentValue.mediumType, () => []);
      episodeNews.push(currentValue);
      return map;
    }, new Map<string, EpisodeNews[]>());

    const promises = [];
    for (const value of episodeMap.values()) {
      const [newsItem] = value;
      if (!newsItem || !newsItem.mediumTitle || !newsItem.mediumType) {
        continue;
      }
      promises.push(
        processMediumNews(newsItem.mediumTitle, newsItem.mediumType, newsItem.mediumTocLink, value, rawNews.update),
      );
    }
    await Promise.all(promises);
  }
  return {
    link: adapter.link,
    rawNews: (rawNews && rawNews.news) || [],
  };
};

async function processMediumNews(
  title: string,
  type: MediaType,
  tocLink: Optional<string>,
  potentialNews: EpisodeNews[],
  update = false,
): EmptyPromise {
  const likeMedium: LikeMedium = await mediumStorage.getLikeMedium({ title, type });

  if (!likeMedium || !likeMedium.medium || !likeMedium.medium.id) {
    if (tocLink) {
      await mediumInWaitStorage.addMediumInWait({ title, medium: type, link: tocLink });
    }
    return;
  }
  const mediumId = likeMedium.medium.id;
  const latestReleases: SimpleEpisode[] = await episodeStorage.getLatestReleases(mediumId);

  const latestRelease = max(latestReleases, (previous, current) => {
    const maxPreviousRelease = max(previous.releases, "releaseDate");
    const maxCurrentRelease = max(current.releases, "releaseDate");

    return (
      ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0) -
      ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0)
    );
  });

  let standardPart = await partStorage.getStandardPart(mediumId);

  if (!standardPart) {
    standardPart = await partStorage.createStandardPart(mediumId);
  }

  if (!standardPart || !standardPart.id) {
    throw Error(`could not create standard part for mediumId: '${mediumId}'`);
  }

  let newEpisodeNews: EpisodeNews[];

  if (latestRelease) {
    const oldReleases: EpisodeNews[] = [];
    newEpisodeNews = potentialNews.filter((value) => {
      if (value.episodeIndex > combiIndex(latestRelease)) {
        return true;
      } else {
        oldReleases.push(value);
        return false;
      }
    });
    const indexReleaseMap: Map<number, EpisodeRelease> = new Map();

    const oldEpisodeIndices = oldReleases.map((value) => {
      indexReleaseMap.set(value.episodeIndex, {
        title: value.episodeTitle,
        url: value.link,
        releaseDate: value.date,
        locked: value.locked,
        episodeId: 0,
      });
      return value.episodeIndex;
    });

    if (oldEpisodeIndices.length) {
      const episodes = await episodeStorage.getMediumEpisodePerIndex(mediumId, oldEpisodeIndices);
      const promises = episodes.map((value) => {
        const index = combiIndex(value);
        const release = indexReleaseMap.get(index);

        if (!release) {
          throw Error(`missing release, queried for episode but got no release source for: '${index}'`);
        }
        if (value.releases.find((prevRelease) => prevRelease.url === release.url)) {
          return Promise.resolve();
        }
        if (!value.id) {
          return episodeStorage
            .addEpisode({
              id: 0,
              // @ts-expect-error
              partId: standardPart.id,
              partialIndex: value.partialIndex,
              totalIndex: value.totalIndex,
              releases: [release],
            })
            .then(() => undefined);
        }
        release.episodeId = value.id;
        return episodeStorage.addRelease(release).then(() => undefined);
      });
      await Promise.all(promises);
    }
    if (update) {
      const sourcedReleases = await episodeStorage.getSourcedReleases(sourceType, mediumId);
      const toUpdateReleases = oldReleases
        .map(
          (value): EpisodeRelease => {
            return {
              title: value.episodeTitle,
              url: value.link,
              releaseDate: value.date,
              locked: value.locked,
              sourceType,
              episodeId: 0,
            };
          },
        )
        .filter((value) => {
          const foundRelease = sourcedReleases.find((release) => release.title === value.title);

          if (!foundRelease) {
            logger.warn("wanted to update an unavailable release");
            return false;
          }
          return foundRelease.url !== value.url;
        });
      if (toUpdateReleases.length) {
        episodeStorage.updateRelease(toUpdateReleases).catch(logger.error);
      }
    }
  } else {
    newEpisodeNews = potentialNews;
  }
  const newEpisodes = newEpisodeNews.map(
    (value): SimpleEpisode => {
      return {
        totalIndex: value.episodeTotalIndex,
        partialIndex: value.episodePartialIndex,
        releases: [
          {
            episodeId: 0,
            releaseDate: value.date,
            url: value.link,
            locked: value.locked,
            title: value.episodeTitle,
          },
        ],
        id: 0,
        // @ts-expect-error
        partId: standardPart.id,
      };
    },
  );

  if (newEpisodes.length) {
    await episodeStorage.addEpisode(newEpisodes);
  }
  if (tocLink) {
    await mediumStorage.addToc(mediumId, tocLink);
  }
}

export async function loadToc(link: string): Promise<Toc[]> {
  checkHooks();
  const results = await Promise.allSettled(
    [...tocScraper.entries()]
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

export async function searchForTocJob(name: string, item: TocSearchMedium): Promise<TocResult> {
  logger.info(`searching for toc on ${name} with ${JSON.stringify(item)}`);
  const hook = nameHookMap.get(name);
  if (!hook) {
    throw Error("no hook found for name: " + name);
  }
  if (!hook.tocSearchAdapter) {
    throw Error("expected hook with tocSearchAdapter");
  }
  return searchForToc(item, hook.tocSearchAdapter);
}

export async function searchForToc(item: TocSearchMedium, searcher: TocSearchScraper): Promise<TocResult> {
  const link = searcher.link;
  if (!link) {
    throw Error("TocSearcher of mediumType: " + item.medium + " has no link");
  }

  const pageInfoKey = "search" + item.mediumId;
  const result = await storage.getPageInfo(link, pageInfoKey);
  const dates = result.values.map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getDate()));
  const maxDate = maxValue(dates);

  if (maxDate && maxDate.toDateString() === new Date().toDateString()) {
    // don't search on the same page the same medium twice in a day
    return { tocs: [] };
  }
  let newToc: Optional<Toc>;
  try {
    newToc = await searcher(item);
  } finally {
    await storage.updatePageInfo(link, pageInfoKey, [new Date().toDateString()], result.values);
  }
  const tocs = [];

  if (newToc) {
    newToc.mediumId = item.mediumId;
    tocs.push(newToc);
  }
  return { tocs };
}

function searchTocJob(id: number, tocSearch?: TocSearchMedium, availableTocs?: string[]): JobRequest[] {
  const consumed: RegExp[] = [];

  if (availableTocs) {
    for (const availableToc of availableTocs) {
      for (const entry of tocScraper.entries()) {
        const [reg] = entry;

        if (!consumed.includes(reg) && reg.test(availableToc)) {
          consumed.push(reg);
          break;
        }
      }
    }
  }

  const searchJobs: JobRequest[] = [];
  if (tocSearch) {
    for (const entry of tocDiscovery.entries()) {
      const [reg, searcher] = entry;
      let searchFound = false;

      if (tocSearch.hosts) {
        for (const link of tocSearch.hosts) {
          if (!consumed.includes(reg) && reg.test(link)) {
            searchFound = true;
            consumed.push(reg);
            break;
          }
        }
      }
      if (!searchFound && (!hasMediaType(searcher.medium, tocSearch.medium) || !searcher.blindSearch)) {
        continue;
      }
      searchJobs.push({
        name: `${searcher.hookName}-${ScrapeName.searchForToc}-${tocSearch.mediumId}`,
        interval: -1,
        arguments: JSON.stringify([searcher.hookName, tocSearch]),
        type: ScrapeName.searchForToc,
        deleteAfterRun: true,
        runImmediately: false,
      });
    }
  }
  if (!searchJobs.length) {
    logger.info(`did not find anything for: ${id} of ${JSON.stringify(tocSearch)}`);
    return [];
  }
  for (let i = 0; i < searchJobs.length; i++) {
    const job = searchJobs[i];

    if (i === 0) {
      job.runImmediately = true;
      continue;
    }
    job.runAfter = searchJobs[i - 1];
  }
  return searchJobs;
}

export const checkTocsJob = async (): Promise<JobRequest[]> => {
  const mediaTocs = await mediumStorage.getAllMediaTocs();
  const tocSearchMedia = await mediumStorage.getTocSearchMedia();
  const mediaWithTocs: Map<number, string[]> = new Map();

  const mediaWithoutTocs = mediaTocs
    .filter((value) => {
      if (value.link) {
        let links = mediaWithTocs.get(value.id);

        if (!links) {
          mediaWithTocs.set(value.id, (links = []));
        }
        links.push(value.link);
        return false;
      }
      return true;
    })
    .map((value) => value.id);

  const newJobs1: JobRequest[] = mediaWithoutTocs
    .map((id) => {
      return searchTocJob(
        id,
        tocSearchMedia.find((value) => value.mediumId === id),
      );
    })
    .flat(2);

  const hooks = [...nameHookMap.values()];
  const promises = [...mediaWithTocs.entries()]
    .map(async (value) => {
      const mediumId = value[0];
      const indices = await episodeStorage.getChapterIndices(mediumId);

      const maxIndex = maxValue(indices);
      const mediumTocs = value[1];
      if (!maxIndex || indices.length < maxIndex) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
      let missingChapters;
      for (let i = 1; i < maxIndex; i++) {
        if (!indices.includes(i)) {
          missingChapters = true;
          break;
        }
      }
      if (missingChapters) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
      if (mediumTocs.some((mediumToc) => hooks.every((hook) => !hook.domainReg || !hook.domainReg.test(mediumToc)))) {
        return searchTocJob(
          mediumId,
          tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
          mediumTocs,
        );
      }
    })
    .flat(2);
  const newJobs2: Array<Optional<JobRequest[]>> = await Promise.all(promises);
  return (
    [newJobs1, newJobs2]
      // flaten to one dimensional array
      .flat(3)
      // filter undefined values
      .filter((value) => value) as JobRequest[]
  );
};
export const queueTocsJob = async (): Promise<JobRequest[]> => {
  // TODO: 02.09.2019 a perfect candidate to use stream on
  const tocs = await mediumStorage.getAllTocs();
  return tocs.map(
    (value): JobRequest => {
      return {
        runImmediately: true,
        arguments: JSON.stringify({ mediumId: value.mediumId, url: value.link } as TocRequest),
        type: ScrapeName.toc,
        name: `${ScrapeName.toc}-${value.mediumId}-${value.link}`,
        interval: MilliTime.HOUR,
        deleteAfterRun: false,
      };
    },
  );
};
export const queueTocs = async (): EmptyPromise => {
  await storage.queueNewTocs();
};

export const oneTimeToc = async ({ url: link, uuid, mediumId, lastRequest }: TocRequest): Promise<TocResult> => {
  logger.info("scraping one time toc: " + link);
  const path = url.parse(link).path;

  if (!path) {
    throw new UrlError(`malformed url: '${link}'`, link);
  }
  let allTocPromise: Optional<Promise<Toc[]>>;

  for (const entry of tocScraper.entries()) {
    const regExp = entry[0];

    if (regExp.test(link)) {
      const scraper: TocScraper = entry[1];
      allTocPromise = scraper(link);
      break;
    }
  }

  if (!allTocPromise) {
    // TODO use the default scraper here, after creating it
    logger.warn(`no scraper found for: '${link}'`);
    return { tocs: [], uuid };
  }

  let allTocs: Toc[];
  try {
    allTocs = await allTocPromise;
  } catch (e) {
    if (e && e.statusCode === 404) {
      throw new MissingResourceError("missing toc resource: " + link, link);
    } else {
      throw e;
    }
  }

  if (!allTocs.length) {
    logger.warn(`no tocs found on: '${link}'`);
    return { tocs: [], uuid };
  }
  if (mediumId && allTocs.length === 1) {
    allTocs[0].mediumId = mediumId;
  }
  logger.info("toc scraped successfully: " + link);
  const today = new Date().toDateString();
  if (lastRequest && lastRequest.toDateString() === today) {
    for (const tocResult of allTocs) {
      for (const tocContent of tocResult.content) {
        if (isTocPart(tocContent)) {
          for (const episode of tocContent.episodes) {
            if (episode.noTime && episode.releaseDate && episode.releaseDate.toDateString() === today) {
              episode.releaseDate = lastRequest;
            }
          }
        } else {
          const episode = tocContent as TocEpisode;
          if (episode.noTime && episode.releaseDate && episode.releaseDate.toDateString() === today) {
            episode.releaseDate = lastRequest;
          }
        }
      }
    }
  }
  return { tocs: allTocs, uuid };
};

export const news = async (link: string): Promise<{ link: string; result: News[] }> => {
  return {
    link,
    result: [],
  };
  // TODO implement news scraping (from home, updates pages etc. which require page analyzing, NOT feed or adapter)
};

export const toc = async (value: TocRequest): Promise<TocResult> => {
  const result = await oneTimeToc(value);
  if (!result.tocs.length) {
    throw Error("could not find toc for: " + JSON.stringify(value));
  }
  // TODO implement toc scraping which requires page analyzing
  return {
    tocs: result.tocs,
    uuid: value.uuid,
  };
};

/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export const list = async (value: { info: string; uuid: Uuid }): Promise<ExternalListResult> => {
  // TODO: 10.03.2020 for now list scrape novelupdates only, later it should take listtype as an argument
  const manager = factory(ListType.NOVELUPDATES, value.info);
  try {
    const lists = await manager.scrapeLists();
    const listsPromise: EmptyPromise = Promise.all(
      lists.lists.map(async (scrapedList) => (scrapedList.link = await checkLink(scrapedList.link, scrapedList.name))),
    ).then(ignore);

    const feedLinksPromise: Promise<string[]> = Promise.all(lists.feed.map((feedLink) => checkLink(feedLink)));

    const mediaPromise = Promise.all(
      lists.media.map(async (medium) => {
        const titleLinkPromise: Promise<string> = checkLink(medium.title.link, medium.title.text);

        let currentLinkPromise: Promise<string> | null;
        if ("link" in medium.current && medium.current.link) {
          currentLinkPromise = checkLink(medium.current.link, medium.current.text);
        } else {
          currentLinkPromise = null;
        }
        let latestLinkPromise: Promise<string> | null;
        if ("link" in medium.latest && medium.latest.link) {
          latestLinkPromise = checkLink(medium.latest.link, medium.latest.text);
        } else {
          latestLinkPromise = null;
        }

        medium.title.link = await titleLinkPromise;
        if ("link" in medium.current && currentLinkPromise) {
          medium.current.link = await currentLinkPromise;
        }
        if ("link" in medium.latest && latestLinkPromise) {
          medium.latest.link = await latestLinkPromise;
        }
      }),
    ).then(ignore);

    await listsPromise;
    await mediaPromise;
    lists.feed = await feedLinksPromise;
    return {
      external: {
        type: ListType.NOVELUPDATES,
        // TODO: add useruuid here
        userUuid: "",
        cookies: value.info,
        uuid: value.uuid,
      },
      lists,
    };
  } catch (e) {
    return Promise.reject({ ...value, error: e });
  }
};

export const feed = async (feedLink: string): Promise<NewsResult> => {
  logger.info(`scraping feed: ${feedLink}`);
  const startTime = Date.now();
  // noinspection JSValidateTypes
  return feedParserPromised
    .parse(feedLink)
    .then((items) =>
      Promise.all(
        items.map((value) => {
          return checkLink(value.link, value.title).then((link) => {
            return {
              title: value.title,
              link,
              // FIXME does this seem right?, current date as fallback?
              date: value.pubdate || value.date || new Date(),
            };
          });
        }),
      ),
    )
    .then((value) => {
      const duration = Date.now() - startTime;
      logger.info(`scraping feed: ${feedLink} took ${duration} ms`);
      return {
        link: feedLink,
        rawNews: value,
      };
    })
    .catch((error) => Promise.reject({ feed: feedLink, error }));
};

export function checkTocContent(content: TocContent, allowMinusOne = false): void {
  if (!content) {
    throw Error("empty toc content");
  }

  const index = content.combiIndex;
  if (index == null || (index < 0 && (index !== -1 || !allowMinusOne))) {
    throw Error("invalid toc content, combiIndex invalid: '" + index + "'");
  }

  const totalIndex = content.totalIndex;
  if (
    totalIndex == null ||
    !Number.isInteger(totalIndex) ||
    (totalIndex < 0 && (totalIndex !== -1 || !allowMinusOne))
  ) {
    throw Error(`invalid toc content, totalIndex invalid: '${totalIndex}' of ${index}`);
  }
  const partialIndex = content.partialIndex;
  if (partialIndex != null && (partialIndex < 0 || !Number.isInteger(partialIndex))) {
    throw Error(`invalid toc content, partialIndex invalid: '${partialIndex}' of ${index}`);
  }
}

// TODO: 21.06.2019 save cache in database?
const cache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
const errorCache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });

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
  private readonly eventMap: Map<string, Array<(value: any) => void | EmptyPromise>> = new Map();

  public get redirects(): RegExp[] {
    return redirects;
  }

  public get tocScraper(): Map<RegExp, TocScraper> {
    return tocScraper;
  }

  public get episodeDownloader(): Map<RegExp, ContentDownloader> {
    return episodeDownloader;
  }

  public get tocDiscovery(): Map<RegExp, TocSearchScraper> {
    return tocDiscovery;
  }

  public get newsAdapter(): NewsScraper[] {
    return newsAdapter;
  }

  public on(event: string, callback: (value: any) => void | EmptyPromise): void {
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
    this.registerHooks(getListManagerHooks());
    this.registerHooks(directScraper.getHooks());
  }

  public getHook(name: string): Hook {
    const hook = nameHookMap.get(name);
    if (!hook) {
      throw Error(`there is no hook with name: '${name}'`);
    }
    return hook;
  }

  private registerHooks(hook: Hook[] | Hook): void {
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
      // TODO: 20.07.2019 check why it should be added to the public ones,
      //  or make the getter for these access the public ones?
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
}

let hookRegistered = false;

export function checkHooks(): void {
  if (!hookRegistered) {
    registerHooks(directScraper.getHooks());
    hookRegistered = true;
  }
}

export async function search(title: string, medium: number): Promise<SearchResult[]> {
  checkHooks();
  const promises: Array<Promise<SearchResult[]>> = [];
  for (const searcher of searchAdapter) {
    // check if wanted medium and defined medium overlap
    if (searcher.medium & medium) {
      promises.push(searcher(title, medium));
    }
  }
  const results = await Promise.allSettled(promises);
  return (results
    .flat(1)
    .map((value) => {
      if (value.status === "fulfilled") {
        return value.value;
      }
      logger.error(value.reason);
      return null;
    })
    .filter((value) => value) as unknown) as SearchResult[];
}

export async function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]> {
  checkHooks();
  const entries = [...episodeDownloader.entries()];

  const downloadContents: Map<number, DownloadContent> = new Map();

  for (const episode of episodes) {
    const indexKey = combiIndex(episode);

    if (!episode.releases.length) {
      downloadContents.set(indexKey, {
        episodeId: episode.id,
        title: "",
        content: [],
      });
      logger.warn(`no releases available for episodeId: ${episode.id} with ${episode.releases.length} Releases`);
      continue;
    }
    const downloadValue = downloadContents.get(indexKey);

    if (downloadValue && downloadValue.content.length) {
      logger.warn(`downloaded episode with index: ${indexKey} and id ${episode.id} already`);
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
        if (e instanceof MissingResourceError || (e.statusCode && (e.statusCode === 410 || e.statusCode === 404))) {
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
    if (!downloadedContent || !downloadedContent.length) {
      downloadContents.set(indexKey, {
        episodeId: episode.id,
        title: "",
        content: [],
      });
      logger.warn(`nothing downloaded for episodeId: ${episode.id}`);
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
          logger.warn(`could not find any episode for downloaded content '${episodeContent.episodeTitle}'`);
        }
      }
    }
  }
  return [...downloadContents.values()];
}

function checkLinkWithInternet(link: string): Promise<FullResponse> {
  return new Promise((resolve, reject) => {
    request
      .head(link)
      .on("response", (res) => {
        // noinspection TypeScriptValidateJSTypes
        if (res.caseless.get("server") === "cloudflare") {
          resolve(queueFastRequestFullResponse(link));
        } else {
          resolve(res);
        }
      })
      .on("error", reject)
      .end();
  });
}

function checkLink(link: string, linkKey?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!redirects.some((value) => value.test(link))) {
      resolve(link);
      return;
    }
    if (linkKey) {
      const value: Optional<any> = cache.get(linkKey);

      if (value && value.redirect && value.followed && value.redirect === link) {
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
        if (reason && reason.statusCode && reason.statusCode === 404) {
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

function registerHooks(hook: Hook[] | Hook) {
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

export async function remapMediaParts(): EmptyPromise {
  const mediaIds = await mediumStorage.getAllMedia();
  await Promise.all(mediaIds.map((mediumId) => remapMediumPart(mediumId)));
}

export async function queueExternalUser(): Promise<JobRequest[]> {
  // eslint-disable-next-line prefer-rest-params
  console.log("queueing all external user", arguments);
  const externalUser: ExternalUser[] = await externalUserStorage.getScrapeExternalUser();

  const promises: Array<Promise<[boolean, ExternalUser]>> = [];
  for (const user of externalUser) {
    const listManager = factory(user.type, user.cookies == null ? undefined : user.cookies);
    promises.push(
      listManager.test(user.identifier).then((value: boolean) => {
        user.cookies = listManager.stringifyCookies();
        return [value, user];
      }),
    );
  }
  const results: Array<[boolean, ExternalUser]> = await Promise.all(promises);

  return results
    .filter((value) => value[0])
    .map((value) => value[1])
    .map(
      (value): JobRequest => {
        return {
          type: ScrapeName.oneTimeUser,
          interval: -1,
          deleteAfterRun: true,
          runImmediately: true,
          name: `${ScrapeName.oneTimeUser}-${value.uuid}`,
          arguments: JSON.stringify({
            uuid: value.uuid,
            info: value.cookies,
          }),
        };
      },
    );
}

export async function remapMediumPart(mediumId: number): EmptyPromise {
  const parts = await partStorage.getMediumPartIds(mediumId);

  const standardPartId = await partStorage.getStandardPartId(mediumId);

  // if there is no standard part, we return as there is no part to move from
  if (!standardPartId) {
    await partStorage.createStandardPart(mediumId);
    return;
  }
  const nonStandardPartIds = parts.filter((value) => value !== standardPartId);
  const overLappingParts = await partStorage.getOverLappingParts(standardPartId, nonStandardPartIds);

  const promises = [];
  for (const overLappingPart of overLappingParts) {
    promises.push(episodeStorage.moveEpisodeToPart(standardPartId, overLappingPart));
  }
  await Promise.all(promises);
}
