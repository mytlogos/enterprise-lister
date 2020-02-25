"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("./tools");
const logger_1 = tslib_1.__importDefault(require("./logger"));
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
        this.activeJobs = [];
        this.queueActive = false;
        this.currentJobId = 0;
        this.currentInterval = 1000;
        this.memoryLimit = memoryLimit;
        this.memorySize = memorySize;
        this.maxActive = maxActive < 0 ? 1 : maxActive;
    }
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
    addJob(job) {
        const wasEmpty = this.isEmpty();
        let lastRun = null;
        const info = {};
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
        this.waitingJobs.push(internJob);
        if (wasEmpty) {
            this.setInterval();
        }
        return info;
    }
    removeJob(job) {
        const predicate = (value) => value.jobInfo === job;
        return tools_1.removeLike(this.waitingJobs, predicate)
            || tools_1.removeLike(this.activeJobs, predicate);
    }
    start() {
        this.queueActive = true;
        this.setInterval();
    }
    pause() {
        this.queueActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    clear() {
        this.queueActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.waitingJobs.forEach((value) => value.active = false);
        this.waitingJobs.length = 0;
        this.activeJobs.length = 0;
    }
    isEmpty() {
        return (this.activeJobs.length + this.waitingJobs.length) === 0;
    }
    isFull() {
        return this.activeJobs.length >= this.maxActive;
    }
    invalidRunning(end, atLeast) {
        const nonEndingJobs = this.activeJobs.filter((value) => {
            return value.startRun && value.startRun < end.getTime();
        });
        return nonEndingJobs.length >= atLeast;
    }
    getJobs() {
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
    _done(job) {
        tools_1.remove(this.activeJobs, job);
        if (job.startRun) {
            const now = new Date();
            const iso = now.toISOString();
            const diffTime = now.getTime() - job.startRun;
            console.log(`Job ${job.jobId} executed in ${diffTime} ms, ${job.executed} times on ${iso}`);
            job.lastRun = Date.now();
            job.startRun = 0;
        }
        else {
            console.log("Cancelling already finished job");
        }
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
    _queueJob() {
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
    executeJob(toExecute) {
        toExecute.running = true;
        this.activeJobs.push(toExecute);
        toExecute.startRun = Date.now();
        this
            .executeCallback(async () => {
            toExecute.executed++;
            if (toExecute.jobInfo.onStart) {
                await this
                    .executeCallback(toExecute.jobInfo.onStart)
                    .catch((reason) => logger_1.default.error("On Start threw an error!: " + reason));
            }
            console.log("executing job: " + toExecute.jobId);
            return toExecute.job(() => this._done(toExecute));
        })
            .catch((reason) => {
            tools_1.remove(this.waitingJobs, toExecute);
            logger_1.default.error(reason);
            return reason;
        })
            .finally(() => {
            this._done(toExecute);
            if (toExecute.jobInfo.onDone) {
                this.executeCallback(toExecute.jobInfo.onDone)
                    .catch((reason) => logger_1.default.error("On Done threw an error!: " + reason));
            }
        });
    }
    setInterval(duration) {
        if (!duration) {
            duration = this.currentInterval;
        }
        else if (this.currentInterval === duration) {
            return;
        }
        else {
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
    executeCallback(callback) {
        return new Promise((resolve, reject) => {
            try {
                const result = callback();
                if (result && result instanceof Promise) {
                    resolve(result);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
}
exports.JobQueue = JobQueue;
//# sourceMappingURL=jobManager.js.map