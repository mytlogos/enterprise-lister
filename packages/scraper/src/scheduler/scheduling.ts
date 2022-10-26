import { jobStorage } from "enterprise-core/dist/database/storages/storage";
import { getElseSet, stringify } from "enterprise-core/dist/tools";
import { JobQueue } from "./jobQueue";
import { getQueueKey } from "../externals/queueRequest";
import { writeFile } from "fs/promises";
import { ValidationError } from "enterprise-core/dist/error";
import { SimpleJob } from "enterprise-core/dist/database/databaseTypes";

export type SchedulingStrategy = (queue: Readonly<JobQueue>, items: SimpleJob[]) => Promise<readonly SimpleJob[]>;

function create<T extends Record<string, SchedulingStrategy>>(value: T): T {
  return value;
}

function firstComeFirstServed(): Promise<readonly SimpleJob[]> {
  return jobStorage.getJobs();
}

const UNKNOWN_QUEUE = "UNKNOWN";

/**
 * Group jobs by their request queue keys.
 *
 * Jobs which will not use a request queue, are assigned to the "UNKNOWN" key.
 *
 * @param items jobs to group
 * @returns a mapping of request queue key to the jobs
 */
function getRequestQueueShare(items: readonly SimpleJob[]): Map<string, SimpleJob[]> {
  const countingMap = new Map<string, SimpleJob[]>();

  for (const item of items) {
    if (!item) {
      continue;
    }
    const linkStart = item.name.indexOf("http");

    let key: string;
    if (linkStart < 0) {
      key = UNKNOWN_QUEUE;
    } else {
      const link = item.name.substring(linkStart);
      key = getQueueKey(link) || UNKNOWN_QUEUE;
    }
    getElseSet(countingMap, key, () => []).push(item);
  }

  return countingMap;
}

/**
 * Get the current distribution of jobs for the request queues.
 * Get the distribution of queueable jobs for the request queues.
 * Select jobs from request queues which will have the lowest load as long as jobs can be queued.
 * The load of a request queue increases with each item queued.
 *
 * The idea is that some request queues have many jobs, which would clog the request queue
 * and block jobs for other request queues, which are then just empty.
 * Using few requests queues heavily also may incure ddos penalties, blocking the scraper even further.
 *
 * @param queue current job queue
 * @param currentItems jobs which are currently running or queued
 * @returns array of ordered jobs to queue
 */
async function requestQueueBalanced(
  queue: Readonly<JobQueue>,
  currentItems: readonly SimpleJob[],
): Promise<readonly SimpleJob[]> {
  // grouping of current items
  const currentShares = getRequestQueueShare(currentItems);

  // get all queueable jobs (waiting, not disabled, nextRun <= NOW)
  const jobs = await jobStorage.queryJobs();

  // grouping of all jobs
  const sharesToStake = getRequestQueueShare(jobs);

  // for printing the plan to disk without any modifications
  const sharesCopy = new Map(sharesToStake);

  const futureShares = new Map(currentShares);

  // ensure all keys of sharesToStake
  for (const key of sharesToStake.keys()) {
    if (!futureShares.has(key)) {
      futureShares.set(key, []);
    }
  }

  // for debugging purpose only
  const futureOnlyShares = new Map<string, SimpleJob[]>([...futureShares.keys()].map((key) => [key, []]));

  // number of items to queue
  const maximumSchedulableJobs = Math.max(queue.maxActive - queue.queuedJobs, 0);
  const jobsToQueue = [];

  for (let i = 0; i < maximumSchedulableJobs; i++) {
    let queueKey = null;
    let queueSize = Number.MAX_VALUE;

    // find the request queue key with the lowest load
    // which is also available on sharesToStake
    for (const [key, value] of futureShares.entries()) {
      if (!sharesToStake.has(key)) {
        continue;
      }

      if (value.length < queueSize) {
        queueKey = key;
        queueSize = value.length;
      }
    }
    // if there is no request queue of least size, nothing needs to be done
    if (!queueKey) {
      break;
    }
    const items = sharesToStake.get(queueKey);

    if (!items) {
      throw new ValidationError(`Expected Key${queueKey}to exist in sharesToStake!`);
    }
    const firstItem = items.shift();

    if (firstItem) {
      // queue item
      jobsToQueue.push(firstItem);
      // add item to current load
      futureShares.get(queueKey)?.push(firstItem);
      // for debugging purposes only
      futureOnlyShares.get(queueKey)?.push(firstItem);
    }

    // remove key from map if no items to queue are left
    if (!items.length) {
      sharesToStake.delete(queueKey);
    }
  }
  // FIXME: remove or ignore this in production
  writeFile(
    "jobqueue-plan.json",
    stringify({
      current: currentShares,
      available: sharesCopy,
      next: futureShares,
    }) + "\n",
    {
      flag: "a",
    },
  ).catch(console.error);
  return jobsToQueue;
}

/**
 * Calculate a baseline for jobs per minute,
 * such that the jobs should be more or less evenly distributed in the long run.
 *
 * The baseline is between 0.1 * maxActive <= baseline <= maxActive.
 *
 * @param queue current used queue
 * @returns a baseline of jobs per minute, maxed at the maximum of the queue
 */
async function calculateBaseLine(queue: Readonly<JobQueue>): Promise<number> {
  const allJobs = await jobStorage.getAllJobs();
  const averageJobsPerMinute = allJobs.reduce((previous, current) => {
    if (!current.interval) {
      return previous + 1 / allJobs.length;
    }
    return previous + (60 * 1000) / current.interval;
  }, 0);

  return Math.min(queue.maxActive, Math.max(Math.ceil(averageJobsPerMinute), Math.floor(queue.maxActive * 0.1)));
}

let currentBaseLine: number;
// set to zero, so that on first time, the baseline will be calculated
let previousBaseLineCalculation = 0;

/**
 * Similar to {@link requestQueueBalanced}, but instead of inspecting only the queueable jobs,
 * inspect all jobs every now and then.
 *
 * Calculate a baseline, maxed out at the queue limit and delay jobs by a percentage
 * which would else be queued right now.
 *
 * Do not queue them, as long as the delay does not go over a certain percentage.
 *
 * Regular Tocs Jobs should always have a greater delay, as their interval is on the bigger side
 * and thus the tolerable percentage delay is greater.
 *
 * Other jobs have a small interval, like news scraper which should run every 5 min, and should tolerate
 * a much smaller delay.
 *
 * One time jobs should always be preferred over repeatable jobs,
 * which is currently not reflected in the {@link requestQueueBalanced} strategy.
 *
 * Do not prefer jobs of queue {@link UNKNOWN_QUEUE} over known queues.
 */
async function jobsQueueForcedBalance(
  queue: Readonly<JobQueue>,
  currentItems: readonly SimpleJob[],
): Promise<readonly SimpleJob[]> {
  const now = Date.now();
  // tolerate a delay 10% of the interval
  const delayTolerance = 0.1;

  // check if previous baseline calculation was a hour ago
  if (now - previousBaseLineCalculation > 60 * 60 * 1000) {
    currentBaseLine = await calculateBaseLine(queue);
    previousBaseLineCalculation = now;
  }

  const items = await requestQueueBalanced(queue, currentItems);

  return items.filter((item, index) => {
    const nextRun = item.nextRun;
    // every item below the baseline or without interval gets through by default
    if (index + 1 + queue.runningJobs <= currentBaseLine || !nextRun) {
      return true;
    }

    const maxDelay = item.interval * delayTolerance;
    // delay if difference of nextRun to now is below the maxDelay
    return nextRun.getTime() - now > maxDelay;
  });
}

export const Strategies = create({
  FIRST_COME_FIRST_SERVED: firstComeFirstServed,
  REQUEST_QUEUE_BALANCED: requestQueueBalanced,
  JOBS_QUEUE_FORCED_BALANCED: jobsQueueForcedBalance,
});
