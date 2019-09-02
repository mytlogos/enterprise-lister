import {Storage} from "../database/database";
import {factory, getListManagerHooks, ListScrapeResult} from "./listManager";
import feedParserPromised from "feedparser-promised";
import {
    addMultiSingle,
    combiIndex,
    delay,
    getElseSet,
    hasMediaType,
    ignore,
    max,
    maxValue,
    MediaType,
    multiSingle,
    removeMultiSingle
} from "../tools";
import {
    Episode,
    EpisodeNews,
    EpisodeRelease,
    JobRequest,
    LikeMedium,
    MilliTime,
    MultiSingle,
    News,
    ScrapeItem,
    ScrapeName,
    SimpleEpisode,
    TocSearchMedium
} from "../types";
import logger, {logError} from "../logger";
import {
    ContentDownloader,
    Dependant,
    DownloadContent,
    EpisodeContent,
    Hook,
    NewsScraper,
    OneTimeEmittableJob,
    ScraperJob,
    ScrapeType,
    Toc,
    TocContent,
    TocRequest,
    TocResult,
    TocScraper,
    TocSearchScraper
} from "./types";
import * as directScraper from "./direct/directScraper";
import * as url from "url";
import {Cache} from "../cache";
import * as validate from "validate.js";
import request from "request";
import {FullResponse} from "cloudscraper";
import {queueFastRequestFullResponse} from "./queueManager";
import {Counter} from "../counter";
import env from "../env";
import {sourceType} from "./direct/undergroundScraper";

// scrape at an interval of 5 min
const interval = 5 * 60 * 1000;

// this one is every 10s
// let interval = 10000;
let paused = true;
const redirects: RegExp[] = [];
const tocScraper: Map<RegExp, TocScraper> = new Map();
const episodeDownloader: Map<RegExp, ContentDownloader> = new Map();
const tocDiscovery: Map<RegExp, TocSearchScraper> = new Map();
const newsAdapter: NewsScraper[] = [];
const nameHookMap = new Map<string, Hook>();

function activity<T>(func: (...args: any[]) => T): (...args: any) => T {
    return (...args: any): T => {
        if (!env.measure) {
            return func(args);
        }
        incActivity();

        const result = func(...args);

        // @ts-ignore
        if (result && result.then) {
            // @ts-ignore
            result.then(() => decActivity());
        } else {
            decActivity();
        }
        return result;
    };
}

const counter = new Counter();

function incActivity() {
    console.log("Active:" + counter.count("scrape"));
}

function decActivity() {
    console.log("Active:" + counter.countDown("scrape"));
}

/**
 * Notifies event listener of events for each fulfilled
 * promise and calls the error listener for each rejected promise
 * for the corresponding error listener of the event.
 *
 * @param {string} key - event key
 * @param {Array<Promise<*>>} promises - promises to notify the listener if they resolve/reject
 * @return {Promise<void>} resolves if all promises are rejected or resolved
 */
function notify(key: string, promises: Array<Promise<any>>): Promise<void> {
    return new Promise((resolve) => {
        let fulfilled = 0;

        if (!promises.length) {
            resolve();
            return;
        }
        promises.forEach((promise) => {
            promise
                .then((value) => {
                    if (env.stopScrapeEvents) {
                        return;
                    }
                    const callbacks = getElseSet(eventMap, key, () => []);
                    callbacks.forEach((cb) => cb(value));
                })
                .catch((error) => {
                    if (env.stopScrapeEvents) {
                        return;
                    }
                    const callbacks = getElseSet(eventMap, key + ":error", () => []);
                    callbacks.forEach((cb) => cb(error));
                })
                .finally(() => {
                    fulfilled++;

                    if (fulfilled === promises.length) {
                        resolve();
                    }
                });
        });
        const notifyTimeOut = 60000;
        setTimeout(() => {
            if (fulfilled < promises.length) {
                logger.warn(`Key: '${key}' is taking too long (more than  ${notifyTimeOut}ms)`);
                resolve();
            }
        }, notifyTimeOut);
    });
}

/**
 * @type {string}
 */
let lastListScrape;

export const scrapeNewsJob = async (name: string): Promise<{ link: string, result: News[] }> => {
    const hook = nameHookMap.get(name);
    if (!hook) {
        throw Error("no hook found for name: " + name);
    }

    if (!hook.newsAdapter) {
        throw Error(`expected hook '${name}' to have newsAdapter`);
    }

    return scrapeNews(hook.newsAdapter);
};

export const scrapeNews = async (adapter: NewsScraper): Promise<{ link: string, result: News[] }> => {
    if (!adapter.link || !validate.isString(adapter.link)) {
        throw Error("missing link on newsScraper");
    }
    console.log(`Scraping for News with Adapter on '${adapter.link}'`);
    const rawNews = await adapter();

    if (rawNews && rawNews.episodes && rawNews.episodes.length) {
        console.log(`Scraped ${rawNews.episodes.length} Episode News on '${adapter.link}'`);
        const episodeMap: Map<string, EpisodeNews[]> = rawNews.episodes.reduce((map, currentValue) => {
            const episodeNews = getElseSet(
                map,
                currentValue.mediumTitle + "%" + currentValue.mediumType,
                () => []
            );
            episodeNews.push(currentValue);
            return map;
        }, new Map<string, EpisodeNews[]>());

        const promises = [];
        for (const value of episodeMap.values()) {
            const [newsItem] = value;
            if (!newsItem || !newsItem.mediumTitle || !newsItem.mediumType) {
                continue;
            }
            promises.push(processMediumNews(
                newsItem.mediumTitle,
                newsItem.mediumType,
                newsItem.mediumTocLink,
                rawNews.update,
                value
            ));
        }
        await Promise.all(promises);
    }
    return {
        link: adapter.link,
        result: (rawNews && rawNews.news) || [],
    };

};

async function processMediumNews(
    title: string, type: MediaType, tocLink: string | undefined, update = false, potentialNews: EpisodeNews[]
): Promise<void> {

    const likeMedia: MultiSingle<LikeMedium> = await Storage.getLikeMedium({title, type});

    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || !likeMedia.medium.id) {
        if (tocLink) {
            await Storage.addMediumInWait({title, medium: type, link: tocLink});
        }
        return;
    }
    const mediumId = likeMedia.medium.id;
    const latestReleases: SimpleEpisode[] = await Storage.getLatestReleases(mediumId);

    const latestRelease = max(latestReleases, (previous, current) => {
        const maxPreviousRelease = max(previous.releases, "releaseDate");
        const maxCurrentRelease = max(current.releases, "releaseDate");

        return ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0)
            - ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0);
    });

    let standardPart = await Storage.getStandardPart(mediumId);

    if (!standardPart) {
        standardPart = await Storage.createStandardPart(mediumId);
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
            const episodes = await Storage.getMediumEpisodePerIndex(mediumId, oldEpisodeIndices);
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
                    return Storage.addEpisode({
                        id: 0,
                        // @ts-ignore
                        partId: standardPart.id,
                        partialIndex: value.partialIndex,
                        totalIndex: value.totalIndex,
                        releases: [release]
                    }).then(() => undefined);
                }
                release.episodeId = value.id;
                return Storage.addRelease(release).then(() => undefined);
            });
            await Promise.all(promises);
        }
        if (update) {
            const sourcedReleases = await Storage.getSourcedReleases(sourceType, mediumId);
            const toUpdateReleases = oldReleases.map((value): EpisodeRelease => {
                return {
                    title: value.episodeTitle,
                    url: value.link,
                    releaseDate: value.date,
                    locked: value.locked,
                    sourceType,
                    episodeId: 0,
                };
            }).filter((value) => {
                const foundRelease = sourcedReleases.find((release) => release.title === value.title);

                if (!foundRelease) {
                    logger.warn("wanted to update an unavailable release");
                    return false;
                }
                return foundRelease.url !== value.url;
            });
            if (toUpdateReleases.length) {
                Storage.updateRelease(toUpdateReleases).catch(logError);
            }
        }
    } else {
        newEpisodeNews = potentialNews;
    }
    const newEpisodes = newEpisodeNews.map((value): SimpleEpisode => {
        return {
            totalIndex: value.episodeTotalIndex,
            partialIndex: value.episodePartialIndex,
            releases: [
                {
                    episodeId: 0,
                    releaseDate: value.date,
                    url: value.link,
                    locked: value.locked,
                    title: value.episodeTitle
                }
            ],
            id: 0,
            // @ts-ignore
            partId: standardPart.id
        };
    });

    if (newEpisodes.length) {
        await Storage.addEpisode(newEpisodes);
    }
    if (tocLink) {
        await Storage.addToc(mediumId, tocLink);
    }
}

export async function searchForTocJob(name: string, item: TocSearchMedium): Promise<TocResult> {
    console.log(`searching for toc on ${name} with ${item}`);
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
    const result = await Storage.getPageInfo(link, pageInfoKey);
    const dates = result.values.map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getDate()));
    const maxDate = maxValue(dates);

    if (maxDate && maxDate.toDateString() === new Date().toDateString()) {
        // don't search on the same page the same medium twice in a day
        return {tocs: []};
    }
    let newToc: Toc | undefined;
    try {
        newToc = await searcher(item);
    } finally {
        await Storage.updatePageInfo(link, pageInfoKey, [new Date().toDateString()], result.values);
    }
    const tocs = [];

    if (newToc) {
        newToc.mediumId = item.mediumId;
        tocs.push(newToc);
    }
    return {tocs};
}

function searchToc(id: number, tocSearch?: TocSearchMedium, availableTocs?: string[]): ScraperJob | undefined {
    const consumed: RegExp[] = [];
    const scraperJobs: ScraperJob[] = [];

    if (availableTocs) {
        for (const availableToc of availableTocs) {
            for (const entry of tocScraper.entries()) {
                const [reg, scraper] = entry;

                if (!consumed.includes(reg) && reg.test(availableToc)) {
                    /*scraperJobs.push({
                        type: "onetime_emittable",
                        key: "toc",
                        item: availableToc,
                        cb: async (item) => {
                            console.log("scraping one time: " + item);
                            const tocs = await scraper(item);
                            if (tocs) {
                                tocs.forEach((value) => value.mediumId = id);
                            }
                            return {tocs};
                        }
                    } as OneTimeEmittableJob);*/
                    consumed.push(reg);
                    break;
                }
            }
        }
    }

    const searchJobs: ScraperJob[] = [];
    if (tocSearch) {
        for (const entry of tocDiscovery.entries()) {
            const [reg, searcher] = entry;
            let search = false;

            if (tocSearch.hosts) {
                for (const link of tocSearch.hosts) {
                    if (!consumed.includes(reg) && reg.test(link)) {
                        search = true;
                        consumed.push(reg);
                        break;
                    }
                }
            }
            if (!search && (!hasMediaType(searcher.medium, tocSearch.medium) || !searcher.blindSearch)) {
                continue;
            }
            searchJobs.push({
                type: "onetime_emittable",
                key: "toc",
                item: tocSearch,
                cb: (item) => searchForToc(item, searcher)
            } as OneTimeEmittableJob);
        }
    }
    if (!searchJobs.length && !scraperJobs.length) {
        console.log("did not find anything for: " + id, tocSearch);
        return undefined;
    }
    for (let i = 0; i < searchJobs.length; i++) {
        const job = searchJobs[i];

        if (i === 0) {
            continue;
        }
        const previousJob = searchJobs[i - 1];
        previousJob.onDone = () => job;
    }
    for (let i = 0; i < scraperJobs.length; i++) {
        const job = scraperJobs[i];

        if (i === 0) {
            const lastSearchJob = searchJobs[searchJobs.length - 1];
            if (lastSearchJob) {
                lastSearchJob.onDone = () => lastSearchJob;
            }
            continue;
        }
        const previousJob = scraperJobs[i - 1];
        previousJob.onDone = () => job;
    }
    return searchJobs[0];
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
            let search = false;

            if (tocSearch.hosts) {
                for (const link of tocSearch.hosts) {
                    if (!consumed.includes(reg) && reg.test(link)) {
                        search = true;
                        consumed.push(reg);
                        break;
                    }
                }
            }
            if (!search && (!hasMediaType(searcher.medium, tocSearch.medium) || !searcher.blindSearch)) {
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
        console.log("did not find anything for: " + id, tocSearch);
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
    const mediaTocs = await Storage.getAllMediaTocs();
    const tocSearchMedia = await Storage.getTocSearchMedia();
    const mediaWithTocs: Map<number, string[]> = new Map();

    const mediaWithoutTocs = mediaTocs
        .filter((value) => {
            if (value.link) {
                let links = mediaWithTocs.get(value.id);

                if (!links) {
                    mediaWithTocs.set(value.id, links = []);
                }
                links.push(value.link);
                return false;
            }
            return true;
        })
        .map((value) => value.id);

    const newJobs1: JobRequest[] = mediaWithoutTocs.map((id) => {
        return searchTocJob(id, tocSearchMedia.find((value) => value.mediumId === id));
    }).flat(2) as JobRequest[];

    const promises = [...mediaWithTocs.entries()].map(async (value) => {
        const mediumId = value[0];
        const indices = await Storage.getChapterIndices(mediumId);
        const maxIndex = maxValue(indices);

        if (!maxIndex || indices.length < maxIndex) {
            return searchTocJob(
                mediumId,
                tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
                value[1]
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
                value[1]
            );
        }
    }).flat(2);
    const newJobs2: JobRequest[] = await Promise.all(promises);
    return [newJobs1, newJobs2].flat(3).filter((value) => value);
};
export const checkTocs = async (): Promise<ScraperJob[]> => {
    const mediaTocs = await Storage.getAllMediaTocs();
    const tocSearchMedia = await Storage.getTocSearchMedia();
    const mediaWithTocs: Map<number, string[]> = new Map();

    const mediaWithoutTocs = mediaTocs
        .filter((value) => {
            if (value.link) {
                let links = mediaWithTocs.get(value.id);

                if (!links) {
                    mediaWithTocs.set(value.id, links = []);
                }
                links.push(value.link);
                return false;
            }
            return true;
        })
        .map((value) => value.id);

    const newScraperJobs1: ScraperJob[] = mediaWithoutTocs.map((id) => {
        return searchToc(id, tocSearchMedia.find((value) => value.mediumId === id));
    }).filter((value) => value) as ScraperJob[];

    const promises = [...mediaWithTocs.entries()].map(async (value) => {
        const mediumId = value[0];
        const indices = await Storage.getChapterIndices(mediumId);
        const maxIndex = maxValue(indices);

        if (!maxIndex || indices.length < maxIndex) {
            return searchToc(
                mediumId,
                tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
                value[1]
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
            return searchToc(
                mediumId,
                tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId),
                value[1]
            );
        }
    });
    const newScraperJobs2: Array<ScraperJob | undefined> = await Promise.all(promises);
    const jobs: ScraperJob[] = [newScraperJobs1, newScraperJobs2].flat(3);
    return jobs.filter((value) => value);
};

export const queueTocsJob = async (): Promise<JobRequest[]> => {
    // TODO: 02.09.2019 a perfect candidate to use stream on
    const tocs = await Storage.getAllTocs();
    return tocs.map((value): JobRequest => {
        return {
            runImmediately: true,
            arguments: JSON.stringify({mediumId: value.id, url: value.link} as TocRequest),
            type: ScrapeName.toc,
            name: `${ScrapeName.toc}-${value.id}-${value.link}`,
            interval: MilliTime.HOUR,
            deleteAfterRun: false,
        };
    });
};
export const queueTocs = async (): Promise<void> => {
    await Storage.queueNewTocs();
};

export const oneTimeToc = async ({url: link, uuid, mediumId}: TocRequest)
    : Promise<{ tocs: Toc[], uuid?: string; }> => {
    console.log("scraping one time toc: " + link);
    const path = url.parse(link).path;

    if (!path) {
        logger.warn(`malformed url: '${link}'`);
        return {tocs: [], uuid};
    }
    let allTocPromise: Promise<Toc[]> | undefined;

    for (const entry of tocScraper.entries()) {
        const regExp = entry[0];

        if (regExp.test(link)) {
            const scraper: TocScraper = entry[1];
            allTocPromise = scraper(link);
            break;
        }
    }

    if (!allTocPromise) {
        // todo use the default scraper here, after creating it
        logger.warn(`no scraper found for: '${link}'`);
        return {tocs: [], uuid};
    }

    const allTocs: Toc[] = await allTocPromise;

    if (!allTocs.length) {
        logger.warn(`no tocs found on: '${link}'`);
        return {tocs: [], uuid};
    }
    if (mediumId && allTocs.length === 1) {
        allTocs[0].mediumId = mediumId;
    }
    console.log("toc scraped: " + link);
    return {tocs: allTocs, uuid};
};

export let news = async (scrapeItem: ScrapeItem): Promise<{ link: string, result: News[] }> => {
    return {
        link: scrapeItem.link,
        result: [],
    };
    // todo implement news scraping (from homepage, updates pages etc. which require page analyzing, NOT feed)
};

export const toc = async (value: TocRequest): Promise<TocResult> => {
    const result = await oneTimeToc(value);
    if (!result.tocs.length) {
        throw Error("could not find toc for: " + value);
    }
    // todo implement toc scraping which requires page analyzing
    return {
        tocs: result.tocs,
        uuid: value.uuid
    };
};

/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export const list = async (value: { cookies: string, uuid: string; })
    : Promise<{ external: { cookies: string, uuid: string }, lists: ListScrapeResult; }> => {

    const manager = factory(0, value.cookies);
    try {
        const lists = await manager.scrapeLists();
        const listsPromise: Promise<void> = Promise.all(lists.lists.map(
            async (scrapedList) => scrapedList.link = await checkLink(scrapedList.link, scrapedList.name))
        ).then(ignore);

        const feedLinksPromise: Promise<string[]> = Promise.all(lists.feed.map((feedLink) => checkLink(feedLink)));

        const mediaPromise = Promise.all(lists.media.map(async (medium) => {
            const titleLinkPromise: Promise<string> = checkLink(medium.title.link, medium.title.text);
            const currentLinkPromise: Promise<string> = checkLink(medium.current.link, medium.current.text);
            const latestLinkPromise: Promise<string> = checkLink(medium.latest.link, medium.latest.text);

            medium.title.link = await titleLinkPromise;
            medium.current.link = await currentLinkPromise;
            medium.latest.link = await latestLinkPromise;
        })).then(ignore);

        await listsPromise;
        await mediaPromise;
        lists.feed = await feedLinksPromise;
        return {external: value, lists};
    } catch (e) {
        // noinspection ES6MissingAwait
        return Promise.reject({...value, error: e});
    }
};

export const feed = async (feedLink: string): Promise<{ link: string, result: News[] }> => {
    console.log("scraping feed: ", feedLink);
    const startTime = Date.now();
    // noinspection JSValidateTypes
    return feedParserPromised.parse(feedLink)
        .then((items) => Promise.all(items.map((value) => {
            return checkLink(value.link, value.title).then((link) => {
                return {
                    title: value.title,
                    link,
                    // fixme does this seem right?, current date as fallback?
                    date: value.pubdate || value.date || new Date(),
                };
            });
        })))
        .then((value) => {
            const duration = Date.now() - startTime;
            console.log(`scraping feed: ${feedLink} took ${duration} ms`);
            return {
                link: feedLink,
                result: value
            };
        })
        .catch((error) => Promise.reject({feed: feedLink, error}));
};

export function checkTocContent(content: TocContent, allowMinusOne = false) {
    if (!content) {
        throw Error("empty toc content");
    }

    const index = content.combiIndex;
    if (index == null || (index < 0 && (index !== -1 || !allowMinusOne))) {
        throw Error("invalid toc content, combiIndex invalid");
    }

    const totalIndex = content.totalIndex;
    if (totalIndex == null
        || !Number.isInteger(totalIndex)
        || (totalIndex < 0 && (totalIndex !== -1 || !allowMinusOne))) {
        throw Error("invalid toc content, totalIndex invalid");
    }
    const partialIndex = content.partialIndex;
    if (partialIndex != null && (partialIndex < 0 || !Number.isInteger(partialIndex))) {
        throw Error("invalid toc content, partialIndex invalid");
    }
}

/**
 * Scrape everything for one cycle, wait for a specified interval and scrape again.
 * Output is send per event listener.
 */
async function scrape(dependants = scrapeDependants, next = true): Promise<void> {
    if (paused) {
        return;
    }

    const startTime = Date.now();

    const tocFinished: Promise<void> = notify("toc", dependants.tocs.map((value) => toc(value)));
    const newsFinished: Promise<void> = notify("news", dependants.news.map((value) => news(value)));
    const feedFinished: Promise<void> = notify("feed", dependants.feeds.map((value) => feed(value)));
    const newsAdapterFinished: Promise<void> = notify("news", newsAdapter.map((adapter) => scrapeNews(adapter)));
    const oneTimeTocFinished: Promise<void> = notify("toc", dependants.oneTimeTocs.map((value) => oneTimeToc(value)))
        .then(() => {
            dependants.oneTimeTocs.length = 0;
        });
    const newUserFinished = notify("list", dependants.oneTimeUser.map((value) => list(value)))
        .then(() => {
            dependants.oneTimeUser.length = 0;
        });
    const checkTocsFinished = checkTocs().then(() => undefined);

    const allPromises: Array<Promise<void>> = [
        tocFinished,
        newsFinished,
        newsAdapterFinished,
        feedFinished,
        newUserFinished,
        oneTimeTocFinished,
        checkTocsFinished,
    ];

    const today = new Date();
    const todayString = today.toDateString();

    // every monday scan every available external user, if not scanned on same day
    const externals = await Storage.getScrapeExternalUser();

    const listFinished: Promise<void> = notify("list", externals.map((value) => list(value)));
    allPromises.push(listFinished);
    // save current run for users for this monday, so that it does not scan again today
    lastListScrape = todayString;

    // start next scrape cycle after all scrape parts are finished, regardless of errors or not
    await Promise.all(allPromises);

    const duration = Date.now() - startTime;
    logger.info(`Scrape Cycle took ${duration} ms`);

    if (next) {
        setTimeout(() => scrape().catch((error) => {
            console.log(error);
            logger.error(error);
        }), interval);
    }
}

// TODO: 21.06.2019 save cache in database?
const cache = new Cache({size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2});
const errorCache = new Cache({size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2});

export interface ListScrapeEvent {
    external: { cookies: string, uuid: string, userUuid: string, type: number };
    lists: ListScrapeResult;
}

export enum ScrapeEvent {
    TOC = "toc",
    FEED = "feed",
    NEWS = "news",
    LIST = "list",
}

export enum ScrapeErrorEvent {
    TOC = "toc:error",
    FEED = "feed:error",
    NEWS = "news:error",
    LIST = "list:error",
}

export interface Scraper {
    addDependant(dependant: Dependant): void;

    removeDependant(dependant: Dependant): void;

    setup(): Promise<void>;

    start(): void;

    stop(): void;

    pause(): void;

    on(event: ScrapeEvent.TOC, callback: (value: { uuid?: string, toc: Toc[] }) => void): void;

    on(event: ScrapeEvent.FEED | ScrapeEvent.NEWS, callback: (value: { link: string, result: News[] }) => void): void;

    on(event: ScrapeEvent.LIST, callback: (value: ListScrapeEvent) => void): void;

// TODO: 23.06.2019 make error events more distinguishable
    on(event: ScrapeErrorEvent.TOC, callback: (errorValue: any) => void): void;

    on(event: ScrapeErrorEvent.FEED, callback: (errorValue: any) => void): void;

    on(event: ScrapeErrorEvent.NEWS, callback: (errorValue: any) => void): void;

    on(event: ScrapeErrorEvent.LIST, callback: (errorValue: any) => void): void;

    on(event: string, callback: (value: any) => void): void;
}

const eventMap: Map<string, Array<(value: any) => void>> = new Map();

export interface ScrapeDependants {
    news: ScrapeItem[];
    oneTimeUser: Array<{ cookies: string, uuid: string }>;
    oneTimeTocs: TocRequest[];
    feeds: string[];
    tocs: TocRequest[];
}

let scrapeDependants: ScrapeDependants;

/**
 *
 * @return {Promise<void>}
 */
export async function setup() {
    const scrapeBoard = await Storage.getScrapes();

    const dependants: ScrapeDependants = {feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: []};

    scrapeBoard.forEach((value) => {
        if (value.type === ScrapeType.NEWS) {
            dependants.news.push(value);
        } else if (value.type === ScrapeType.FEED) {
            dependants.feeds.push(value.link);
        } else if (value.type === ScrapeType.TOC) {
            dependants.tocs.push({mediumId: value.mediumId, url: value.link, uuid: value.userId});
        }
    });

    scrapeDependants = dependants;
}

export class ScraperHelper {
    public readonly redirects: RegExp[] = [];
    public readonly tocScraper: Map<RegExp, TocScraper> = new Map();
    public readonly episodeDownloader: Map<RegExp, ContentDownloader> = new Map();
    public readonly tocDiscovery: Map<RegExp, TocSearchScraper> = new Map();
    public readonly newsAdapter: NewsScraper[] = [];
    private readonly eventMap: Map<string, Array<(value: any) => void>> = new Map();
    private readonly nameHookMap = new Map<string, Hook>();

    public on(event: string, callback: (value: any) => void) {
        const callbacks = getElseSet(this.eventMap, event, () => []);
        callbacks.push(callback);
    }

    public emit(event: string, value: any): void {
        if (env.stopScrapeEvents) {
            console.log("not emitting events");
            return;
        }
        const callbacks = getElseSet(this.eventMap, event, () => []);
        callbacks.forEach((cb) => cb(value));
    }

    public init(): void {
        this.registerHooks(getListManagerHooks());
        this.registerHooks(directScraper.getHooks());
    }

    public getHook(name: string): Hook {
        const hook = this.nameHookMap.get(name);
        if (!hook) {
            throw Error(`there is no hook with name: '${name}'`);
        }
        return hook;
    }

    private registerHooks(hook: Hook[] | Hook): void {
        // @ts-ignore
        multiSingle(hook, (value: Hook) => {
            if (!value.name) {
                throw Error("hook without name!");
            }
            if (this.nameHookMap.has(value.name)) {
                throw Error(`encountered hook with name '${value.name}' twice`);
            }
            this.nameHookMap.set(value.name, value);
            nameHookMap.set(value.name, value);

            if (value.redirectReg) {
                redirects.push(value.redirectReg);
            }
            // TODO: 20.07.2019 check why it should be added to the public ones,
            //  or make the getter for these access the public ones?
            if (value.newsAdapter) {
                value.newsAdapter.hookName = value.name;
                newsAdapter.push(value.newsAdapter);
                this.newsAdapter.push(value.newsAdapter);
            }
            if (value.domainReg) {
                if (value.tocAdapter) {
                    value.tocAdapter.hookName = value.name;
                    tocScraper.set(value.domainReg, value.tocAdapter);
                    this.tocScraper.set(value.domainReg, value.tocAdapter);
                }

                if (value.contentDownloadAdapter) {
                    value.contentDownloadAdapter.hookName = value.name;
                    episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
                    this.episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
                }

                if (value.tocSearchAdapter) {
                    value.tocSearchAdapter.hookName = value.name;
                    tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
                    this.tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
                }
            }
            if (value.tocPattern && value.tocSearchAdapter) {
                value.tocSearchAdapter.hookName = value.name;
                tocDiscovery.set(value.tocPattern, value.tocSearchAdapter);
                this.tocDiscovery.set(value.tocPattern, value.tocSearchAdapter);
            }
        });
    }
}

export function addDependant(dependant: Dependant) {
    const dependants = {feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: [], media: []};

    // @ts-ignore
    addMultiSingle(dependants.oneTimeUser, dependant.oneTimeUser);
    // @ts-ignore
    addMultiSingle(dependants.oneTimeTocs, dependant.oneTimeToc);
    // @ts-ignore
    addMultiSingle(dependants.feeds, dependant.feed);
    addMultiSingle(dependants.news, dependant.news);
    addMultiSingle(dependants.tocs, dependant.toc);

    // kick of a cycle and if no error occurs: add it to permanent cycle
    delay(100)
        .then(() => scrape(dependants, false))
        .then(() => {
            // @ts-ignore
            // addMultiSingle(scrapeDependants.oneTimeUser, dependant.oneTimeUser);
            // @ts-ignore
            addMultiSingle(scrapeDependants.feeds, dependant.feed);
            addMultiSingle(scrapeDependants.news, dependant.news);
            addMultiSingle(scrapeDependants.tocs, dependant.toc);
        })
        .catch((error) => {
            console.log(error);
            logger.error(error);
        });
}

let hookRegistered = false;

export async function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]> {
    if (!episodeDownloader.size && !hookRegistered) {
        registerHooks(directScraper.getHooks());
        hookRegistered = true;
    }
    const entries = [...episodeDownloader.entries()];

    const downloadContents: Map<number, DownloadContent> = new Map();

    for (const episode of episodes) {
        const indexKey = combiIndex(episode);

        if (!episode.releases.length) {
            downloadContents.set(indexKey, {
                episodeId: episode.id,
                title: "",
                content: []
            });
            logger.warn(`no releases available for episodeId: ${episode.id} with ${episode.releases.length} Releases`);
            continue;
        }
        const downloadValue = downloadContents.get(indexKey);

        if (downloadValue && downloadValue.content.length) {
            logger.warn(`downloaded episode with index: ${indexKey} and id ${episode.id} already`);
            continue;
        }
        let downloadedContent: EpisodeContent[] | undefined;
        let releaseIndex = 0;
        let downloaderIndex = 0;

        while (!downloadedContent && releaseIndex !== episode.releases.length) {
            let downloaderEntry: [RegExp, ContentDownloader] | undefined;

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
                if (e.statusCode && (e.statusCode === 410 || e.statusCode === 404)) {
                    Storage.deleteRelease(release).catch(logError);
                } else {
                    logError(e);
                }
                downloaderIndex = 0;
                releaseIndex++;
                continue;
            }

            episodeContents = episodeContents.filter((value) => {
                if (value.locked && value.index === combiIndex(episode)) {
                    release.locked = true;
                    Storage.updateRelease(release).catch(logError);
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
                content: []
            });
            logger.warn(`nothing downloaded for episodeId: ${episode.id}`);
        } else if (downloadedContent.length === 1) {
            const episodeContent = downloadedContent[0];
            downloadContents.set(indexKey, {
                title: episodeContent.episodeTitle,
                content: episodeContent.content,
                episodeId: episode.id
            });
        } else {
            for (const episodeContent of downloadedContent) {
                const foundEpisode = episodes.find(
                    (value) =>
                        value.releases.find(
                            (release) => (release.title === episodeContent.episodeTitle)
                                || (combiIndex(value) === episodeContent.index)
                        )
                        != null
                );
                if (foundEpisode) {
                    downloadContents.set(indexKey, {
                        title: episodeContent.episodeTitle,
                        content: episodeContent.content,
                        episodeId: foundEpisode.id
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
            const value: any | undefined = cache.get(linkKey);

            if (value && value.redirect && value.followed && value.redirect === link) {
                // refresh this entry, due to hit
                cache.ttl(linkKey);
                resolve(value.followed);
                return;
            }
            // i dont want the same error message again and again
            // if it occurs once it is highly likely it will come again, so just resolve with empty string
            const errorValue: any | undefined = errorCache.get(linkKey);

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
                    cache.set(linkKey, {redirect: link, followed: href});
                }

                resolve(href);
            })
            .catch((reason) => {
                if (reason && reason.statusCode && reason.statusCode === 404) {
                    // todo if resource does not exist what to do?
                    if (linkKey) {
                        cache.set(linkKey, {redirect: link, followed: ""});
                    }
                    resolve("");
                    return;
                }
                if (linkKey) {
                    const value: any | undefined = errorCache.get(linkKey);

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
 *
 * @param {Dependant} dependant
 */
export function remove(dependant: Dependant) {
    // @ts-ignore
    removeMultiSingle(scrapeDependants.oneTimeUser, dependant.oneTimeUser);
    // @ts-ignore
    removeMultiSingle(scrapeDependants.feeds, dependant.feed);
    removeMultiSingle(scrapeDependants.news, dependant.news);
    removeMultiSingle(scrapeDependants.tocs, dependant.toc);
}

export function registerHooks(hook: Hook[] | Hook) {
    // @ts-ignore
    multiSingle(hook, (value: Hook) => {
        if (value.redirectReg) {
            redirects.push(value.redirectReg);
        }
        if (value.newsAdapter) {
            newsAdapter.push(value.newsAdapter);
        }
        if (value.domainReg) {
            if (value.tocAdapter) {
                tocScraper.set(value.domainReg, value.tocAdapter);
            }

            if (value.contentDownloadAdapter) {
                episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
            }

            if (value.tocSearchAdapter) {
                tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
            }
        }
    });
}

/**
 *
 */
export function pause() {
    paused = true;
}

export function initHooks() {
    registerHooks(getListManagerHooks());
    registerHooks(directScraper.getHooks());
}

/**
 *
 */
export function start() {
    paused = false;
    initHooks();
    scrape().catch((error) => {
        console.log(error);
        logger.error(error);
    });
}

export function on(event: "toc", callback: (value: { uuid?: string, tocs: Toc[] }) => void): void;
export function on(event: "feed" | "news", callback: (value: { link: string, result: News[] }) => void): void;
export function on(event: "list", callback: (value: {
    external: { cookies: string, uuid: string, userUuid: string, type: number },
    lists: ListScrapeResult;
}) => void): void;
export function on(event: "toc:error", callback: (errorValue: any) => void): void;
export function on(event: "news:error", callback: (errorValue: any) => void): void;
export function on(event: "feed:error", callback: (errorValue: any) => void): void;
export function on(event: "list:error", callback: (errorValue: any) => void): void;

export function on(event: string, callback: (value: any) => void) {
    const callbacks = getElseSet(eventMap, event, () => []);
    callbacks.push(callback);
}

export async function remapMediaParts() {
    const mediaIds = await Storage.getAllMedia();
    await Promise.all(mediaIds.map((mediumId) => remapMediumPart(mediumId)));
}

export async function queueExternalUser() {
    console.log("queueing external user");
}

export async function remapMediumPart(mediumId: number) {
    const parts = await Storage.getMediumPartIds(mediumId);

    const standardPartId = await Storage.getStandardPartId(mediumId);

    // if there is no standard part, we return as there is no part to move from
    if (!standardPartId) {
        await Storage.createStandardPart(mediumId);
        return;
    }
    const nonStandardPartIds = parts.filter((value) => value !== standardPartId);
    const overLappingParts = await Storage.getOverLappingParts(standardPartId, nonStandardPartIds);

    const promises = [];
    for (const overLappingPart of overLappingParts) {
        promises.push(Storage.moveEpisodeToPart(standardPartId, overLappingPart));
    }
    await Promise.all(promises);
    /*const standardPartEpisodeIndices = await Storage.getPartsEpisodeIndices(standardPart.id);

    const standardPartEpisodes = standardPartEpisodeIndices[0].episodes;

    if (!standardPartEpisodes.length) {
        return;
    }
    const partEpisodeIndices = await Storage.getPartsEpisodeIndices(nonStandardPartIds);
    const partEpisodesIndicesMap = new Map<number, number[]>();
    partEpisodeIndices.forEach((value) => {
        partEpisodesIndicesMap.set(value.partId, value.episodes);
    });

    if (!standardPartEpisodes) {
        logger.warn("could not find standardPartEpisodes even though it has a standard part");
        return;
    }
    if (!standardPartEpisodes.length) {
        return;
    }
    const episodePartMap = new Map<number, number>();

    for (const episodeIndex of standardPartEpisodes) {
        for (const part of parts) {
            // skip standard parts here
            if (part.totalIndex === -1) {
                continue;
            }
            const episodeIndices = partEpisodesIndicesMap.get(part.id);

            if (!episodeIndices) {
                continue;
            }
            if (episodeIndices.find((value) => value === episodeIndex)) {
                const partId = episodePartMap.get(episodeIndex);

                if (partId != null && partId !== part.id) {
                    throw Error(`episode ${episodeIndex} owned by multiple parts: '${partId}' and '${part.id}'`);
                }
                episodePartMap.set(episodeIndex, part.id);
                break;
            }
        }
    }
    const partEpisodes = new Map<number, number[]>();
    for (const [episodeIndex, partId] of episodePartMap.entries()) {
        const episodesIndices = getElseSet(partEpisodes, partId, () => []);
        episodesIndices.push(episodeIndex);
    }

    const promises = [];
    for (const [partId, episodeIndices] of partEpisodes.entries()) {
        promises.push(Storage.moveEpisodeToPart(standardPart.id, episodeIndices, partId));
    }
    await Promise.all(promises);*/
}
