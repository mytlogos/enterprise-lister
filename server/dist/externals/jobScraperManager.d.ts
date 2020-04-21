import { OutsideJob } from "../jobManager";
import { JobRequest } from "../types";
export declare class JobScraperManager {
    automatic: boolean;
    private paused;
    private readonly helper;
    private readonly queue;
    private jobMap;
    private nameIdList;
    private intervalId;
    constructor();
    on(event: string, callback: (value: any) => void): void;
    removeDependant(key: number | string): void;
    setup(): Promise<void>;
    start(): void;
    pause(): void;
    stop(): void;
    /**
     * Mainly for test purposes
     * @param jobIds
     */
    runJobs(...jobIds: number[]): Promise<void>;
    addJobs(...jobs: JobRequest[]): Promise<void>;
    getJobs(): OutsideJob[];
    private addDependant;
    private checkCurrentVsStorage;
    private checkRunningJobs;
    private checkRunningStorageJobs;
    private fetchJobs;
    private processJobItems;
    private queueEmittableJob;
    private queueJob;
    private processJobCallback;
    private processJobCallbackResult;
    private setJobListener;
    private collectEmittable;
}
export declare const DefaultJobScraper: JobScraperManager;
