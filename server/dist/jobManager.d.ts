import { JobRequest } from "./types";
/**
 * Memory Units with their Values in Bytes.
 */
export declare enum MemorySize {
    GB = 1073741824,
    MB = 1048576,
    KB = 1024,
    B = 1
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
export declare class JobQueue {
    /**
     * The current memoryLimit.
     * A Memory Limit of zero or negative is ignored.
     */
    readonly memoryLimit: number;
    /**
     * The maximum Number of active Jobs.
     * A positive number, can be zero (TODO: maxActive = 0 should be removed?)
     */
    readonly maxActive: number;
    /**
     * The Unit of the Memory Limit.
     */
    readonly memorySize: MemorySize;
    /**
     * The queued Jobs.
     * @private
     */
    private readonly waitingJobs;
    /**
     * The active Jobs.
     * Has at most the number of maxActive elements.
     * @private
     */
    private readonly activeJobs;
    private queueActive;
    /**
     * The intervalId of the current Interval for checking.
     * @private
     */
    private intervalId;
    /**
     * Current time in milliseconds between checking for starting jobs.
     * @private
     */
    private currentInterval;
    /**
     * Get the number of currently active Jobs.
     */
    get runningJobs(): number;
    /**
     * Get the number of currently schedulable Jobs
     * in regards to the number of currently and maximum active jobs.
     */
    get schedulableJobs(): number;
    /**
     * Get the Number of Jobs in this queue regardless of their state.
     */
    get totalJobs(): number;
    /**
     * Construct a JobQueue.
     *
     * @param memoryLimit the size of the Memory Limit, zero or negative for ignoring memory limits, by default zero
     * @param memorySize the units of the Memory Limit, by default Bytes
     * @param maxActive the maximum number of active jobs, negative values are replaced by 1, by default 5
     */
    constructor({ memoryLimit, memorySize, maxActive }?: {
        memoryLimit?: number | undefined;
        memorySize?: MemorySize | undefined;
        maxActive?: number | undefined;
    });
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
    addJob(jobId: number, job: JobCallback): Job;
    /**
     * Remove all Jobs which have the corresponding JobInfo.
     * Which is ultimately at most one job, as every JobInfo is a new object.
     * Removing an active Job does not stop itself or it´s callbacks from executing.
     *
     * @param job the jobInfo of the job to remove
     * @return boolean true if there was a job removed from the active or waiting queue
     */
    removeJob(job: Job): boolean;
    /**
     * Start the Queue.
     * Activates checking for schedulable jobs.
     */
    start(): void;
    /**
     * Pauses the Queue.
     * Stops only from executing new jobs, not stopping currently active jobs.
     */
    pause(): void;
    /**
     * Pauses the Queue and removes all
     * Jobs regardless of state.
     * Does not stop any currently active jobs.
     */
    clear(): void;
    /**
     * Checks whether the queue is empty or not.
     *
     * @return boolean if the queue is empty
     */
    isEmpty(): boolean;
    /**
     * Checks whether the current queue has as many active jobs
     * as the maximum number of active jobs.
     *
     * @return boolean true of maximum number of jobs are active
     */
    isFull(): boolean;
    /**
     * Checks whether there are a certain number of jobs which started
     * before a certain date.
     *
     * @param end the date to check for
     * @param atLeast the number of jobs which at least need to be invalid
     * @return boolean true if 'atLeast' number of jobs started before 'end'
     */
    invalidRunning(end: Date, atLeast: number): boolean;
    /**
     * Get a shallow copy of the internal representation of the jobs.
     * Does not return any callbacks or the jobcallback itself.
     * The jobs can at most be identified by the jobId given when the job was queued.
     *
     * @return Array<OutsideJob> an array of the internal jobs.
     */
    getJobs(): OutsideJob[];
    private _done;
    private _fullQueue;
    private _overMemoryLimit;
    private _queueJob;
    private executeJob;
    private setInterval;
    private executeCallback;
}
export declare type JobCallback = ((done: () => void) => void | JobRequest | JobRequest[]) | (() => Promise<void | JobRequest | JobRequest[]>);
export interface OutsideJob {
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
