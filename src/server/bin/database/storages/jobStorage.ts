import {JobItem, JobRequest, JobState, AllJobStats, JobStats} from "../../types";
import {storageInContext} from "./storage";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {JobContext} from "../contexts/jobContext";

function inContext<T>(callback: ContextCallback<T, JobContext>, transaction = true) {
    return storageInContext(callback, (con) => queryContextProvider(con).jobContext, transaction);
}

export class JobStorage {
    public getJobsStats(): Promise<AllJobStats> {
        return inContext((context) => context.getJobsStats());
    }

    public getJobsStatsGrouped(): Promise<JobStats[]> {
        return inContext((context) => context.getJobsStatsGrouped());
    }

    public removeJobLike(column: string, value: any): Promise<void> {
        return inContext((context) => context.removeJobLike(column, value));
    }

    public stopJobs(): Promise<void> {
        return inContext((context) => context.stopJobs());
    }

    public getJobs(limit?: number): Promise<JobItem[]> {
        return inContext((context) => context.getJobs(limit));
    }

    public getAllJobs(): Promise<JobItem[]> {
        return inContext((context) => context.getAllJobs());
    }

    public getJobsById(jobIds: number[]): Promise<JobItem[]> {
        return inContext((context) => context.getJobsById(jobIds));
    }

    public getJobsByName(names: string[]): Promise<JobItem[]> {
        return inContext((context) => context.getJobsByName(names));
    }

    public getAfterJobs(id: number): Promise<JobItem[]> {
        return inContext((context) => context.getAfterJobs(id));
    }

    public addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]> {
        return inContext((context) => context.addJobs(jobs));
    }

    public removeJobs(jobs: JobItem | JobItem[], finished?: Date): Promise<void> {
        return inContext((context) => context.removeJobs(jobs, finished));
    }

    public removeJob(key: string | number): Promise<void> {
        return inContext((context) => context.removeJob(key));
    }

    public updateJobs(jobs: JobItem | JobItem[], finished?: Date): Promise<void> {
        return inContext((context) => context.updateJobs(jobs, finished));
    }

    public async getJobsInState(state: JobState): Promise<JobItem[]> {
        return inContext((context) => context.getJobsInState(state));
    }
}
