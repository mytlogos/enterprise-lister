import { remove, removeLike, stringify, getElseSet, isAbortError } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { Optional, Nullable } from "enterprise-core/dist/types";
import { runAsync, StoreKey, inContext, requireStore } from "enterprise-core/dist/asyncStorage";
import Timeout = NodeJS.Timeout;
import { channel } from "diagnostics_channel";
import { JobError } from "enterprise-core/dist/error";
import { Job } from "./job";

const queueChannel = channel("enterprise-jobqueue");

function createJobMessage(store: ReadonlyMap<string, any>) {
  const message = {
    modifications: store.get("modifications") || {},
    queryCount: store.get("queryCount") || 0,
    network: store.get("network") || {},
    originalMessage: store.get("message"),
    error: undefined as unknown,
  };
  if (store.has("error")) {
    const storeError = store.get("error");

    if (
      storeError instanceof Error ||
      (typeof storeError === "object" && storeError && "name" in storeError && "message" in storeError)
    ) {
      message.error = {
        name: storeError.name,
        message: storeError.message,
      };
    } else {
      message.error = storeError;
    }
  }
  return message;
}

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
   * Queue a new Job.
   * The JobId is used for identification and logging.
   * There can be multiple jobs with the same JobId.
   *
   * @param job the job to execute
   * @return Job for registering callbacks before and after executing a job
   */
  public addJob(job: Job): void {
    const wasEmpty = this.isEmpty();
    let lastRun: Nullable<number> = null;

    const internJob: InternJob = {
      active: true,
      job,
      set lastRun(last: number) {
        lastRun = last;
      },
      get lastRun() {
        // @ts-expect-error
        return lastRun;
      },
    };
    this.waitingJobs.push(internJob);

    if (wasEmpty) {
      this.setInterval();
    }
  }

  /**
   * Remove all Jobs which have the corresponding JobInfo.
   * Which is ultimately at most one job, as every JobInfo is a new object.
   * Removing an active Job does not stop itself or it´s callbacks from executing.
   *
   * @param job the jobInfo of the job to remove
   * @return boolean true if there was a job removed from the active or waiting queue
   */
  public removeJob(job: Readonly<Job>): boolean {
    const predicate = (value: InternJob) => value.job.id === job.id;
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
   * Does not return any callbacks or the job callback itself.
   * The jobs can at most be identified by the jobId given when the job was queued.
   *
   * @return Array<OutsideJob> an array of the internal jobs.
   */
  public getJobs(): ReadonlyArray<Readonly<OutsideJob>> {
    const jobs = [];
    for (const job of this.activeJobs) {
      jobs.push({
        active: job.active,
        jobId: job.job.id,
        lastRun: job.lastRun,
        running: job.running,
        startRun: job.startRun,
      });
    }
    for (const job of this.waitingJobs) {
      jobs.push({
        active: job.active,
        jobId: job.job.id,
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
      const store = requireStore();

      const running = store.get(StoreKey.RUNNING);
      const waiting = store.get(StoreKey.WAITING);

      logger.info("Job finished running", {
        job_id: job.job.id,
        job_running: running + "ms",
        job_waiting: waiting + "ms",
      });
      job.lastRun = Date.now();
      job.startRun = 0;
    } else {
      logger.info("Cancelling already finished job", { job_id: job.job.id });
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
      logger.info("queue will not execute a new job this tick", { reason });
      this.setInterval(1000);
      return;
    }
    const nextInternJob = this.waitingJobs.shift();
    if (!nextInternJob) {
      throw new JobError("no Job not found even though it should not be empty");
    }
    if (this.schedulableJobs > this.runningJobs) {
      this.setInterval(500);
    }
    this.executeJob(nextInternJob);
  }

  private executeJob(toExecute: InternJob) {
    toExecute.running = true;
    toExecute.startRun = Date.now();
    this.activeJobs.push(toExecute);

    const store = toExecute.job.jobStore;

    (async () => {
      try {
        // wrap each "stage" in runAsync of localstorage,
        // so that even if one stage loses context for whatever reason,
        // it should not affect the other stages
        const stop = await runAsync(toExecute.job.id, store, () =>
          inContext("Job-beforeRun", async () => {
            try {
              return await toExecute.job.beforeRun();
            } catch (error) {
              if (isAbortError(error)) {
                throw error;
              }
              logger.error("beforeRun threw an error", { job_id: toExecute.job.id, reason: stringify(error) });
              return true;
            }
          }),
        );

        if (stop) {
          return;
        }

        await runAsync(toExecute.job.id, store, () =>
          inContext("Job-Running", async () => {
            logger.info("executing job", { job_id: toExecute.job.id });

            await toExecute.job.runJob();

            // set default result value if not already set
            getElseSet(store, StoreKey.RESULT, () => "success");
            const message = createJobMessage(store);
            store.set(StoreKey.MESSAGE, stringify(message));
          }),
        );
      } catch (error) {
        if (isAbortError(error)) {
          store.set(StoreKey.RESULT, "aborted");
        } else {
          store.set(StoreKey.RESULT, "failed");
        }

        const message = {
          ...createJobMessage(store),
          reason: typeof error === "object" && error && (error as Error).message,
        };
        store.set(StoreKey.MESSAGE, stringify(message));

        if (isAbortError(error)) {
          logger.error("Job aborted", { job_id: toExecute.job.id, job_status: toExecute.job.jobStatus });
        } else {
          logger.error("Job threw an error", { job_id: toExecute.job.id, reason: stringify(error) });
        }
      } finally {
        await runAsync(toExecute.job.id, store, async () => {
          this._done(toExecute);

          await inContext("Job-afterRun", async () => {
            try {
              return await toExecute.job.afterRun();
            } catch (error) {
              logger.error("afterRun threw an error", { job_id: toExecute.job.id, reason: stringify(error) });
            }
          });

          toExecute.job.finished();
        });
      }
    })().catch(logger.error);
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
      });
    }
  }
}

interface InternJob {
  readonly job: Readonly<Job>;
  startRun?: number;
  running?: boolean;
  active: boolean;
  lastRun: Nullable<number>;
}

export interface OutsideJob {
  jobId: number;
  startRun?: number;
  running?: boolean;
  active: boolean;
  lastRun: Nullable<number>;
}
