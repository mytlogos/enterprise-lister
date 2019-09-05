"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const types_1 = require("../../types");
const tools_1 = require("../../tools");
class JobContext extends subContext_1.SubContext {
    async getJobs(limit = 50) {
        if (limit <= 0 || !limit) {
            limit = 50;
        }
        return this.query("SELECT * FROM jobs WHERE nextRun IS NOT NULL AND nextRun < NOW() AND state != 'running' LIMIT ?", limit);
    }
    async stopJobs() {
        await this.query("UPDATE jobs SET state = ?", types_1.JobState.WAITING);
        await this.query("CREATE TEMPORARY TABLE tmp_jobs (id INT UNSIGNED NOT NULL)");
        await this.query("INSERT INTO tmp_jobs SELECT id from jobs");
        await this.query("DELETE FROM jobs WHERE runAfter IS NOT NULL AND runAfter NOT IN (SELECT id FROM tmp_jobs)");
        await this.query("DROP TEMPORARY TABLE tmp_jobs");
    }
    async getAfterJobs(id) {
        return this.query("SELECT * FROM jobs WHERE `runAfter` = ? AND `state` != 'running'", id);
    }
    async addJobs(jobs) {
        const now = new Date();
        // @ts-ignore
        return tools_1.promiseMultiSingle(jobs, async (value) => {
            let args = value.arguments;
            if (value.arguments && !tools_1.isString(value.arguments)) {
                args = JSON.stringify(value.arguments);
            }
            let runAfter;
            // @ts-ignore
            if (value.runAfter && value.runAfter.id && Number.isInteger(value.runAfter.id)) {
                // @ts-ignore
                runAfter = value.runAfter.id;
            }
            const nextRun = value.runImmediately ? now : null;
            const result = await this.query("INSERT IGNORE INTO jobs " +
                "(`type`, `name`, `state`, `interval`, `deleteAfterRun`, `runAfter`, `arguments`, `nextRun`) " +
                "VALUES (?,?,?,?,?,?,?,?)", [
                value.type, value.name, types_1.JobState.WAITING, value.interval,
                value.deleteAfterRun, runAfter, args, nextRun
            ]);
            // the only reason it should fail to insert is when its name constraint is violated
            if (!result.insertId) {
                return this.query("SELECT * FROM jobs WHERE name=?", value.name);
            }
            // @ts-ignore
            value.id = result.insertId;
            delete value.runImmediately;
            return value;
        });
    }
    async removeJobs(jobs) {
        await this.queryInList("DELETE FROM jobs WHERE id", jobs, undefined, (value) => value.id);
    }
    async removeJob(key) {
        if (tools_1.isString(key)) {
            await this.query("DELETE FROM jobs WHERE `name` = ?", key);
        }
        else {
            await this.query("DELETE FROM jobs WHERE id = ?", key);
        }
    }
    async updateJobs(jobs) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(jobs, (value) => {
            return this.update("jobs", (updates, values) => {
                updates.push("state = ?");
                values.push(value.state);
                updates.push("lastRun = ?");
                values.push(value.lastRun);
                updates.push("nextRun = ?");
                values.push(value.nextRun);
                updates.push("arguments = ?");
                let args = value.arguments;
                if (value.arguments && !tools_1.isString(value.arguments)) {
                    args = JSON.stringify(value.arguments);
                }
                values.push(args);
            }, {
                column: "id",
                value: value.id
            });
        }).then(tools_1.ignore);
    }
}
exports.JobContext = JobContext;
//# sourceMappingURL=jobContext.js.map