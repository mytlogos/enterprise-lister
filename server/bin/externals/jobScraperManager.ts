import {
    checkTocsJob,
    feed,
    list,
    news,
    oneTimeToc,
    queueExternalUser,
    queueTocsJob,
    remapMediaParts,
    ScrapeEvent,
    scrapeNewsJob,
    ScraperHelper,
    searchForTocJob,
    toc
} from "./scraperTools";
import {Job, JobQueue, OutsideJob} from "../jobManager";
import {getElseSet, isString, maxValue} from "../tools";
import logger, {logError} from "../logger";
import {JobItem, JobRequest, JobState, MilliTime, ScrapeName} from "../types";
import {jobStorage} from "../database/storages/storage";
import * as dns from "dns";
import Timeout = NodeJS.Timeout;

class ScrapeJob {
    public static readonly toc = new ScrapeJob(ScrapeName.toc, toc, ScrapeEvent.TOC);
    public static readonly oneTimeToc = new ScrapeJob(ScrapeName.oneTimeToc, oneTimeToc, ScrapeEvent.TOC);
    public static readonly searchForToc = new ScrapeJob(ScrapeName.searchForToc, searchForTocJob, ScrapeEvent.TOC);
    public static readonly feed = new ScrapeJob(ScrapeName.feed, feed, ScrapeEvent.FEED);
    public static readonly news = new ScrapeJob(ScrapeName.news, news, ScrapeEvent.NEWS);
    public static readonly newsAdapter = new ScrapeJob(ScrapeName.newsAdapter, scrapeNewsJob, ScrapeEvent.NEWS);
    public static readonly oneTimeUser = new ScrapeJob(ScrapeName.oneTimeUser, list, ScrapeEvent.NEWS);
    public static readonly checkTocs = new ScrapeJob(ScrapeName.checkTocs, checkTocsJob);
    public static readonly queueTocs = new ScrapeJob(ScrapeName.queueTocs, queueTocsJob);
    public static readonly remapMediaParts = new ScrapeJob(ScrapeName.remapMediaParts, remapMediaParts);
    public static readonly queueExternalUser = new ScrapeJob(ScrapeName.queueExternalUser, queueExternalUser);

    private constructor(
        public readonly name: ScrapeName,
        readonly func: (...args: any[]) => any,
        readonly event?: ScrapeEvent
    ) {

    }

    public toString() {
        return this.name;
    }
}

// TODO: 02.09.2019 clear or run all jobs which have the runAfter field, where the original job was deleted
const clearJobsOnStartPromise = jobStorage.stopJobs().catch(console.error);

const missingConnections = new Set<Date>();

// tslint:disable-next-line:max-classes-per-file
export class JobScraperManager {
    private paused = true;
    private readonly helper = new ScraperHelper();
    private readonly queue = new JobQueue({maxActive: 200});
    private jobMap = new Map<number | string, Job>();
    private nameIdList: Array<[number, string]> = [];
    private intervalId: Timeout | undefined;

    constructor() {
        this.helper.init();
    }

    public on(event: string, callback: (value: any) => void): void {
        this.helper.on(event, callback);
    }

    public removeDependant(key: number | string): void {
        const job = this.jobMap.get(key);
        if (!job) {
            logger.warn("tried to remove non existant job");
            return;
        }
        let otherKey: number | string | undefined;
        const [compareIndex, otherKeyIndex] = isString(key) ? [1, 0] : [0, 1];
        const index = this.nameIdList.findIndex((value) => value[compareIndex] === key);

        if (index >= 0) {
            const found = this.nameIdList[index];

            this.nameIdList.splice(index, 1);

            if (found) {
                otherKey = found[otherKeyIndex];
            }
        }
        if (!otherKey) {
            logger.warn("could not find other job key for: " + key);
        } else {
            this.jobMap.delete(otherKey);
            this.jobMap.delete(key);
        }
        this.queue.removeJob(job);
        jobStorage.removeJob(key).catch(logError);
    }

    public async setup(): Promise<void> {
        await clearJobsOnStartPromise;
        const jobs = this.helper.newsAdapter.map((value): JobRequest => {
            return {
                deleteAfterRun: false,
                runImmediately: true,
                interval: MilliTime.MINUTE * 5,
                name: `${value.hookName}-${ScrapeName.newsAdapter}`,
                type: ScrapeName.newsAdapter,
                arguments: value.hookName
            };
        });
        jobs.push(
            {
                type: ScrapeName.checkTocs,
                interval: MilliTime.HOUR,
                name: ScrapeName.checkTocs,
                deleteAfterRun: false,
                runImmediately: true
            },
            {
                type: ScrapeName.queueTocs,
                interval: MilliTime.HOUR,
                name: ScrapeName.queueTocs,
                deleteAfterRun: false,
                runImmediately: true
            },
            {
                type: ScrapeName.remapMediaParts,
                interval: MilliTime.HOUR,
                name: ScrapeName.remapMediaParts,
                deleteAfterRun: false,
                runImmediately: true
            },
            {
                type: ScrapeName.queueExternalUser,
                interval: MilliTime.DAY * 7,
                name: ScrapeName.queueExternalUser,
                deleteAfterRun: false,
                runImmediately: true
            }
        );
        this.addJobs(...jobs);
    }

    public start(): void {
        this.paused = false;
        this.queue.start();

        const interval = setInterval(() => {
            if (this.paused) {
                return;
            }
            this.fetchJobs().catch(logError);
            this.checkRunningJobs().catch(logError);
        }, 60000);
        this.fetchJobs().catch(console.error);

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = interval;
    }

    public pause(): void {
        this.paused = true;
        this.queue.pause();

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    public stop(): void {
        this.paused = true;
        this.queue.clear();

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    public async addJobs(...jobs: JobRequest[]) {
        let waitForOtherRequest: JobRequest[] = [];
        const addJobs = jobs.filter((value) => {
            if (value.runAfter) {
                waitForOtherRequest.push(value);
                return false;
            } else {
                return true;
            }
        });

        while (addJobs.length) {
            await jobStorage.addJobs(addJobs);
            addJobs.length = 0;
            waitForOtherRequest = waitForOtherRequest.filter((value) => {
                if (isJobItem(value.runAfter)) {
                    addJobs.push(value);
                    return false;
                } else {
                    return true;
                }
            });
        }

        if (waitForOtherRequest.length) {
            logger.warn("could not add all depending jobs: " + JSON.stringify(waitForOtherRequest));
        }
    }

    public getJobs(): OutsideJob[] {
        return this.queue.getJobs();
    }

    private addDependant(jobsMap: Map<ScrapeJob, JobItem[]>): void {
        for (const [key, value] of jobsMap.entries()) {
            for (const job of value) {
                if (this.jobMap.has(job.id)) {
                    continue;
                }
                if (key.event) {
                    this.queueEmittableJob(key, job);
                } else {
                    this.queueJob(key, job);
                }
            }
        }
    }

    private async checkRunningJobs() {
        const now = new Date();
        try {
            // @ts-ignore
            await dns.promises.lookup("google.de");
            const timeoutDates = [...missingConnections.values()];
            const maxDate = maxValue(timeoutDates);

            now.setMinutes(-30);
            // if there at least 5 jobs which started 30 min before but did not finish,
            // when there is at least one timeout, stop this process (pm2 should restart it then again)
            if (maxDate) {
                if (maxDate < now && this.queue.invalidRunning(maxDate, 5)) {
                    logError("Restarting Process due to long running jobs");
                    process.exit(1);
                    return;
                }
                now.setHours(-2);
                if (maxDate < now && this.queue.invalidRunning(maxDate, 1)) {
                    logError("Restarting Process due to long running jobs");
                    process.exit(1);
                    return;
                }
            }
        } catch (e) {
            missingConnections.add(now);
        }
    }

    private async fetchJobs(): Promise<void> {
        if (this.queue.isFull()) {
            console.log("skip fetching jobs");
            return;
        }
        console.log("fetching jobs");
        const scrapeBoard: JobItem[] = await jobStorage.getJobs();
        this.processJobItems(scrapeBoard);
    }

    private processJobItems(items: JobItem[]) {
        const jobMap = new Map<ScrapeJob, any[]>();
        items
            .forEach((value) => {
                let args: any | undefined;
                let jobType: ScrapeJob;
                switch (value.type) {
                    case ScrapeName.newsAdapter:
                        jobType = ScrapeJob.newsAdapter;
                        args = value.arguments;
                        break;
                    case ScrapeName.checkTocs:
                        jobType = ScrapeJob.checkTocs;
                        break;
                    case ScrapeName.feed:
                        jobType = ScrapeJob.feed;
                        args = value.arguments;
                        break;
                    case ScrapeName.news:
                        jobType = ScrapeJob.news;
                        args = value.arguments;
                        break;
                    case ScrapeName.oneTimeToc:
                        jobType = ScrapeJob.oneTimeToc;
                        args = JSON.parse(value.arguments as string);
                        break;
                    case ScrapeName.oneTimeUser:
                        jobType = ScrapeJob.oneTimeUser;
                        args = JSON.parse(value.arguments as string);
                        break;
                    case ScrapeName.queueExternalUser:
                        jobType = ScrapeJob.queueExternalUser;
                        args = JSON.parse(value.arguments as string);
                        break;
                    case ScrapeName.queueTocs:
                        jobType = ScrapeJob.queueTocs;
                        break;
                    case ScrapeName.remapMediaParts:
                        jobType = ScrapeJob.remapMediaParts;
                        break;
                    case ScrapeName.toc:
                        jobType = ScrapeJob.toc;
                        args = JSON.parse(value.arguments as string);
                        break;
                    case ScrapeName.searchForToc:
                        jobType = ScrapeJob.searchForToc;
                        args = JSON.parse(value.arguments as string);
                        break;
                    default:
                        logger.warn("unknown job type: " + value.type);
                        return;
                }
                value.arguments = args;
                getElseSet(jobMap, jobType, () => []).push(value);
            });
        this.addDependant(jobMap);
    }

    private queueEmittableJob(jobType: ScrapeJob, item: JobItem) {
        const job = this.queue.addJob(() => {
            if (!jobType.event) {
                logger.warn("running emittable job without event name: " + jobType);
                return Promise.resolve();
            }
            if (Array.isArray(item.arguments)) {
                return this.collectEmittable(jobType.event, jobType.func(...item.arguments));
            } else {
                return this.collectEmittable(jobType.event, jobType.func(item.arguments));
            }
        });
        this.setJobListener(job, item);
        return job;
    }

    private queueJob(jobType: ScrapeJob, item: JobItem) {
        const job = this.queue.addJob(() => {
            if (Array.isArray(item.arguments)) {
                this.processJobCallback(jobType.func(...item.arguments));
            } else {
                this.processJobCallback(jobType.func(item.arguments));
            }
        });
        this.setJobListener(job, item);
        return job;
    }

    private processJobCallback(result: JobRequest | JobRequest[] | Promise<JobRequest | JobRequest[]>)
        : Promise<void> | void {

        if (!result) {
            return;
        }
        if (result instanceof Promise) {
            return result.then((value) => value && this.processJobCallbackResult(value));
        } else {
            return this.processJobCallbackResult(result);
        }
    }

    private processJobCallbackResult(value: JobRequest | JobRequest[]): void {
        if (!value) {
            return;
        }
        if (Array.isArray(value)) {
            this.addJobs(...value).catch(logError);
        } else {
            this.addJobs(value).catch(logError);
        }
    }

    private setJobListener(job: Job, item: JobItem) {
        job.onStart = async () => {
            if (item.name) {
                this.jobMap.set(item.name, job);
            }
            this.jobMap.set(item.id, job);
            item.state = JobState.RUNNING;
            await jobStorage.updateJobs(item);
            console.log(`Job ${item.name ? item.name : item.id} is running now, ${new Date()}`);
        };
        job.onDone = async () => {
            if (item.name) {
                this.jobMap.delete(item.name);
            }
            this.jobMap.delete(item.id);
            const newJobs = await jobStorage.getAfterJobs(item.id);
            this.processJobItems(newJobs);

            if (item.deleteAfterRun) {
                await jobStorage.removeJobs(item);
            } else {
                item.lastRun = new Date();

                if (item.interval > 0) {
                    if (item.interval < 60000) {
                        item.interval = 60000;
                    }
                    item.nextRun = new Date(item.lastRun.getTime() + item.interval);
                }
                item.state = JobState.WAITING;
                await jobStorage.updateJobs(item);
            }
            console.log(`Job ${item.name ? item.name : item.id} finished now, ${new Date()}`);
        };
    }

    private collectEmittable(eventName: ScrapeEvent, value: Promise<any>): Promise<void> {
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

function isJobItem(value: any): value is JobItem {
    return value && value.id;
}

export const DefaultJobScraper = new JobScraperManager();
DefaultJobScraper.start();
