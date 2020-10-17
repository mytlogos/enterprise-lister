import {JobItem, JobRequest, JobState} from "../../types";
import {storageInContext} from "./storage";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {JobContext} from "../contexts/jobContext";

function inContext<T>(callback: ContextCallback<T, JobContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).jobContext);
}

export class JobStorage {
    public removeJobLike(column: string, value: any): Promise<void> {
        return inContext((context) => context.removeJobLike(column, value));
    }

    public stopJobs(): Promise<void> {
        return inContext((context) => context.stopJobs());
    }

    public getJobs(limit?: number): Promise<JobItem[]> {
        return inContext((context) => context.getJobs(limit));
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

    public removeJobs(jobs: JobItem | JobItem[]): Promise<void> {
        return inContext((context) => context.removeJobs(jobs));
    }

    public removeJob(key: string | number): Promise<void> {
        return inContext((context) => context.removeJob(key));
    }

    public updateJobs(jobs: JobItem | JobItem[]): Promise<void> {
        return inContext((context) => context.updateJobs(jobs));
    }

    public async getJobsInState(state: JobState): Promise<JobItem[]> {
        return inContext((context) => context.getJobsInState(state));
    }
}
