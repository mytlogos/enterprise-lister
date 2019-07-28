"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("./tools");
const logger_1 = require("./logger");
var MemorySize;
(function (MemorySize) {
    MemorySize[MemorySize["GB"] = 1073741824] = "GB";
    MemorySize[MemorySize["MB"] = 1048576] = "MB";
    MemorySize[MemorySize["KB"] = 1024] = "KB";
    MemorySize[MemorySize["B"] = 1] = "B";
})(MemorySize = exports.MemorySize || (exports.MemorySize = {}));
class JobQueue {
    constructor({ memoryLimit = 0, memorySize = MemorySize.B, maxActive = 5 } = {}) {
        this.waitingJobs = [];
        this.newJobs = [];
        this.activeJobs = [];
        this.queueActive = false;
        this.currentJobId = 0;
        this.nextScheduling = -1;
        this.timesRescheduled = 0;
        this.memoryLimit = memoryLimit;
        this.memorySize = memorySize;
        this.maxActive = maxActive;
    }
    get runningJobs() {
        return this.activeJobs.length;
    }
    get schedulableJobs() {
        return this.waitingJobs.length + this.newJobs.length;
    }
    get totalJobs() {
        return this.waitingJobs.length + this.newJobs.length + this.activeJobs.length;
    }
    addJob(job, interval) {
        const queue = this;
        let lastRun = null;
        const info = {
            interval,
            childJobs: [],
            addChildJob(childJob, childInterval) {
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
        const internJob = {
            jobId: this.currentJobId++,
            executed: 0,
            active: true,
            job,
            set lastRun(last) {
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
    removeJob(job) {
        const predicate = (value) => value.jobInfo === job;
        return tools_1.removeLike(this.waitingJobs, predicate)
            || tools_1.removeLike(this.activeJobs, predicate)
            || tools_1.removeLike(this.newJobs, predicate);
    }
    start() {
        this.queueActive = true;
        this._schedule();
    }
    pause() {
        this.queueActive = false;
    }
    clear() {
        this.queueActive = false;
        this.waitingJobs.forEach((value) => value.active = false);
        this.waitingJobs.length = 0;
        this.activeJobs.length = 0;
        this.newJobs.length = 0;
    }
    _done(job, start) {
        tools_1.remove(this.activeJobs, job);
        if (job.jobInfo.interval && job.jobInfo.interval > 0) {
            this.waitingJobs.push(job);
            this.waitingJobs.sort((a, b) => a.jobInfo.nextRun - b.jobInfo.nextRun);
        }
        if (job.running) {
            job.lastRun = Date.now();
            job.running = false;
            const iso = new Date().toISOString();
            console.log(`Job ${job.jobId} executed in ${job.lastRun - start} ms, ${job.executed} times on ${iso}`);
        }
        else {
            console.log("Cancelling already finished job");
        }
        this._schedule();
    }
    _fullQueue() {
        return this.runningJobs >= this.maxActive;
    }
    _overMemoryLimit() {
        if (this.memoryLimit <= 0) {
            return false;
        }
        return (process.memoryUsage().rss / this.memorySize) > this.memoryLimit;
    }
    _reschedule(timeout) {
        this.timesRescheduled++;
        if (this.timesRescheduled > 100 && this._overMemoryLimit()) {
            console.error("too long rescheduled and over memoryLimit");
        }
        if (this.nextScheduling > 0 && this.nextScheduling < timeout) {
            return;
        }
        // FIXME: 25.07.2019 reschedules two times per second?
        this.nextScheduling = timeout;
        tools_1.delay(timeout).then(() => {
            this.nextScheduling = -1;
            this._schedule();
        });
        console.log(`rescheduling, active: ${this.activeJobs.length}, waiting: ${this.waitingJobs.length}, new: ${this.newJobs.length}, times waited: ${this.timesRescheduled}`);
    }
    _schedule() {
        if (!this.schedulableJobs || !this.queueActive || this._fullQueue() || this._overMemoryLimit()) {
            this._reschedule(1000);
            return;
        }
        let nextInternJob;
        let jobArray;
        if (this.newJobs.length) {
            nextInternJob = this.newJobs.shift();
            jobArray = this.newJobs;
        }
        else {
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
        }
        catch (e) {
            this._done(toExecute, start);
            tools_1.remove(this.waitingJobs, toExecute);
            if (toExecute.jobInfo.onFailure) {
                toExecute.jobInfo.onFailure(e);
            }
            console.error(e);
            throw e;
        }
        finally {
            if (toExecute.jobInfo.onDone) {
                try {
                    toExecute.jobInfo.onDone();
                }
                catch (e) {
                    logger_1.logError("On Done threw an error!: " + e);
                }
            }
        }
        if (result && result instanceof Promise) {
            result
                .then(() => this._done(toExecute, start))
                .catch((reason) => {
                this._done(toExecute, start);
                tools_1.remove(this.waitingJobs, toExecute);
                if (toExecute.jobInfo.onFailure) {
                    toExecute.jobInfo.onFailure(reason);
                }
                console.error(reason);
                return reason;
            });
        }
    }
}
exports.JobQueue = JobQueue;
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
//# sourceMappingURL=jobQueue.js.map