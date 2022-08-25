import { ScraperHelper } from "../externals/scraperTools";
import { JobQueue, OutsideJob } from "./jobQueue";
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
import { jobStorage, notificationStorage } from "enterprise-core/dist/database/storages/storage";
import * as dns from "dns";
import { getStore, StoreKey } from "enterprise-core/dist/asyncStorage";
import { StartJobChannelMessage } from "../externals/types";
import { getNewsAdapter, load } from "../externals/hookManager";
import { ScrapeJob, scrapeMapping } from "./scrapeJobs";
import { channel } from "diagnostics_channel";
import { SchedulingStrategy, Strategies } from "./scheduling";
import { gracefulShutdown } from "enterprise-core/dist/exit";
import { createJob, Job } from "./job";

const missingConnections = new Set<Date>();
const jobChannel = channel("enterprise-jobs");

export class JobScheduler {
  public automatic = true;
  public filter: undefined | ((item: JobItem) => boolean);

  private readonly helper = new ScraperHelper();
  private readonly queue = new JobQueue({ maxActive: 50 });
  private fetching = false;
  private paused = true;
  private readonly jobMap = new Map<number | string, Job>();

  /**
   * Jobs of currently queued or running jobs
   */
  private readonly jobs: Job[] = [];
  private readonly nameIdList: Array<[number, string]> = [];
  private intervalId: Optional<NodeJS.Timeout>;
  private readonly schedulingStrategy: SchedulingStrategy;

  public constructor() {
    this.schedulingStrategy = Strategies.JOBS_QUEUE_FORCED_BALANCED;
  }

  public on(event: string, callback: (value: any) => undefined | EmptyPromise): void {
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

    this.jobs.forEach((job) => job.abort());
    this.jobs.length = 0;
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
      const message: StartJobChannelMessage = {
        jobId: job.jobId,
        messageType: "jobs",
        jobName: found?.[1] || "Not found",
        timestamp: job.startRun || 0,
        type: "started",
      };
      jobChannel.publish(message);
    });
  }

  private addDependant(jobsMap: Map<ScrapeJob, Job[]>): void {
    for (const [key, value] of jobsMap.entries()) {
      for (const job of value) {
        // skip jobs which are already known to be running/queued
        if (this.jobMap.has(job.id)) {
          continue;
        }

        if (this.filter && !this.filter(job.currentItem)) {
          continue;
        }

        if (key.event) {
          this.queueEmittableJob(key, job);
        } else {
          this.queueJob(job);
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
          gracefulShutdown();
          return;
        }
        now.setHours(-2);
        if (maxDate < now && this.queue.invalidRunning(maxDate, 1)) {
          logger.error("Restarting Process due to long running jobs");
          gracefulShutdown();
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
        gracefulShutdown();
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
    const jobs: JobItem[] = await this.schedulingStrategy(
      this.queue,
      this.jobs.map((job) => job.currentItem),
    );
    this.processJobItems(jobs);
    logger.info("fetched jobs", {
      running: this.queue.runningJobs,
      schedulable: this.queue.schedulableJobs,
      total: this.queue.totalJobs,
    });
    this.fetching = false;
  }

  private processJobItems(items: JobItem[]) {
    const jobMap = new Map<ScrapeJob, Job[]>();
    items.forEach((value) => {
      const job = createJob(value);
      const scrapeJob = scrapeMapping.get(value.type);

      if (!scrapeJob) {
        logger.warn("no scrape job available", { job_id: value.id, job_type: value.type });
        return;
      }

      if (job) {
        getElseSet(jobMap, scrapeJob, () => []).push(job);
      }
    });
    this.addDependant(jobMap);
  }

  private queueEmittableJob(jobType: ScrapeJob, job: Job) {
    this.queue.addJob(job);
    job.once("done", async (error, result) => {
      if (!jobType.event) {
        logger.warn("running emittable job without event name", { job_type: jobType.name });
        return Promise.resolve();
      }

      if (error) {
        const store = getStore();

        if (store) {
          const jobLabel = store.get(StoreKey.LABEL) ?? { job_name: "unknown", job_id: 0 };

          await notificationStorage
            .insertNotification({
              title: `Job Error for '${jobLabel.job_name}'`,
              content: error.message.slice(0, 700),
              date: new Date(),
              key: "job-" + jobLabel.job_id,
              type: "error",
            })
            .catch(logger.error);
        }
        await this.helper.emit(jobType.event + ":error", error);
      } else {
        await this.helper.emit(jobType.event, result);
      }
    });
    this.setJobListener(job);
    return job;
  }

  private queueJob(job: Job) {
    this.queue.addJob(job);

    job.once("done", async (error, result: undefined | JobRequest | JobRequest[]) => {
      if (error) {
        logger.error(error);
        return;
      }
      if (!result) {
        return;
      }
      logger.info("job produced job requests", { job_id: job.id });

      if (Array.isArray(result)) {
        await this.addJobs(...result).catch(logger.error);
      } else {
        await this.addJobs(result).catch(logger.error);
      }
    });
    this.setJobListener(job);
    return job;
  }

  private setJobListener(job: Job) {
    // remember job until it is finished
    this.jobs.push(job);
    const item = job.currentItem;

    job.once("before", async () => {
      if (item.name) {
        this.jobMap.set(item.name, job);
        this.nameIdList.push([item.id, item.name]);
      }
      this.jobMap.set(item.id, job);
    });

    job.once("after", async () => {
      if (item.name) {
        this.jobMap.delete(item.name);
        removeLike(this.nameIdList, (value) => value[0] === item.id);
      }

      removeLike(this.jobs, (value) => value.id === item.id);
      this.jobMap.delete(item.id);
      const newJobs = await jobStorage.getAfterJobs(item.id);
      this.processJobItems(newJobs);
    });
  }
}

function isJobItem(value: any): value is JobItem {
  return value?.id;
}

export const DefaultJobScraper = new JobScheduler();
