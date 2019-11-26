"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const listManager_1 = require("./listManager");
const feedparser_promised_1 = tslib_1.__importDefault(require("feedparser-promised"));
const tools_1 = require("../tools");
const types_1 = require("../types");
const logger_1 = tslib_1.__importStar(require("../logger"));
const directScraper = tslib_1.__importStar(require("./direct/directScraper"));
const url = tslib_1.__importStar(require("url"));
const cache_1 = require("../cache");
const validate = tslib_1.__importStar(require("validate.js"));
const request_1 = tslib_1.__importDefault(require("request"));
const queueManager_1 = require("./queueManager");
const env_1 = tslib_1.__importDefault(require("../env"));
const undergroundScraper_1 = require("./direct/undergroundScraper");
const storage_1 = require("../database/storages/storage");
const redirects = [];
const tocScraper = new Map();
const episodeDownloader = new Map();
const tocDiscovery = new Map();
const newsAdapter = [];
const searchAdapter = [];
const nameHookMap = new Map();
exports.scrapeNewsJob = async (name) => {
    const hook = nameHookMap.get(name);
    if (!hook) {
        throw Error("no hook found for name: " + name);
    }
    if (!hook.newsAdapter) {
        throw Error(`expected hook '${name}' to have newsAdapter`);
    }
    return exports.scrapeNews(hook.newsAdapter);
};
exports.scrapeNews = async (adapter) => {
    if (!adapter.link || !validate.isString(adapter.link)) {
        throw Error("missing link on newsScraper");
    }
    console.log(`Scraping for News with Adapter on '${adapter.link}'`);
    const rawNews = await adapter();
    if (rawNews && rawNews.episodes && rawNews.episodes.length) {
        console.log(`Scraped ${rawNews.episodes.length} Episode News on '${adapter.link}'`);
        const episodeMap = rawNews.episodes.reduce((map, currentValue) => {
            const episodeNews = tools_1.getElseSet(map, currentValue.mediumTitle + "%" + currentValue.mediumType, () => []);
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
};
async function processMediumNews(title, type, tocLink, update = false, potentialNews) {
    const likeMedia = await storage_1.mediumStorage.getLikeMedium({ title, type });
    if (!likeMedia || Array.isArray(likeMedia) || !likeMedia.medium || !likeMedia.medium.id) {
        if (tocLink) {
            await storage_1.mediumInWaitStorage.addMediumInWait({ title, medium: type, link: tocLink });
        }
        return;
    }
    const mediumId = likeMedia.medium.id;
    const latestReleases = await storage_1.episodeStorage.getLatestReleases(mediumId);
    const latestRelease = tools_1.max(latestReleases, (previous, current) => {
        const maxPreviousRelease = tools_1.max(previous.releases, "releaseDate");
        const maxCurrentRelease = tools_1.max(current.releases, "releaseDate");
        return ((maxPreviousRelease && maxPreviousRelease.releaseDate.getTime()) || 0)
            - ((maxCurrentRelease && maxCurrentRelease.releaseDate.getTime()) || 0);
    });
    let standardPart = await storage_1.partStorage.getStandardPart(mediumId);
    if (!standardPart) {
        standardPart = await storage_1.partStorage.createStandardPart(mediumId);
    }
    if (!standardPart || !standardPart.id) {
        throw Error(`could not create standard part for mediumId: '${mediumId}'`);
    }
    let newEpisodeNews;
    if (latestRelease) {
        const oldReleases = [];
        newEpisodeNews = potentialNews.filter((value) => {
            if (value.episodeIndex > tools_1.combiIndex(latestRelease)) {
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
                locked: value.locked,
                episodeId: 0,
            });
            return value.episodeIndex;
        });
        if (oldEpisodeIndices.length) {
            const episodes = await storage_1.episodeStorage.getMediumEpisodePerIndex(mediumId, oldEpisodeIndices);
            const promises = episodes.map((value) => {
                const index = tools_1.combiIndex(value);
                const release = indexReleaseMap.get(index);
                if (!release) {
                    throw Error(`missing release, queried for episode but got no release source for: '${index}'`);
                }
                if (value.releases.find((prevRelease) => prevRelease.url === release.url)) {
                    return Promise.resolve();
                }
                if (!value.id) {
                    return storage_1.episodeStorage.addEpisode({
                        id: 0,
                        // @ts-ignore
                        partId: standardPart.id,
                        partialIndex: value.partialIndex,
                        totalIndex: value.totalIndex,
                        releases: [release]
                    }).then(() => undefined);
                }
                release.episodeId = value.id;
                return storage_1.episodeStorage.addRelease(release).then(() => undefined);
            });
            await Promise.all(promises);
        }
        if (update) {
            const sourcedReleases = await storage_1.episodeStorage.getSourcedReleases(undergroundScraper_1.sourceType, mediumId);
            const toUpdateReleases = oldReleases.map((value) => {
                return {
                    title: value.episodeTitle,
                    url: value.link,
                    releaseDate: value.date,
                    locked: value.locked,
                    sourceType: undergroundScraper_1.sourceType,
                    episodeId: 0,
                };
            }).filter((value) => {
                const foundRelease = sourcedReleases.find((release) => release.title === value.title);
                if (!foundRelease) {
                    logger_1.default.warn("wanted to update an unavailable release");
                    return false;
                }
                return foundRelease.url !== value.url;
            });
            if (toUpdateReleases.length) {
                storage_1.episodeStorage.updateRelease(toUpdateReleases).catch(logger_1.logError);
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
        await storage_1.episodeStorage.addEpisode(newEpisodes);
    }
    if (tocLink) {
        await storage_1.mediumStorage.addToc(mediumId, tocLink);
    }
}
async function searchForTocJob(name, item) {
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
exports.searchForTocJob = searchForTocJob;
async function searchForToc(item, searcher) {
    const link = searcher.link;
    if (!link) {
        throw Error("TocSearcher of mediumType: " + item.medium + " has no link");
    }
    const pageInfoKey = "search" + item.mediumId;
    const result = await storage_1.storage.getPageInfo(link, pageInfoKey);
    const dates = result.values.map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getDate()));
    const maxDate = tools_1.maxValue(dates);
    if (maxDate && maxDate.toDateString() === new Date().toDateString()) {
        // don't search on the same page the same medium twice in a day
        return { tocs: [] };
    }
    let newToc;
    try {
        newToc = await searcher(item);
    }
    finally {
        await storage_1.storage.updatePageInfo(link, pageInfoKey, [new Date().toDateString()], result.values);
    }
    const tocs = [];
    if (newToc) {
        newToc.mediumId = item.mediumId;
        tocs.push(newToc);
    }
    return { tocs };
}
exports.searchForToc = searchForToc;
function searchTocJob(id, tocSearch, availableTocs) {
    const consumed = [];
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
    const searchJobs = [];
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
            if (!search && (!tools_1.hasMediaType(searcher.medium, tocSearch.medium) || !searcher.blindSearch)) {
                continue;
            }
            searchJobs.push({
                name: `${searcher.hookName}-${types_1.ScrapeName.searchForToc}-${tocSearch.mediumId}`,
                interval: -1,
                arguments: JSON.stringify([searcher.hookName, tocSearch]),
                type: types_1.ScrapeName.searchForToc,
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
exports.checkTocsJob = async () => {
    const mediaTocs = await storage_1.mediumStorage.getAllMediaTocs();
    const tocSearchMedia = await storage_1.mediumStorage.getTocSearchMedia();
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
    const newJobs1 = mediaWithoutTocs.map((id) => {
        return searchTocJob(id, tocSearchMedia.find((value) => value.mediumId === id));
    }).flat(2);
    const promises = [...mediaWithTocs.entries()].map(async (value) => {
        const mediumId = value[0];
        const indices = await storage_1.episodeStorage.getChapterIndices(mediumId);
        const maxIndex = tools_1.maxValue(indices);
        if (!maxIndex || indices.length < maxIndex) {
            return searchTocJob(mediumId, tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId), value[1]);
        }
        let missingChapters;
        for (let i = 1; i < maxIndex; i++) {
            if (!indices.includes(i)) {
                missingChapters = true;
                break;
            }
        }
        if (missingChapters) {
            return searchTocJob(mediumId, tocSearchMedia.find((searchMedium) => searchMedium.mediumId === mediumId), value[1]);
        }
    }).flat(2);
    const newJobs2 = await Promise.all(promises);
    return [newJobs1, newJobs2].flat(3).filter((value) => value);
};
exports.queueTocsJob = async () => {
    // TODO: 02.09.2019 a perfect candidate to use stream on
    const tocs = await storage_1.mediumStorage.getAllTocs();
    return tocs.map((value) => {
        return {
            runImmediately: true,
            arguments: JSON.stringify({ mediumId: value.id, url: value.link }),
            type: types_1.ScrapeName.toc,
            name: `${types_1.ScrapeName.toc}-${value.id}-${value.link}`,
            interval: types_1.MilliTime.HOUR,
            deleteAfterRun: false,
        };
    });
};
exports.queueTocs = async () => {
    await storage_1.storage.queueNewTocs();
};
exports.oneTimeToc = async ({ url: link, uuid, mediumId }) => {
    console.log("scraping one time toc: " + link);
    const path = url.parse(link).path;
    if (!path) {
        logger_1.default.warn(`malformed url: '${link}'`);
        return { tocs: [], uuid };
    }
    let allTocPromise;
    for (const entry of tocScraper.entries()) {
        const regExp = entry[0];
        if (regExp.test(link)) {
            const scraper = entry[1];
            allTocPromise = scraper(link);
            break;
        }
    }
    if (!allTocPromise) {
        // todo use the default scraper here, after creating it
        logger_1.default.warn(`no scraper found for: '${link}'`);
        return { tocs: [], uuid };
    }
    const allTocs = await allTocPromise;
    if (!allTocs.length) {
        logger_1.default.warn(`no tocs found on: '${link}'`);
        return { tocs: [], uuid };
    }
    if (mediumId && allTocs.length === 1) {
        allTocs[0].mediumId = mediumId;
    }
    console.log("toc scraped: " + link);
    return { tocs: allTocs, uuid };
};
exports.news = async (link) => {
    return {
        link,
        result: [],
    };
    // todo implement news scraping (from home, updates pages etc. which require page analyzing, NOT feed or adapter)
};
exports.toc = async (value) => {
    const result = await exports.oneTimeToc(value);
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
exports.list = async (value) => {
    const manager = listManager_1.factory(0, value.cookies);
    try {
        const lists = await manager.scrapeLists();
        const listsPromise = Promise.all(lists.lists.map(async (scrapedList) => scrapedList.link = await checkLink(scrapedList.link, scrapedList.name))).then(tools_1.ignore);
        const feedLinksPromise = Promise.all(lists.feed.map((feedLink) => checkLink(feedLink)));
        const mediaPromise = Promise.all(lists.media.map(async (medium) => {
            const titleLinkPromise = checkLink(medium.title.link, medium.title.text);
            const currentLinkPromise = checkLink(medium.current.link, medium.current.text);
            const latestLinkPromise = checkLink(medium.latest.link, medium.latest.text);
            medium.title.link = await titleLinkPromise;
            medium.current.link = await currentLinkPromise;
            medium.latest.link = await latestLinkPromise;
        })).then(tools_1.ignore);
        await listsPromise;
        await mediaPromise;
        lists.feed = await feedLinksPromise;
        return { external: value, lists };
    }
    catch (e) {
        // noinspection ES6MissingAwait
        return Promise.reject({ ...value, error: e });
    }
};
exports.feed = async (feedLink) => {
    console.log("scraping feed: ", feedLink);
    const startTime = Date.now();
    // noinspection JSValidateTypes
    return feedparser_promised_1.default.parse(feedLink)
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
};
function checkTocContent(content, allowMinusOne = false) {
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
exports.checkTocContent = checkTocContent;
// TODO: 21.06.2019 save cache in database?
const cache = new cache_1.Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
const errorCache = new cache_1.Cache({ size: 500, deleteOnExpire: true, stdTTL: 60 * 60 * 2 });
var ScrapeEvent;
(function (ScrapeEvent) {
    ScrapeEvent["TOC"] = "toc";
    ScrapeEvent["FEED"] = "feed";
    ScrapeEvent["NEWS"] = "news";
    ScrapeEvent["LIST"] = "list";
})(ScrapeEvent = exports.ScrapeEvent || (exports.ScrapeEvent = {}));
class ScraperHelper {
    constructor() {
        this.eventMap = new Map();
    }
    get redirects() {
        return redirects;
    }
    get tocScraper() {
        return tocScraper;
    }
    get episodeDownloader() {
        return episodeDownloader;
    }
    get tocDiscovery() {
        return tocDiscovery;
    }
    get newsAdapter() {
        return newsAdapter;
    }
    on(event, callback) {
        const callbacks = tools_1.getElseSet(this.eventMap, event, () => []);
        callbacks.push(callback);
    }
    emit(event, value) {
        if (env_1.default.stopScrapeEvents) {
            console.log("not emitting events");
            return;
        }
        const callbacks = tools_1.getElseSet(this.eventMap, event, () => []);
        callbacks.forEach((cb) => cb(value));
    }
    init() {
        this.registerHooks(listManager_1.getListManagerHooks());
        this.registerHooks(directScraper.getHooks());
    }
    getHook(name) {
        const hook = nameHookMap.get(name);
        if (!hook) {
            throw Error(`there is no hook with name: '${name}'`);
        }
        return hook;
    }
    registerHooks(hook) {
        // @ts-ignore
        tools_1.multiSingle(hook, (value) => {
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
exports.ScraperHelper = ScraperHelper;
let hookRegistered = false;
function checkHooks() {
    if (!hookRegistered) {
        registerHooks(directScraper.getHooks());
        hookRegistered = true;
    }
}
async function search(title, medium) {
    checkHooks();
    const promises = [];
    for (const searcher of searchAdapter) {
        if (searcher.medium === medium) {
            promises.push(searcher(title, medium));
        }
    }
    const results = await Promise.all(promises);
    return results.flat(1);
}
exports.search = search;
async function downloadEpisodes(episodes) {
    checkHooks();
    const entries = [...episodeDownloader.entries()];
    const downloadContents = new Map();
    for (const episode of episodes) {
        const indexKey = tools_1.combiIndex(episode);
        if (!episode.releases.length) {
            downloadContents.set(indexKey, {
                episodeId: episode.id,
                title: "",
                content: []
            });
            logger_1.default.warn(`no releases available for episodeId: ${episode.id} with ${episode.releases.length} Releases`);
            continue;
        }
        const downloadValue = downloadContents.get(indexKey);
        if (downloadValue && downloadValue.content.length) {
            logger_1.default.warn(`downloaded episode with index: ${indexKey} and id ${episode.id} already`);
            continue;
        }
        let downloadedContent;
        let releaseIndex = 0;
        let downloaderIndex = 0;
        while (!downloadedContent && releaseIndex !== episode.releases.length) {
            let downloaderEntry;
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
            let episodeContents;
            try {
                episodeContents = await downloaderEntry[1](release.url);
            }
            catch (e) {
                if (e.statusCode && (e.statusCode === 410 || e.statusCode === 404)) {
                    storage_1.episodeStorage.deleteRelease(release).catch(logger_1.logError);
                }
                else {
                    logger_1.logError(e);
                }
                downloaderIndex = 0;
                releaseIndex++;
                continue;
            }
            episodeContents = episodeContents.filter((value) => {
                if (value.locked && value.index === tools_1.combiIndex(episode)) {
                    release.locked = true;
                    storage_1.episodeStorage.updateRelease(release).catch(logger_1.logError);
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
            logger_1.default.warn(`nothing downloaded for episodeId: ${episode.id}`);
        }
        else if (downloadedContent.length === 1) {
            const episodeContent = downloadedContent[0];
            downloadContents.set(indexKey, {
                title: episodeContent.episodeTitle,
                content: episodeContent.content,
                episodeId: episode.id
            });
        }
        else {
            for (const episodeContent of downloadedContent) {
                const foundEpisode = episodes.find((value) => value.releases.find((release) => (release.title === episodeContent.episodeTitle)
                    || (tools_1.combiIndex(value) === episodeContent.index))
                    != null);
                if (foundEpisode) {
                    downloadContents.set(indexKey, {
                        title: episodeContent.episodeTitle,
                        content: episodeContent.content,
                        episodeId: foundEpisode.id
                    });
                }
                else {
                    logger_1.default.warn(`could not find any episode for downloaded content '${episodeContent.episodeTitle}'`);
                }
            }
        }
    }
    return [...downloadContents.values()];
}
exports.downloadEpisodes = downloadEpisodes;
function checkLinkWithInternet(link) {
    return new Promise((resolve, reject) => {
        request_1.default
            .head(link)
            .on("response", (res) => {
            // noinspection TypeScriptValidateJSTypes
            if (res.caseless.get("server") === "cloudflare") {
                resolve(queueManager_1.queueFastRequestFullResponse(link));
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
function registerHooks(hook) {
    // @ts-ignore
    tools_1.multiSingle(hook, (value) => {
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
async function remapMediaParts() {
    const mediaIds = await storage_1.mediumStorage.getAllMedia();
    await Promise.all(mediaIds.map((mediumId) => remapMediumPart(mediumId)));
}
exports.remapMediaParts = remapMediaParts;
async function queueExternalUser() {
    console.log("queueing external user");
}
exports.queueExternalUser = queueExternalUser;
async function remapMediumPart(mediumId) {
    const parts = await storage_1.partStorage.getMediumPartIds(mediumId);
    const standardPartId = await storage_1.partStorage.getStandardPartId(mediumId);
    // if there is no standard part, we return as there is no part to move from
    if (!standardPartId) {
        await storage_1.partStorage.createStandardPart(mediumId);
        return;
    }
    const nonStandardPartIds = parts.filter((value) => value !== standardPartId);
    const overLappingParts = await storage_1.partStorage.getOverLappingParts(standardPartId, nonStandardPartIds);
    const promises = [];
    for (const overLappingPart of overLappingParts) {
        promises.push(storage_1.episodeStorage.moveEpisodeToPart(standardPartId, overLappingPart));
    }
    await Promise.all(promises);
}
exports.remapMediumPart = remapMediumPart;
//# sourceMappingURL=scraperTools.js.map