import {SubContext} from "./subContext";
import {JobItem, JobRequest, JobState} from "../../types";
import {ignore, isString, promiseMultiSingle} from "../../tools";

export class JobContext extends SubContext {
    public async removeJobLike(column: string, value: any): Promise<void> {
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
            await this.query(`DELETE FROM jobs WHERE ${mysql.escapeId(column)} LIKE ?`, like);
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

    public async stopJobs(): Promise<void> {
        await this.query("UPDATE jobs SET state = ?", JobState.WAITING);
        await this.query("CREATE TEMPORARY TABLE tmp_jobs (id INT UNSIGNED NOT NULL)");
        await this.query("INSERT INTO tmp_jobs SELECT id from jobs");
        await this.query("DELETE FROM jobs WHERE runAfter IS NOT NULL AND runAfter NOT IN (SELECT id FROM tmp_jobs)");
        await this.query("DROP TEMPORARY TABLE tmp_jobs");
    }

    public async getAfterJobs(id: number): Promise<JobItem[]> {
        return this.query("SELECT * FROM jobs WHERE `runAfter` = ? AND `state` != 'running'", id);
    }

    public async addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]> {
        const now = new Date();
        const currentJobs: Array<{ id: number, name: string }> = await this.query("SELECT id, name FROM jobs");
        // @ts-ignore
        return promiseMultiSingle(jobs, async (value: JobRequest): Promise<JobItem | undefined> => {
            let args = value.arguments;
            if (value.arguments && !isString(value.arguments)) {
                args = JSON.stringify(value.arguments);
            }
            let runAfter: number | undefined;

            // @ts-ignore
            if (value.runAfter && value.runAfter.id && Number.isInteger(value.runAfter.id)) {
                // @ts-ignore
                runAfter = value.runAfter.id;
            }
            const nextRun = value.runImmediately ? now : null;
            const foundJob = currentJobs.find((job) => job.name === value.name);

            if (foundJob) {
                // @ts-ignore
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
                    // @ts-ignore
                    value.id = result.insertId;
                }
            }
            delete value.runImmediately;
            return value as unknown as JobItem;
        });
    }

    public async removeJobs(jobs: JobItem | JobItem[]): Promise<void> {
        await this.queryInList("DELETE FROM jobs WHERE id", jobs, undefined, (value) => value.id);
    }

    public async removeJob(key: string | number): Promise<void> {
        if (isString(key)) {
            await this.query("DELETE FROM jobs WHERE `name` = ?", key);
        } else {
            await this.query("DELETE FROM jobs WHERE id = ?", key);
        }
    }

    public async updateJobs(jobs: JobItem | JobItem[]): Promise<void> {
        // @ts-ignore
        return promiseMultiSingle(jobs, (value: JobItem) => {
            return this.update("jobs", (updates, values) => {
                updates.push("state = ?");
                values.push(value.state);

                // for now updateJobs is used only to switch between the running states running and waiting
                updates.push("runningSince = ?");
                values.push(value.state === JobState.RUNNING ? new Date() : null);

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
        }).then(ignore);
    }
}
