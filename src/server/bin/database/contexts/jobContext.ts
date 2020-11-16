import {SubContext} from "./subContext";
import {JobItem, JobRequest, JobState, JobStats, AllJobStats, EmptyPromise, MultiSingleValue, PromiseMultiSingle, Optional} from "../../types";
import {isString, promiseMultiSingle, multiSingle} from "../../tools";
import logger from "../../logger";
import mysql from "promise-mysql";
import {escapeLike} from "../storages/storageTools";
import { getStore } from "../../asyncStorage";
import { storeModifications } from "../sqlTools";

export class JobContext extends SubContext {
    public async getJobsStats(): Promise<AllJobStats> {
        const results = await this.getStats();
        return results[0];
    }

    public getJobsStatsGrouped(): Promise<JobStats[]> {
        return this.getStats(true);
    }

    private async getStats<Stat extends AllJobStats>(grouped = false): Promise<Stat[]> {
        const values = await this.query(`
            SELECT 
            ${grouped ? "name," : ""} 
            AVG(network) as avgnetwork, 
            MIN(network) as minnetwork, 
            MAX(network) as maxnetwork, 
            AVG(received) as avgreceived, 
            MIN(received) as minreceived, 
            MAX(received) as maxreceived, 
            AVG(send) as avgsend, 
            MIN(send) as minsend, 
            MAX(send) as maxsend, 
            AVG(duration) as avgduration, 
            MAX(duration) maxD, 
            MIN(duration) minD,
            Count(*) as count,
            GROUP_CONCAT(\`update\`) as allupdate,
            GROUP_CONCAT(\`create\`) as allcreate,
            GROUP_CONCAT(\`delete\`) as alldelete,
            (SUM(CASE WHEN \`result\` = 'failed' THEN 1 ELSE 0 END) / Count(*)) as failed, 
            (SUM(CASE WHEN \`result\` = 'success' THEN 1 ELSE 0 END) / COUNT(*)) as succeeded,
            AVG(query) as queries,
            MAX(query) maxQ, 
            MIN(CASE WHEN query = 0 THEN NULL ELSE query END) minQ
            FROM (
                SELECT 
                name, 
                \`result\`,
                JSON_EXTRACT(message, "$.modifications.*.updated") as \`update\`,
                JSON_EXTRACT(message, "$.modifications.*.deleted") as \`delete\`,
                JSON_EXTRACT(message, "$.modifications.*.created") as \`create\`,
                CAST(JSON_EXTRACT(message, "$.queryCount") as unsigned int) as query,
                CAST(JSON_EXTRACT(message, "$.network.count") as unsigned int) as network,
                CAST(JSON_EXTRACT(message, "$.network.received") as unsigned int) as received,
                CAST(JSON_EXTRACT(message, "$.network.sent") as unsigned int) as send,
                end - start as duration
                FROM job_history
            ) as job_history
            ${grouped ? "group by name," : ""}
            ;`
        );
        // 'all*' Properties are comma separated lists of number arrays
        for (const value of values) {
            let numberArrays: number[][] = JSON.parse("[" + value.allcreate + "]");
            value.allcreate = numberArrays.flat().reduce((v1, v2) => v1 + v2, 0);

            numberArrays = JSON.parse("[" + value.alldelete + "]");
            value.alldelete = numberArrays.flat().reduce((v1_1, v2_1) => v1_1 + v2_1, 0);

            numberArrays = JSON.parse("[" + value.allupdate + "]");
            value.allupdate = numberArrays.flat().reduce((v1_2, v2_2) => v1_2 + v2_2, 0);
        }
        return values;
    }

    public async removeJobLike(column: string, value: any): EmptyPromise {
        if (value == null) {
            logger.warn(`trying to delete jobs on column '${column}' without a value`);
            return;
        }
        if (["type", "name", "arguments"].includes(column)) {
            if (!isString(value)) {
                throw Error(`trying to delete jobs from column '${column}' without a string value: ${value}`);
            }
            const like = escapeLike(value, {
                noBoundaries: true,
                singleQuotes: true
            });
            const result = await this.query(`DELETE FROM jobs WHERE ${mysql.escapeId(column)} LIKE ?`, like);
            storeModifications("job", "delete", result);
        }
    }

    public async getJobs(limit = 50): Promise<JobItem[]> {
        if (limit <= 0 || !limit) {
            limit = 50;
        }
        return this.query(
            "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' order by nextRun LIMIT ?",
            limit
        );
    }

    public async getAllJobs(): Promise<JobItem[]> {
        return this.query(
            "SELECT id, name, state, runningSince, nextRun FROM jobs;",
        );
    }

    public getJobsById(jobIds: number[]): Promise<JobItem[]> {
        return this.queryInList(
            "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND id ",
            jobIds
        ) as Promise<JobItem[]>;
    }

    public getJobsByName(names: string[]): Promise<JobItem[]> {
        return this.queryInList(
            "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND name ",
            names
        ) as Promise<JobItem[]>;
    }

    public async stopJobs(): EmptyPromise {
        await this.query("UPDATE jobs SET state = ?", JobState.WAITING);
        await this.query("CREATE TEMPORARY TABLE tmp_jobs (id INT UNSIGNED NOT NULL)");
        await this.query("INSERT INTO tmp_jobs SELECT id from jobs");
        await this.query("DELETE FROM jobs WHERE runAfter IS NOT NULL AND runAfter NOT IN (SELECT id FROM tmp_jobs)");
        await this.query("DROP TEMPORARY TABLE tmp_jobs");
    }

    public async getAfterJobs(id: number): Promise<JobItem[]> {
        return this.query("SELECT * FROM jobs WHERE `runAfter` = ? AND `state` != 'running'", id);
    }

    public async addJobs<T extends MultiSingleValue<JobRequest>>(jobs: T): PromiseMultiSingle<T, JobItem> {
        const now = new Date();
        const currentJobs: Array<{ id: number; name: string }> = await this.query("SELECT id, name FROM jobs");
        return promiseMultiSingle(jobs, async (value: JobRequest): Promise<JobItem> => {
            let args = value.arguments;
            if (value.arguments && !isString(value.arguments)) {
                args = JSON.stringify(value.arguments);
            }
            let runAfter: Optional<number>;

            // @ts-expect-error
            if (value.runAfter && value.runAfter.id && Number.isInteger(value.runAfter.id)) {
                // @ts-expect-error
                runAfter = value.runAfter.id;
            }
            const nextRun = value.runImmediately ? now : null;
            const foundJob = currentJobs.find((job) => job.name === value.name);

            if (foundJob) {
                // @ts-expect-error
                value.id = foundJob.id;
            } else {
                const result = await this.query(
                    "INSERT IGNORE INTO jobs " +
                    "(`type`, `name`, `state`, `interval`, `deleteAfterRun`, `runAfter`, `arguments`, `nextRun`) " +
                    "VALUES (?,?,?,?,?,?,?,?)",
                    [
                        value.type, value.name, JobState.WAITING, value.interval,
                        value.deleteAfterRun, runAfter, args, nextRun
                    ]
                );
                // the only reason it should fail to insert is when its name constraint is violated
                if (!result.insertId) {
                    throw Error("could not add job: " + JSON.stringify(value) + " nor find it");
                } else {
                    // @ts-expect-error
                    value.id = result.insertId;
                }
                storeModifications("job", "insert", result);
            }
            delete value.runImmediately;
            return value as unknown as JobItem;
        });
    }

    public async removeJobs(jobs: JobItem | JobItem[], finished?: Date): EmptyPromise {
        const result = await this.queryInList("DELETE FROM jobs WHERE id", jobs, undefined, (value) => value.id);
        multiSingle(result, value => storeModifications("job", "delete", value));

        if (finished) {
            await this.addJobHistory(jobs, finished);
        }
    }

    public async removeJob(key: string | number): EmptyPromise {
        let result;
        if (isString(key)) {
            result = await this.query("DELETE FROM jobs WHERE `name` = ?", key);
        } else {
            result = await this.query("DELETE FROM jobs WHERE id = ?", key);
        }
        storeModifications("job", "delete", result);
    }

    public async updateJobs(jobs: JobItem | JobItem[], finished?: Date): EmptyPromise {
        await promiseMultiSingle(jobs, (value: JobItem) => {
            return this.update("jobs", (updates, values) => {
                updates.push("state = ?");
                values.push(value.state);

                // for now updateJobs is used only to switch between the running states running and waiting
                updates.push("runningSince = ?");
                if (value.state === JobState.RUNNING && !value.runningSince) {
                    throw Error("No running since value on running job!");
                }
                values.push(value.runningSince);

                updates.push("lastRun = ?");
                values.push(value.lastRun);

                updates.push("nextRun = ?");
                values.push(value.nextRun);

                updates.push("arguments = ?");
                let args = value.arguments;
                if (value.arguments && !isString(value.arguments)) {
                    args = JSON.stringify(value.arguments);
                }
                values.push(args);
            }, {
                column: "id",
                value: value.id
            });
        });

        if (finished) {
            await this.addJobHistory(jobs, finished);
        }
    }

    public getJobsInState(state: JobState): Promise<JobItem[]> {
        return this.query(
            "SELECT * FROM jobs WHERE state = ? order by nextRun",
            state
        );
    }

    private async addJobHistory(jobs: JobItem | JobItem[], finished: Date): EmptyPromise {
        await promiseMultiSingle(jobs, (value: JobItem) => {
            let args = value.arguments;
            if (value.arguments && !isString(value.arguments)) {
                args = JSON.stringify(value.arguments);
            }
            const store = getStore();
            if (!store) {
                throw Error("missing store - is this running outside a AsyncLocalStorage Instance?");
            }
            const context = store.get("history");
            const result = store.get("result") || "success";
            const message = store.get("message") || "Missing Message";

            return this.query(
                "INSERT INTO job_history (id, type, name, deleteAfterRun, runAfter, start, end, result, message, context, arguments)" +
                " VALUES (?,?,?,?,?,?,?,?,?,?,?);",
                [
                    value.id,
                    value.type,
                    value.name,
                    value.deleteAfterRun,
                    value.runAfter,
                    value.runningSince,
                    finished,
                    result,
                    message,
                    JSON.stringify(context),
                    args
                ]
            );
        });
    }
}
