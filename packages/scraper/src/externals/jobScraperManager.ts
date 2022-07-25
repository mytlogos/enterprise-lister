import { ScrapeEvent, ScraperHelper } from "./scraperTools";
import { Job, JobQueue, OutsideJob } from "../jobManager";
import { getElseSet, isString, maxValue, removeLike, stringify } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import {
  JobItem,
  JobRequest,
  JobState,
  MilliTime,
  ScrapeName,
  EmptyPromise,
  Optional,
} from "enterprise-core/dist/types";
import { jobStorage } from "enterprise-core/dist/database/storages/storage";
import * as dns from "dns";
import { getStore, StoreKey } from "enterprise-core/dist/asyncStorage";
import Timeout = NodeJS.Timeout;
import { EndJobChannelMessage, StartJobChannelMessage, TocRequest } from "./types";
import { getNewsAdapter, load } from "./hookManager";
import { ScrapeJob } from "./scrapeJobs";
import diagnostic_channel from "diagnostics_channel";
import { SchedulingStrategy, Strategies } from "./scheduling";
import { JobError } from "enterprise-core/dist/error";

const missingConnections = new Set<Date>();
const jobChannel = diagnostic_channel.channel("enterprise-jobs");

export class JobScraperManager {
  private static initStore(item: JobItem) {
    const store = getStore();

    if (store) {
      const label = getElseSet(store, StoreKey.LABEL, () => ({}));
      label.job_id = item.id;
      label.job_name = item.name;
      store.set(StoreKey.LAST_RUN, item.lastRun);
    }
  }

  public automatic = true;
  public filter: undefined | ((item: JobItem) => boolean);

  private readonly helper = new ScraperHelper();
  private readonly queue = new JobQueue({ maxActive: 50 });
  private fetching = false;
  private paused = true;
  private readonly jobMap = new Map<number | string, Job>();
  private readonly jobItems = [] as JobItem[];
  private readonly nameIdList: Array<[number, string]> = [];
  private intervalId: Optional<Timeout>;
  private readonly schedulingStrategy: SchedulingStrategy;

  public constructor() {
    this.schedulingStrategy = Strategies.REQUEST_QUEUE_BALANCED;
  }

  public on(event: string, callback: (value: any) => void | EmptyPromise): void {
    this.helper.on(event, callback);
  }

  public async removeDependant(key: number | string): EmptyPromise {
    const job = this.jobMap.get(key);
    if (!job) {
      logger.warn("tried to remove non existant job", { job_key: key });
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
      logger.warn("could not find other job key", { job_key: key });
    } else {
      this.jobMap.delete(otherKey);
      this.jobMap.delete(key);
    }
    this.queue.removeJob(job);
    return jobStorage.removeJob(key).catch(logger.error);
  }

  public async setup(): EmptyPromise {
    // load (scraper) hooks on setup
    await load();

    // TODO: 02.09.2019 clear or run all jobs which have the runAfter field, where the original job was deleted
    await jobStorage.stopJobs().catch(logger.error);

    const jobs = getNewsAdapter().map((value): JobRequest => {
      return {
        deleteAfterRun: false,
        runImmediately: true,
        interval: MilliTime.MINUTE * 5,
        name: `${value.hookName + ""}-${ScrapeName.newsAdapter}`,
        type: ScrapeName.newsAdapter,
        arguments: value.hookName,
      };
    });
    jobs.push(
      {
        type: ScrapeName.checkTocs,
        interval: MilliTime.HOUR,
        name: ScrapeName.checkTocs,
        deleteAfterRun: false,
        runImmediately: true,
      },
      {
        type: ScrapeName.queueTocs,
        interval: MilliTime.HOUR,
        name: ScrapeName.queueTocs,
        deleteAfterRun: false,
        runImmediately: true,
      },
      {
        type: ScrapeName.remapMediaParts,
        interval: MilliTime.HOUR,
        name: ScrapeName.remapMediaParts,
        deleteAfterRun: false,
        runImmediately: true,
      },
      {
        type: ScrapeName.queueExternalUser,
        interval: MilliTime.DAY * 7,
        name: ScrapeName.queueExternalUser,
        deleteAfterRun: false,
        runImmediately: true,
      },
    );
    await this.addJobs(...jobs);
  }

  public start(): void {
    this.paused = false;
    this.queue.start();

    const interval = setInterval(() => {
      if (this.paused) {
        return;
      }
      if (!this.automatic) {
        return;
      }
      this.fetchJobs().catch(logger.error);
      this.checkRunningJobs().catch(logger.error);
      this.checkCurrentVsStorage()
        .then(() => this.checkRunningStorageJobs())
        .catch(logger.error);
    }, 60_000);
    this.fetchJobs().catch(logger.error);

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

  /**
   * Mainly for test purposes
   * @param jobIds
   */
  public async runJobs(...jobIds: number[]): EmptyPromise {
    logger.info("start fetching jobs", {
      running: this.queue.runningJobs,
      schedulable: this.queue.schedulableJobs,
      total: this.queue.totalJobs,
    });
    const jobs = await jobStorage.getJobsById(jobIds);
    this.processJobItems(jobs);
    logger.info("fetched jobs", {
      running: this.queue.runningJobs,
      schedulable: this.queue.schedulableJobs,
      total: this.queue.totalJobs,
    });
  }

  public async addJobs(...jobs: JobRequest[]): EmptyPromise {
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

  public publishJobs(): void {
    this.queue.getJobs().forEach((job) => {
      if (!job.active || !job.startRun) {
        return;
      }
      const found = this.nameIdList.find((value) => value[0] === job.jobId);
      const message = {
        jobId: job.jobId,
        messageType: "jobs",
        jobName: found?.[1] || "Not found",
        timestamp: job.startRun || 0,
        type: "started",
      } as StartJobChannelMessage;
      jobChannel.publish(message);
    });
  }

  private addDependant(jobsMap: Map<ScrapeJob, JobItem[]>): void {
    for (const [key, value] of jobsMap.entries()) {
      for (const job of value) {
        if (this.jobMap.has(job.id)) {
          continue;
        }
        if (this.filter && !this.filter(job)) {
          continue;
        }

        this.jobItems.push(job);

        if (key.event) {
          this.queueEmittableJob(key, job);
        } else {
          this.queueJob(key, job);
        }
      }
    }
  }

  private async checkCurrentVsStorage() {
    const runningJobs: JobItem[] = await jobStorage.getJobsInState(JobState.RUNNING);

    // jobs which are marked as running in storage, while not running
    const invalidJobs: JobItem[] = [];

    const jobs = this.queue.getJobs();
    const currentlyRunningJobIds = new Set();
    for (const job of jobs) {
      if (job.running) {
        currentlyRunningJobIds.add(job.jobId);
      }
    }
    for (const runningJob of runningJobs) {
      if (!currentlyRunningJobIds.has(runningJob.id)) {
        invalidJobs.push(runningJob);
      }
    }
    if (invalidJobs.length) {
      // TODO: what to do with these variables?
      const identifier = [];
      const removeJobs: JobItem[] = [];
      const updateJobs = invalidJobs.filter((value) => {
        identifier.push(value.name ? value.name : value.id);

        if (value.deleteAfterRun) {
          removeJobs.push(value);
          return false;
        }

        value.lastRun = new Date();

        if (value.interval > 0) {
          if (value.interval < 60000) {
            value.interval = 60000;
          }
          value.nextRun = new Date(value.lastRun.getTime() + value.interval);
        }
        value.state = JobState.WAITING;
        return true;
      });
      if (removeJobs.length) {
        try {
          await jobStorage.removeJobs(removeJobs);
          logger.warn("Removed Invalid Jobs", { count: removeJobs.length, jobs: JSON.stringify(removeJobs) });
        } catch (e) {
          logger.error("error while removing invalid Jobs", { reason: stringify(e) });
        }
      }
      if (updateJobs.length) {
        try {
          await jobStorage.updateJobs(updateJobs);
          logger.warn("Set invalid Jobs back to 'waiting'", {
            count: updateJobs.length,
            jobs: JSON.stringify(updateJobs),
          });
        } catch (e) {
          logger.error("error while removing invalid Jobs", { reason: stringify(e) });
        }
      }
    }
  }

  private async checkRunningJobs() {
    const now = new Date();
    try {
      await dns.promises.lookup("google.de");
      const timeoutDates = [...missingConnections.values()];
      const maxDate = maxValue(timeoutDates);

      now.setMinutes(-30);
      // if there at least 5 jobs which started 30 min before but did not finish,
      // when there is at least one timeout, stop this process (pm2 should restart it then again)
      if (maxDate) {
        if (maxDate < now && this.queue.invalidRunning(maxDate, 5)) {
          logger.error("Restarting Process due to long running jobs");
          process.exit(1);
          return;
        }
        now.setHours(-2);
        if (maxDate < now && this.queue.invalidRunning(maxDate, 1)) {
          logger.error("Restarting Process due to long running jobs");
          process.exit(1);
          return;
        }
      }
    } catch (e) {
      missingConnections.add(now);
    }
  }

  private async checkRunningStorageJobs() {
    const runningJobs: JobItem[] = await jobStorage.getJobsInState(JobState.RUNNING);
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    for (const runningJob of runningJobs) {
      if (!runningJob.runningSince) {
        logger.warn("job in state 'RUNNING' without a start date", { job_id: runningJob.id });
        continue;
      }

      if (runningJob.runningSince < twoHoursAgo) {
        logger.error("Cannot finish jobs properly - exiting application with error code 1", {
          storageRunning: runningJobs.length,
          queueRunning: this.queue.runningJobs,
        });
        process.exit(1);
      }
    }
  }

  private async fetchJobs(): EmptyPromise {
    if (!this.automatic) {
      return;
    }
    if (this.fetching) {
      logger.warn("skip fetching jobs", { reason: "previous fetch is still active" });
      return;
    }
    if (this.queue.isFull()) {
      logger.info("skip fetching jobs", { reason: "queue is full" });
      return;
    }
    this.fetching = true;
    logger.info("start fetching jobs", {
      running: this.queue.runningJobs,
      schedulable: this.queue.schedulableJobs,
      total: this.queue.totalJobs,
    });
    const jobs: JobItem[] = await this.schedulingStrategy(this.queue, this.jobItems);
    this.processJobItems(jobs);
    logger.info("fetched jobs", {
      running: this.queue.runningJobs,
      schedulable: this.queue.schedulableJobs,
      total: this.queue.totalJobs,
    });
    this.fetching = false;
  }

  private processJobItems(items: JobItem[]) {
    const jobMap = new Map<ScrapeJob, JobItem[]>();
    items.forEach((value) => {
      let args: Optional<any>;
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
          args = JSON.parse(value.arguments as string) as TocRequest;
          args.lastRequest = value.lastRun;
          break;
        case ScrapeName.searchForToc:
          jobType = ScrapeJob.searchForToc;
          args = JSON.parse(value.arguments as string);
          break;
        default:
          logger.warn("unknown job type", { job_type: value.type });
          return;
      }
      value.arguments = args;
      getElseSet(jobMap, jobType, () => []).push(value);
    });
    this.addDependant(jobMap);
  }

  private queueEmittableJob(jobType: ScrapeJob, item: JobItem) {
    const job = this.queue.addJob(item.id, () => {
      JobScraperManager.initStore(item);
      if (!jobType.event) {
        logger.warn("running emittable job without event name", { job_type: jobType.name });
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
    const job = this.queue.addJob(item.id, () => {
      JobScraperManager.initStore(item);
      if (Array.isArray(item.arguments)) {
        this.processJobCallback(jobType.func(...item.arguments));
      } else {
        this.processJobCallback(jobType.func(item.arguments));
      }
    });
    this.setJobListener(job, item);
    return job;
  }

  private processJobCallback(
    result: JobRequest | JobRequest[] | Promise<JobRequest | JobRequest[]>,
  ): EmptyPromise | void {
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
      this.addJobs(...value).catch(logger.error);
    } else {
      this.addJobs(value).catch(logger.error);
    }
  }

  private setJobListener(job: Job, item: JobItem) {
    job.onStart = async () => {
      if (item.name) {
        this.jobMap.set(item.name, job);
        this.nameIdList.push([item.id, item.name]);
      }
      this.jobMap.set(item.id, job);
      item.state = JobState.RUNNING;
      item.runningSince = new Date();

      await jobStorage.updateJobs(item);
      logger.info("Job is running now", { job_name: item.name, job_id: item.id });

      if (jobChannel.hasSubscribers) {
        jobChannel.publish({
          messageType: "jobs",
          type: "started",
          jobName: item.name,
          jobId: item.id,
          timestamp: Date.now(),
        } as StartJobChannelMessage);
      }
    };
    job.onDone = async () => {
      const end = new Date();

      if (item.name) {
        this.jobMap.delete(item.name);
        removeLike(this.nameIdList, (value) => value[0] === item.id);
      }

      removeLike(this.jobItems, (value) => value.id === item.id);
      this.jobMap.delete(item.id);
      const newJobs = await jobStorage.getAfterJobs(item.id);
      this.processJobItems(newJobs);

      if (item.deleteAfterRun) {
        await jobStorage.removeJobs(item, end);
      } else {
        item.lastRun = new Date();
        item.previousScheduledAt = item.nextRun;

        if (item.interval > 0) {
          if (item.interval < 60000) {
            item.interval = 60000;
          }
          item.nextRun = new Date(item.lastRun.getTime() + item.interval);
        }
        item.state = JobState.WAITING;
        await jobStorage.updateJobs(item, end);
      }
      logger.info("Job finished now", { job_name: item.name, job_id: item.id });

      if (jobChannel.hasSubscribers) {
        const store = getStore();
        if (!store) {
          throw new JobError("missing store - is this running outside a AsyncLocalStorage Instance?");
        }

        const result = store.get(StoreKey.RESULT);
        jobChannel.publish({
          messageType: "jobs",
          type: "finished",
          jobName: item.name,
          jobId: item.id,
          jobType: item.type,
          jobTrack: {
            modifications: store.get(StoreKey.MODIFICATIONS) || {},
            network: store.get(StoreKey.NETWORK) || {
              count: 0,
              sent: 0,
              received: 0,
              history: [],
            },
            queryCount: store.get(StoreKey.QUERY_COUNT) || 0,
          },
          result,
          reason: result !== "success" ? store.get(StoreKey.MESSAGE) : undefined,
          timestamp: Date.now(),
        } as EndJobChannelMessage);
      }
    };
  }

  private collectEmittable(eventName: ScrapeEvent, value: Promise<any>): EmptyPromise {
    // TODO: 23.06.2019 collect e.g. 10 resolved items and then emit them, or emit them periodically if available
    // TODO: 23.06.2019 add timeout?
    return value
      .then((content) => this.helper.emit(eventName, content))
      .catch(async (reason) => {
        await this.helper.emit(eventName + ":error", reason);
        return reason;
      });
  }
}

function isJobItem(value: any): value is JobItem {
  return value?.id;
}

export const DefaultJobScraper = new JobScraperManager();
// DefaultJobScraper.start();
