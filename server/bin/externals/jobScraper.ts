import {
    checkTocs,
    feed,
    list,
    news,
    oneTimeToc,
    processNewsScraper,
    Scraper,
    ScraperHelper,
    scrapeTypes,
    toc
} from "./scraperTools";
import {Dependant} from "./types";
import {Job, JobCallback, JobQueue} from "../jobQueue";
import {multiSingle} from "../tools";
import {Storage} from "../database/database";
import {Counter} from "../counter";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const CHECK_TOC = "check_toc_key";
const counter = new Counter();

export class JobScraper implements Scraper {

    private static processDependant(dependant: Dependant, key: keyof Dependant, cb: (value: any) => void) {
        if (key in dependant) {
            multiSingle(dependant[key], cb);
        }
    }

    private paused = true;
    private readonly helper = new ScraperHelper();
    private readonly queue = new JobQueue();
    private readonly dependantMap: Map<any, Job> = new Map();

    constructor() {
        this.helper.init();
    }

    public addDependant(dependant: Dependant): void {
        JobScraper.processDependant(
            dependant,
            "toc",
            (value: any) => this.queuePeriodicEmittable("toc", HOUR, value, toc)
        );
        JobScraper.processDependant(
            dependant,
            "oneTimeToc",
            (value: any) => this.queueOneTimeEmittable("toc", value, oneTimeToc)
        );
        JobScraper.processDependant(
            dependant,
            "feed",
            (value: any) => this.queuePeriodicEmittable("feed", 10 * MINUTE, value, feed)
        );
        JobScraper.processDependant(
            dependant,
            "news",
            (value: any) => this.queuePeriodicEmittable("news", 5 * MINUTE, value, news)
        );
        JobScraper.processDependant(
            dependant,
            "oneTimeUser",
            (value: any) => this.queueOneTimeEmittable("list", value, list)
        );
    }

    public on(event: string, callback: (value: any) => void): void {
        this.helper.on(event, callback);
    }

    public removeDependant(dependant: Dependant): void {
        const job = this.dependantMap.get(dependant);
        if (!job) {
            return;
        }
        this.queue.removeJob(job);
        this.dependantMap.delete(dependant);
    }

    public async setup(): Promise<void> {
        this.queuePeriodic(HOUR, async () => {
            const scrapeBoard = await Storage.getScrapes();

            scrapeBoard
                .map((value) => {
                    if (value.type === scrapeTypes.NEWS) {
                        return {news: value};
                    } else if (value.type === scrapeTypes.FEED) {
                        return {feed: value.link};
                    } else if (value.type === scrapeTypes.TOC) {
                        return {toc: value};
                    }
                    return null;
                })
                // TODO: 23.06.2019 add only new ones, map checks for reference equality not value equality
                .filter((value) => value)
                .forEach((value) => value && this.addDependant(value));
        });
        this.helper.newsAdapter.forEach((value) => {
            this.queuePeriodicEmittable("news", 5 * MINUTE, value, processNewsScraper);
        });
        this.queuePeriodicEmittable("toc", HOUR, CHECK_TOC, checkTocs);
        this.queuePeriodic(DAY, async () => {
            // every monday scan every available external user, if not scanned on same day
            const externals = await Storage.getScrapeExternalUser();
            // externals.forEach((value) => this.queueOneTimeEmittable("list", value, list));
        });
    }

    public start(): void {
        this.paused = false;
        this.queue.start();
    }

    public pause(): void {
        this.paused = true;
        this.queue.pause();
    }

    public stop(): void {
        this.paused = true;
        this.queue.clear();
    }

    private queuePeriodicEmittable(key: string, interval: number, item: any, cb: (item: any) => Promise<any>) {
        if (!item || this.dependantMap.has(item)) {
            return;
        }
        const periodicJob = this.queue.addJob(() => this.collectEmittable(key, cb(item)), interval);
        periodicJob.onFailure = () => this.dependantMap.delete(item);
        this.dependantMap.set(item, periodicJob);
    }

    private queuePeriodic(interval: number, cb: JobCallback): Job {
        return this.queue.addJob(cb, interval);
    }

    private queueOneTimeEmittable(key: string, item: any, cb: (item: any) => Promise<any>) {
        if (!item || this.dependantMap.has(item)) {
            return;
        }
        const oneTimeJob = this.queue.addJob(() => this.collectEmittable(key, cb(item)));
        oneTimeJob.onFailure = () => this.dependantMap.delete(item);
        this.dependantMap.set(item, oneTimeJob);
    }

    private collectEmittable(key: string, value: Promise<any>): Promise<void> {
        // TODO: 23.06.2019 collect e.g. 10 resolved items and then emit them, or emit them periodically if available
        // TODO: 23.06.2019 add timeout?
        return value
            .then((content) => this.helper.emit(key, content))
            .catch((reason) => {
                this.helper.emit(key + ":error", reason);
                return reason;
            });
    }
}
