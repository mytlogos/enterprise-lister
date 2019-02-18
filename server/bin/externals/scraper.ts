import {Storage} from "../database";
import {factory, ListScrapeResult} from "./listManager";
import feedParserPromised from "feedparser-promised";
import {addMultiSingle, getElseSet, removeMultiSingle} from "../tools";
import {News, ScrapeItem} from "../types";

// scrape at an interval of 5 min
const interval = 5 * 60 * 1000;

// this one is every 10s
// let interval = 10000;
let paused = true;

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
    let newUserFinished = notify("list", dependants.oneTimeUser.map((value) => list(value)));
    newUserFinished = newUserFinished.then(() => {
        dependants.oneTimeUser.length = 0;
    });

    // todo add medium/toc? scrapes (mediumScrape == toc, or !=?)
    const allPromises = [tocFinished, newsFinished, feedFinished, newUserFinished];

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
        setTimeout(() => scrape().catch(console.log), interval);
    }
}

/**
 *
 * @param value
 * @return {Promise<void>}
 */
async function news(value: ScrapeItem): Promise<void> {
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
 *
 */
async function list(value: { cookies: string, uuid: string }):
    Promise<{ external: { cookies: string, uuid: string }, lists: ListScrapeResult }> {

    const manager = factory(0);
    manager.parseAndReplaceCookies(value.cookies);
    try {
        const lists = await manager.scrapeLists();
        return {external: value, lists};
    } catch (e) {
        return Promise.reject({...value, error: e});
    }
}

// todo filter news with between now and last scrapDate
/**
 *
 * @param {string} feedLink
 * @return {Promise<News>}
 */
async function feed(feedLink: string): Promise<News[]> {
    // noinspection JSValidateTypes
    return feedParserPromised.parse(feedLink)
        .then((items) => items.map((value) => {
            return {
                title: value.title,
                link: value.link,
                // fixme does this seem right?, current date as fallback?
                date: value.pubdate || value.date || new Date(),
            };
        }))
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

    const dependants: ScrapeDependants = {feeds: [], tocs: [], oneTimeUser: [], news: [], media: []};

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


export interface Dependant {
    oneTimeUser?: Array<{ cookies: string, uuid: string }> | { cookies: string, uuid: string };
    feed?: string[] | string;
    news?: any[] | any;
    toc?: any[] | any;
    medium?: any[] | any;
}


/**
 *
 * @param {Dependant} dependant
 */
export function add(dependant: Dependant) {
    const dependants = {feeds: [], tocs: [], oneTimeUser: [], news: [], media: []};

    // @ts-ignore
    addMultiSingle(dependants.oneTimeUser, dependant.oneTimeUser);
    // @ts-ignore
    addMultiSingle(dependants.feeds, dependant.feed);
    addMultiSingle(dependants.news, dependant.news);
    addMultiSingle(dependants.tocs, dependant.toc);
    addMultiSingle(dependants.media, dependant.medium);

    // kick of a cycle and if no error occurs: add it to permanent cycle
    scrape(dependants, false).then(() => {
        // @ts-ignore
        addMultiSingle(scrapeDependants.oneTimeUser, dependant.oneTimeUser);
        // @ts-ignore
        addMultiSingle(scrapeDependants.feeds, dependant.feed);
        addMultiSingle(scrapeDependants.news, dependant.news);
        addMultiSingle(scrapeDependants.tocs, dependant.toc);
        addMultiSingle(scrapeDependants.media, dependant.medium);
    }).catch(console.log);
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
    scrape().catch(console.log);
}

export function on(event: string, callback: (value: any) => void) {
    const callbacks = getElseSet(eventMap, event, () => []);
    callbacks.push(callback);
}
