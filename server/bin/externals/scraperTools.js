import { Storage } from "../database/database";
import { factory, getListManagerHooks } from "./listManager";
import feedParserPromised from "feedparser-promised";
import { addMultiSingle, combiIndex, delay, getElseSet, max, maxValue, multiSingle, removeMultiSingle } from "../tools";
import logger, { logError } from "../logger";
import * as directScraper from "./direct/directScraper";
import { getHooks } from "./direct/directScraper";
import * as url from "url";
import { Cache } from "../cache";
import * as validate from "validate.js";
import request from "request";
import { queueFastRequestFullResponse } from "./queueManager";
import { Counter } from "../counter";
import env from "../env";
import { sourceType } from "./direct/undergroundScraper";
// scrape at an interval of 5 min
const interval = 5 * 60 * 1000;
// this one is every 10s
// let interval = 10000;
let paused = true;
const redirects = [];
const tocScraper = new Map();
const episodeDownloader = new Map();
const tocDiscovery = new Map();
const newsAdapter = [];
function activity(func) {
    return (...args) => {
        if (!env.measure) {
            return func(args);
        }
        incActivity();
        const result = func(...args);
        // @ts-ignore
        if (result && result.then) {
            // @ts-ignore
            result.then(() => decActivity());
        }
        else {
            decActivity();
        }
        return result;
    };
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
function notify(key, promises) {
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
const counter = new Counter();
function incActivity() {
    console.log("Active:" + counter.count("scrape"));
}
function decActivity() {
    console.log("Active:" + counter.countDown("scrape"));
}
export const processNewsScraper = activity(async (adapter) => {
    if (!adapter.link || !validate.isString(adapter.link)) {
        throw Error("missing link on newsScraper");
    }
    console.log(`Scraping for News with Adapter on '${adapter.link}'`);
    const rawNews = await adapter();
    if (rawNews && rawNews.episodes && rawNews.episodes.length) {
        console.log(`Scraped ${rawNews.episodes.length} Episode News on '${adapter.link}'`);
        const episodeMap = rawNews.episodes.reduce((map, currentValue) => {
            const episodeNews = getElseSet(map, currentValue.mediumTitle + "%" + currentValue.mediumType, () => []);
            episodeNews.push(currentValue);
            return map;
        }, new Map());
        const promises = [];
        for (const value of episodeMap.values()) {
            const [newsItem] = value;
            if (!newsItem || !newsItem.mediumTitle || !newsItem.mediumType) {
                continue;
            }
            promises.push(processMediumNews(newsItem.mediumTitle, newsItem.mediumType, newsItem.mediumTocLink, rawNews.update, value));
        }
        await Promise.all(promises);
    }
    return {
        link: adapter.link,
        result: (rawNews && rawNews.news) || [],
    };
});
async function processMediumNews(title, type, tocLink, update = false, potentialNews) {
    const likeMedia = await Storage.getLikeMedium({ title, type });
    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || !likeMedia.medium.id) {
        if (tocLink) {
            await Storage.addMediumInWait({ title, medium: type, link: tocLink });
        }
        return;
    }
    const mediumId = likeMedia.medium.id;
    const latestReleases = await Storage.getLatestReleases(mediumId);
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
    if (!standardPart) {
        throw Error(`could not create standard part for mediumId: '${mediumId}'`);
    }
    let newEpisodeNews;
    if (latestRelease) {
        const oldReleases = [];
        newEpisodeNews = potentialNews.filter((value) => {
            if (value.episodeIndex > combiIndex(latestRelease)) {
                return true;
            }
            else {
                oldReleases.push(value);
                return false;
            }
        });
        const indexReleaseMap = new Map();
        const oldEpisodeIndices = oldReleases.map((value) => {
            indexReleaseMap.set(value.episodeIndex, {
                title: value.episodeTitle,
                url: value.link,
                releaseDate: value.date,
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
            const toUpdateReleases = oldReleases.map((value) => {
                return {
                    title: value.episodeTitle,
                    url: value.link,
                    releaseDate: value.date,
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
    }
    else {
        newEpisodeNews = potentialNews;
    }
    const newEpisodes = newEpisodeNews.map((value) => {
        return {
            totalIndex: value.episodeTotalIndex,
            partialIndex: value.episodePartialIndex,
            releases: [
                {
                    episodeId: 0,
                    releaseDate: value.date,
                    url: value.link,
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
function searchToc(id, tocSearch, availableTocs) {
    const consumed = [];
    const scraperJobs = [];
    if (availableTocs) {
        for (const availableToc of availableTocs) {
            for (const entry of tocScraper.entries()) {
                const [reg, scraper] = entry;
                if (!consumed.includes(reg) && reg.test(availableToc)) {
                    scraperJobs.push({
                        type: "onetime_emittable",
                        key: "toc",
                        item: availableToc,
                        cb: async (item) => {
                            const tocs = await scraper(item);
                            if (tocs) {
                                tocs.forEach((value) => value.mediumId = id);
                            }
                            return { tocs };
                        }
                    });
                    consumed.push(reg);
                    break;
                }
            }
        }
    }
    const searchJobs = [];
    if (tocSearch && tocSearch.hosts && tocSearch.hosts.length) {
        for (const link of tocSearch.hosts) {
            for (const entry of tocDiscovery.entries()) {
                const [reg, searcher] = entry;
                if (!consumed.includes(reg) && reg.test(link)) {
                    searchJobs.push({
                        type: "onetime_emittable",
                        key: "toc",
                        item: tocSearch,
                        cb: async (item) => {
                            const newToc = await searcher(item);
                            const tocs = [];
                            if (newToc) {
                                newToc.mediumId = id;
                                tocs.push(newToc);
                            }
                            return { tocs };
                        }
                    });
                    consumed.push(reg);
                    break;
                }
            }
        }
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
    return searchJobs.length ? searchJobs[0] : scraperJobs[0];
}
export const checkTocs = activity(async () => {
    const mediaTocs = await Storage.getAllTocs();
    const tocSearchMedia = await Storage.getTocSearchMedia();
    const mediaWithTocs = new Map();
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
    const newScraperJobs1 = mediaWithoutTocs.map((id) => {
        return searchToc(id, tocSearchMedia.find((value) => value.mediumId === id));
    }).filter((value) => value);
    const promises = [...mediaWithTocs.entries()].map(async (value) => {
        const mediumId = value[0];
        const indices = await Storage.getChapterIndices(mediumId);
        const maxIndex = maxValue(indices);
        if (maxIndex == null || indices.length < maxIndex) {
            return searchToc(mediumId, tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId), value[1]);
        }
        let missingChapters;
        for (let i = 1; i < maxIndex; i++) {
            if (!indices.includes(i)) {
                missingChapters = true;
                break;
            }
        }
        if (missingChapters) {
            return searchToc(mediumId, tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId), value[1]);
        }
    });
    const newScraperJobs2 = await Promise.all(promises);
    const jobs = [newScraperJobs1, newScraperJobs2].flat(3);
    return jobs.filter((value) => value);
});
export const oneTimeToc = activity(async ({ url: link, uuid, mediumId }) => {
    const host = url.parse(link).host;
    if (!host) {
        logger.warn(`malformed url: '${link}'`);
        return { toc: [], uuid };
    }
    let allTocPromise;
    for (const entry of tocScraper.entries()) {
        const regExp = entry[0];
        if (regExp.test(host)) {
            const scraper = entry[1];
            allTocPromise = scraper(link);
            break;
        }
    }
    if (!allTocPromise) {
        // todo use the default scraper here, after creating it
        logger.warn(`no scraper found for: '${link}'`);
        return { toc: [], uuid };
    }
    const allTocs = await allTocPromise;
    if (!allTocs.length) {
        logger.warn(`no tocs found on: '${link}'`);
        return { toc: [], uuid };
    }
    if (mediumId && allTocs.length === 1) {
        allTocs[0].mediumId = mediumId;
    }
    console.log("toc scraped: " + link);
    return { toc: allTocs, uuid };
});
/**
 *
 * @param scrapeItem
 * @return {Promise<void>}
 */
export let news = activity(async (scrapeItem) => {
    return {
        link: scrapeItem.link,
        result: [],
    };
    // todo implement news scraping (from homepage, updates pages etc. which require page analyzing, NOT feed)
});
/**
 *
 * @param value
 * @return {Promise<void>}
 */
export const toc = activity(async (value) => {
    // todo implement toc scraping which requires page analyzing
});
/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export const list = activity(async (value) => {
    const manager = factory(0, value.cookies);
    try {
        const lists = await manager.scrapeLists();
        const listsPromise = Promise.all(lists.lists.map(async (scrapedList) => scrapedList.link = await checkLink(scrapedList.link, scrapedList.name)));
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
        return { external: value, lists };
    }
    catch (e) {
        return Promise.reject({ ...value, error: e });
    }
});
export const feed = activity(async (feedLink) => {
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
        .catch((error) => Promise.reject({ feed: feedLink, error }));
});
/**
 * Scrape everything for one cycle, wait for a specified interval and scrape again.
 * Output is send per event listener.
 */
async function scrape(dependants = scrapeDependants, next = true) {
    if (paused) {
        return;
    }
    const startTime = Date.now();
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
    const checkTocsFinished = checkTocs().then(() => undefined);
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
const cache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
const errorCache = new Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
export var ScrapeTypes;
(function (ScrapeTypes) {
    ScrapeTypes[ScrapeTypes["LIST"] = 0] = "LIST";
    ScrapeTypes[ScrapeTypes["FEED"] = 1] = "FEED";
    ScrapeTypes[ScrapeTypes["NEWS"] = 2] = "NEWS";
    ScrapeTypes[ScrapeTypes["TOC"] = 3] = "TOC";
    ScrapeTypes[ScrapeTypes["ONETIMEUSER"] = 4] = "ONETIMEUSER";
    ScrapeTypes[ScrapeTypes["ONETIMETOC"] = 5] = "ONETIMETOC";
})(ScrapeTypes || (ScrapeTypes = {}));
const eventMap = new Map();
let scrapeDependants;
/**
 *
 * @return {Promise<void>}
 */
export async function setup() {
    const scrapeBoard = await Storage.getScrapes();
    const dependants = { feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: [], media: [] };
    scrapeBoard.forEach((value) => {
        if (value.type === ScrapeTypes.NEWS) {
            dependants.news.push(value);
        }
        else if (value.type === ScrapeTypes.FEED) {
            dependants.feeds.push(value.link);
        }
        else if (value.type === ScrapeTypes.TOC) {
            dependants.tocs.push(value);
        }
    });
    scrapeDependants = dependants;
}
export class ScraperHelper {
    constructor() {
        this.redirects = [];
        this.tocScraper = new Map();
        this.episodeDownloader = new Map();
        this.tocDiscovery = new Map();
        this.newsAdapter = [];
        this.eventMap = new Map();
    }
    on(event, callback) {
        const callbacks = getElseSet(this.eventMap, event, () => []);
        callbacks.push(callback);
    }
    emit(event, value) {
        if (env.stopScrapeEvents) {
            console.log("not emitting events");
            return;
        }
        const callbacks = getElseSet(this.eventMap, event, () => []);
        callbacks.forEach((cb) => cb(value));
    }
    init() {
        this.registerHooks(getListManagerHooks());
        this.registerHooks(getHooks());
    }
    registerHooks(hook) {
        // @ts-ignore
        multiSingle(hook, (value) => {
            if (value.redirectReg) {
                redirects.push(value.redirectReg);
            }
            // TODO: 20.07.2019 check why it should be added to the public ones,
            //  or make the getter for these access the public ones?
            if (value.newsAdapter) {
                if (Array.isArray(value.newsAdapter)) {
                    newsAdapter.push(...value.newsAdapter);
                    this.newsAdapter.push(...value.newsAdapter);
                }
                else {
                    newsAdapter.push(value.newsAdapter);
                    this.newsAdapter.push(value.newsAdapter);
                }
            }
            if (value.domainReg) {
                if (value.tocAdapter) {
                    tocScraper.set(value.domainReg, value.tocAdapter);
                    this.tocScraper.set(value.domainReg, value.tocAdapter);
                }
                if (value.contentDownloadAdapter) {
                    episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
                    this.episodeDownloader.set(value.domainReg, value.contentDownloadAdapter);
                }
                if (value.tocSearchAdapter) {
                    tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
                    this.tocDiscovery.set(value.domainReg, value.tocSearchAdapter);
                }
            }
            if (value.tocPattern && value.tocSearchAdapter) {
                tocDiscovery.set(value.tocPattern, value.tocSearchAdapter);
                this.tocDiscovery.set(value.tocPattern, value.tocSearchAdapter);
            }
        });
    }
}
export function addDependant(dependant) {
    const dependants = { feeds: [], tocs: [], oneTimeUser: [], oneTimeTocs: [], news: [], media: [] };
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
let hookRegistered = false;
export async function downloadEpisodes(episodes) {
    if (!episodeDownloader.size && !hookRegistered) {
        registerHooks(directScraper.getHooks());
        hookRegistered = true;
    }
    const entries = [...episodeDownloader.entries()];
    const downloadContents = new Map();
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
        let downloadedContent;
        let releaseIndex = 0;
        let downloaderIndex = 0;
        while (!downloadedContent && releaseIndex !== episode.releases.length) {
            let downloaderEntry;
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
            let episodeContents = await downloaderEntry[1](release.url);
            episodeContents = episodeContents.filter((value) => value.content);
            if (episodeContents.length && episodeContents[0].content) {
                downloadedContent = episodeContents;
                break;
            }
        }
        if (!downloadedContent) {
            downloadContents.set(indexKey, {
                episodeId: episode.id,
                title: "",
                content: ""
            });
            logger.warn(`nothing downloaded for episodeId: ${episode.id}`);
        }
        else {
            for (const episodeContent of downloadedContent) {
                const foundEpisode = episodes.find((value) => value.releases.find((release) => (release.title === episodeContent.episodeTitle)
                    || (combiIndex(value) === episodeContent.index))
                    != null);
                if (foundEpisode) {
                    downloadContents.set(indexKey, {
                        title: episodeContent.episodeTitle,
                        content: episodeContent.content,
                        episodeId: foundEpisode.id
                    });
                }
                else {
                    logger.warn(`could not find any episode for downloaded content '${episodeContent.episodeTitle}'`);
                }
            }
        }
    }
    return [...downloadContents.values()];
}
function checkLinkWithInternet(link) {
    return new Promise((resolve, reject) => {
        request
            .head(link)
            .on("response", (res) => {
            if (res.caseless.get("server") === "cloudflare") {
                resolve(queueFastRequestFullResponse(link));
            }
            else {
                resolve(res);
            }
        })
            .on("error", reject)
            .end();
    });
}
function checkLink(link, linkKey) {
    return new Promise((resolve, reject) => {
        if (!redirects.some((value) => value.test(link))) {
            resolve(link);
            return;
        }
        if (linkKey) {
            const value = cache.get(linkKey);
            if (value && value.redirect && value.followed && value.redirect === link) {
                // refresh this entry, due to hit
                cache.ttl(linkKey);
                resolve(value.followed);
                return;
            }
            // i dont want the same error message again and again
            // if it occurs once it is highly likely it will come again, so just resolve with empty string
            const errorValue = errorCache.get(linkKey);
            if (errorValue && errorValue === link) {
                errorCache.ttl(linkKey);
                resolve("");
                return;
            }
        }
        checkLinkWithInternet(link)
            .then((response) => {
            const href = response.request.uri.href;
            if (linkKey) {
                cache.set(linkKey, { redirect: link, followed: href });
            }
            resolve(href);
        })
            .catch((reason) => {
            if (reason && reason.statusCode && reason.statusCode === 404) {
                // todo if resource does not exist what to do?
                if (linkKey) {
                    cache.set(linkKey, { redirect: link, followed: "" });
                }
                resolve("");
                return;
            }
            if (linkKey) {
                const value = errorCache.get(linkKey);
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
export function remove(dependant) {
    // @ts-ignore
    removeMultiSingle(scrapeDependants.oneTimeUser, dependant.oneTimeUser);
    // @ts-ignore
    removeMultiSingle(scrapeDependants.feeds, dependant.feed);
    removeMultiSingle(scrapeDependants.news, dependant.news);
    removeMultiSingle(scrapeDependants.tocs, dependant.toc);
    removeMultiSingle(scrapeDependants.media, dependant.medium);
}
export function registerHooks(hook) {
    // @ts-ignore
    multiSingle(hook, (value) => {
        if (value.redirectReg) {
            redirects.push(value.redirectReg);
        }
        if (value.newsAdapter) {
            if (Array.isArray(value.newsAdapter)) {
                newsAdapter.push(...value.newsAdapter);
            }
            else {
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
export function on(event, callback) {
    const callbacks = getElseSet(eventMap, event, () => []);
    callbacks.push(callback);
}
//# sourceMappingURL=scraperTools.js.map