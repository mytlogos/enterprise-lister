import {Storage} from "../database/database";
import logger, {logError} from "../logger";
import {addMultiSingle, delay, removeMultiSingle} from "../tools";
import {
    checkTocs,
    feed,
    list,
    news,
    oneTimeToc,
    processNewsScraper,
    ScrapeDependants,
    Scraper,
    ScraperHelper,
    scrapeTypes,
    toc
} from "./scraperTools";
import {Dependant} from "./types";

// scrape at an interval of 5 min
const interval = 5 * 60 * 1000;

export class IntervalScraper implements Scraper {
    private paused = true;
    private lastListScrape: string | null = null;
    private readonly scrapeDependants: ScrapeDependants = {
        feeds: [],
        tocs: [],
        oneTimeUser: [],
        oneTimeTocs: [],
        news: [],
        media: []
    };
    private readonly helper = new ScraperHelper();

    constructor() {
        this.helper.init();
    }


    public addDependant(dependant: Dependant) {
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
            .then(() => this.scrape(dependants, false))
            .then(() => {
                // @ts-ignore
                // addMultiSingle(scrapeDependants.oneTimeUser, dependant.oneTimeUser);
                // @ts-ignore
                addMultiSingle(this.scrapeDependants.feeds, dependant.feed);
                addMultiSingle(this.scrapeDependants.news, dependant.news);
                addMultiSingle(this.scrapeDependants.tocs, dependant.toc);
                addMultiSingle(this.scrapeDependants.media, dependant.medium);
            })
            .catch((error) => logError(error));
    }

    public async setup(): Promise<void> {
        const scrapeBoard = await Storage.getScrapes();

        scrapeBoard.forEach((value) => {
            if (value.type === scrapeTypes.NEWS) {
                this.scrapeDependants.news.push(value);
            } else if (value.type === scrapeTypes.FEED) {
                this.scrapeDependants.feeds.push(value.link);
            } else if (value.type === scrapeTypes.TOC) {
                this.scrapeDependants.tocs.push(value);
            }
        });
    }

    public pause(): void {
        this.paused = true;
    }

    public removeDependant(dependant: Dependant) {
        // @ts-ignore
        removeMultiSingle(this.scrapeDependants.oneTimeUser, dependant.oneTimeUser);
        // @ts-ignore
        removeMultiSingle(this.scrapeDependants.feeds, dependant.feed);
        removeMultiSingle(this.scrapeDependants.news, dependant.news);
        removeMultiSingle(this.scrapeDependants.tocs, dependant.toc);
        removeMultiSingle(this.scrapeDependants.media, dependant.medium);
    }

    public start(): void {
        this.paused = false;
        this.scrape().catch((error) => logError(error));
    }

    public stop(): void {
        this.paused = true;
    }

    public on(event: string, callback: (value: any) => void) {
        this.helper.on(event, callback);
    }

    /**
     * Scrape everything for one cycle, wait for a specified interval and scrape again.
     * Output is send per event listener.
     */
    private async scrape(dependants = this.scrapeDependants, next = true) {
        if (this.paused) {
            return;
        }

        const startTime = Date.now();
        const allPromises = [];

        allPromises.push(this._notify("toc", dependants.tocs.map((value) => toc(value))));
        allPromises.push(this._notify("news", dependants.news.map((value) => news(value))));
        allPromises.push(this._notify("feed", dependants.feeds.map((value) => feed(value))));
        allPromises.push(this._notify(
            "news",
            this.helper.newsAdapter.map((adapter) => processNewsScraper(adapter))
        ));
        allPromises.push(this
            ._notify("toc", dependants.oneTimeTocs.map((value) => oneTimeToc(value)))
            .then(() => {
                dependants.oneTimeTocs.length = 0;
            })
        );
        allPromises.push(this
            ._notify("list", dependants.oneTimeUser.map((value) => list(value)))
            .then(() => {
                dependants.oneTimeUser.length = 0;
            })
        );
        allPromises.push(this._notify("toc", [checkTocs()]));

        const today = new Date();
        const todayString = today.toDateString();

        // every monday scan every available external user, if not scanned on same day
        const externals = await Storage.getScrapeExternalUser();

        allPromises.push(this._notify("list", externals.map((value) => list(value))));
        // save current run for users for this monday, so that it does not scan again today
        this.lastListScrape = todayString;

        // start next scrape cycle after all scrape parts are finished, regardless of errors or not
        await Promise.all(allPromises);

        const duration = Date.now() - startTime;
        logger.info(`Scrape Cycle took ${duration} ms`);

        if (next) {
            setTimeout(() => this.scrape().catch((error) => logError(error)), interval);
        }
    }

    /*private async scrape(dependants = this.scrapeDependants, next = true) {
        if (this.paused) {
            return;
        }

        const startTime = Date.now();

        await this._notify("toc", dependants.tocs.map((value) => toc(value)));
        await this._notify("news", dependants.news.map((value) => news(value)));
        await this._notify("feed", dependants.feeds.map((value) => feed(value)));
        await this._notify(
            "news",
            this.helper.newsAdapter.map((adapter) => processNewsScraper(adapter))
        );
        await this
            ._notify("toc", dependants.oneTimeTocs.map((value) => oneTimeToc(value)))
            .then(() => {
                dependants.oneTimeTocs.length = 0;
            });
        await this
            ._notify("list", dependants.oneTimeUser.map((value) => list(value)))
            .then(() => {
                dependants.oneTimeUser.length = 0;
            });
        await this._notify("toc", [checkTocs()]);

        const today = new Date();
        const todayString = today.toDateString();

        // every monday scan every available external user, if not scanned on same day
        const externals = await Storage.getScrapeExternalUser();

        await this._notify("list", externals.map((value) => list(value)));
        // save current run for users for this monday, so that it does not scan again today
        this.lastListScrape = todayString;

        const duration = Date.now() - startTime;
        logger.info(`Scrape Cycle took ${duration} ms`);

        if (next) {
            setTimeout(() => this.scrape().catch((error) => logError(error)), interval);
        }
    }*/

    /**
     * Notifies event listener of events for each fulfilled
     * promise and calls the error listener for each rejected promise
     * for the corresponding error listener of the event.
     *
     * @param {string} key - event key
     * @param {Array<Promise<*>>} promises - promises to notify the listener if they resolve/reject
     * @return {Promise<void>} resolves if all promises are rejected or resolved
     */
    private _notify(key: string, promises: Array<Promise<any>>): Promise<void> {
        return new Promise((resolve) => {
            let fulfilled = 0;

            if (!promises.length) {
                resolve();
                return;
            }
            promises.forEach((promise) => {
                promise
                    .then((value) => this.helper.emit(key, value))
                    .catch((error) => this.helper.emit(key + ":error", error))
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
}
