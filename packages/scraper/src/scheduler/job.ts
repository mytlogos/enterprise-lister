import { channel } from "diagnostics_channel";
import { runAsync, Store, StoreKey } from "enterprise-core/dist/asyncStorage";
import { jobStorage } from "enterprise-core/dist/database/storages/storage";
import { JobError } from "enterprise-core/dist/error";
import logger from "enterprise-core/dist/logger";
import { stringify } from "enterprise-core/dist/tools";
import { JobItem, JobState, Optional, ScrapeName } from "enterprise-core/dist/types";
import { EndJobChannelMessage, StartJobChannelMessage } from "../externals/types";
import { scrapeMapping } from "./scrapeJobs";

export interface Events {
  done: (err: Error | undefined, result: any) => Promise<void>;
  before: () => Promise<void>;
  after: () => Promise<void>;
}

const jobChannel = channel("enterprise-jobs");

type EventListener = {
  [K in keyof Events]: Array<Events[K]>;
};

export function createJob(item: JobItem): Job | undefined {
  let args: Optional<any>;

  switch (item.type) {
    case ScrapeName.newsAdapter:
      args = item.arguments;
      break;
    case ScrapeName.checkTocs:
      break;
    case ScrapeName.feed:
      args = item.arguments;
      break;
    case ScrapeName.news:
      args = item.arguments;
      break;
    case ScrapeName.oneTimeToc:
      args = JSON.parse(item.arguments as string);
      break;
    case ScrapeName.oneTimeUser:
      args = JSON.parse(item.arguments as string);
      break;
    case ScrapeName.queueExternalUser:
      args = JSON.parse(item.arguments as string);
      break;
    case ScrapeName.queueTocs:
      break;
    case ScrapeName.remapMediaParts:
      break;
    case ScrapeName.toc:
      args = JSON.parse(item.arguments as string);
      args.lastRequest = item.lastRun;
      break;
    case ScrapeName.searchForToc:
      args = JSON.parse(item.arguments as string);
      break;
    default:
      logger.warn("unknown job type", { job_type: item.type, job_id: item.id });
      return;
  }

  const scrapeJob = scrapeMapping.get(item.type);

  if (!scrapeJob) {
    logger.warn("no scrape job mapping for job type", { job_type: item.type, job_id: item.id });
    return;
  }

  return new Job(() => scrapeJob.func.apply(undefined, Array.isArray(args) ? args : [args]), item);
}

type JobStatus = "waiting" | "beforeRun" | "running" | "afterRun" | "end";

/**
 * Single use instance of a job.
 * Cannot be used twice.
 * Can be aborted, breaking the normal lifecycle from the current status to "end".
 * Tries to abort the job on a best-effort basis.
 * Each stage checks in-between if job was aborted.
 *
 * To work better, the actual jobs should check via getStore().get(StoreKey.ABORT)
 * if this context was aborted.
 */
export class Job {
  private readonly controller = new AbortController();
  private readonly store: Store = new Map();

  /**
   * The lifecycle of jobs goes one way: waiting -> beforeRun -> running -> afterRun -> end
   */
  private status: JobStatus = "waiting";
  private readonly events: EventListener = Object.create(null);
  public readonly currentItem: JobItem;

  public constructor(private readonly job: () => any | Promise<any>, private readonly original: JobItem) {
    this.store.set(StoreKey.ABORT, this.controller.signal);

    if (original.lastRun) {
      this.store.set(StoreKey.LAST_RUN, original.lastRun);
    }

    this.store.set(StoreKey.LABEL, { job_id: original.id, job_name: original.name });
    this.currentItem = structuredClone(original);
  }

  public get jobStore(): Store {
    return this.store;
  }

  public get jobStatus() {
    return this.status;
  }

  public get id(): number {
    return this.original.id;
  }

  public async runJob() {
    if (this.status !== "beforeRun") {
      throw new JobError("beforeRun was not called");
    }
    this.status = "running";
    // throw if we try to run job, even though it is already aborted
    this.controller.signal.throwIfAborted();

    try {
      const result = await runAsync(this.original.id, this.store, this.job);
      this.controller.signal.throwIfAborted();

      await this.emit("done", undefined, result);
    } catch (err) {
      let error: Error;

      if (err instanceof Error) {
        error = err;
      } else {
        error = Error(stringify(err));
      }
      // if job was already aborted, rethrow the original error
      if (error.name === "AbortError") {
        throw error;
      }
      this.controller.signal.throwIfAborted();
      await this.emit("done", error, undefined);
    }
  }

  public async beforeRun() {
    if (this.status !== "waiting") {
      throw new JobError("a job cannot be run twice!");
    }

    this.status = "beforeRun";
    this.controller.signal.throwIfAborted();

    // this should wait until all listeners are called and awaited
    await this.emit("before");

    const item = this.currentItem;
    item.state = JobState.RUNNING;
    item.runningSince = new Date();

    await jobStorage.updateJobs(item);
    logger.info("Job is running now", { job_name: item.name, job_id: item.id });

    if (jobChannel.hasSubscribers) {
      const message: StartJobChannelMessage = {
        messageType: "jobs",
        type: "started",
        jobName: item.name,
        jobId: item.id,
        timestamp: Date.now(),
      };
      jobChannel.publish(message);
    }
  }

  /**
   * Do not check if it was aborted.
   * If it reached here, aborting should not matter or have any effect on the job.
   */
  public async afterRun() {
    if (this.status !== "running" && !this.controller.signal.aborted) {
      // this error is only valid if it was not aborted before
      throw new JobError("runJob was not called");
    }
    const end = new Date();
    this.status = "afterRun";

    // this should wait until all listeners are called and awaited
    await this.emit("after");

    const item = this.currentItem;

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
      const store = this.store;
      const result = store.get(StoreKey.RESULT) || "success";

      const message: EndJobChannelMessage = {
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
      };
      jobChannel.publish(message);
    }
  }

  /**
   * Guaranteed to never throw.
   */
  public finished() {
    this.status = "end";
  }

  public abort() {
    this.controller.abort();
  }

  private async emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): Promise<boolean> {
    const handler: EventListener[E] = this.events[event];

    if (!handler || !handler.length) {
      return false;
    }

    // FIXME: i am losing async context here when debugging, see asyncStorage bug description
    // @ts-expect-error
    await Promise.all(handler.map(async (listener) => listener.apply(this, args)));
    return true;
  }

  public removeListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    const listeners = this.events[event];

    if (!listeners) {
      return this;
    }

    const index = listeners.indexOf(listener);

    if (index >= 0) {
      listeners.splice(index, 1);
    }
    return this;
  }

  public once<E extends keyof Events>(event: E, listener: Events[E]): this {
    let listeners = this.events[event];
    listeners ??= this.events[event] = [];

    let fired = false;
    // @ts-expect-error
    const wrapper: Events[E] = async (...args: Parameters<Events[E]>): Promise<ReturnType<Events[E]>> => {
      if (!fired) {
        this.removeListener(event, wrapper);
        fired = true;
        // @ts-expect-error
        return listener.apply(this, args);
      }
    };
    listeners.push(wrapper);
    return this;
  }
}
