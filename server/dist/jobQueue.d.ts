import { ScraperJob } from "./externals/types";
export declare enum MemorySize {
    GB = 1073741824,
    MB = 1048576,
    KB = 1024,
    B = 1
}
export declare class JobQueue {
    readonly memoryLimit: number;
    readonly maxActive: number;
    readonly memorySize: MemorySize;
    private readonly waitingJobs;
    private readonly newJobs;
    private readonly activeJobs;
    private queueActive;
    private currentJobId;
    private nextScheduling;
    private timesRescheduled;
    readonly runningJobs: number;
    readonly schedulableJobs: number;
    readonly totalJobs: number;
    constructor({ memoryLimit, memorySize, maxActive }?: {
        memoryLimit?: number | undefined;
        memorySize?: MemorySize | undefined;
        maxActive?: number | undefined;
    });
    addJob(job: JobCallback, interval?: number): Job;
    removeJob(job: Job): boolean;
    start(): void;
    pause(): void;
    clear(): void;
    private _done;
    private _fullQueue;
    private _overMemoryLimit;
    private _reschedule;
    private _schedule;
}
export declare type JobCallback = ((done: () => void) => void | ScraperJob | ScraperJob[]) | (() => Promise<void | ScraperJob | ScraperJob[]>);
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
