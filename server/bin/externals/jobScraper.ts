import {
    checkTocs,
    feed,
    list,
    news,
    oneTimeToc,
    queueTocs, remapMediaParts,
    scrapeNews,
    Scraper,
    ScraperHelper,
    ScrapeType,
    toc
} from "./scraperTools";
import {Dependant, OneTimeEmittableJob, PeriodicEmittableJob, PeriodicJob, ScraperJob, TocRequest} from "./types";
import {Job, JobCallback, JobQueue} from "../jobQueue";
import {multiSingle} from "../tools";
import {Storage} from "../database/database";
import {Counter} from "../counter";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const counter = new Counter();

export type PromiseConsumer = (item: any) => Promise<any>;

export class JobScraper implements Scraper {

    private static processDependant(dependant: Dependant, key: keyof Dependant, cb: (value: any) => void) {
        if (key in dependant) {
            multiSingle(dependant[key], cb);
        }
    }

    private paused = true;
    private readonly helper = new ScraperHelper();
    private readonly queue = new JobQueue({maxActive: 200});
    private readonly dependantMap: Map<any, Job> = new Map();

    constructor() {
        this.helper.init();
    }

    public addDependant(dependant: Dependant): void {
        JobScraper.processDependant(
            dependant,
            "toc",
            (value: any) => this.queueOneTimeEmittable(
                "toc",
                value,
                // what if it can't execute for an whole hour?
                (item: TocRequest) => toc(item).finally(
                    () => Storage.updateScrape(item.url, ScrapeType.TOC, HOUR)
                )
            )
        );
        JobScraper.processDependant(
            dependant,
            "oneTimeToc",
            (value: any) => this.queueOneTimeEmittable(
                "toc",
                value,
                (item: TocRequest) => oneTimeToc(item).finally(
                    () => Storage.removeScrape(item.url, ScrapeType.ONETIMETOC)
                )
            )
        );
        JobScraper.processDependant(
            dependant,
            "feed",
            (value: any) => {
                this.queuePeriodicEmittable("feed", 10 * MINUTE, value, feed);
            }
        );
        JobScraper.processDependant(
            dependant,
            "news",
            (value: any) => this.queuePeriodicEmittable("news", 5 * MINUTE, value, news)
        );
        JobScraper.processDependant(
            dependant,
            "oneTimeUser",
            (value: any) => this.queueOneTimeEmittable(
                "list",
                value,
                (item) => list(item).finally(() => Storage.removeScrape(item.url, ScrapeType.ONETIMEUSER))
            )
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
        this.queuePeriodic(MINUTE, async () => {
            const scrapeBoard = await Storage.getScrapes();

            scrapeBoard
                .map((value): Dependant | null => {
                    if (value.type === ScrapeType.NEWS) {
                        return {news: value};
                    } else if (value.type === ScrapeType.FEED) {
                        return {feed: value.link};
                    } else if (value.type === ScrapeType.TOC) {
                        return {toc: {mediumId: value.mediumId, url: value.link, uuid: value.userId}};
                    } else if (value.type === ScrapeType.ONETIMETOC) {
                        // @ts-ignore
                        return {oneTimeToc: {mediumId: value.mediumId, url: value.link, uuid: value.userId}};
                    } else if (value.type === ScrapeType.ONETIMEUSER) {
                        // @ts-ignore
                        return {oneTimeUser: {cookies: value.info, url: value.link, uuid: value.userId}};
                    }
                    return null;
                })
                // TODO: 23.06.2019 add only new ones, map checks for reference equality not value equality
                .filter((value) => value)
                // @ts-ignore
                .forEach((value: Dependant) => this.addDependant(value));
        });
        this.helper.newsAdapter.forEach((value) => {
            this.queuePeriodicEmittable("news", 5 * MINUTE, value, scrapeNews);
        });
        this.queuePeriodic(HOUR, checkTocs);
        this.queuePeriodic(HOUR, queueTocs);
        this.queuePeriodic(HOUR, remapMediaParts);
        this.queuePeriodic(DAY, async () => {
            // every monday scan every available external user, if not scanned on same day
            const externals = await Storage.getScrapeExternalUser();
            externals.forEach((value) => this.queueOneTimeEmittable("list", value, list));
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

    public queuePeriodicEmittable(key: string, interval: number, item: any, cb: PromiseConsumer): Job | null {
        return this.queuePeriodicEmittableJob({type: "periodic_emittable", key, interval, item, cb});
    }

    public queuePeriodic(interval: number, cb: JobCallback): Job {
        return this.queuePeriodicJob({type: "periodic", interval, cb});
    }

    public queueOneTimeEmittable(key: string, item: any, cb: PromiseConsumer): Job | null {
        return this.queueOneTimeEmittableJob({type: "onetime_emittable", key, item, cb});
    }

    public addScraperJob(value: ScraperJob) {
        if (isPeriodicEmittableJob(value)) {
            this.queuePeriodicEmittableJob(value);

        } else if (isOneTimeEmittableJob(value)) {
            this.queueOneTimeEmittableJob(value);

        } else if (isPeriodicJob(value)) {
            this.queuePeriodicJob(value);
        }
    }

    private queueOneTimeEmittableJob(job: OneTimeEmittableJob): Job | null {
        if (!job.item || this.dependantMap.has(job.item)) {
            return null;
        }
        const oneTimeJob = this.queue.addJob(() => this.collectEmittable(job.key, job.cb(job.item)));
        let otherOnFailure: (reason?: any) => void | undefined;
        const onFailure = (reason: any) => {
            this.dependantMap.delete(job.item);
            if (job.onFailure) {
                job.onFailure(reason);
            }
            if (otherOnFailure) {
                otherOnFailure(reason);
            }
        };
        Object.defineProperty(oneTimeJob, "onFailure", {
            get(): (reason?: any) => void {
                return onFailure;
            },
            set(v: any): void {
                otherOnFailure = v;
            }
        });
        this.dependantMap.set(job.item, oneTimeJob);
        oneTimeJob.onSuccess = job.onSuccess;
        oneTimeJob.onDone = () => {
            if (!job.onDone) {
                return;
            }
            this.dependantMap.delete(job.item);
            const result = job.onDone();
            if (result) {
                this.processJobCallbackResult(result);
            }
        };
        return oneTimeJob;
    }

    private queuePeriodicEmittableJob(job: PeriodicEmittableJob): Job | null {
        if (!job || !job.item || this.dependantMap.has(job.item)) {
            return null;
        }
        const periodicJob = this.queue.addJob(() => this.collectEmittable(job.key, job.cb(job.item)), job.interval);
        periodicJob.onFailure = () => this.dependantMap.delete(job.item);
        let otherOnFailure: (reason?: any) => void | undefined;
        const onFailure = (reason: any) => {
            this.dependantMap.delete(job.item);
            if (job.onFailure) {
                job.onFailure(reason);
            }
            if (otherOnFailure) {
                otherOnFailure(reason);
            }
        };
        Object.defineProperty(periodicJob, "onFailure", {
            get(): (reason?: any) => void {
                return onFailure;
            },
            set(v: any): void {
                otherOnFailure = v;
            }
        });
        this.dependantMap.set(job.item, periodicJob);
        periodicJob.onSuccess = job.onSuccess;
        periodicJob.onDone = () => {
            if (!job.onDone) {
                return;
            }
            const result = job.onDone();
            if (result) {
                this.processJobCallbackResult(result);
            }
        };
        return periodicJob;
    }

    private queuePeriodicJob(job: PeriodicJob): Job {
        // TODO: 22.07.2019 this could be a potential bug
        // @ts-ignore
        const addJob = this.queue.addJob((done) => this.processJobCallback(done, job.cb), job.interval);
        addJob.onDone = () => {
            if (!job.onDone) {
                return;
            }
            const result = job.onDone();
            if (result) {
                this.processJobCallbackResult(result);
            }
        };
        addJob.onSuccess = job.onSuccess;
        addJob.onFailure = job.onFailure;
        return addJob;
    }

    private processJobCallback(done: () => void, cb: JobCallback): Promise<void> | void {
        const result = cb(done);

        if (!result) {
            return;
        }
        if (result instanceof Promise) {
            return result.then((value) => this.processJobCallbackResult(value));
        } else {
            return this.processJobCallbackResult(result);
        }
    }

    private processJobCallbackResult(value: any): void {
        if (!value) {
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((scraperJob) => this.addScraperJob(scraperJob));
        } else {
            this.addScraperJob(value);
        }
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

function isOneTimeEmittableJob(value: any): value is OneTimeEmittableJob {
    return value && value.type === "onetime_emittable";
}

function isPeriodicEmittableJob(value: any): value is PeriodicEmittableJob {
    return value && value.type === "periodic_emittable";
}

function isPeriodicJob(value: any): value is PeriodicJob {
    return value && value.type === "periodic";
}

export const DefaultJobScraper = new JobScraper();
DefaultJobScraper.start();
