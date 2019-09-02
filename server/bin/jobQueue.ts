import {delay, remove, removeLike} from "./tools";
import {ScraperJob} from "./externals/types";
import {logError} from "./logger";

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
    private readonly newJobs: InternJob[] = [];
    private readonly activeJobs: InternJob[] = [];
    private queueActive = false;
    private currentJobId = 0;
    private nextScheduling = -1;
    private timesRescheduled = 0;

    get runningJobs() {
        return this.activeJobs.length;
    }

    get schedulableJobs() {
        const available = this.waitingJobs.length + this.newJobs.length;
        const maxSchedulable = this.maxActive - this.runningJobs;
        return maxSchedulable > available ? available : maxSchedulable;
    }

    get totalJobs() {
        return this.waitingJobs.length + this.newJobs.length + this.activeJobs.length;
    }

    constructor({memoryLimit = 0, memorySize = MemorySize.B, maxActive = 5} = {}) {
        this.memoryLimit = memoryLimit;
        this.memorySize = memorySize;
        this.maxActive = maxActive;
    }

    public addJob(job: JobCallback, interval?: number): Job {
        const queue = this;
        let lastRun: number | null = null;

        const info: Job = {
            interval,
            childJobs: [],

            addChildJob(childJob: JobCallback, childInterval?: number): Job {
                if (!internJob.active) {
                    throw Error("cannot add child job to inactive job");
                }
                const childJobInfo = queue.addJob(childJob, childInterval);
                childJobInfo.parent = this;
                this.childJobs.push(childJobInfo);
                return childJobInfo;
            },
            parent: null,

            get lastRun() {
                return lastRun;
            },

            get nextRun() {
                if (this.lastRun == null) {
                    return -1;
                }
                const timeLeft = this.lastRun + (this.interval || 0) - Date.now();
                return timeLeft < 0 ? 0 : timeLeft;
            },
        };
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
        this.newJobs.push(internJob);

        if (!this._fullQueue()) {
            this._schedule();
        }
        return info;
    }

    public removeJob(job: Job): boolean {
        const predicate = (value: InternJob) => value.jobInfo === job;
        return removeLike(this.waitingJobs, predicate)
            || removeLike(this.activeJobs, predicate)
            || removeLike(this.newJobs, predicate);
    }

    public start() {
        this.queueActive = true;
        this._schedule();
    }

    public pause() {
        this.queueActive = false;
    }

    public clear() {
        this.queueActive = false;
        this.waitingJobs.forEach((value) => value.active = false);
        this.waitingJobs.length = 0;
        this.activeJobs.length = 0;
        this.newJobs.length = 0;
    }

    private _done(job: InternJob, start: number) {
        remove(this.activeJobs, job);

        if (job.jobInfo.interval && job.jobInfo.interval > 0) {
            this.waitingJobs.push(job);
            this.waitingJobs.sort((a, b) => a.jobInfo.nextRun - b.jobInfo.nextRun);
        }
        if (job.running) {
            job.lastRun = Date.now();
            job.running = false;
            const iso = new Date().toISOString();
            console.log(`Job ${job.jobId} executed in ${job.lastRun - start} ms, ${job.executed} times on ${iso}`);
        } else {
            console.log("Cancelling already finished job");
        }

        this._schedule();
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

    private _reschedule(timeout: number) {
        this.timesRescheduled++;
        if (this.timesRescheduled > 100 && this._overMemoryLimit()) {
            console.error("too long rescheduled and over memoryLimit");
        }
        if ((this.nextScheduling > 0 && this.nextScheduling < timeout) || !this.schedulableJobs) {
            return;
        }
        timeout = timeout < 1000 ? 1000 : timeout;
        // FIXME: 25.07.2019 reschedules two times per second?
        this.nextScheduling = timeout;
        delay(timeout).then(() => {
            this.nextScheduling = -1;
            this._schedule();
        });
        console.log(`rescheduling, active: ${this.activeJobs.length}, waiting: ${this.waitingJobs.length}, new: ${this.newJobs.length}, times waited: ${this.timesRescheduled}`);
    }

    private _schedule() {
        if (!this.schedulableJobs || !this.queueActive || this._fullQueue() || this._overMemoryLimit()) {
            this._reschedule(1000);
            return;
        }
        let nextInternJob: InternJob | undefined;
        let jobArray;
        if (this.newJobs.length) {
            nextInternJob = this.newJobs.shift();
            jobArray = this.newJobs;
        } else {
            nextInternJob = this.waitingJobs.shift();
            jobArray = this.waitingJobs;
        }
        if (!nextInternJob) {
            throw Error("no Job not found even though it should not be empty");
        }
        const toExecute = nextInternJob;
        if (toExecute.jobInfo.nextRun > 0) {
            const iso = new Date().toISOString();
            console.log(`waiting for ${toExecute.jobInfo.nextRun} ms on ${iso}`);
            jobArray.unshift(toExecute);
            this._reschedule(toExecute.jobInfo.nextRun);
            return;
        }
        this.timesRescheduled = 0;
        toExecute.running = true;
        this.activeJobs.push(toExecute);
        let result;

        const start = Date.now();
        try {
            toExecute.executed++;
            result = toExecute.job(() => this._done(toExecute, start));

            if (toExecute.jobInfo.onSuccess) {
                toExecute.jobInfo.onSuccess();
            }
        } catch (e) {
            this._done(toExecute, start);
            remove(this.waitingJobs, toExecute);

            if (toExecute.jobInfo.onFailure) {
                toExecute.jobInfo.onFailure(e);
            }
            console.error(e);
            throw e;
        } finally {
            if (toExecute.jobInfo.onDone) {
                try {
                    console.log("executing on done");
                    toExecute.jobInfo.onDone();
                } catch (e) {
                    logError("On Done threw an error!: " + e);
                }
            }
        }

        if (result && result instanceof Promise) {
            result
                .then(() => this._done(toExecute, start))
                .catch((reason) => {
                    this._done(toExecute, start);
                    remove(this.waitingJobs, toExecute);

                    if (toExecute.jobInfo.onFailure) {
                        toExecute.jobInfo.onFailure(reason);
                    }

                    console.error(reason);
                    return reason;
                });
        }
    }
}

export type JobCallback = ((done: () => void) => void | ScraperJob | ScraperJob[])
    | (() => Promise<void | ScraperJob | ScraperJob[]>);

interface InternJob {
    readonly jobInfo: Job;
    readonly job: JobCallback;
    jobId: number;
    running?: boolean;
    active: boolean;
    executed: number;
    lastRun: number | null;
}

export interface Job {
    readonly interval?: number;
    readonly childJobs: Job[];
    readonly nextRun: number;
    readonly lastRun: number | null;
    parent: Job | null;
    onFailure?: (reason: any) => void;
    onSuccess?: () => void;
    onDone?: () => void;

    addChildJob(childJob: JobCallback, childInterval?: number): Job;
}

/*
.reduce((previousValue, currentValue) => {
                const previousNext = previousValue.jobInfo.nextRun;
                const currentNext = currentValue.jobInfo.nextRun;

                const currentLastRun = Number(currentValue.lastRun);
                const previousLastRun = Number(previousValue.lastRun);

                if (previousNext <= 0) {
                    if (previousNext === currentNext) {
                        if (currentLastRun < previousLastRun) {
                            return currentValue;
                        } else {
                            return previousValue;
                        }
                    } else if (previousNext < currentNext) {
                        return previousValue;
                    } else {
                        return currentValue;
                    }
                } else if (currentNext <= 0) {
                    return currentValue;
                }
                return previousValue;
            });
 */
