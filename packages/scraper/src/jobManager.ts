import { remove, removeLike, stringify, getElseSet } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { JobRequest, EmptyPromise, Optional, Nullable } from "enterprise-core/dist/types";
import { getStore, runAsync, setContext, removeContext } from "enterprise-core/dist/asyncStorage";
import Timeout = NodeJS.Timeout;
import diagnostics_channel from "diagnostics_channel";
import { JobQueueChannelMessage } from "./externals/types";

const queueChannel = diagnostics_channel.channel("enterprise-jobqueue");

/**
 * Memory Units with their Values in Bytes.
 */
export enum MemorySize {
  GB = 1024 * 1024 * 1024,
  MB = 1024 * 1024,
  KB = 1024,
  B = 1,
}

/**
 * A Job Queue which queues Jobs to start.
 * The queue may define a Memory Limit after which
 * no new Jobs are queued right away and a number of
 * Jobs which can be active at the same time.
 *
 * The Queue itself is unbounded, there can be as many Jobs
 * queued as there is memory.
 * (TODO: what if there so many jobs queued that a given Memory Limit is exceeded?)
 * The Queue can be paused, started, but will
 * queue new Jobs regardless of the state of the queue.
 *
 * A Job runs in a Async Context and has access
 * to a Map as store, which can be accessed with the
 * asyncStorage.getStore API.
 *
 * A Job is schedulable if there is room between the number
 * of maximum active jobs and the number of currently active jobs.
 *
 * The Queue has two scheduling phases in which the rate of
 * checking for schedulable Jobs differ:
 * <ol>
 *     <li>Full: Checks every 0.5s</li>
 *     <li>Constrained: Checks every 1s</li>
 * </ol>
 * It switches to the full rate if it had once more schedulable jobs
 * than the number of currently running jobs.
 * The queue switches to constrained if it does not have any schedulable jobs
 * or any Queue Constraints like Memory are active or the queue itself is not active (paused or stopped).
 *
 * If the Queue is paused it stops checking for schedulable jobs until it is started again.
 *
 * After a Job is executed (successfully or failed), it will be removed immediately.
 */
export class JobQueue {
  /**
   * The current memoryLimit.
   * A Memory Limit of zero or negative is ignored.
   */
  public readonly memoryLimit: number;
  /**
   * The maximum Number of active Jobs.
   * A positive number, can be zero (TODO: maxActive = 0 should be removed?)
   */
  public readonly maxActive: number;
  /**
   * The Unit of the Memory Limit.
   */
  public readonly memorySize: MemorySize;
  /**
   * The queued Jobs.
   * @private
   */
  private readonly waitingJobs: InternJob[] = [];
  /**
   * The active Jobs.
   * Has at most the number of maxActive elements.
   * @private
   */
  private readonly activeJobs: InternJob[] = [];
  private queueActive = false;
  /**
   * The intervalId of the current Interval for checking.
   * @private
   */
  private intervalId: Optional<Timeout>;
  /**
   * Current time in milliseconds between checking for starting jobs.
   * @private
   */
  private currentInterval = 1000;

  /**
   * Get the number of currently active Jobs.
   */
  public get runningJobs(): number {
    return this.activeJobs.length;
  }

  /**
   * Get the number of currently queued inactive Jobs.
   */
  public get queuedJobs(): number {
    return this.waitingJobs.length;
  }

  /**
   * Get the number of currently schedulable Jobs
   * in regards to the number of currently and maximum active jobs.
   */
  public get schedulableJobs(): number {
    const available = this.waitingJobs.length;
    const maxSchedulable = this.maxActive - this.runningJobs;
    return maxSchedulable > available ? available : maxSchedulable;
  }

  /**
   * Get the Number of Jobs in this queue regardless of their state.
   */
  public get totalJobs(): number {
    return this.waitingJobs.length + this.activeJobs.length;
  }

  /**
   * Construct a JobQueue.
   *
   * @param memoryLimit the size of the Memory Limit, zero or negative for ignoring memory limits, by default zero
   * @param memorySize the units of the Memory Limit, by default Bytes
   * @param maxActive the maximum number of active jobs, negative values are replaced by 1, by default 5
   */
  public constructor({ memoryLimit = 0, memorySize = MemorySize.B, maxActive = 5 } = {}) {
    this.memoryLimit = memoryLimit;
    this.memorySize = memorySize;
    this.maxActive = maxActive < 0 ? 1 : maxActive;
  }

  /**
   * Queue a new Job with the given jobId.
   * The JobId is used for identification and logging.
   * There can be multiple jobs with the same JobId and/or JobCallback.
   * A Job can return new JobRequests (TODO: JobRequests are unnecessary for JobQueue).
   *
   * @param jobId the jobId, any number
   * @param job the job to execute, a valid function
   * @return Job for registering callbacks before and after executing a job
   */
  public addJob(jobId: number, job: JobCallback): Job {
    const wasEmpty = this.isEmpty();
    let lastRun: Nullable<number> = null;

    const info: Job = {};
    const internJob: InternJob = {
      jobId,
      executed: 0,
      active: true,
      job,
      set lastRun(last: number) {
        lastRun = last;
      },
      get lastRun() {
        // @ts-expect-error
        return lastRun;
      },
      jobInfo: info,
    };
    this.waitingJobs.push(internJob);
    if (wasEmpty) {
      this.setInterval();
    }
    return info;
  }

  /**
   * Remove all Jobs which have the corresponding JobInfo.
   * Which is ultimately at most one job, as every JobInfo is a new object.
   * Removing an active Job does not stop itself or it´s callbacks from executing.
   *
   * @param job the jobInfo of the job to remove
   * @return boolean true if there was a job removed from the active or waiting queue
   */
  public removeJob(job: Job): boolean {
    const predicate = (value: InternJob) => value.jobInfo === job;
    return removeLike(this.waitingJobs, predicate) || removeLike(this.activeJobs, predicate);
  }

  /**
   * Start the Queue.
   * Activates checking for schedulable jobs.
   */
  public start(): void {
    this.queueActive = true;
    this.setInterval();
  }

  /**
   * Pauses the Queue.
   * Stops only from executing new jobs, not stopping currently active jobs.
   */
  public pause(): void {
    this.queueActive = false;

    this.stopInterval();
  }

  /**
   * Pauses the Queue and removes all
   * Jobs regardless of state.
   * Does not stop any currently active jobs.
   */
  public clear(): void {
    this.queueActive = false;

    this.stopInterval();

    this.waitingJobs.forEach((value) => (value.active = false));
    this.waitingJobs.length = 0;
    this.activeJobs.length = 0;
  }

  /**
   * Checks whether the queue is empty or not.
   *
   * @return boolean if the queue is empty
   */
  public isEmpty(): boolean {
    return this.activeJobs.length + this.waitingJobs.length === 0;
  }

  /**
   * Checks whether the current queue has as many active jobs
   * as the maximum number of active jobs.
   *
   * @return boolean true of maximum number of jobs are active
   */
  public isFull(): boolean {
    return this.activeJobs.length >= this.maxActive;
  }

  /**
   * Checks whether there are a certain number of jobs which started
   * before a certain date.
   *
   * @param end the date to check for
   * @param atLeast the number of jobs which at least need to be invalid
   * @return boolean true if 'atLeast' number of jobs started before 'end'
   */
  public invalidRunning(end: Date, atLeast: number): boolean {
    const nonEndingJobs = this.activeJobs.filter((value) => {
      return value.startRun && value.startRun < end.getTime();
    });
    return nonEndingJobs.length >= atLeast;
  }

  /**
   * Get a shallow copy of the internal representation of the jobs.
   * Does not return any callbacks or the jobcallback itself.
   * The jobs can at most be identified by the jobId given when the job was queued.
   *
   * @return Array<OutsideJob> an array of the internal jobs.
   */
  public getJobs(): OutsideJob[] {
    const jobs = [];
    for (const job of this.activeJobs) {
      jobs.push({
        active: job.active,
        executed: job.executed,
        jobId: job.jobId,
        lastRun: job.lastRun,
        running: job.running,
        startRun: job.startRun,
      });
    }
    for (const job of this.waitingJobs) {
      jobs.push({
        active: job.active,
        executed: job.executed,
        jobId: job.jobId,
        lastRun: job.lastRun,
        running: job.running,
        startRun: job.startRun,
      });
    }
    return jobs;
  }

  private _done(job: InternJob) {
    remove(this.activeJobs, job);
    job.running = false;
    if (job.startRun) {
      const store = getStore();

      if (!store) {
        throw Error("Missing Store! Are you sure this was running in an AsyncResource?");
      }
      const running = store.get("running");
      const waiting = store.get("waiting");
      logger.info(
        `Job ${job.jobId} executed in running ${running} ms and waiting ${waiting} ms, ${job.executed} times`,
      );
      job.lastRun = Date.now();
      job.startRun = 0;
    } else {
      logger.info(`Cancelling already finished job ${job.jobId}`);
    }
  }

  private _fullQueue() {
    return this.runningJobs >= this.maxActive;
  }

  private _overMemoryLimit() {
    if (this.memoryLimit <= 0) {
      return false;
    }
    return process.memoryUsage().rss / this.memorySize > this.memoryLimit;
  }

  private _queueJob(): void {
    if (this.isEmpty() && this.intervalId) {
      this.stopInterval();
      logger.info("queue is empty");
      return;
    }
    if (!this.schedulableJobs || !this.queueActive || this._fullQueue() || this._overMemoryLimit()) {
      let reason = "i dont know the reason";
      if (!this.schedulableJobs) {
        reason = "No Schedulable Jobs";
      } else if (!this.queueActive) {
        reason = "Queue is not active";
      } else if (this._fullQueue()) {
        reason = "Queue is full";
      } else if (this._overMemoryLimit()) {
        reason = "Over Memory Limit";
      }
      logger.info(`queue will not execute a new job this tick: '${reason}'`);
      this.setInterval(1000);
      return;
    }
    const nextInternJob = this.waitingJobs.shift();
    if (!nextInternJob) {
      throw Error("no Job not found even though it should not be empty");
    }
    if (this.schedulableJobs > this.runningJobs) {
      this.setInterval(500);
    }
    this.executeJob(nextInternJob);
  }

  private executeJob(toExecute: InternJob) {
    toExecute.running = true;
    this.activeJobs.push(toExecute);
    toExecute.startRun = Date.now();
    const store = new Map();
    runAsync(toExecute.jobId, store, async () => {
      try {
        if (toExecute.jobInfo.onStart) {
          try {
            setContext("Job-OnStart");
            await this.executeCallback(toExecute.jobInfo.onStart);
          } catch (error) {
            logger.error(`Job ${toExecute.jobId} onStart threw an error!: ${stringify(error)}`);
          } finally {
            removeContext("Job-OnStart");
          }
        }
        setContext("Job");
        await this.executeCallback(async () => {
          toExecute.executed++;
          logger.info("executing job: " + toExecute.jobId);
          return toExecute.job(() => this._done(toExecute));
        });
        getElseSet(store, "result", () => "success");
        if (!store.get("message")) {
          const message = {
            modifications: store.get("modifications") || {},
            queryCount: store.get("queryCount") || 0,
            network: store.get("network") || {},
          };
          store.set("message", JSON.stringify(message));
        }
      } catch (error) {
        remove(this.waitingJobs, toExecute);
        store.set("result", "failed");
        if (!store.get("message")) {
          const message = {
            modifications: store.get("modifications") || {},
            queryCount: store.get("queryCount") || 0,
            network: store.get("network") || {},
            reason: error.message,
          };
          store.set("message", JSON.stringify(message));
        }
        logger.error(`Job ${toExecute.jobId} threw an error somewhere ${stringify(error)}`);
      } finally {
        removeContext("Job");
        this._done(toExecute);

        if (toExecute.jobInfo.onDone) {
          try {
            setContext("Job-OnDone");
            await this.executeCallback(toExecute.jobInfo.onDone);
          } catch (error) {
            logger.error(`Job ${toExecute.jobId} onDone threw an error!: ${stringify(error)}`);
          } finally {
            removeContext("Job-OnDone");
          }
        }
      }
    });
  }

  private setInterval(duration?: number) {
    if (!duration) {
      duration = this.currentInterval;
    } else if (this.currentInterval === duration) {
      return;
    } else {
      this.currentInterval = duration;
    }
    const interval = setInterval(() => {
      if (!this.queueActive) {
        return;
      }
      this._queueJob();
      this.publish();
    }, duration);

    this.stopInterval();
    this.intervalId = interval;
  }

  private stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private executeCallback(callback: () => any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const result = callback();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Publish the current state of this JobQueue to the diagnostics_channel.
   */
  private publish() {
    if (queueChannel.hasSubscribers) {
      queueChannel.publish({
        messageType: "jobqueue",
        active: this.activeJobs.length,
        queued: this.waitingJobs.length,
        max: this.maxActive,
      } as JobQueueChannelMessage);
    }
  }
}

export type JobCallback =
  | ((done: () => void) => void | JobRequest | JobRequest[])
  | (() => Promise<void | JobRequest | JobRequest[]>);

interface InternJob {
  readonly jobInfo: Job;
  readonly job: JobCallback;
  jobId: number;
  startRun?: number;
  running?: boolean;
  active: boolean;
  executed: number;
  lastRun: Nullable<number>;
}

export interface OutsideJob {
  jobId: number;
  startRun?: number;
  running?: boolean;
  active: boolean;
  executed: number;
  lastRun: Nullable<number>;
}

export interface Job {
  onStart?: () => void | EmptyPromise;
  onDone?: () => void | EmptyPromise;
}
