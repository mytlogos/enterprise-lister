import {remove, removeLike} from "./tools";
import {logError} from "./logger";
import {JobRequest} from "./types";
import Timeout = NodeJS.Timeout;

export enum MemorySize {
    GB = 1024 * 1024 * 1024,
    MB = 1024 * 1024,
    KB = 1024,
    B = 1,
}

export class JobQueue {
    public readonly memoryLimit: number;
    public readonly maxActive: number;
    public readonly memorySize: MemorySize;
    private readonly waitingJobs: InternJob[] = [];
    private readonly activeJobs: InternJob[] = [];
    private queueActive = false;
    private currentJobId = 0;
    private intervalId: Timeout | undefined;
    private currentInterval = 1000;

    get runningJobs() {
        return this.activeJobs.length;
    }

    get schedulableJobs() {
        const available = this.waitingJobs.length;
        const maxSchedulable = this.maxActive - this.runningJobs;
        return maxSchedulable > available ? available : maxSchedulable;
    }

    get totalJobs() {
        return this.waitingJobs.length + this.activeJobs.length;
    }

    constructor({memoryLimit = 0, memorySize = MemorySize.B, maxActive = 5} = {}) {
        this.memoryLimit = memoryLimit;
        this.memorySize = memorySize;
        this.maxActive = maxActive < 0 ? 1 : maxActive;
    }

    public addJob(job: JobCallback): Job {
        const wasEmpty = this.isEmpty();
        let lastRun: number | null = null;

        const info: Job = {};
        const internJob: InternJob = {
            jobId: this.currentJobId++,
            executed: 0,
            active: true,
            job,
            set lastRun(last: number) {
                lastRun = last;
            },
            get lastRun() {
                // @ts-ignore
                return lastRun;
            },
            jobInfo: info
        };
        this.waitingJobs.push(internJob);
        if (wasEmpty) {
            this.setInterval();
        }
        return info;
    }

    public removeJob(job: Job): boolean {
        const predicate = (value: InternJob) => value.jobInfo === job;
        return removeLike(this.waitingJobs, predicate)
            || removeLike(this.activeJobs, predicate);
    }

    public start() {
        this.queueActive = true;
        this.setInterval();
    }

    public pause() {
        this.queueActive = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    public clear() {
        this.queueActive = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.waitingJobs.forEach((value) => value.active = false);
        this.waitingJobs.length = 0;
        this.activeJobs.length = 0;
    }

    public isEmpty(): boolean {
        return (this.activeJobs.length + this.waitingJobs.length) === 0;
    }

    public isFull() {
        return this.activeJobs.length >= this.maxActive;
    }

    public invalidRunning(end: Date, atLeast: number): boolean {
        const nonEndingJobs = this.activeJobs.filter((value) => {
            return value.startRun && value.startRun < end.getTime();
        });
        return nonEndingJobs.length >= atLeast;
    }

    private _done(job: InternJob) {
        remove(this.activeJobs, job);

        if (job.startRun) {
            const now = new Date();
            const iso = now.toISOString();
            const diffTime = now.getTime() - job.startRun;
            console.log(`Job ${job.jobId} executed in ${diffTime} ms, ${job.executed} times on ${iso}`);
            job.lastRun = Date.now();
            job.startRun = 0;
        } else {
            console.log("Cancelling already finished job");
        }
    }

    private _fullQueue() {
        return this.runningJobs >= this.maxActive;
    }

    private _overMemoryLimit() {
        if (this.memoryLimit <= 0) {
            return false;
        }
        return (process.memoryUsage().rss / this.memorySize) > this.memoryLimit;
    }

    private _queueJob(): void {
        if (this.isEmpty() && this.intervalId) {
            clearInterval(this.intervalId);
            console.log("queue is empty");
            return;
        }
        if (!this.schedulableJobs || !this.queueActive || this._fullQueue() || this._overMemoryLimit()) {
            console.log("ignoring: " + new Date());
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
        this
            .executeCallback(async () => {
                toExecute.executed++;
                if (toExecute.jobInfo.onStart) {
                    await this
                        .executeCallback(toExecute.jobInfo.onStart)
                        .catch((reason) => logError("On Start threw an error!: " + reason));
                }
                console.log("executing job: " + toExecute.jobId);
                return toExecute.job(() => this._done(toExecute));
            })
            .catch((reason) => {
                remove(this.waitingJobs, toExecute);
                console.error(reason);
                return reason;
            })
            .finally(() => {
                this._done(toExecute);

                if (toExecute.jobInfo.onDone) {
                    this.executeCallback(toExecute.jobInfo.onDone)
                        .catch((reason) => logError("On Done threw an error!: " + reason));
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
        }, duration);

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = interval;
    }

    private executeCallback(callback: () => any): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const result = callback();

                if (result && result instanceof Promise) {
                    resolve(result);
                }
            } catch (e) {
                reject(e);
            }
        });
    }
}

export type JobCallback = ((done: () => void) => void | JobRequest | JobRequest[])
    | (() => Promise<void | JobRequest | JobRequest[]>);

interface InternJob {
    readonly jobInfo: Job;
    readonly job: JobCallback;
    jobId: number;
    startRun?: number;
    running?: boolean;
    active: boolean;
    executed: number;
    lastRun: number | null;
}

export interface Job {
    onStart?: () => void | Promise<void>;
    onDone?: () => void | Promise<void>;
}
