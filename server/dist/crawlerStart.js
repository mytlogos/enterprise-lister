"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("./tools");
const types_1 = require("./types");
const logger_1 = require("./logger");
const types_2 = require("./externals/types");
const validate = tslib_1.__importStar(require("validate.js"));
const scraperTools_1 = require("./externals/scraperTools");
const jobScraperManager_1 = require("./externals/jobScraperManager");
const storage_1 = require("./database/storages/storage");
const scraper = jobScraperManager_1.DefaultJobScraper;
// todo fill out all of the event listener
/**
 *
 */
async function processNews({ link, rawNews }) {
    if (!link || !validate.isString(link)) {
        throw tools_1.Errors.INVALID_INPUT;
    }
    tools_1.multiSingle(rawNews, (item) => delete item.id);
    const newsKey = "news";
    const newsPageInfo = await storage_1.storage.getPageInfo(link, newsKey);
    if (newsPageInfo.values.length) {
        const newPageInfos = [];
        rawNews = rawNews.filter((value) => {
            const newsHash = tools_1.Md5Hash.hash(value.title + value.date).hash;
            const index = newsPageInfo.values.findIndex((hash) => newsHash === hash);
            if (index >= 0) {
                newsPageInfo.values.splice(index, 1);
                return false;
            }
            else {
                newPageInfos.push(newsHash);
                return true;
            }
        });
        if (newsPageInfo.values.length || newPageInfos.length) {
            await storage_1.storage.updatePageInfo(link, newsKey, newPageInfos, newsPageInfo.values);
        }
    }
    let news = await storage_1.newsStorage.addNews(rawNews);
    if (Array.isArray(news)) {
        news = news.filter((value) => value);
    }
    if (!news || (Array.isArray(news) && !news.length)) {
        return;
    }
    // this produces wrong links, so disable it for now
    // set news to medium
    // await Storage.linkNewsToMedium();
}
async function feedHandler({ link, result }) {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/g, " ");
    });
    try {
        await processNews({ link, rawNews: result });
    }
    catch (e) {
        logger_1.logError(e);
    }
}
async function getTocMedia(tocs, uuid) {
    const media = new Map();
    await Promise.all(tocs.map(async (toc) => {
        let medium;
        if (toc.mediumId) {
            // @ts-ignore
            medium = await storage_1.mediumStorage.getSimpleMedium(toc.mediumId);
        }
        else {
            const likeMedium = await storage_1.mediumStorage.getLikeMedium({ title: toc.title, link: "" });
            medium = likeMedium.medium;
        }
        if (!medium) {
            medium = await storage_1.mediumStorage.addMedium({ medium: toc.mediumType, title: toc.title }, uuid);
        }
        if (medium.id && toc.link) {
            await storage_1.mediumStorage.addToc(medium.id, toc.link);
        }
        else {
            console.log("missing toc and id for ", medium, " and ", toc);
        }
        const mediumValue = tools_1.getElseSet(media, medium, () => {
            return {
                episodes: [],
                parts: []
            };
        });
        toc.content.forEach((content) => {
            if (!content || content.totalIndex == null) {
                throw Error(`invalid tocContent for mediumId:'${medium && medium.id}' and link:'${toc.link}'`);
            }
            scraperTools_1.checkTocContent(content, tools_1.isTocPart(content));
            let alterTitle;
            if (!content.title) {
                alterTitle = `${content.totalIndex}${content.partialIndex ? "." + content.partialIndex : ""}`;
                content.title = alterTitle;
            }
            if (tools_1.isTocEpisode(content)) {
                if (alterTitle) {
                    content.title = `Episode ${content.title}`;
                }
                mediumValue.episodes.push(content);
            }
            else if (tools_1.isTocPart(content)) {
                if (alterTitle) {
                    content.title = `Volume ${content.title}`;
                }
                content.episodes.forEach((value) => scraperTools_1.checkTocContent(value));
                mediumValue.parts.push(content);
            }
            else {
                throw Error("content neither part nor episode");
            }
        });
    }));
    return media;
}
async function addPartEpisodes(value) {
    if (!value.part || !value.part.id) {
        throw Error(`something went wrong. got no part for tocPart ${value.tocPart.combiIndex}`);
    }
    value.tocPart.episodes.forEach((episode) => {
        scraperTools_1.checkTocContent(episode);
        value.episodeMap.set(episode.combiIndex, { tocEpisode: episode });
    });
    // @ts-ignore
    const episodes = await storage_1.episodeStorage.getMediumEpisodePerIndex(value.part.mediumId, [...value.episodeMap.keys()], true);
    episodes.forEach((episode) => {
        if (!episode.id) {
            return;
        }
        const tocEpisode = value.episodeMap.get(tools_1.combiIndex(episode));
        if (!tocEpisode) {
            throw Error("something went wrong. got no value at this episode index");
        }
        tocEpisode.episode = episode;
    });
    const nonNewIndices = [];
    const allEpisodes = [...value.episodeMap.keys()]
        .filter((index) => {
        const notInStorage = episodes.every((episode) => tools_1.combiIndex(episode) !== index || !episode.id);
        if (notInStorage) {
            return true;
        }
        nonNewIndices.push(index);
    })
        .map((episodeIndex) => {
        const episodeToc = value.episodeMap.get(episodeIndex);
        if (!episodeToc) {
            throw Error("something went wrong. got no value at this episode index");
        }
        return {
            id: 0,
            // @ts-ignore
            partId: value.part.id,
            // @ts-ignore
            totalIndex: episodeToc.tocEpisode.totalIndex,
            partialIndex: episodeToc.tocEpisode.partialIndex,
            releases: [{
                    episodeId: 0,
                    title: episodeToc.tocEpisode.title,
                    url: episodeToc.tocEpisode.url,
                    releaseDate: episodeToc.tocEpisode.releaseDate || new Date()
                }]
        };
    });
    const knownEpisodeIds = nonNewIndices
        .map((index) => episodes.find((episode) => tools_1.combiIndex(episode) === index))
        .filter((episode) => episode != null)
        .map((episode) => episode.id);
    if (knownEpisodeIds.length) {
        const next = value.episodeMap.values().next();
        if (!next.value) {
            throw Error("no episode values for part " + value.part.id);
        }
        const exec = /https?:\/\/([^\/]+)/.exec(next.value.tocEpisode.url);
        if (!exec) {
            throw Error("invalid url for release: " + next.value.tocEpisode.url);
        }
        const episodeReleases = await storage_1.episodeStorage.getReleasesByHost(knownEpisodeIds, exec[0]);
        const updateReleases = [];
        const newReleases = nonNewIndices.map((index) => {
            const episodeValue = value.episodeMap.get(index);
            if (!episodeValue) {
                throw Error(`no episodeValue for index ${index} of medium ${value.part && value.part.mediumId}`);
            }
            const currentEpisode = episodeValue.episode;
            if (!currentEpisode) {
                throw Error("known episode has no episode from storage");
            }
            const id = currentEpisode.id;
            const foundRelease = episodeReleases.find((release) => release.url === episodeValue.tocEpisode.url
                && release.episodeId === id);
            const tocRelease = {
                episodeId: id,
                releaseDate: episodeValue.tocEpisode.releaseDate || new Date(),
                title: episodeValue.tocEpisode.title,
                url: episodeValue.tocEpisode.url,
                locked: episodeValue.tocEpisode.locked,
            };
            if (foundRelease) {
                if (!tools_1.equalsRelease(foundRelease, tocRelease)
                    && foundRelease.releaseDate.toDateString() === tocRelease.releaseDate.toDateString()) {
                    updateReleases.push(tocRelease);
                }
                return;
            }
            return tocRelease;
        }).filter((v) => v);
        if (newReleases.length) {
            await storage_1.episodeStorage.addRelease(newReleases);
        }
        if (updateReleases.length) {
            await storage_1.episodeStorage.updateRelease(updateReleases);
        }
    }
    if (allEpisodes.length) {
        await storage_1.episodeStorage.addEpisode(allEpisodes);
    }
}
async function tocHandler(result) {
    if (!result) {
        // TODO: 01.09.2019 for now just return
        return;
    }
    const tocs = result.tocs;
    const uuid = result.uuid;
    console.log(`handling toc: ${tocs} ${uuid}`);
    if (!(tocs && tocs.length)) {
        return;
    }
    const media = await getTocMedia(tocs, uuid);
    const promises = Array.from(media.entries())
        .filter((entry) => entry[0].id)
        .map(async (entry) => {
        const mediumId = entry[0].id;
        const tocParts = entry[1].parts;
        if (!tocParts.length && !entry[1].episodes.length) {
            return [];
        }
        const indexPartsMap = new Map();
        tocParts.forEach((value) => {
            scraperTools_1.checkTocContent(value, true);
            if (value.totalIndex == null) {
                throw Error(`totalIndex should not be null! mediumId: '${mediumId}'`);
            }
            indexPartsMap.set(value.combiIndex, { tocPart: value, episodeMap: new Map() });
        });
        if (entry[1].episodes.length) {
            indexPartsMap.set(-1, {
                tocPart: { title: "", totalIndex: -1, combiIndex: -1, episodes: entry[1].episodes },
                episodeMap: new Map()
            });
        }
        const partIndices = [...indexPartsMap.keys()];
        const parts = await storage_1.partStorage.getMediumPartsPerIndex(mediumId, partIndices);
        parts.forEach((value) => {
            tools_1.checkIndices(value);
            if (!value.id) {
                return;
            }
            const tocPart = indexPartsMap.get(tools_1.combiIndex(value));
            if (!tocPart) {
                throw Error("something went wrong. got no value at this part index");
            }
            tocPart.part = value;
        });
        await Promise.all(partIndices
            .filter((index) => parts.every((part) => tools_1.combiIndex(part) !== index || !part.id))
            .map((index) => {
            const partToc = indexPartsMap.get(index);
            if (!partToc) {
                throw Error("something went wrong. got no value at this part index");
            }
            scraperTools_1.checkTocContent(partToc.tocPart, true);
            return storage_1.partStorage
                // @ts-ignore
                .addPart({
                mediumId,
                title: partToc.tocPart.title,
                totalIndex: partToc.tocPart.totalIndex,
                partialIndex: partToc.tocPart.partialIndex
            })
                // @ts-ignore
                .then((part) => partToc.part = part);
        }));
        // 'moves' episodes from the standard part to other parts, if they own the episodes too
        try {
            await scraperTools_1.remapMediumPart(mediumId);
        }
        catch (e) {
            console.error(e);
        }
        return [...indexPartsMap.values()].map((value) => addPartEpisodes(value));
        // catch all errors from promises, so it will not affect others
    })
        .map((value) => value.catch((reason) => {
        logger_1.logError(reason);
        return [];
    }));
    await Promise.all((await Promise.all(promises)).flat());
}
exports.tocHandler = tocHandler;
async function addFeeds(feeds) {
    if (!feeds.length) {
        return;
    }
    // TODO: 04.09.2019 get all feeds from jobs
    let scrapes = [];
    scrapes = scrapes.filter((value) => value.type === types_2.ScrapeType.FEED);
    const scrapeFeeds = feeds.filter((feed) => !scrapes.find((value) => value.link === feed)).filter((value) => value);
    if (!scrapeFeeds.length) {
        return;
    }
    await scraper.addJobs(...scrapeFeeds.map((value) => {
        return {
            arguments: value,
            type: types_1.ScrapeName.feed,
            name: `${types_1.ScrapeName.feed}-${value}`,
            interval: types_1.MilliTime.MINUTE * 10,
            runImmediately: true,
            deleteAfterRun: false
        };
    }));
}
/**
 *
 */
async function processMedia(media, listType, userUuid) {
    // todo update the progress of each user
    const likeMedia = media.map((value) => {
        return {
            title: value.title.text,
            link: value.title.link,
        };
    });
    const currentLikeMedia = await storage_1.mediumStorage.getLikeMedium(likeMedia);
    const foundLikeMedia = [];
    // filter out the media which were found in the storage, leaving only the new ones
    const newMedia = media.filter((value) => {
        const likeMedium = Array.isArray(currentLikeMedia)
            ? currentLikeMedia.find((likedMedium) => {
                return likedMedium.title === value.title.text
                    && likedMedium.link === value.title.link;
            })
            : currentLikeMedia;
        if (likeMedium) {
            foundLikeMedia.push(likeMedium);
            return false;
        }
        return true;
    });
    // if there are new media, queue it for scraping,
    // after adding it to the storage and pushing it to foundLikeMedia
    if (newMedia.length) {
        let storedMedia;
        try {
            storedMedia = await Promise.all(newMedia.map((scrapeMedium) => {
                // noinspection JSCheckFunctionSignatures
                return storage_1.mediumStorage
                    .addMedium({ title: scrapeMedium.title.text, medium: scrapeMedium.medium })
                    .then((value) => {
                    return {
                        medium: value,
                        title: scrapeMedium.title.text,
                        link: scrapeMedium.title.link,
                    };
                });
            }));
        }
        catch (e) {
            logger_1.logError(e);
            return [];
        }
        foundLikeMedia.push(...storedMedia);
    }
    return foundLikeMedia;
}
async function updateDatabase({ removedLists, result, addedLists, renamedLists, allLists, lists }) {
    // TODO: check if this whole message thing is solved with invalidation table from database
    const message = {};
    const promisePool = [];
    if (removedLists.length) {
        storage_1.externalListStorage
            .removeExternalList(result.external.uuid, removedLists)
            .then(() => {
            if (!message.remove) {
                message.remove = {};
            }
            message.remove.externalList = removedLists;
        })
            .catch((error) => logger_1.logError(error));
    }
    // add each new list to the storage
    promisePool.push(...addedLists.map((value) => storage_1.externalListStorage
        .addExternalList(result.external.uuid, {
        name: value.name,
        url: value.link,
        medium: value.medium,
        items: value.media,
    })
        .then((externalList) => {
        if (!message.add) {
            message.add = {};
        }
        if (!message.add.externalList) {
            message.add.externalList = [];
        }
        externalList.uuid = result.external.uuid;
        message.add.externalList.push(externalList);
    })
        .catch((error) => logger_1.logError(error))));
    promisePool.push(...renamedLists.map((value, index) => {
        const id = allLists[index].id;
        return storage_1.externalListStorage
            .updateExternalList({
            id,
            name: value.name,
        })
            .then(() => {
            if (!message.update) {
                message.update = {};
            }
            if (!message.update.lists) {
                message.update.lists = [];
            }
            message.update.lists.push({ external: true, id, name: value.name });
        })
            .catch((error) => logger_1.logError(error));
    }));
    // check whether media were removed or added to the list
    allLists.forEach((externalList, index) => {
        const scrapeList = lists[index];
        const removedMedia = [...externalList.items];
        const newMedia = scrapeList.media.filter((mediumId) => {
            const mediumIndex = removedMedia.indexOf(mediumId);
            if (mediumIndex < 0) {
                return true;
            }
            removedMedia.splice(mediumIndex, 1);
            return false;
        });
        promisePool.push(...removedMedia.map((mediumId) => storage_1.externalListStorage
            .removeItemFromExternalList(externalList.id, mediumId)
            .then(() => {
            if (!message.remove) {
                message.remove = {};
            }
            if (!message.remove.items) {
                message.remove.items = [];
            }
            message.remove.items.push({ external: true, listId: externalList.id, mediumId });
        })
            .catch((error) => logger_1.logError(error))));
        promisePool.push(...newMedia.map((mediumId) => storage_1.externalListStorage
            .addItemToExternalList(externalList.id, mediumId)
            .then(() => {
            if (!message.add) {
                message.add = {};
            }
            if (!message.add.items) {
                message.add.items = [];
            }
            message.add.items.push({ external: true, listId: externalList.id, mediumId });
        })
            .catch((error) => logger_1.logError(error))));
    });
    // update externalUser with (new) cookies and a new lastScrape date (now)
    promisePool.push(storage_1.externalUserStorage
        // @ts-ignore
        .updateExternalUser({
        uuid: result.external.uuid,
        cookies: result.external.cookies,
        lastScrape: new Date(),
    })
        .catch((error) => logger_1.logError(error)));
    await Promise.all(promisePool);
    return message;
}
/**
 *
 */
async function listHandler(result) {
    const feeds = result.lists.feed;
    const lists = result.lists.lists;
    const media = result.lists.media;
    // list of media, which are referenced in the scraped lists
    const likeMedia = await processMedia(media, result.external.type, result.external.userUuid);
    // add feeds to the storage and add them to the scraper
    await addFeeds(feeds);
    const currentLists = await storage_1.externalListStorage.getExternalLists(result.external.uuid);
    // all available stored list, which lie on the same index as the scraped lists
    const allLists = [];
    // new lists, which should be added to the storage
    const addedLists = [];
    // all renamed lists
    const renamedLists = [];
    lists.forEach((scrapeList, index) => {
        // check whether there is some list with the same name
        let listIndex = currentLists.findIndex((list) => list.name === scrapeList.name);
        if (listIndex < 0) {
            // check whether there is some list with the same link even if it is another name
            listIndex = currentLists.findIndex((list) => list.url === scrapeList.link);
            // list was renamed if link is the same
            if (listIndex >= 0) {
                renamedLists.push(scrapeList);
            }
        }
        // if scraped list is neither link or title matched, treat is as a newly added list
        if (listIndex < 0) {
            addedLists.push(scrapeList);
        }
        else {
            allLists[index] = currentLists[listIndex];
        }
        // map the scrapeMedia to their id in the storage
        // @ts-ignore
        scrapeList.media = scrapeList.media.map((scrapeMedium) => {
            const likeMedium = likeMedia.find((like) => {
                return like && like.link === scrapeMedium.title.link;
            });
            if (!likeMedium || !likeMedium.medium) {
                throw Error("missing medium in storage for " + scrapeMedium.title.link);
            }
            return likeMedium.medium.id;
        });
    });
    // lists that are not in the scraped lists => lists that were deleted
    const removedLists = currentLists.filter((value) => !allLists.includes(value)).map((value) => value.id);
    await updateDatabase({
        removedLists,
        result,
        addedLists,
        renamedLists,
        allLists,
        lists
    });
}
async function newsHandler({ link, result }) {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/, " ");
    });
    try {
        await processNews({ link, rawNews: result });
    }
    catch (e) {
        logger_1.logError(e);
    }
}
scraper.on("feed:error", (errorValue) => logger_1.logError(errorValue));
scraper.on("toc:error", (errorValue) => logger_1.logError(errorValue));
scraper.on("list:error", (errorValue) => logger_1.logError(errorValue));
scraper.on("news:error", (errorValue) => logger_1.logError(errorValue));
scraper.on("news", (result) => newsHandler(result).catch((error) => logger_1.logError(error)));
scraper.on("toc", (result) => tocHandler(result).catch((error) => logger_1.logError(error)));
scraper.on("feed", (result) => feedHandler(result).catch((error) => logger_1.logError(error)));
scraper.on("list", (result) => listHandler(result).catch((error) => logger_1.logError(error)));
exports.startCrawler = () => {
    scraper
        .setup()
        .then(() => scraper.start())
        .catch((error) => logger_1.logError(error));
};
//# sourceMappingURL=crawlerStart.js.map