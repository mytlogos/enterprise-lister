export declare class JobQueue {
    readonly memoryLimit: number;
    readonly maxActive: number;
    private readonly waitingJobs;
    private readonly newJobs;
    private readonly activeJobs;
    private queueActive;
    private currentJobId;
    private scheduled;
    readonly runningJobs: number;
    readonly schedulableJobs: number;
    readonly totalJobs: number;
    constructor({ memoryLimit, maxActive }?: {
        memoryLimit?: number | undefined;
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
export declare type JobCallback = ((done: () => void) => void) | (() => Promise<void>);
export interface Job {
    readonly interval?: number;
    readonly childJobs: Job[];
    readonly nextRun: number;
    readonly lastRun: number | null;
    parent: Job | null;
    onFailure?: (reason: any) => void;
    addChildJob(childJob: JobCallback, childInterval?: number): Job;
}
