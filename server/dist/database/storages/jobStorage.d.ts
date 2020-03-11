import { JobItem, JobRequest } from "../../types";
export declare class JobStorage {
    removeJobLike(column: string, value: any): Promise<void>;
    stopJobs(): Promise<void>;
    getJobs(limit?: number): Promise<JobItem[]>;
    getAfterJobs(id: number): Promise<JobItem[]>;
    addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]>;
    removeJobs(jobs: JobItem | JobItem[]): Promise<void>;
    removeJob(key: string | number): Promise<void>;
    updateJobs(jobs: JobItem | JobItem[]): Promise<void>;
}
