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
        JobScraper.processDependant(dependant, "oneTimeToc", (value) => this.queueOneTimeEmittable("toc", value, (item) => scraperTools_1.oneTimeToc(item).finally(() => database_1.Storage.removeScrape(item.url, scraperTools_1.ScrapeTypes.ONETIMETOC))));
        JobScraper.processDependant(dependant, "feed", 
        // TODO: 20.07.2019 decomment this
        (value) => {
        });
        JobScraper.processDependant(dependant, "news", (value) => this.queuePeriodicEmittable("news", 5 * MINUTE, value, scraperTools_1.news));
        JobScraper.processDependant(dependant, "oneTimeUser", (value) => this.queueOneTimeEmittable("list", value, (item) => scraperTools_1.list(item).finally(() => database_1.Storage.removeScrape(item.url, scraperTools_1.ScrapeTypes.ONETIMEUSER))));
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
        this.queuePeriodic(MINUTE, async () => {
            const scrapeBoard = await database_1.Storage.getScrapes();
            scrapeBoard
                .map((value) => {
                if (value.type === scraperTools_1.ScrapeTypes.NEWS) {
                    return { news: value };
                }
                else if (value.type === scraperTools_1.ScrapeTypes.FEED) {
                    return { feed: value.link };
                }
                else if (value.type === scraperTools_1.ScrapeTypes.TOC) {
                    return { toc: value };
                }
                else if (value.type === scraperTools_1.ScrapeTypes.ONETIMETOC) {
                    // @ts-ignore
                    return { oneTimeToc: { mediumId: value.mediumId, url: value.link, uuid: value.userId } };
                }
                else if (value.type === scraperTools_1.ScrapeTypes.ONETIMEUSER) {
                    // @ts-ignore
                    return { oneTimeUser: { cookies: value.info, url: value.link, uuid: value.userId } };
                }
                return null;
            })
                // TODO: 23.06.2019 add only new ones, map checks for reference equality not value equality
                .filter((value) => value)
                // @ts-ignore
                .forEach((value) => this.addDependant(value));
        });
        this.helper.newsAdapter.forEach((value) => {
            this.queuePeriodicEmittable("news", 5 * MINUTE, value, scraperTools_1.processNewsScraper);
        });
        this.queuePeriodic(HOUR, scraperTools_1.checkTocs);
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
        return this.queuePeriodicEmittableJob({ type: "periodic_emittable", key, interval, item, cb });
    }
    queuePeriodic(interval, cb) {
        return this.queuePeriodicJob({ type: "periodic", interval, cb });
    }
    queueOneTimeEmittable(key, item, cb) {
        return this.queueOneTimeEmittableJob({ type: "onetime_emittable", key, item, cb });
    }
    addScraperJob(value) {
        if (isPeriodicEmittableJob(value)) {
            this.queuePeriodicEmittableJob(value);
        }
        else if (isOneTimeEmittableJob(value)) {
            this.queueOneTimeEmittableJob(value);
        }
        else if (isPeriodicJob(value)) {
            this.queuePeriodicJob(value);
        }
    }
    queueOneTimeEmittableJob(job) {
        if (!job.item || this.dependantMap.has(job.item)) {
            return null;
        }
        const oneTimeJob = this.queue.addJob(() => this.collectEmittable(job.key, job.cb(job.item)));
        let otherOnFailure;
        const onFailure = (reason) => {
            this.dependantMap.delete(job.item);
            if (job.onFailure) {
                job.onFailure(reason);
            }
            if (otherOnFailure) {
                otherOnFailure(reason);
            }
        };
        Object.defineProperty(oneTimeJob, "onFailure", {
            get() {
                return onFailure;
            },
            set(v) {
                otherOnFailure = v;
            }
        });
        this.dependantMap.set(job.item, oneTimeJob);
        oneTimeJob.onSuccess = job.onSuccess;
        oneTimeJob.onDone = () => {
            if (!job.onDone) {
                return;
            }
            const result = job.onDone();
            if (result) {
                this.processJobCallbackResult(result);
            }
        };
        return oneTimeJob;
    }
    queuePeriodicEmittableJob(job) {
        if (!job || !job.item || this.dependantMap.has(job.item)) {
            return null;
        }
        const periodicJob = this.queue.addJob(() => this.collectEmittable(job.key, job.cb(job.item)), job.interval);
        periodicJob.onFailure = () => this.dependantMap.delete(job.item);
        let otherOnFailure;
        const onFailure = (reason) => {
            this.dependantMap.delete(job.item);
            if (job.onFailure) {
                job.onFailure(reason);
            }
            if (otherOnFailure) {
                otherOnFailure(reason);
            }
        };
        Object.defineProperty(periodicJob, "onFailure", {
            get() {
                return onFailure;
            },
            set(v) {
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
    queuePeriodicJob(job) {
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
    processJobCallback(done, cb) {
        const result = cb(done);
        if (!result) {
            return;
        }
        if (result instanceof Promise) {
            return result.then((value) => this.processJobCallbackResult(value));
        }
        else {
            return this.processJobCallbackResult(result);
        }
    }
    processJobCallbackResult(value) {
        if (!value) {
            return value;
        }
        if (Array.isArray(value)) {
            value.forEach((scraperJob) => this.addScraperJob(scraperJob));
        }
        else {
            this.addScraperJob(value);
        }
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
function isOneTimeEmittableJob(value) {
    return value && value.type === "onetime_emittable";
}
function isPeriodicEmittableJob(value) {
    return value && value.type === "periodic_emittable";
}
function isPeriodicJob(value) {
    return value && value.type === "periodic";
}
exports.DefaultJobScraper = new JobScraper();
exports.DefaultJobScraper.start();
//# sourceMappingURL=jobScraper.js.map