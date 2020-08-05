"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("./tools");
const logger_1 = tslib_1.__importDefault(require("./logger"));
const asyncStorage_1 = require("./asyncStorage");
/**
 * Memory Units with their Values in Bytes.
 */
var MemorySize;
(function (MemorySize) {
    MemorySize[MemorySize["GB"] = 1073741824] = "GB";
    MemorySize[MemorySize["MB"] = 1048576] = "MB";
    MemorySize[MemorySize["KB"] = 1024] = "KB";
    MemorySize[MemorySize["B"] = 1] = "B";
})(MemorySize = exports.MemorySize || (exports.MemorySize = {}));
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
class JobQueue {
    /**
     * Construct a JobQueue.
     *
     * @param memoryLimit the size of the Memory Limit, zero or negative for ignoring memory limits, by default zero
     * @param memorySize the units of the Memory Limit, by default Bytes
     * @param maxActive the maximum number of active jobs, negative values are replaced by 1, by default 5
     */
    constructor({ memoryLimit = 0, memorySize = MemorySize.B, maxActive = 5 } = {}) {
        /**
         * The queued Jobs.
         * @private
         */
        this.waitingJobs = [];
        /**
         * The active Jobs.
         * Has at most the number of maxActive elements.
         * @private
         */
        this.activeJobs = [];
        this.queueActive = false;
        /**
         * Current time in milliseconds between checking for starting jobs.
         * @private
         */
        this.currentInterval = 1000;
        this.memoryLimit = memoryLimit;
        this.memorySize = memorySize;
        this.maxActive = maxActive < 0 ? 1 : maxActive;
    }
    /**
     * Get the number of currently active Jobs.
     */
    get runningJobs() {
        return this.activeJobs.length;
    }
    /**
     * Get the number of currently schedulable Jobs
     * in regards to the number of currently and maximum active jobs.
     */
    get schedulableJobs() {
        const available = this.waitingJobs.length;
        const maxSchedulable = this.maxActive - this.runningJobs;
        return maxSchedulable > available ? available : maxSchedulable;
    }
    /**
     * Get the Number of Jobs in this queue regardless of their state.
     */
    get totalJobs() {
        return this.waitingJobs.length + this.activeJobs.length;
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
    addJob(jobId, job) {
        const wasEmpty = this.isEmpty();
        let lastRun = null;
        const info = {};
        const internJob = {
            jobId,
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
    /**
     * Remove all Jobs which have the corresponding JobInfo.
     * Which is ultimately at most one job, as every JobInfo is a new object.
     * Removing an active Job does not stop itself or it´s callbacks from executing.
     *
     * @param job the jobInfo of the job to remove
     * @return boolean true if there was a job removed from the active or waiting queue
     */
    removeJob(job) {
        const predicate = (value) => value.jobInfo === job;
        return tools_1.removeLike(this.waitingJobs, predicate)
            || tools_1.removeLike(this.activeJobs, predicate);
    }
    /**
     * Start the Queue.
     * Activates checking for schedulable jobs.
     */
    start() {
        this.queueActive = true;
        this.setInterval();
    }
    /**
     * Pauses the Queue.
     * Stops only from executing new jobs, not stopping currently active jobs.
     */
    pause() {
        this.queueActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    /**
     * Pauses the Queue and removes all
     * Jobs regardless of state.
     * Does not stop any currently active jobs.
     */
    clear() {
        this.queueActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.waitingJobs.forEach((value) => value.active = false);
        this.waitingJobs.length = 0;
        this.activeJobs.length = 0;
    }
    /**
     * Checks whether the queue is empty or not.
     *
     * @return boolean if the queue is empty
     */
    isEmpty() {
        return (this.activeJobs.length + this.waitingJobs.length) === 0;
    }
    /**
     * Checks whether the current queue has as many active jobs
     * as the maximum number of active jobs.
     *
     * @return boolean true of maximum number of jobs are active
     */
    isFull() {
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
    invalidRunning(end, atLeast) {
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
        job.running = false;
        if (job.startRun) {
            const store = asyncStorage_1.getStore();
            const running = store.get("running");
            const waiting = store.get("waiting");
            logger_1.default.info(`Job ${job.jobId} executed in running ${running} ms and waiting ${waiting} ms, ${job.executed} times`);
            job.lastRun = Date.now();
            job.startRun = 0;
        }
        else {
            logger_1.default.info(`Cancelling already finished job ${job.jobId}`);
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
            logger_1.default.info("queue is empty");
            return;
        }
        if (!this.schedulableJobs || !this.queueActive || this._fullQueue() || this._overMemoryLimit()) {
            let reason = "i dont know the reason";
            if (!this.schedulableJobs) {
                reason = "No Schedulable Jobs";
            }
            else if (!this.queueActive) {
                reason = "Queue is not active";
            }
            else if (this._fullQueue()) {
                reason = "Queue is full";
            }
            else if (this._overMemoryLimit()) {
                reason = "Over Memory Limit";
            }
            logger_1.default.info(`queue will not execute a new job this tick: '${reason}'`);
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
        const store = new Map();
        asyncStorage_1.runAsync(store, () => this
            .executeCallback(async () => {
            toExecute.executed++;
            if (toExecute.jobInfo.onStart) {
                await this
                    .executeCallback(toExecute.jobInfo.onStart)
                    .catch((reason) => logger_1.default.error(`Job ${toExecute.jobId} onStart threw an error!: ${tools_1.stringify(reason)}`));
            }
            logger_1.default.info("executing job: " + toExecute.jobId);
            return toExecute.job(() => this._done(toExecute));
        })
            .catch((reason) => {
            tools_1.remove(this.waitingJobs, toExecute);
            logger_1.default.error(`Job ${toExecute.jobId} threw an error somewhere ${tools_1.stringify(reason)}`);
        })
            .finally(() => {
            this._done(toExecute);
            if (toExecute.jobInfo.onDone) {
                this.executeCallback(toExecute.jobInfo.onDone)
                    .catch((reason) => logger_1.default.error(`Job ${toExecute.jobId} onDone threw an error!: ${tools_1.stringify(reason)}`));
            }
        }));
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
                resolve(result);
            }
            catch (e) {
                reject(e);
            }
        });
    }
}
exports.JobQueue = JobQueue;
//# sourceMappingURL=jobManager.js.map