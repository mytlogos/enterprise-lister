"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scraperTools_1 = require("./scraperTools");
const jobQueue_1 = require("../jobQueue");
const tools_1 = require("../tools");
const database_1 = require("../database/database");
const counter_1 = require("../counter");
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const CHECK_TOC = "check_toc_key";
const counter = new counter_1.Counter();
class JobScraper {
    constructor() {
        this.paused = true;
        this.helper = new scraperTools_1.ScraperHelper();
        this.queue = new jobQueue_1.JobQueue();
        this.dependantMap = new Map();
        this.helper.init();
    }
    static processDependant(dependant, key, cb) {
        if (key in dependant) {
            tools_1.multiSingle(dependant[key], cb);
        }
    }
    addDependant(dependant) {
        JobScraper.processDependant(dependant, "toc", (value) => this.queuePeriodicEmittable("toc", HOUR, value, scraperTools_1.toc));
        JobScraper.processDependant(dependant, "oneTimeToc", (value) => this.queueOneTimeEmittable("toc", value, scraperTools_1.oneTimeToc));
        JobScraper.processDependant(dependant, "feed", (value) => this.queuePeriodicEmittable("feed", 10 * MINUTE, value, scraperTools_1.feed));
        JobScraper.processDependant(dependant, "news", (value) => this.queuePeriodicEmittable("news", 5 * MINUTE, value, scraperTools_1.news));
        JobScraper.processDependant(dependant, "oneTimeUser", (value) => this.queueOneTimeEmittable("list", value, scraperTools_1.list));
    }
    on(event, callback) {
        this.helper.on(event, callback);
    }
    removeDependant(dependant) {
        const job = this.dependantMap.get(dependant);
        if (!job) {
            return;
        }
        this.queue.removeJob(job);
        this.dependantMap.delete(dependant);
    }
    async setup() {
        this.queuePeriodic(HOUR, async () => {
            const scrapeBoard = await database_1.Storage.getScrapes();
            scrapeBoard
                .map((value) => {
                if (value.type === scraperTools_1.scrapeTypes.NEWS) {
                    return { news: value };
                }
                else if (value.type === scraperTools_1.scrapeTypes.FEED) {
                    return { feed: value.link };
                }
                else if (value.type === scraperTools_1.scrapeTypes.TOC) {
                    return { toc: value };
                }
                return null;
            })
                // TODO: 23.06.2019 add only new ones, map checks for reference equality not value equality
                .filter((value) => value)
                .forEach((value) => value && this.addDependant(value));
        });
        this.helper.newsAdapter.forEach((value) => {
            this.queuePeriodicEmittable("news", 5 * MINUTE, value, scraperTools_1.processNewsScraper);
        });
        this.queuePeriodicEmittable("toc", HOUR, CHECK_TOC, scraperTools_1.checkTocs);
        this.queuePeriodic(DAY, async () => {
            // every monday scan every available external user, if not scanned on same day
            const externals = await database_1.Storage.getScrapeExternalUser();
            // externals.forEach((value) => this.queueOneTimeEmittable("list", value, list));
        });
    }
    start() {
        this.paused = false;
        this.queue.start();
    }
    pause() {
        this.paused = true;
        this.queue.pause();
    }
    stop() {
        this.paused = true;
        this.queue.clear();
    }
    queuePeriodicEmittable(key, interval, item, cb) {
        if (!item || this.dependantMap.has(item)) {
            return;
        }
        const periodicJob = this.queue.addJob(() => this.collectEmittable(key, cb(item)), interval);
        periodicJob.onFailure = () => this.dependantMap.delete(item);
        this.dependantMap.set(item, periodicJob);
    }
    queuePeriodic(interval, cb) {
        return this.queue.addJob(cb, interval);
    }
    queueOneTimeEmittable(key, item, cb) {
        if (!item || this.dependantMap.has(item)) {
            return;
        }
        const oneTimeJob = this.queue.addJob(() => this.collectEmittable(key, cb(item)));
        oneTimeJob.onFailure = () => this.dependantMap.delete(item);
        this.dependantMap.set(item, oneTimeJob);
    }
    collectEmittable(key, value) {
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
exports.JobScraper = JobScraper;
//# sourceMappingURL=jobScraper.js.map