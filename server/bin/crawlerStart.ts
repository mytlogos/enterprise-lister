import {Storage} from "./database/database";
import {combiIndex, Errors, getElseSet, isTocEpisode, isTocPart, Md5Hash, multiSingle} from "./tools";
import {ListScrapeResult, ScrapeList, ScrapeMedium} from "./externals/listManager";
import {ExternalList, LikeMedium, News, Part, SimpleEpisode, SimpleMedium} from "./types";
import logger, {logError} from "./logger";
import {Toc, TocEpisode, TocPart} from "./externals/types";
import * as validate from "validate.js";
import {ScrapeTypes} from "./externals/scraperTools";
import {DefaultJobScraper} from "./externals/jobScraper";

const scraper = DefaultJobScraper;

// todo fill out all of the event listener
/**
 *
 */
async function processNews({link, rawNews}: { link: string, rawNews: News[] }): Promise<void> {
    if (!link || !validate.isString(link)) {
        throw Errors.INVALID_INPUT;
    }
    multiSingle(rawNews, (item: News) => delete item.id);

    const newsKey = "news";
    const newsPageInfo = await Storage.getPageInfo(link, newsKey);

    if (newsPageInfo.values.length) {
        const newPageInfos: string[] = [];

        rawNews = rawNews.filter((value) => {
            const newsHash = Md5Hash.hash(value.title + value.date).hash;

            const index = newsPageInfo.values.findIndex((hash) => newsHash === hash);

            if (index >= 0) {
                newsPageInfo.values.splice(index, 1);
                return false;
            } else {
                newPageInfos.push(newsHash);
                return true;
            }
        });
        if (newsPageInfo.values.length || newPageInfos.length) {
            await Storage.updatePageInfo(link, newsKey, newPageInfos, newsPageInfo.values);
        }
    }
    let news = await Storage.addNews(rawNews);

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

async function feedHandler({link, result}: { link: string, result: News[] }): Promise<void> {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/g, " ");
    });
    try {
        await processNews({link, rawNews: result});
    } catch (e) {
        logError(e);
    }
}

async function getTocMedia(result: { tocs: Toc[]; uuid: string }, uuid: string)
    : Promise<Map<SimpleMedium, { parts: TocPart[]; episodes: TocEpisode[] }>> {

    const media: Map<SimpleMedium, { parts: TocPart[], episodes: TocEpisode[]; }> = new Map();

    await Promise.all(result.tocs.map(async (toc) => {
        let medium: SimpleMedium | undefined;

        if (toc.mediumId) {
            // @ts-ignore
            medium = await Storage.getSimpleMedium(toc.mediumId);
        } else {
            const likeMedium = await Storage.getLikeMedium({title: toc.title, link: ""});
            medium = likeMedium.medium;
        }

        if (!medium) {
            medium = await Storage.addMedium({medium: toc.mediumType, title: toc.title}, uuid);
        }

        if (medium.id && toc.link) {
            await Storage.addToc(medium.id, toc.link);
        } else {
            console.log("missing");
        }

        const mediumValue = getElseSet(media, medium, () => {
            return {
                episodes: [],
                parts: []
            };
        });

        toc.content.forEach((content) => {
            if (!content || content.totalIndex == null) {
                throw Error(`invalid tocContent for mediumId:'${medium && medium.id}' and link:'${toc.link}'`);
            }
            const totalIndex = Math.floor(content.totalIndex);
            content.totalIndex = totalIndex;
            const partialIndex = content.totalIndex - totalIndex;

            let alterTitle;
            if (!content.title) {
                alterTitle = `${content.totalIndex}${content.partialIndex ? "." + content.partialIndex : ""}`;
                content.title = alterTitle;
            }
            if (partialIndex) {
                content.partialIndex = partialIndex;
            }
            if (isTocEpisode(content)) {
                if (alterTitle) {
                    content.title = `Episode ${content.title}`;
                }
                mediumValue.episodes.push(content);
            } else if (isTocPart(content)) {
                if (alterTitle) {
                    content.title = `Volume ${content.title}`;
                }
                mediumValue.parts.push(content);
            } else {
                throw Error("content neither part nor episode");
            }
        });
    }));
    return media;
}

type TocMap = Map<number, {
    tocPart: TocPart,
    part?: Part,
    episodeMap: Map<number, {
        tocEpisode: TocEpisode,
        episode?: SimpleEpisode
    }>
}>;

async function remapParts(indexPartsMap: TocMap, mediumId: number) {

    const values = [...indexPartsMap.values()];

    const standardTocPart = values.find((value) => value.tocPart.totalIndex === -1);
    let standardPart;

    if (!standardTocPart || !standardTocPart.part) {
        standardPart = await Storage.getStandardPart(mediumId);

        if (standardTocPart) {
            standardTocPart.part = standardPart;
        }
    } else {
        standardPart = standardTocPart.part;
    }
    // if there is no standard part, we return as there is no part to move from
    if (!standardPart) {
        return;
    }
    values.forEach((value) => {
        if (!value.part) {
            throw Error("tocPart without part!");
        }
    });
    const [standardPartEpisodeIndices] = await Storage.getPartsEpisodeIndices(standardPart.id);

    if (!standardPartEpisodeIndices) {
        return;
    }
    const episodePartMap = new Map<number, number>();

    for (const episodeIndex of standardPartEpisodeIndices.episodes) {
        for (const part of values) {
            // skip standard parts here
            if (part.tocPart.totalIndex === -1) {
                continue;
            }
            if (!part.part) {
                throw Error("tocPart without part!");
            }
            if (part.tocPart.episodes.find((value) => value.totalIndex + (value.partialIndex || 0) === episodeIndex)) {
                const partId = episodePartMap.get(episodeIndex);
                if (partId != null && partId !== part.part.id) {
                    throw Error(`episode ${episodeIndex} owned by multiple parts: '${partId}' and '${part.part.id}'`);
                }
                episodePartMap.set(episodeIndex, part.part.id);
                break;
            }
        }
    }
    const partEpisodes = new Map<number, number[]>();
    for (const [episodeId, partId] of episodePartMap.entries()) {
        const episodes = getElseSet(partEpisodes, partId, () => []);
        episodes.push(episodeId);
    }

    const promises = [];
    for (const [partId, episodeIds] of partEpisodes.entries()) {
        promises.push(Storage.moveEpisodeToPart(episodeIds, partId));
    }
    await Promise.all(promises);
}

interface TocPartMapping {
    tocPart: TocPart;
    part?: Part;
    episodeMap: Map<number, {
        tocEpisode: TocEpisode, episode?: SimpleEpisode
    }>;
}

async function addPartEpisodes(value: TocPartMapping): Promise<void> {

    if (!value.part) {
        throw Error(`something went wrong. got no part for tocPart ${value.tocPart.combiIndex}`);
    }
    value.tocPart.episodes.forEach((episode) => {
        value.episodeMap.set(episode.combiIndex, {tocEpisode: episode});
    });
    // @ts-ignore
    const episodes: SimpleEpisode[] = await Storage.getPartEpisodePerIndex(
        value.part.id,
        [...value.episodeMap.keys()]
    );

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

    const allEpisodes: SimpleEpisode[] = [...value.episodeMap.keys()]
        .filter((index) => !episodes.find((episode) => combiIndex(episode) === index))
        .map((episodeIndex): SimpleEpisode => {
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
    await Storage.addEpisode(allEpisodes);
}

export async function tocHandler(result: { tocs: Toc[], uuid: string }): Promise<void> {
    console.log(`handling toc: ${result.tocs} ${result.uuid}`);
    if (!(result.tocs && result.tocs.length)) {
        return;
    }
    // todo do not only search for episodes and parts with totalIndex, but with partialIndex too

    const uuid = result.uuid;

    const media: Map<SimpleMedium, { parts: TocPart[], episodes: TocEpisode[]; }> = await getTocMedia(result, uuid);

    const promises: Array<Promise<Array<Promise<void>>>> = Array.from(media.entries())
        .filter((entry) => entry[0].id)
        .map(async (entry) => {
            const mediumId = entry[0].id as number;

            const tocParts = entry[1].parts;
            const indexPartsMap: Map<number, TocPartMapping> = new Map();

            tocParts.forEach((value) => {
                if (value.totalIndex == null) {
                    throw Error(`totalIndex should not be null! mediumId: '${mediumId}'`);
                }
                indexPartsMap.set(value.combiIndex, {tocPart: value, episodeMap: new Map()});
            });

            if (entry[1].episodes.length) {
                indexPartsMap.set(-1, {
                    tocPart: {title: "", totalIndex: -1, combiIndex: -1, episodes: entry[1].episodes},
                    episodeMap: new Map()
                });
            }

            const partIndices = [...indexPartsMap.keys()];
            const parts = await Storage.getMediumPartsPerIndex(mediumId, partIndices);

            parts.forEach((value) => {
                if (!value.id) {
                    return;
                }
                const tocPart = indexPartsMap.get(combiIndex(value));

                if (!tocPart) {
                    throw Error("something went wrong. got no value at this part index");
                }
                tocPart.part = value;
            });

            await Promise.all(partIndices
                .filter((index) => parts.every((part) => combiIndex(part) !== index || !part.id))
                .map((index) => {
                    const partToc = indexPartsMap.get(index);

                    if (!partToc) {
                        throw Error("something went wrong. got no value at this part index");
                    }

                    return Storage
                    // @ts-ignore
                        .addPart({
                            mediumId,
                            title: partToc.tocPart.title,
                            totalIndex: partToc.tocPart.totalIndex,
                            partialIndex: partToc.tocPart.partialIndex
                        })
                        // @ts-ignore
                        .then((part: Part) => partToc.part = part);
                }));
            // 'moves' episodes from the standard part to other parts, if they own the episodes too
            await remapParts(indexPartsMap, mediumId);

            return [...indexPartsMap.values()].map((value) => addPartEpisodes(value));
        });
    await Promise.all((await Promise.all(promises)).flat());
}

async function addFeeds(feeds: string[]): Promise<void> {
    if (!feeds.length) {
        return;
    }
    let scrapes = await Storage.getScrapes();
    scrapes = scrapes.filter((value) => value.type === ScrapeTypes.FEED);

    const scrapeFeeds = feeds.map((feed) => {
        if (scrapes.find((value) => value.link === feed)) {
            return;
        }
        return {
            link: feed,
            type: ScrapeTypes.FEED,
        };
    }).filter((value) => value);

    if (!scrapeFeeds.length) {
        return;
    }
    // @ts-ignore
    await Storage.addScrape(scrapeFeeds);
}

/**
 *
 */
async function processMedia(media: ScrapeMedium[], listType: number, userUuid: string): Promise<LikeMedium[]> {
    // todo update the progress of each user
    const likeMedia = media.map((value) => {
        return {
            title: value.title.text,
            link: value.title.link,
        };
    });
    const currentLikeMedia = await Storage.getLikeMedium(likeMedia);

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
        let storedMedia: Array<{ title: string, link: string, medium: SimpleMedium }>;
        try {
            storedMedia = await Promise.all(newMedia.map(
                (scrapeMedium) => {
                    // noinspection JSCheckFunctionSignatures
                    return Storage
                        .addMedium({title: scrapeMedium.title.text, medium: scrapeMedium.medium})
                        .then((value) => {
                            return {
                                medium: value,
                                title: scrapeMedium.title.text,
                                link: scrapeMedium.title.link,
                            };
                        });
                }));
        } catch (e) {
            console.log(e);
            logger.error(e);
            return [];
        }

        foundLikeMedia.push(...storedMedia);

        // queue newly added media for scraping
        scraper.addDependant({
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

interface ChangeContent {
    removedLists: any;
    result: { external: { cookies: string; uuid: string; userUuid: string; type: number }; lists: ListScrapeResult };
    addedLists: ScrapeList[];
    renamedLists: ScrapeList[];
    allLists: ExternalList[];
    lists: any;
}

async function updateDatabase({removedLists, result, addedLists, renamedLists, allLists, lists}: ChangeContent) {
    // TODO: check if this whole message thing is solved with invalidation table from database
    const message: any = {};
    const promisePool = [];

    if (removedLists.length) {
        Storage
            .removeExternalList(result.external.uuid, removedLists)
            .then(() => {
                if (!message.remove) {
                    message.remove = {};
                }
                message.remove.externalList = removedLists;
            })
            .catch((error) => {
                console.log(error);
                logger.error(error);
            });
    }

    // add each new list to the storage
    promisePool.push(...addedLists.map((value) => Storage
        .addExternalList(result.external.uuid, {
            name: value.name,
            url: value.link,
            medium: value.medium,
            items: value.media,
        } as ExternalList)
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
            logger.error(error);
        })));

    promisePool.push(...renamedLists.map((value, index) => {
        const id = allLists[index].id;
        return Storage
            .updateExternalList({
                id,
                name: value.name,
            } as ExternalList)
            .then(() => {
                if (!message.update) {
                    message.update = {};
                }

                if (!message.update.lists) {
                    message.update.lists = [];
                }

                message.update.lists.push({external: true, id, name: value.name});
            })
            .catch((error) => {
                console.log(error);
                logger.error(error);
            });
    }));

    // check whether media were removed or added to the list
    allLists.forEach((externalList, index) => {
        const scrapeList = lists[index];

        const removedMedia = [...externalList.items];
        // @ts-ignore
        const newMedia = scrapeList.media.filter((mediumId: number) => {
            const mediumIndex = removedMedia.indexOf(mediumId);
            if (mediumIndex < 0) {
                return true;
            }
            removedMedia.splice(mediumIndex, 1);
            return false;
        });

        promisePool.push(...removedMedia.map((mediumId) => Storage
            .removeItemFromExternalList(externalList.id, mediumId)
            .then(() => {
                if (!message.remove) {
                    message.remove = {};
                }
                if (!message.remove.items) {
                    message.remove.items = [];
                }
                message.remove.items.push({external: true, listId: externalList.id, mediumId});
            })
            .catch((error) => {
                console.log(error);
                logger.error(error);
            })));

        promisePool.push(...newMedia.map((mediumId: number) => Storage
            .addItemToExternalList(externalList.id, mediumId)
            .then(() => {
                if (!message.add) {
                    message.add = {};
                }
                if (!message.add.items) {
                    message.add.items = [];
                }
                message.add.items.push({external: true, listId: externalList.id, mediumId});
            })
            .catch((error) => {
                console.log(error);
                logger.error(error);
            })));
    });

    // update externalUser with (new) cookies and a new lastScrape date (now)
    promisePool.push(Storage
    // @ts-ignore
        .updateExternalUser({
            uuid: result.external.uuid,
            cookies: result.external.cookies,
            lastScrape: new Date(),
        })
        .catch((error: any) => {
            console.log(error);
            logger.error(error);
        }));

    await Promise.all(promisePool);
    return message;
}

/**
 *
 */
async function listHandler(result: {
    external: { cookies: string, uuid: string, userUuid: string, type: number },
    lists: ListScrapeResult;
})
    : Promise<void> {

    const feeds = result.lists.feed;
    const lists = result.lists.lists;
    const media = result.lists.media;

    // list of media, which are referenced in the scraped lists
    const likeMedia = await processMedia(media, result.external.type, result.external.userUuid);
    // add feeds to the storage and add them to the scraper
    await addFeeds(feeds);

    const currentLists = await Storage.getExternalLists(result.external.uuid);

    // all available stored list, which lie on the same index as the scraped lists
    const allLists: ExternalList[] = [];
    // new lists, which should be added to the storage
    const addedLists: ScrapeList[] = [];
    // all renamed lists
    const renamedLists: ScrapeList[] = [];

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
        } else {
            allLists[index] = currentLists[listIndex];
        }

        // map the scrapeMedia to their id in the storage
        // @ts-ignore
        scrapeList.media = scrapeList.media.map((scrapeMedium: ScrapeMedium) => {
            const likeMedium = likeMedia.find((like: LikeMedium) => {
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

async function newsHandler({link, result}: { link: string, result: News[] }) {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/, " ");
    });
    try {
        await processNews({link, rawNews: result});
    } catch (e) {
        logger.error(e);
        console.log(e);
    }
}

scraper.on("feed:error", (errorValue: any) => logError(errorValue));
scraper.on("toc:error", (errorValue: any) => logError(errorValue));
scraper.on("list:error", (errorValue: any) => logError(errorValue));

scraper.on("news:error", (errorValue: any) => logError(errorValue));
scraper.on("news", (result) => newsHandler(result).catch((error) => logError(error)));
scraper.on("toc", (result) => tocHandler(result).catch((error) => logError(error)));
scraper.on("feed", (result) => feedHandler(result).catch((error) => logError(error)));

scraper.on("list", (result) => listHandler(result).catch((error) => logError(error)));

export const startCrawler = (): void => {
    scraper
        .setup()
        .then(() => scraper.start())
        .catch((error) => logError(error));
};
