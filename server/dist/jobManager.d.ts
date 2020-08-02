import { JobRequest } from "./types";
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
    private readonly activeJobs;
    private queueActive;
    private intervalId;
    private currentInterval;
    get runningJobs(): number;
    get schedulableJobs(): number;
    get totalJobs(): number;
    constructor({ memoryLimit, memorySize, maxActive }?: {
        memoryLimit?: number | undefined;
        memorySize?: MemorySize | undefined;
        maxActive?: number | undefined;
    });
    addJob(jobId: number, job: JobCallback): Job;
    removeJob(job: Job): boolean;
    start(): void;
    pause(): void;
    clear(): void;
    isEmpty(): boolean;
    isFull(): boolean;
    invalidRunning(end: Date, atLeast: number): boolean;
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
