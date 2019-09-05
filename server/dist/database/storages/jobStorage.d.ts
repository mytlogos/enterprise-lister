import { JobItem, JobRequest } from "../../types";
export declare class JobStorage {
    stopJobs(): Promise<void>;
    getJobs(limit?: number): Promise<JobItem[]>;
    getAfterJobs(id: number): Promise<JobItem[]>;
    addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]>;
    removeJobs(jobs: JobItem | JobItem[]): Promise<void>;
    removeJob(key: string | number): Promise<void>;
    updateJobs(jobs: JobItem | JobItem[]): Promise<void>;
}
