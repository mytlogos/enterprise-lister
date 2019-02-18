import * as scraper from "./externals/scraper";
import {Storage} from "./database";
import {broadCastNews, sendMessage} from "./websocketManager";
import {multiSingle} from "./tools";
import {ListScrapeResult, ScrapeList, ScrapeMedium} from "./externals/listManager";
import {ExternalList, LikeMedium, Medium, News} from "./types";

// todo look into database trigger or maybe replace it with database listener, which notify user on changes?
// todo fill out all of the event listener
/**
 *
 */
async function notifyUser(rawNews: News[]): Promise<void> {
    multiSingle(rawNews, (item) => delete item.id);

    let news = await Storage.addNews(rawNews);

    if (Array.isArray(news)) {
        news = news.filter((value) => value);
    }
    if (!news || (Array.isArray(news) && !news.length)) {
        return;
    }
    // set news to medium
    await Storage.linkNewsToMedium();
    // broadcast news to online user
    // @ts-ignore
    broadCastNews(news);
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

/**
 *
 * @param result
 * @return {Promise<void>}
 */
async function feedHandler(result: News[]): Promise<void> {
    try {
        await notifyUser(result);
    } catch (e) {
        console.log(e);
    }
}

async function tocHandler(result: any): Promise<void> {
    console.log("toc: ", result);
}

async function addFeeds(feeds: string[]): Promise<void> {
    if (!feeds.length) {
        return;
    }
    let scrapes = await Storage.getScrapes();
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
        const storedMedia: Array<{ title: string, link: string, medium: Medium }> = await Promise.all(newMedia.map(
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
            if (!likeMedium) {
                throw Error("missing medium in storage for " + scrapeMedium.title.link);
            }
            return likeMedium.medium.id;
        });
    });
    // lists that are not in the scraped lists => lists that were deleted
    const removedLists = currentLists.filter((value) => !allLists.includes(value)).map((value) => value.id);
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
            .catch(console.log);
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
        .catch(console.log)));

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
            .catch(console.log);
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
            .catch(console.log)));

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
            .catch(console.log)));
    });

    // update externalUser with (new) cookies and a new lastScrape date (now)
    promisePool.push(Storage
    // @ts-ignore
        .updateExternalUser({
            uuid: result.external.uuid,
            cookies: result.external.cookies,
            lastScrape: new Date(),
        })
        .catch(console.log));

    await Promise.all(promisePool);
    sendMessage(result.external.userUuid, message);
}

/**
 *
 * @param result
 * @return {Promise<void>}
 */
async function newsHandler(result: News[]) {
    console.log("news: ", result);
    try {
        await notifyUser(result);
    } catch (e) {
        console.log(e);
    }
}

scraper.on("feed:error", (errorValue: any) => {
    console.log(errorValue);
});

scraper.on("toc:error", (errorValue: any) => {
    console.log(errorValue);
});

scraper.on("list:error", (errorValue: any) => {
    console.log(errorValue);

});

scraper.on("news:error", (errorValue: any) => {
    console.log(errorValue);

});

scraper.on("news", (result: any) => newsHandler(result).catch(console.log));
scraper.on("toc", (result: any) => tocHandler(result).catch(console.log));
scraper.on("feed", (result: any) => feedHandler(result).catch(console.log));
scraper.on("list", (result: any) => listHandler(result).catch(console.log));

const listenerList = [];

export const startCrawler = (): void => {
    scraper.setup().then(() => scraper.start()).catch(console.log);
};

/**
 *
 * @param {function} listener
 * @return {undefined}
 */
export const addErrorListener = (listener: (error: Error) => void): void => {
    listenerList.push(listener);
};
