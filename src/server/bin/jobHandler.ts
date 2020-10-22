import {
    checkIndices,
    combiIndex,
    equalsRelease,
    Errors,
    getElseSet,
    isTocEpisode,
    isTocPart,
    Md5Hash,
    multiSingle
} from "./tools";
import {ListScrapeResult, ScrapeList, ScrapeMedium} from "./externals/listManager";
import {
    EpisodeRelease,
    ExternalList,
    ExternalUserUuid,
    JobRequest,
    LikeMedium,
    MilliTime,
    MinPart,
    News,
    Part,
    ScrapeItem,
    ScrapeName,
    SimpleEpisode,
    SimpleMedium,
    UserUuid
} from "./types";
import logger from "./logger";
import {ScrapeType, Toc, TocEpisode, TocPart} from "./externals/types";
import * as validate from "validate.js";
import {checkTocContent, remapMediumPart} from "./externals/scraperTools";
import {DefaultJobScraper} from "./externals/jobScraperManager";
import {
    episodeStorage,
    externalListStorage,
    externalUserStorage,
    jobStorage,
    mediumStorage,
    newsStorage,
    partStorage,
    storage
} from "./database/storages/storage";
import {MissingResourceError, UrlError} from "./externals/errors";

const scraper = DefaultJobScraper;

// TODO fill out all of the event listener
/**
 *
 */
async function processNews({link, rawNews}: { link: string; rawNews: News[] }): Promise<void> {
    if (!link || !validate.isString(link)) {
        throw Errors.INVALID_INPUT;
    }
    multiSingle(rawNews, (item: News) => delete item.id);

    const newsKey = "news";
    const newsPageInfo = await storage.getPageInfo(link, newsKey);

    if (newsPageInfo.values.length) {
        const newPageInfos: string[] = [];

        rawNews = await Promise.all(rawNews.filter(async (value) => {
            const newsHash = (await Md5Hash.hash(value.title + value.date)).hash;

            const index = newsPageInfo.values.findIndex((hash) => newsHash === hash);

            if (index >= 0) {
                newsPageInfo.values.splice(index, 1);
                return false;
            } else {
                newPageInfos.push(newsHash);
                return true;
            }
        }));
        if (newsPageInfo.values.length || newPageInfos.length) {
            await storage.updatePageInfo(link, newsKey, newPageInfos, newsPageInfo.values);
        }
    }
    let news = await newsStorage.addNews(rawNews);

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

async function feedHandler({link, result}: { link: string; result: News[] }): Promise<void> {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/g, " ");
    });
    try {
        await processNews({link, rawNews: result});
    } catch (e) {
        logger.error(e);
    }
}

async function getTocMedia(tocs: Toc[], uuid?: string)
    : Promise<Map<SimpleMedium, { parts: TocPart[]; episodes: TocEpisode[] }>> {

    const media: Map<SimpleMedium, { parts: TocPart[]; episodes: TocEpisode[] }> = new Map();

    await Promise.all(tocs.map(async (toc) => {
        let medium: SimpleMedium | undefined;

        if (toc.mediumId) {
            // @ts-ignore
            medium = await mediumStorage.getSimpleMedium(toc.mediumId);
        } else {
            const likeMedium = await mediumStorage.getLikeMedium({title: toc.title, link: ""});
            medium = likeMedium.medium;
        }

        if (!medium) {
            const author = toc.authors ? toc.authors[0].name : undefined;
            const artist = toc.artists ? toc.artists[0].name : undefined;
            medium = await mediumStorage.addMedium({
                medium: toc.mediumType,
                title: toc.title,
                author,
                artist,
                stateOrigin: toc.statusCOO,
                stateTL: toc.statusTl,
                languageOfOrigin: toc.langCOO,
                lang: toc.langTL,
            }, uuid);
        } else {
            const author = toc.authors ? toc.authors[0].name : undefined;
            const artist = toc.artists ? toc.artists[0].name : undefined;
            await mediumStorage.updateMediumToc({
                id: 0,
                mediumId: medium.id as number,
                link: toc.link,
                medium: toc.mediumType,
                author,
                artist,
                stateOrigin: toc.statusCOO,
                stateTL: toc.statusTl,
                languageOfOrigin: toc.langCOO,
                lang: toc.langTL,
            });
        }

        if (toc.synonyms) {
            await mediumStorage.addSynonyms({mediumId: medium.id as number, synonym: toc.synonyms});
        }

        if (medium.id && toc.link) {
            await mediumStorage.addToc(medium.id, toc.link);
        } else {
            // TODO: 26.02.2020 what does this imply, should something be done? is this an error?
            logger.warn(`missing toc and id for ${JSON.stringify(medium)} and ${JSON.stringify(toc)}`);
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
            checkTocContent(content, isTocPart(content));

            let alterTitle;
            if (!content.title) {
                alterTitle = `${content.totalIndex}${content.partialIndex ? "." + content.partialIndex : ""}`;
                content.title = alterTitle;
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
                content.episodes.forEach((value) => checkTocContent(value));
                mediumValue.parts.push(content);
            } else {
                throw Error("content neither part nor episode");
            }
        });
    }));
    return media;
}

interface TocPartMapping {
    tocPart: TocPart;
    part?: MinPart;
    episodeMap: Map<number, {
        tocEpisode: TocEpisode; episode?: SimpleEpisode;
    }>;
}

async function addPartEpisodes(value: TocPartMapping): Promise<void> {
    if (!value.part || !value.part.id) {
        throw Error(`something went wrong. got no part for tocPart ${value.tocPart.combiIndex}`);
    }
    value.tocPart.episodes.forEach((episode) => {
        checkTocContent(episode);
        value.episodeMap.set(episode.combiIndex, {tocEpisode: episode});
    });
    // @ts-ignore
    const episodes: SimpleEpisode[] = await episodeStorage.getMediumEpisodePerIndex(
        value.part.mediumId,
        [...value.episodeMap.keys()],
        true
    );

    episodes.forEach((episode) => {
        if (!episode.id) {
            return;
        }
        const tocEpisode = value.episodeMap.get(combiIndex(episode));

        if (!tocEpisode) {
            throw Error("something went wrong. got no value at this episode index");
        }
        tocEpisode.episode = episode;
    });

    const nonNewIndices: number[] = [];
    const allEpisodes: SimpleEpisode[] = [...value.episodeMap.keys()]
        .filter((index) => {
            const notInStorage = episodes.every((episode) => combiIndex(episode) !== index || !episode.id);

            if (notInStorage) {
                return true;
            }
            nonNewIndices.push(index);
        })
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
    const knownEpisodeIds = (nonNewIndices
        .map((index) => episodes.find((episode) => combiIndex(episode) === index))
        .filter((episode) => episode != null) as SimpleEpisode[])
        .map((episode: SimpleEpisode) => episode.id);

    if (knownEpisodeIds.length) {
        const next = value.episodeMap.values().next();

        if (!next.value) {
            throw Error("no episode values for part " + value.part.id);
        }
        const exec = /https?:\/\/([^/]+)/.exec(next.value.tocEpisode.url);
        if (!exec) {
            throw Error("invalid url for release: " + next.value.tocEpisode.url);
        }
        const episodeReleases = await episodeStorage.getReleasesByHost(knownEpisodeIds, exec[0]);
        const updateReleases: EpisodeRelease[] = [];

        const newReleases = nonNewIndices.map((index): EpisodeRelease | undefined => {
            const episodeValue = value.episodeMap.get(index);

            if (!episodeValue) {
                throw Error(`no episodeValue for index ${index} of medium ${value.part && value.part.mediumId}`);
            }
            const currentEpisode = episodeValue.episode;

            if (!currentEpisode) {
                throw Error("known episode has no episode from storage");
            }
            const id = currentEpisode.id;
            const foundRelease = episodeReleases.find((release) =>
                release.url === episodeValue.tocEpisode.url
                && release.episodeId === id);

            const tocRelease: EpisodeRelease = {
                episodeId: id,
                releaseDate: episodeValue.tocEpisode.releaseDate || new Date(),
                title: episodeValue.tocEpisode.title,
                url: episodeValue.tocEpisode.url,
                locked: episodeValue.tocEpisode.locked,
            };
            if (foundRelease) {
                // check in what way the releases differ, there are cases there
                // only the time changes, as the same releases is extracted
                // from a non changing relative Time value, thus having a later absolute time
                if (!equalsRelease(foundRelease, tocRelease)) {
                    const currentValue = tocRelease.releaseDate;
                    tocRelease.releaseDate = foundRelease.releaseDate;

                    if (equalsRelease(foundRelease, tocRelease)) {
                        // differ only in the releaseDate
                        // update only if the new version has an earlier date then the storage one
                        if (currentValue < foundRelease.releaseDate) {
                            updateReleases.push(tocRelease);
                        }
                    } else {
                        // differ in anything else, excluding releaseDate, so restore value and update
                        if (currentValue < foundRelease.releaseDate) {
                            tocRelease.releaseDate = currentValue;
                        } else {
                            tocRelease.releaseDate = foundRelease.releaseDate;
                        }
                        updateReleases.push(tocRelease);
                    }
                }
                return;
            }
            return tocRelease;
        }).filter((v) => v) as EpisodeRelease[];

        if (newReleases.length) {
            await episodeStorage.addRelease(newReleases);
        }
        if (updateReleases.length) {
            await episodeStorage.updateRelease(updateReleases);
        }
    }
    if (allEpisodes.length) {
        await episodeStorage.addEpisode(allEpisodes);
    }
}

export async function tocHandler(result: { tocs: Toc[]; uuid?: string }): Promise<void> {
    if (!result) {
        // TODO: 01.09.2019 for now just return
        return;
    }
    const tocs = result.tocs;
    const uuid = result.uuid;
    logger.debug(`handling toc: ${tocs.map((value) => {
        return {...value, content: value.content.length};
    })} ${uuid}`);

    if (!(tocs && tocs.length)) {
        return;
    }

    const media: Map<SimpleMedium, { parts: TocPart[]; episodes: TocEpisode[] }> = await getTocMedia(tocs, uuid);

    const promises: Array<Promise<Array<Promise<void>>>> = Array.from(media.entries())
        .filter((entry) => entry[0].id)
        .map(async (entry) => {
            const mediumId = entry[0].id as number;

            const tocParts = entry[1].parts;

            if (!tocParts.length && !entry[1].episodes.length) {
                return [];
            }

            const indexPartsMap: Map<number, TocPartMapping> = new Map();

            tocParts.forEach((value) => {
                checkTocContent(value, true);
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
            const parts = await partStorage.getMediumPartsPerIndex(mediumId, partIndices);

            parts.forEach((value) => {
                checkIndices(value);
                if (!value.id) {
                    return;
                }
                const tocPart = indexPartsMap.get(combiIndex(value));

                if (!tocPart) {
                    throw Error(`got no value at this part index: ${combiIndex(value)} of ${JSON.stringify(value)}`);
                }
                tocPart.part = value;
            });

            await Promise.all(partIndices
                .filter((index) => parts.every((part) => combiIndex(part) !== index || !part.id))
                .map((index) => {
                    const partToc = indexPartsMap.get(index);

                    if (!partToc) {
                        throw Error(`got no value at this part index: ${index}`);
                    }
                    checkTocContent(partToc.tocPart, true);
                    return partStorage
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
            try {
                await remapMediumPart(mediumId);
            } catch (e) {
                logger.error(e);
            }

            return [...indexPartsMap.values()].map((value) => addPartEpisodes(value));
            // catch all errors from promises, so it will not affect others
        })
        .map((value) => value.catch((reason) => {
            logger.error(reason);
            return [];
        }));
    await Promise.all((await Promise.all(promises)).flat());
}

async function addFeeds(feeds: string[]): Promise<void> {
    if (!feeds.length) {
        return;
    }
    // TODO: 04.09.2019 get all feeds from jobs
    let scrapes: ScrapeItem[] = [];
    scrapes = scrapes.filter((value) => value.type === ScrapeType.FEED);

    const scrapeFeeds = feeds.filter((feed) => !scrapes.find((value) => value.link === feed)).filter((value) => value);

    if (!scrapeFeeds.length) {
        return;
    }
    await scraper.addJobs(...scrapeFeeds.map((value): JobRequest => {
        return {
            arguments: value,
            type: ScrapeName.feed,
            name: `${ScrapeName.feed}-${value}`,
            interval: MilliTime.MINUTE * 10,
            runImmediately: true,
            deleteAfterRun: false
        };
    }));
}

/**
 *
 */
async function processMedia(media: ScrapeMedium[], listType: number, userUuid: string): Promise<LikeMedium[]> {
    const likeMedia = media.map((value) => {
        return {
            title: value.title.text,
            link: value.title.link,
        };
    });
    const currentLikeMedia: LikeMedium[] = await mediumStorage.getLikeMedium(likeMedia);

    const foundLikeMedia: LikeMedium[] = [];
    const updateMediaPromises: Array<Promise<void>> = [];

    // filter out the media which were found in the storage, leaving only the new ones
    const newMedia = media.filter((value) => {
        const likeMedium = Array.isArray(currentLikeMedia)
            ? currentLikeMedia.find((likedMedium) => {
                return likedMedium.title === value.title.text
                    && likedMedium.link === value.title.link
                    && likedMedium.medium;
            })
            : currentLikeMedia;

        if (likeMedium) {
            foundLikeMedia.push(likeMedium);
            if (likeMedium.medium && likeMedium.medium.id) {
                if (value.title.link) {
                    updateMediaPromises.push(mediumStorage.addToc(likeMedium.medium.id, value.title.link));
                }
                // TODO: 09.03.2020 episode Indices are not relative to the medium, which makes it unusable atm
                // if (value.current && ("partIndex" in value.current || "episodeIndex" in value.current)) {
                //     updateMediaPromises.push(episodeStorage.markLowerIndicesRead(
                //         userUuid,
                //         likeMedium.medium.id,
                //         value.current.partIndex,
                //         value.current.episodeIndex
                //     ));
                // }
            }
            // TODO update the progress of each user via value.latest, value.current
            return false;
        }
        return true;
    });
    // if there are new media, queue it for scraping,
    // after adding it to the storage and pushing it to foundLikeMedia
    let storedMedia: Array<{ title: string; link: string; medium: SimpleMedium }>;
    try {
        storedMedia = await Promise.all(newMedia.map(
            (scrapeMedium) => {
                return mediumStorage
                    .addMedium({
                        title: scrapeMedium.title.text,
                        medium: scrapeMedium.medium,
                    })
                    .then(async (value) => {
                        if (value.id) {
                            if (scrapeMedium.title.link) {
                                await mediumStorage.addToc(value.id, scrapeMedium.title.link);
                            }
                        }
                        return {
                            medium: value,
                            title: scrapeMedium.title.text,
                            link: scrapeMedium.title.link,
                        };
                    });
            }));
        await Promise.all(updateMediaPromises);
    } catch (e) {
        logger.error(e);
        return [];
    }

    foundLikeMedia.push(...storedMedia);
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
    const promisePool: Array<Promise<any>> = [];

    if (removedLists.length) {
        externalListStorage
            .removeExternalList(result.external.uuid, removedLists)
            .catch((error) => logger.error(error));
    }

    // add each new list to the storage
    promisePool.push(...addedLists.map((value) => externalListStorage
        .addExternalList(result.external.uuid, {
            name: value.name,
            url: value.link,
            medium: value.medium,
            items: value.media,
        } as ExternalList)
        .catch((error) => logger.error(error))));

    promisePool.push(...renamedLists.map((value, index) => {
        const id = allLists[index].id;
        return externalListStorage
            .updateExternalList({
                id,
                name: value.name,
            } as ExternalList)
            .catch((error) => logger.error(error));
    }));

    // check whether media were removed or added to the list
    allLists.forEach((externalList, index) => {
        const scrapeList = lists[index];

        const removedMedia = [...externalList.items];
        const newMedia = (scrapeList.media as number[]).filter((mediumId) => {
            const mediumIndex = removedMedia.indexOf(mediumId);
            if (mediumIndex < 0) {
                return true;
            }
            removedMedia.splice(mediumIndex, 1);
            return false;
        });

        // TODO: 09.03.2020 externalLists will not be synchronized totally with
        // promisePool.push(...removedMedia.map((mediumId) => externalListStorage
        //     .removeItemFromExternalList(externalList.id, mediumId)
        //     .catch((error) => logger.error(error))));

        promisePool.push(...newMedia.map((mediumId: number) => externalListStorage
            .addItemToExternalList(externalList.id, mediumId)
            .catch((error) => logger.error(error))));
    });

    // update externalUser with (new) cookies and a new lastScrape date (now)
    promisePool.push(externalUserStorage
        // @ts-ignore
        .updateExternalUser({
            uuid: result.external.uuid,
            cookies: result.external.cookies,
            lastScrape: new Date(),
        })
        .catch((error: any) => logger.error(error)));

    await Promise.all(promisePool);
}

/**
 *
 */
async function listHandler(result: {
    external: { cookies: string; uuid: ExternalUserUuid; userUuid: UserUuid; type: number };
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

    const currentLists = await externalListStorage.getExternalLists(result.external.uuid);

    // all available stored list, which lie on the same index as the scraped lists
    const allLists: ExternalList[] = [];
    // new lists, which should be added to the storage
    const addedLists: ScrapeList[] = [];
    // all renamed lists
    const renamedLists: ScrapeList[] = [];

    lists.forEach((scrapeList, index) => {
        // check whether there is some list with the same name
        const listIndex = currentLists.findIndex((list) => list.name === scrapeList.name);

        // TODO: 09.03.2020 with the current ListManager, the lists do not have different links,
        //  so renaming lists cannot be detected
        // if (listIndex < 0) {
        //     // check whether there is some list with the same link even if it is another name
        //     listIndex = currentLists.findIndex((list) => list.url === scrapeList.link);
        //
        //     // list was renamed if link is the same
        //     if (listIndex >= 0) {
        //         renamedLists.push(scrapeList);
        //     }
        // }

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

async function newsHandler({link, result}: { link: string; result: News[] }) {
    result.forEach((value) => {
        value.title = value.title.replace(/(\s|\n|\t)+/, " ");
    });
    try {
        await processNews({link, rawNews: result});
    } catch (e) {
        logger.error(e);
    }
}

async function tocErrorHandler(error: Error) {
    // TODO: 10.03.2020 remove any releases associated? with this toc
    //  to do that, it needs to be checked if there are other toc from this domain (unlikely)
    //  and if there are to scrape them and delete any releases that are not contained in them
    //  if there aren't any other tocs on this domain, remove all releases from that domain
    try {
        if (error instanceof MissingResourceError) {
            logger.warn("toc will be removed, resource was seemingly deleted from: " + error.resource);
            await mediumStorage.removeToc(error.resource);
            await jobStorage.removeJobLike("name", error.resource);
        } else if (error instanceof UrlError) {
            logger.warn("toc will be removed, url is not what the scraper expected: " + error.url);
            await mediumStorage.removeToc(error.url);
            await jobStorage.removeJobLike("name", error.url);
        } else {
            logger.error(error);
        }
    } catch (e) {
        logger.error(e);
    }
}

scraper.on("feed:error", (errorValue: any) => logger.error(errorValue));
scraper.on("toc:error", (errorValue: any) => tocErrorHandler(errorValue));
scraper.on("list:error", (errorValue: any) => logger.error(errorValue));

scraper.on("news:error", (errorValue: any) => logger.error(errorValue));
scraper.on("news", (result) => newsHandler(result).catch((error) => logger.error(error)));
scraper.on("toc", (result) => tocHandler(result).catch((error) => logger.error(error)));
scraper.on("feed", (result) => feedHandler(result).catch((error) => logger.error(error)));

scraper.on("list", (result) => listHandler(result).catch((error) => logger.error(error)));

export const startCrawler = (): void => {
    scraper
        .setup()
        .then(() => scraper.start())
        .catch((error) => logger.error(error));
};
