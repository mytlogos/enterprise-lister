import { JobItem } from "enterprise-core/dist/types";
import { jobStorage } from "enterprise-core/dist/database/storages/storage";
import { JobQueue } from "../jobManager";
import { getQueueKey } from "./queueManager";
import { getElseSet } from "../../../core/dist/tools";

export type SchedulingStrategy = (queue: JobQueue, items: JobItem[]) => Promise<JobItem[]>;

function create<T extends Record<string, SchedulingStrategy>>(value: T): T {
  return value;
}

function firstComeFirstServed(): Promise<JobItem[]> {
  return jobStorage.getJobs();
}

const UNKNOWN_QUEUE = "UNKNOWN";

function getRequestQueueShare(items: JobItem[]): Map<string, JobItem[]> {
  const countingMap = new Map<string, JobItem[]>();

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

async function requestQueueBalanced(queue: JobQueue, currentItems: JobItem[]): Promise<JobItem[]> {
  const currentShares = getRequestQueueShare(currentItems);
  const jobs = await jobStorage.queryJobs();
  const sharesToStake = getRequestQueueShare(jobs);

  const futureShares = new Map(currentShares);

  for (const key of sharesToStake.keys()) {
    if (!futureShares.has(key)) {
      futureShares.set(key, []);
    }
  }

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
      throw new Error(`Expected Key${queueKey}to exist in sharesToStake!`);
    }
    const firstItem = items.shift();

    if (firstItem) {
      jobsToQueue.push(firstItem);
      futureShares.get(queueKey)?.push(firstItem);
    }
    // remove key from map if no items to queue are left
    if (!items.length) {
      sharesToStake.delete(queueKey);
    }
  }
  return jobsToQueue;
}

export const Strategies = create({
  FIRST_COME_FIRST_SERVED: firstComeFirstServed,
  REQUEST_QUEUE_BALANCED: requestQueueBalanced,
});
