"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const scraper = tslib_1.__importStar(require("./externals/scraper"));
const database_1 = require("./database/database");
const tools_1 = require("./tools");
const logger_1 = tslib_1.__importStar(require("./logger"));
const validate = tslib_1.__importStar(require("validate.js"));
// todo look into database trigger or maybe replace it with database listener, which notify user on changes?
// todo fill out all of the event listener
/**
 *
 */
async function notifyUser({ link, rawNews }) {
    if (!link || !validate.isString(link)) {
        throw tools_1.Errors.INVALID_INPUT;
    }
    tools_1.multiSingle(rawNews, (item) => delete item.id);
    const newsKey = "news";
    const newsPageInfo = await database_1.Storage.getPageInfo(link, newsKey);
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
            await database_1.Storage.updatePageInfo(link, newsKey, newPageInfos, newsPageInfo.values);
        }
    }
    let news = await database_1.Storage.addNews(rawNews);
    if (Array.isArray(news)) {
        news = news.filter((value) => value);
    }
    if (!news || (Array.isArray(news) && !news.length)) {
        return;
    }
    // set news to medium
    await database_1.Storage.linkNewsToMedium();
}
function extractNewsMeta() {
    const likelyChapReg = /(\W|^)((ch(apter|(\.?\s?\d+)))|c\d+|episode|((extra|intermission|side.story).+))([^a-z]|$)/i;
    const probableChapReg = /(\W|^)part([^a-z]|$)/i;
    const likelyChapRegSensitive = /(\W|^)SS([^a-z]|$)/;
    const likelyVolReg = /(\W|^)(Vol(ume|\.)|v\d+|Arc|book)([^a-z]|$)/i;
    const volChapReg = /(\d+)-(\d+)/;
    const numberReg = /\d+/;
    /*if (chapter) {
        // if the chapter match is not at the beginning, sth else (novel title likely) is preceding it
        const chapStart = chapter.chapter.index;

        if (chapStart) {
            let novel = chapter.text.substring(0, chapStart).trim();

            if (chapter.volume) {
                const volStart = chapter.volume.index;
                result.volume = chapter.text.substring(volStart, chapStart);

                const volIndex = result.volume.match(/\d+/);
                result.volIndex = volIndex && volIndex[0];

                if (volStart) {
                    novel = chapter.text.substring(0, volStart).trim();
                } else {
                    novel = "";
                }
            }
            result.novel = novel;
        }

        result.chapter = chapter.text.substring(chapStart);

        const chapIndex = result.chapter.match(/\d+([,.]\d+)?/);
        result.chapIndex = chapIndex && chapIndex[0];
    }
    let volume;

    if (!result.volume) {
        volume = volumes[0];

        if (volume && !volume.chapter) {
            const volStart = volume.volume.index;
            result.volume = volume.text.substring(volStart);

            const volIndex = result.volume.match(/\d+([,.]\d+)?/);
            result.volIndex = volIndex && volIndex[0];

            if (volStart) {
                result.novel = volume.text.substring(0, volStart).trim();
            }
        }
    }*/
}
async function feedHandler({ link, result }) {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/g, " ");
    });
    try {
        await notifyUser({ link, rawNews: result });
    }
    catch (e) {
        logger_1.logError(e);
    }
}
async function tocHandler(result) {
    if (!(result.toc && result.toc.length)) {
        return;
    }
    // todo do not only search for episodes and parts with totalIndex, but with partialIndex too
    const uuid = result.uuid;
    const media = new Map();
    await Promise.all(result.toc.map(async (toc) => {
        let medium;
        if (toc.mediumId) {
            // @ts-ignore
            medium = await database_1.Storage.getMedium(toc.mediumId, uuid);
        }
        else {
            const likeMedium = await database_1.Storage.getLikeMedium({ title: toc.title, link: "" });
            medium = likeMedium.medium;
        }
        if (!medium) {
            medium = await database_1.Storage.addMedium({ medium: toc.mediumType, title: toc.title }, uuid);
        }
        if (medium.id && toc.link) {
            await database_1.Storage.addToc(medium.id, toc.link);
        }
        const mediumValue = tools_1.getElseSet(media, medium, () => {
            return {
                episodes: [],
                parts: []
            };
        });
        toc.content.forEach((content) => {
            const totalIndex = Math.floor(content.index);
            const partialIndex = content.index - totalIndex;
            if (partialIndex) {
                content.partialIndex = partialIndex;
            }
            if (tools_1.isTocEpisode(content)) {
                mediumValue.episodes.push(content);
            }
            else if (tools_1.isTocPart(content)) {
                mediumValue.parts.push(content);
            }
            else {
                throw Error("content neither part nor episode");
            }
        });
    }));
    const promises = Array.from(media.entries())
        .filter((entry) => entry[0].id)
        .map(async (entry) => {
        const mediumId = entry[0].id;
        const tocParts = entry[1].parts;
        const partsMap = new Map();
        tocParts.forEach((value) => {
            partsMap.set(value.index, { tocPart: value, episodeMap: new Map() });
        });
        if (entry[1].episodes.length) {
            partsMap.set(-1, { tocPart: { title: "", index: -1, episodes: entry[1].episodes }, episodeMap: new Map() });
        }
        const parts = await database_1.Storage.getMediumPartsPerIndex(mediumId, [...partsMap.keys()]);
        parts.forEach((value) => {
            if (!value.id) {
                return;
            }
            const tocPart = partsMap.get(value.totalIndex);
            if (!tocPart) {
                throw Error("something went wrong. got no value at this part index");
            }
            tocPart.part = value;
        });
        await Promise.all(parts.filter((value) => !value.id).map((value) => {
            const partToc = partsMap.get(value.totalIndex);
            if (!partToc) {
                throw Error("something went wrong. got no value at this part index");
            }
            return database_1.Storage
                // @ts-ignore
                .addPart(mediumId, {
                totalIndex: partToc.tocPart.index,
                title: partToc.tocPart.title,
                partialIndex: partToc.tocPart.partialIndex
            })
                // @ts-ignore
                .then((part) => partToc.part = part);
        }));
        return [...partsMap.values()].map(async (value) => {
            if (!value.part) {
                throw Error("something went wrong. got no part for tocPart");
            }
            value.tocPart.episodes.forEach((episode) => value.episodeMap.set(episode.index, { tocEpisode: episode }));
            // @ts-ignore
            const episodes = await database_1.Storage.getPartEpisodePerIndex(value.part.id, [...value.episodeMap.keys()]);
            episodes.forEach((episode) => {
                if (!episode.id) {
                    return;
                }
                const tocEpisode = value.episodeMap.get(episode.totalIndex);
                if (!tocEpisode) {
                    throw Error("something went wrong. got no value at this episode index");
                }
                tocEpisode.episode = episode;
            });
            await Promise.all(episodes.filter((episode) => !episode.id).map((episode) => {
                const episodeToc = value.episodeMap.get(episode.totalIndex);
                if (!episodeToc) {
                    throw Error("something went wrong. got no value at this episode index");
                }
                return database_1.Storage
                    // @ts-ignore
                    .addEpisode(value.part.id, {
                    // @ts-ignore
                    totalIndex: episodeToc.tocEpisode.index,
                    partialIndex: episodeToc.tocEpisode.partialIndex,
                    releases: [{
                            title: episodeToc.tocEpisode.title,
                            url: episodeToc.tocEpisode.url,
                            releaseDate: episodeToc.tocEpisode.releaseDate || new Date()
                        }]
                })
                    .then((addedEpisode) => episodeToc.episode = addedEpisode);
            }));
        });
    });
    await Promise.all((await Promise.all(promises)).flat());
    logger_1.default.info("toc: " + JSON.stringify(result));
}
async function addFeeds(feeds) {
    if (!feeds.length) {
        return;
    }
    let scrapes = await database_1.Storage.getScrapes();
    scrapes = scrapes.filter((value) => value.type === scraper.scrapeTypes.FEED);
    const scrapeFeeds = feeds.map((feed) => {
        if (scrapes.find((value) => value.link === feed)) {
            return;
        }
        return {
            link: feed,
            type: scraper.scrapeTypes.FEED,
        };
    }).filter((value) => value);
    if (!scrapeFeeds.length) {
        return;
    }
    // @ts-ignore
    await database_1.Storage.addScrape(scrapeFeeds);
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
    const currentLikeMedia = await database_1.Storage.getLikeMedium(likeMedia);
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
                return database_1.Storage
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
            console.log(e);
            logger_1.default.error(e);
            return [];
        }
        foundLikeMedia.push(...storedMedia);
        // queue newly added media for scraping
        scraper.add({
            medium: storedMedia.map((value) => {
                return {
                    id: value.medium.id,
                    listType,
                };
            }),
        });
    }
    return foundLikeMedia;
}
async function updateDatabase({ removedLists, result, addedLists, renamedLists, allLists, lists }) {
    // TODO: check if this whole message thing is solved with invalidation table from database
    const message = {};
    const promisePool = [];
    if (removedLists.length) {
        database_1.Storage
            .removeExternalList(result.external.uuid, removedLists)
            .then(() => {
            if (!message.remove) {
                message.remove = {};
            }
            message.remove.externalList = removedLists;
        })
            .catch((error) => {
            console.log(error);
            logger_1.default.error(error);
        });
    }
    // add each new list to the storage
    promisePool.push(...addedLists.map((value) => database_1.Storage
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
        .catch((error) => {
        console.log(error);
        logger_1.default.error(error);
    })));
    promisePool.push(...renamedLists.map((value, index) => {
        const id = allLists[index].id;
        return database_1.Storage
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
            .catch((error) => {
            console.log(error);
            logger_1.default.error(error);
        });
    }));
    // check whether media were removed or added to the list
    allLists.forEach((externalList, index) => {
        const scrapeList = lists[index];
        const removedMedia = [...externalList.items];
        // @ts-ignore
        const newMedia = scrapeList.media.filter((mediumId) => {
            const mediumIndex = removedMedia.indexOf(mediumId);
            if (mediumIndex < 0) {
                return true;
            }
            removedMedia.splice(mediumIndex, 1);
            return false;
        });
        promisePool.push(...removedMedia.map((mediumId) => database_1.Storage
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
            .catch((error) => {
            console.log(error);
            logger_1.default.error(error);
        })));
        promisePool.push(...newMedia.map((mediumId) => database_1.Storage
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
            .catch((error) => {
            console.log(error);
            logger_1.default.error(error);
        })));
    });
    // update externalUser with (new) cookies and a new lastScrape date (now)
    promisePool.push(database_1.Storage
        // @ts-ignore
        .updateExternalUser({
        uuid: result.external.uuid,
        cookies: result.external.cookies,
        lastScrape: new Date(),
    })
        .catch((error) => {
        console.log(error);
        logger_1.default.error(error);
    }));
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
    const currentLists = await database_1.Storage.getExternalLists(result.external.uuid);
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
        await notifyUser({ link, rawNews: result });
    }
    catch (e) {
        logger_1.default.error(e);
        console.log(e);
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
const listenerList = [];
exports.startCrawler = () => {
    scraper.setup().then(() => scraper.start()).catch((error) => {
        console.log(error);
        logger_1.default.error(error);
    });
};
/**
 *
 * @param {function} listener
 * @return {undefined}
 */
exports.addErrorListener = (listener) => {
    listenerList.push(listener);
};
//# sourceMappingURL=crawlerStart.js.map