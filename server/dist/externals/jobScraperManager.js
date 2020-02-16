"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const scraperTools_1 = require("./scraperTools");
const jobManager_1 = require("../jobManager");
const tools_1 = require("../tools");
const logger_1 = tslib_1.__importStar(require("../logger"));
const types_1 = require("../types");
const storage_1 = require("../database/storages/storage");
const dns = tslib_1.__importStar(require("dns"));
class ScrapeJob {
    constructor(name, func, event) {
        this.name = name;
        this.func = func;
        this.event = event;
    }
    toString() {
        return this.name;
    }
}
ScrapeJob.toc = new ScrapeJob(types_1.ScrapeName.toc, scraperTools_1.toc, scraperTools_1.ScrapeEvent.TOC);
ScrapeJob.oneTimeToc = new ScrapeJob(types_1.ScrapeName.oneTimeToc, scraperTools_1.oneTimeToc, scraperTools_1.ScrapeEvent.TOC);
ScrapeJob.searchForToc = new ScrapeJob(types_1.ScrapeName.searchForToc, scraperTools_1.searchForTocJob, scraperTools_1.ScrapeEvent.TOC);
ScrapeJob.feed = new ScrapeJob(types_1.ScrapeName.feed, scraperTools_1.feed, scraperTools_1.ScrapeEvent.FEED);
ScrapeJob.news = new ScrapeJob(types_1.ScrapeName.news, scraperTools_1.news, scraperTools_1.ScrapeEvent.NEWS);
ScrapeJob.newsAdapter = new ScrapeJob(types_1.ScrapeName.newsAdapter, scraperTools_1.scrapeNewsJob, scraperTools_1.ScrapeEvent.NEWS);
ScrapeJob.oneTimeUser = new ScrapeJob(types_1.ScrapeName.oneTimeUser, scraperTools_1.list, scraperTools_1.ScrapeEvent.NEWS);
ScrapeJob.checkTocs = new ScrapeJob(types_1.ScrapeName.checkTocs, scraperTools_1.checkTocsJob);
ScrapeJob.queueTocs = new ScrapeJob(types_1.ScrapeName.queueTocs, scraperTools_1.queueTocsJob);
ScrapeJob.remapMediaParts = new ScrapeJob(types_1.ScrapeName.remapMediaParts, scraperTools_1.remapMediaParts);
ScrapeJob.queueExternalUser = new ScrapeJob(types_1.ScrapeName.queueExternalUser, scraperTools_1.queueExternalUser);
// TODO: 02.09.2019 clear or run all jobs which have the runAfter field, where the original job was deleted
const clearJobsOnStartPromise = storage_1.jobStorage.stopJobs().catch(console.error);
const missingConnections = new Set();
// tslint:disable-next-line:max-classes-per-file
class JobScraperManager {
    constructor() {
        this.paused = true;
        this.helper = new scraperTools_1.ScraperHelper();
        this.queue = new jobManager_1.JobQueue({ maxActive: 200 });
        this.jobMap = new Map();
        this.nameIdList = [];
        this.helper.init();
    }
    on(event, callback) {
        this.helper.on(event, callback);
    }
    removeDependant(key) {
        const job = this.jobMap.get(key);
        if (!job) {
            logger_1.default.warn("tried to remove non existant job");
            return;
        }
        let otherKey;
        const [compareIndex, otherKeyIndex] = tools_1.isString(key) ? [1, 0] : [0, 1];
        const index = this.nameIdList.findIndex((value) => value[compareIndex] === key);
        if (index >= 0) {
            const found = this.nameIdList[index];
            this.nameIdList.splice(index, 1);
            if (found) {
                otherKey = found[otherKeyIndex];
            }
        }
        if (!otherKey) {
            logger_1.default.warn("could not find other job key for: " + key);
        }
        else {
            this.jobMap.delete(otherKey);
            this.jobMap.delete(key);
        }
        this.queue.removeJob(job);
        storage_1.jobStorage.removeJob(key).catch(logger_1.logError);
    }
    async setup() {
        await clearJobsOnStartPromise;
        const jobs = this.helper.newsAdapter.map((value) => {
            return {
                deleteAfterRun: false,
                runImmediately: true,
                interval: types_1.MilliTime.MINUTE * 5,
                name: `${value.hookName}-${types_1.ScrapeName.newsAdapter}`,
                type: types_1.ScrapeName.newsAdapter,
                arguments: value.hookName
            };
        });
        jobs.push({
            type: types_1.ScrapeName.checkTocs,
            interval: types_1.MilliTime.HOUR,
            name: types_1.ScrapeName.checkTocs,
            deleteAfterRun: false,
            runImmediately: true
        }, {
            type: types_1.ScrapeName.queueTocs,
            interval: types_1.MilliTime.HOUR,
            name: types_1.ScrapeName.queueTocs,
            deleteAfterRun: false,
            runImmediately: true
        }, {
            type: types_1.ScrapeName.remapMediaParts,
            interval: types_1.MilliTime.HOUR,
            name: types_1.ScrapeName.remapMediaParts,
            deleteAfterRun: false,
            runImmediately: true
        }, {
            type: types_1.ScrapeName.queueExternalUser,
            interval: types_1.MilliTime.DAY * 7,
            name: types_1.ScrapeName.queueExternalUser,
            deleteAfterRun: false,
            runImmediately: true
        });
        this.addJobs(...jobs);
    }
    start() {
        this.paused = false;
        this.queue.start();
        const interval = setInterval(() => {
            if (this.paused) {
                return;
            }
            this.fetchJobs().catch(logger_1.logError);
            this.checkRunningJobs().catch(logger_1.logError);
        }, 60000);
        this.fetchJobs().catch(console.error);
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = interval;
    }
    pause() {
        this.paused = true;
        this.queue.pause();
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    stop() {
        this.paused = true;
        this.queue.clear();
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    async addJobs(...jobs) {
        let waitForOtherRequest = [];
        const addJobs = jobs.filter((value) => {
            if (value.runAfter) {
                waitForOtherRequest.push(value);
                return false;
            }
            else {
                return true;
            }
        });
        while (addJobs.length) {
            await storage_1.jobStorage.addJobs(addJobs);
            addJobs.length = 0;
            waitForOtherRequest = waitForOtherRequest.filter((value) => {
                if (isJobItem(value.runAfter)) {
                    addJobs.push(value);
                    return false;
                }
                else {
                    return true;
                }
            });
        }
        if (waitForOtherRequest.length) {
            logger_1.default.warn("could not add all depending jobs: " + JSON.stringify(waitForOtherRequest));
        }
    }
    getJobs() {
        return this.queue.getJobs();
    }
    addDependant(jobsMap) {
        for (const [key, value] of jobsMap.entries()) {
            for (const job of value) {
                if (this.jobMap.has(job.id)) {
                    continue;
                }
                if (key.event) {
                    this.queueEmittableJob(key, job);
                }
                else {
                    this.queueJob(key, job);
                }
            }
        }
    }
    async checkRunningJobs() {
        const now = new Date();
        try {
            // @ts-ignore
            await dns.promises.lookup("google.de");
            const timeoutDates = [...missingConnections.values()];
            const maxDate = tools_1.maxValue(timeoutDates);
            now.setMinutes(-30);
            // if there at least 5 jobs which started 30 min before but did not finish,
            // when there is at least one timeout, stop this process (pm2 should restart it then again)
            if (maxDate) {
                if (maxDate < now && this.queue.invalidRunning(maxDate, 5)) {
                    logger_1.logError("Restarting Process due to long running jobs");
                    process.exit(1);
                    return;
                }
                now.setHours(-2);
                if (maxDate < now && this.queue.invalidRunning(maxDate, 1)) {
                    logger_1.logError("Restarting Process due to long running jobs");
                    process.exit(1);
                    return;
                }
            }
        }
        catch (e) {
            missingConnections.add(now);
        }
    }
    async fetchJobs() {
        if (this.queue.isFull()) {
            console.log("skip fetching jobs");
            return;
        }
        console.log("fetching jobs");
        const scrapeBoard = await storage_1.jobStorage.getJobs();
        this.processJobItems(scrapeBoard);
    }
    processJobItems(items) {
        const jobMap = new Map();
        items
            .forEach((value) => {
            let args;
            let jobType;
            switch (value.type) {
                case types_1.ScrapeName.newsAdapter:
                    jobType = ScrapeJob.newsAdapter;
                    args = value.arguments;
                    break;
                case types_1.ScrapeName.checkTocs:
                    jobType = ScrapeJob.checkTocs;
                    break;
                case types_1.ScrapeName.feed:
                    jobType = ScrapeJob.feed;
                    args = value.arguments;
                    break;
                case types_1.ScrapeName.news:
                    jobType = ScrapeJob.news;
                    args = value.arguments;
                    break;
                case types_1.ScrapeName.oneTimeToc:
                    jobType = ScrapeJob.oneTimeToc;
                    args = JSON.parse(value.arguments);
                    break;
                case types_1.ScrapeName.oneTimeUser:
                    jobType = ScrapeJob.oneTimeUser;
                    args = JSON.parse(value.arguments);
                    break;
                case types_1.ScrapeName.queueExternalUser:
                    jobType = ScrapeJob.queueExternalUser;
                    args = JSON.parse(value.arguments);
                    break;
                case types_1.ScrapeName.queueTocs:
                    jobType = ScrapeJob.queueTocs;
                    break;
                case types_1.ScrapeName.remapMediaParts:
                    jobType = ScrapeJob.remapMediaParts;
                    break;
                case types_1.ScrapeName.toc:
                    jobType = ScrapeJob.toc;
                    args = JSON.parse(value.arguments);
                    break;
                case types_1.ScrapeName.searchForToc:
                    jobType = ScrapeJob.searchForToc;
                    args = JSON.parse(value.arguments);
                    break;
                default:
                    logger_1.default.warn("unknown job type: " + value.type);
                    return;
            }
            value.arguments = args;
            tools_1.getElseSet(jobMap, jobType, () => []).push(value);
        });
        this.addDependant(jobMap);
    }
    queueEmittableJob(jobType, item) {
        const job = this.queue.addJob(() => {
            if (!jobType.event) {
                logger_1.default.warn("running emittable job without event name: " + jobType);
                return Promise.resolve();
            }
            if (Array.isArray(item.arguments)) {
                return this.collectEmittable(jobType.event, jobType.func(...item.arguments));
            }
            else {
                return this.collectEmittable(jobType.event, jobType.func(item.arguments));
            }
        });
        this.setJobListener(job, item);
        return job;
    }
    queueJob(jobType, item) {
        const job = this.queue.addJob(() => {
            if (Array.isArray(item.arguments)) {
                this.processJobCallback(jobType.func(...item.arguments));
            }
            else {
                this.processJobCallback(jobType.func(item.arguments));
            }
        });
        this.setJobListener(job, item);
        return job;
    }
    processJobCallback(result) {
        if (!result) {
            return;
        }
        if (result instanceof Promise) {
            return result.then((value) => value && this.processJobCallbackResult(value));
        }
        else {
            return this.processJobCallbackResult(result);
        }
    }
    processJobCallbackResult(value) {
        if (!value) {
            return;
        }
        if (Array.isArray(value)) {
            this.addJobs(...value).catch(logger_1.logError);
        }
        else {
            this.addJobs(value).catch(logger_1.logError);
        }
    }
    setJobListener(job, item) {
        job.onStart = async () => {
            if (item.name) {
                this.jobMap.set(item.name, job);
            }
            this.jobMap.set(item.id, job);
            item.state = types_1.JobState.RUNNING;
            await storage_1.jobStorage.updateJobs(item);
            console.log(`Job ${item.name ? item.name : item.id} is running now, ${new Date()}`);
        };
        job.onDone = async () => {
            if (item.name) {
                this.jobMap.delete(item.name);
            }
            this.jobMap.delete(item.id);
            const newJobs = await storage_1.jobStorage.getAfterJobs(item.id);
            this.processJobItems(newJobs);
            if (item.deleteAfterRun) {
                await storage_1.jobStorage.removeJobs(item);
            }
            else {
                item.lastRun = new Date();
                if (item.interval > 0) {
                    if (item.interval < 60000) {
                        item.interval = 60000;
                    }
                    item.nextRun = new Date(item.lastRun.getTime() + item.interval);
                }
                item.state = types_1.JobState.WAITING;
                await storage_1.jobStorage.updateJobs(item);
            }
            console.log(`Job ${item.name ? item.name : item.id} finished now, ${new Date()}`);
        };
    }
    collectEmittable(eventName, value) {
        // TODO: 23.06.2019 collect e.g. 10 resolved items and then emit them, or emit them periodically if available
        // TODO: 23.06.2019 add timeout?
        return value
            .then((content) => this.helper.emit(eventName, content))
            .catch((reason) => {
            this.helper.emit(eventName + ":error", reason);
            return reason;
        });
    }
}
exports.JobScraperManager = JobScraperManager;
function isJobItem(value) {
    return value && value.id;
}
exports.DefaultJobScraper = new JobScraperManager();
exports.DefaultJobScraper.start();
//# sourceMappingURL=jobScraperManager.js.map