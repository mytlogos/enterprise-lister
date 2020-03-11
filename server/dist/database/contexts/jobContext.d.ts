import { SubContext } from "./subContext";
import { JobItem, JobRequest } from "../../types";
export declare class JobContext extends SubContext {
    removeJobLike(column: string, value: any): Promise<void>;
    getJobs(limit?: number): Promise<JobItem[]>;
    stopJobs(): Promise<void>;
    getAfterJobs(id: number): Promise<JobItem[]>;
    addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]>;
    removeJobs(jobs: JobItem | JobItem[]): Promise<void>;
    removeJob(key: string | number): Promise<void>;
    updateJobs(jobs: JobItem | JobItem[]): Promise<void>;
}
