import {Storage} from "../database/database";
import {factory, getListManagerHooks, ListScrapeResult} from "./listManager";
import feedParserPromised from "feedparser-promised";
import {addMultiSingle, delay, getElseSet, maxValue, multiSingle, removeMultiSingle} from "../tools";
import {Episode, News, ScrapeItem, SimpleEpisode} from "../types";
import logger from "../logger";
import {
    ContentDownloader,
    Dependant,
    DownloadContent,
    EpisodeContent,
    Hook,
    NewsScraper,
    OneTimeToc,
    Toc,
    TocScraper,
    TocSearchScraper
} from "./types";
import * as directScraper from "./direct/directScraper";
import {queueRequestFullResponse} from "./queueManager";
import * as url from "url";
import {Cache} from "../cache";
import * as validate from "validate.js";

// todo for each page, save info as key-value-pairs

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
                    const callbacks = getElseSet(eventMap, key, () => []);
                    callbacks.forEach((cb) => cb(value));
                })
                .catch((error) => {
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

/**
 * Scrape everything for one cycle, wait for a specified interval and scrape again.
 * Output is send per event listener.
 */
async function scrape(dependants = scrapeDependants, next = true) {
    if (paused) {
        return;
    }

    const tocFinished = notify("toc", dependants.tocs.map((value) => toc(value)));
    const newsFinished = notify("news", dependants.news.map((value) => news(value)));
    const feedFinished = notify("feed", dependants.feeds.map((value) => feed(value)));
    const newsAdapterFinished = notify("news", newsAdapter.map((adapter) => processNewsScraper(adapter)));
    const oneTimeTocFinished = notify("toc", dependants.oneTimeTocs.map((value) => oneTimeToc(value)))
        .then(() => {
            dependants.oneTimeTocs.length = 0;
        });
    const newUserFinished = notify("list", dependants.oneTimeUser.map((value) => list(value)))
        .then(() => {
            dependants.oneTimeUser.length = 0;
        });
    const checkTocsFinished = notify("toc", [checkTocs()]);

    const allPromises = [
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

    const listFinished = notify("list", externals.map((value) => list(value)));
    allPromises.push(listFinished);
    // save current run for users for this monday, so that it does not scan again today
    lastListScrape = todayString;

    // start next scrape cycle after all scrape parts are finished, regardless of errors or not
    await Promise.all(allPromises);

    if (next) {
        setTimeout(() => scrape().catch((error) => {
            console.log(error);
            logger.error(error);
        }), interval);
    }
}

async function processNewsScraper(adapter: NewsScraper): Promise<{ link: string, result: News[] }> {
    if (!adapter.link || !validate.isString(adapter.link)) {
        throw Error("missing link on newsScraper");
    }
    const rawNews = await adapter();
    return {
        link: adapter.link,
        result: rawNews || [],
    };

}

async function searchToc(id: number, availableTocs: string[] = []): Promise<{ id: number, tocs: Toc[] }> {
    const links = await Storage.getAllChapterLinks(id);
    const medium = await Storage.getTocSearchMedium(id);
    const consumed: RegExp[] = [];
    const tocs: Toc[] = [];

    for (const tocLink of availableTocs) {

        for (const entry of tocDiscovery.entries()) {
            const [reg] = entry;

            if (!consumed.includes(reg) && reg.test(tocLink)) {
                consumed.push(reg);
                break;
            }
        }
    }

    for (const link of links) {

        for (const entry of tocDiscovery.entries()) {
            const [reg, searcher] = entry;

            if (!consumed.includes(reg) && reg.test(link)) {
                const scrapedToc = await searcher(medium);

                if (scrapedToc) {
                    tocs.push(scrapedToc);
                }
                consumed.push(reg);
                break;
            }
        }
    }
    return {id, tocs};
}

async function checkTocs(): Promise<{ toc: Toc[], uuid?: string }> {
    const allAvailableTocs = await Storage.getAllTocs();
    const mediaWithTocs: Map<number, string[]> = new Map();

    const mediaWithoutTocs = allAvailableTocs
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

    const mappedTocs: Array<{ id: number, tocs: Toc[] }> = await Promise
        .all(mediaWithoutTocs.map((value) => searchToc(value)))
        .then((map) => map.filter((value) => value.tocs.length));

    const otherMappedTocs: Array<{ id: number, tocs: Toc[]; }> = await Promise
        .all([...mediaWithTocs.entries()].map(async (value) => {
            const mediumId = value[0];
            const indices = await Storage.getChapterIndices(mediumId);
            const max = maxValue(indices);

            if (max != null) {
                let missingChapters;

                for (let i = 1; i < max; i++) {
                    if (!indices.includes(i)) {
                        missingChapters = true;
                        break;
                    }
                }
                if (missingChapters) {
                    return searchToc(mediumId, value[1]);
                }
            }
        }))
        .then((array) => array.filter((value) => value && value.tocs.length)) as Array<{ id: number, tocs: Toc[]; }>;

    mappedTocs.push(...otherMappedTocs);

    const tocs = mappedTocs.flatMap((value) => value.tocs.map((newToc) => {
        newToc.mediumId = value.id;
        return newToc;
    }));
    return {toc: tocs};
}

async function oneTimeToc({url: link, uuid, mediumId}: OneTimeToc): Promise<{ toc: Toc[], uuid: string }> {
    const host = url.parse(link).host;

    if (!host) {
        logger.warn(`malformed url: '${link}'`);
        return {toc: [], uuid};
    }
    let allTocPromise: Promise<Toc[]> | undefined;

    for (const entry of tocScraper.entries()) {
        const regExp = entry[0];

        if (regExp.test(host)) {
            const scraper: TocScraper = entry[1];
            allTocPromise = scraper(link);
            break;
        }
    }

    if (!allTocPromise) {
        // todo use the default scraper here, after creating it
        logger.warn(`no scraper found for: '${link}'`);
        return {toc: [], uuid};
    }

    const allTocs: Toc[] = await allTocPromise;

    if (!allTocs.length) {
        logger.warn(`no tocs found on: '${link}'`);
        return {toc: [], uuid};
    }
    if (mediumId && allTocs.length === 1) {
        allTocs[0].mediumId = mediumId;
    }
    console.log("toc scraped: " + link);
    return {toc: allTocs, uuid};
}

/**
 *
 * @param scrapeItem
 * @return {Promise<void>}
 */
async function news(scrapeItem: ScrapeItem): Promise<{ link: string, result: News[] }> {
    return {
        link: scrapeItem.link,
        result: [],
    };
    // todo implement news scraping (from homepage, updates pages etc. which require page analyzing, NOT feed)
}

/**
 *
 * @param value
 * @return {Promise<void>}
 */
async function toc(value: ScrapeItem): Promise<void> {
    // todo implement toc scraping which requires page analyzing
}

/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
async function list(value: { cookies: string, uuid: string }):
    Promise<{ external: { cookies: string, uuid: string }, lists: ListScrapeResult }> {

    const manager = factory(0);
    manager.parseAndReplaceCookies(value.cookies);
    try {
        const lists = await manager.scrapeLists();
        const listsPromise = Promise.all(lists.lists.map(
            async (scrapedList) => scrapedList.link = await checkLink(scrapedList.link, scrapedList.name))
        );

        const feedLinksPromise = Promise.all(lists.feed.map((feedLink) => checkLink(feedLink)));
        const mediaPromise = Promise.all(lists.media.map(async (medium) => {
            const titleLinkPromise = checkLink(medium.title.link, medium.title.text);
            const currentLinkPromise = checkLink(medium.current.link, medium.current.text);
            const latestLinkPromise = checkLink(medium.latest.link, medium.latest.text);

            medium.title.link = await titleLinkPromise;
            medium.current.link = await currentLinkPromise;
            medium.latest.link = await latestLinkPromise;
        }));

        await listsPromise;
        await mediaPromise;
        lists.feed = await feedLinksPromise;
        return {external: value, lists};
    } catch (e) {
        return Promise.reject({...value, error: e});
    }
}

const cache = new Cache({size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2});
const errorCache = new Cache({size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2});

/**
 *
 * @param {string} feedLink
 * @return {Promise<News>}
 */
async function feed(feedLink: string): Promise<{ link: string, result: News[] }> {
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
            return {
                link: feedLink,
                result: value
            };
        })
        .catch((error) => Promise.reject({feed: feedLink, error}));
}

export const scrapeTypes = {
    LIST: 0,
    FEED: 1,
    NEWS: 2,
    TOC: 3,
};

const eventMap: Map<string, Array<(value: any) => void>> = new Map();

interface ScrapeDependants {
    news: ScrapeItem[];
    oneTimeUser: Array<{ cookies: string, uuid: string }>;
    oneTimeTocs: Array<{ url: string, uuid: string }>;
    feeds: string[];
    tocs: ScrapeItem[];
    media: ScrapeItem[];
}

let scrapeDependants: ScrapeDependants;

/**
 *
 * @return {Promise<void>}
 */
export async function setup() {
    const scrapeBoard = await Storage.getScrapes();

    const dependants: ScrapeDependants = {feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: [], media: []};

    scrapeBoard.forEach((value) => {
        if (value.type === scrapeTypes.NEWS) {
            dependants.news.push(value);
        } else if (value.type === scrapeTypes.FEED) {
            dependants.feeds.push(value.link);
        } else if (value.type === scrapeTypes.TOC) {
            dependants.tocs.push(value);
        }
    });

    scrapeDependants = dependants;
}


export function add(dependant: Dependant) {
    const dependants = {feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: [], media: []};

    // @ts-ignore
    addMultiSingle(dependants.oneTimeUser, dependant.oneTimeUser);
    // @ts-ignore
    addMultiSingle(dependants.oneTimeTocs, dependant.oneTimeToc);
    // @ts-ignore
    addMultiSingle(dependants.feeds, dependant.feed);
    addMultiSingle(dependants.news, dependant.news);
    addMultiSingle(dependants.tocs, dependant.toc);
    addMultiSingle(dependants.media, dependant.medium);

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
            addMultiSingle(scrapeDependants.media, dependant.medium);
        })
        .catch((error) => {
            console.log(error);
            logger.error(error);
        });

}

export async function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]> {
    const entries = [...episodeDownloader.entries()];

    const downloadContents: Map<number, DownloadContent> = new Map();

    for (const episode of episodes) {
        const indexKey = combiIndex(episode);

        if (!episode.releases.length) {
            downloadContents.set(indexKey, {
                episodeId: episode.id,
                title: "",
                content: ""
            });
            logger.warn(`no releases available for episodeId: ${episode.id} with ${episode.releases.length} Releases`);
            continue;
        }
        const downloadValue = downloadContents.get(indexKey);

        if (downloadValue && downloadValue.content) {
            continue;
        }
        let downloadedContent: EpisodeContent[] | undefined;
        let releaseIndex = 0;
        let downloaderIndex = 0;

        while (!downloadedContent && releaseIndex !== episode.releases.length) {
            let downloaderEntry: [RegExp, ContentDownloader] | undefined;

            const release = episode.releases[releaseIndex];

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

            let episodeContents: EpisodeContent[] = await downloaderEntry[1](release.url);

            episodeContents = episodeContents.filter((value) => value.content);

            if (episodeContents.length && episodeContents[0].content) {
                downloadedContent = episodeContents;
            }
        }
        if (!downloadedContent) {
            downloadContents.set(indexKey, {
                episodeId: episode.id,
                title: "",
                content: ""
            });
            logger.warn(`nothing downloaded for episodeId: ${episode.id}`);
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

function combiIndex(episode: SimpleEpisode): number {
    return episode.totalIndex + (episode.partialIndex || 0);
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

        console.log(`checking link '${link}'`);
        queueRequestFullResponse(link)
            .then((response) => {
                const href = response.request.uri.href;

                if (linkKey) {
                    cache.set(linkKey, {redirect: link, followed: href});
                }

                return href;
            })
            .catch((reason) => {
                if (reason && reason.statusCode && reason.statusCode === 404) {
                    // todo if resource does not exist what to do?
                    if (linkKey) {
                        cache.set(linkKey, {redirect: link, followed: ""});
                    }
                    resolve("");
                } else if (linkKey) {
                    const value: any | undefined = errorCache.get(linkKey);

                    if (!value || value !== link) {
                        errorCache.set(linkKey, link);
                        reject(reason);
                    } else {
                        errorCache.ttl(linkKey);
                    }
                }
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
    removeMultiSingle(scrapeDependants.media, dependant.medium);
}


export function registerHooks(hook: Hook[] | Hook) {
    // @ts-ignore
    multiSingle(hook, (value: Hook) => {
        if (value.redirectReg) {
            redirects.push(value.redirectReg);
        }
        if (value.newsAdapter) {
            if (Array.isArray(value.newsAdapter)) {
                newsAdapter.push(...value.newsAdapter);
            } else {
                newsAdapter.push(value.newsAdapter);
            }
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

/**
 *
 */
export function start() {
    paused = false;
    registerHooks(getListManagerHooks());
    registerHooks(directScraper.getHooks());

    scrape().catch((error) => {
        console.log(error);
        logger.error(error);
    });
}

export function on(event: "toc", callback: (value: { uuid: string, toc: Toc[] }) => void): void;
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
