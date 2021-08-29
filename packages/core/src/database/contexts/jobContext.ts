import { SubContext } from "./subContext";
import {
  JobItem,
  JobRequest,
  JobState,
  JobStats,
  AllJobStats,
  EmptyPromise,
  MultiSingleValue,
  PromiseMultiSingle,
  Optional,
  JobDetails,
  JobHistoryItem,
  JobStatFilter,
  BasicJobStats,
  TimeBucket,
  TimeJobStats,
  PropertyNames,
  TypedQuery,
  Id,
  JobStatSummary,
  JobTrack,
} from "../../types";
import { isString, promiseMultiSingle, multiSingle } from "../../tools";
import logger from "../../logger";
import mysql from "promise-mysql";
import { escapeLike } from "../storages/storageTools";
import { getStore } from "../../asyncStorage";
import { storeModifications } from "../sqlTools";

interface CountValue<T> {
  count: number;
  value: T;
}

type MergeableKey<T> = PropertyNames<T, number>;

function merge<T>(mergeInto: T, merger: T, keys: Array<MergeableKey<T>>) {
  for (const key of keys) {
    // @ts-expect-error
    mergeInto[key] = mergeInto[key] + merger[key];
  }
}

export interface JobQuery {
  limit?: number;
}

export class JobContext extends SubContext {
  public async getJobsStats(): Promise<AllJobStats> {
    const results: AllJobStats[] = await this.getStats();
    return results[0];
  }

  public getJobsStatsGrouped(): Promise<JobStats[]> {
    return this.getStats({ type: "named" });
  }

  public getJobsStatsTimed(bucket: TimeBucket, groupByDomain: boolean): Promise<TimeJobStats[]> {
    return this.getStats({ type: "timed", unit: bucket, groupByDomain });
  }

  private async getStats<Stat extends BasicJobStats>(statFilter?: JobStatFilter): Promise<Stat[]> {
    let filterColumn = "";
    let groupBy = "";
    let minMax = true;

    if (statFilter?.type === "named") {
      filterColumn = "name,";
      groupBy = "group by name";
    } else if (statFilter?.type === "timed") {
      minMax = false;
      groupBy = "group by timepoint";

      if (statFilter.groupByDomain) {
        groupBy += ", name";
        filterColumn += "name,";
      }

      if (statFilter.unit === "day") {
        filterColumn +=
          "TIMESTAMPADD(second, -SECOND(`start`)-MINUTE(`start`)*60-HOUR(start)*3600, start) as timepoint,";
      } else if (statFilter.unit === "hour") {
        filterColumn += "TIMESTAMPADD(second, -SECOND(`start`)-MINUTE(`start`)*60, start) as timepoint,";
      } else if (statFilter.unit === "minute") {
        filterColumn += "TIMESTAMPADD(second, -SECOND(`start`), start) as timepoint,";
      }
    }
    const values = await this.query(`
            SELECT 
            ${filterColumn}
            AVG(network_queries) as avgnetwork, 
            ${minMax ? "MIN(network_queries) as minnetwork," : ""} 
            ${minMax ? "MAX(network_queries) as maxnetwork, " : ""} 
            AVG(network_received) as avgreceived, 
            ${minMax ? "MIN(network_received) as minreceived," : ""}  
            ${minMax ? "MAX(network_received) as maxreceived, " : ""} 
            AVG(network_send) as avgsend, 
            ${minMax ? "MIN(network_send) as minsend, " : ""} 
            ${minMax ? "MAX(network_send) as maxsend, " : ""} 
            AVG(duration) as avgduration, 
            ${minMax ? "MAX(duration) maxD, " : ""} 
            ${minMax ? "MIN(duration) minD," : ""} 
            Count(*) as count,
            AVG(lagging) as avglagging,
            SUM(updated) as allupdate,
            SUM(created) as allcreate,
            SUM(deleted) as alldelete,
            AVG(CASE WHEN \`result\` = 'failed' THEN 1 ELSE 0 END) as failed, 
            AVG(CASE WHEN \`result\` = 'success' THEN 1 ELSE 0 END) as succeeded,
            AVG(queries) as queries${minMax ? "," : ""}
            ${minMax ? "MAX(queries) maxQ, " : ""} 
            ${minMax ? "MIN(CASE WHEN queries = 0 THEN NULL ELSE queries END) minQ" : ""} 
            FROM job_history
            ${groupBy}
            ;`);
    if (statFilter?.type === "timed") {
      for (const value of values) {
        value.timepoint = new Date(value.timepoint);
      }
    }
    if (statFilter?.type === "timed" && statFilter.groupByDomain) {
      const dateMapping = new Map<
        number,
        CountValue<TimeJobStats> & { domain: Record<string, CountValue<TimeJobStats>> }
      >();
      const tocJob = /^toc-\d+-https?:\/\/(www\.)?([^.]+).+$/;
      const searchTocJob = /^(.+)-searchForToc-\d+$/;
      const newsJob = /^(.+)-newsadapter$/;
      const keys: Array<MergeableKey<TimeJobStats>> = [
        "allcreate",
        "alldelete",
        "allupdate",
        "avgduration",
        "avgnetwork",
        "avgreceived",
        "avgsend",
        "avglagging",
        "count",
        "failed",
        "queries",
        "succeeded",
      ];

      for (const value of values as Array<JobStats & TimeJobStats>) {
        let match = tocJob.exec(value.name);

        let group = dateMapping.get(value.timepoint.getTime());

        if (!group) {
          const copy = { ...value };
          // @ts-expect-error
          delete copy.name;

          group = {
            count: 1,
            value: copy,
            domain: {},
          };
          dateMapping.set(value.timepoint.getTime(), group);
        } else {
          group.count++;
          merge(group.value, value, keys);
        }
        let domain = "";

        if (match) {
          domain = match[2];
        } else {
          match = searchTocJob.exec(value.name);

          if (match) {
            domain = match[1];
          } else {
            match = newsJob.exec(value.name);

            if (match) {
              domain = match[1];
            }
          }
        }
        if (domain) {
          const domainValue = group.domain[domain];
          if (!domainValue) {
            const copy = { ...value };
            // @ts-expect-error
            delete copy.name;
            // @ts-expect-error
            delete copy.timepoint;

            group.domain[domain] = {
              count: 1,
              value: copy,
            };
          } else {
            domainValue.count++;
            merge(domainValue.value, value, keys);
          }
        }
      }
      // empty the array
      values.length = 0;

      for (const value of dateMapping.values()) {
        for (const key of keys) {
          // count is a sum, not average value
          if (key === "count") {
            continue;
          }
          // @ts-expect-error
          value.value[key] /= value.count;
        }
        value.value.domain = {};

        for (const [domain, domainValue] of Object.entries(value.domain)) {
          for (const key of keys) {
            // count is a sum, not average value
            if (key === "count") {
              continue;
            }
            // @ts-expect-error
            domainValue.value[key] /= domainValue.count;
          }
          value.value.domain[domain] = domainValue.value;
        }

        values.push(value.value);
      }
    }
    return values;
  }

  public async getJobsStatsSummary(): Promise<JobStatSummary[]> {
    return this.query("SELECT * FROM job_stat_summary;");
  }

  public async getJobDetails(id: number): Promise<JobDetails> {
    const jobPromise: Promise<JobItem[]> = this.query("SELECT * FROM jobs WHERE id = ?", id);
    const historyPromise: Promise<JobHistoryItem[]> = this.query(
      `
      SELECT * FROM job_history
      WHERE name = (SELECT name FROM job_history WHERE id = ? LIMIT 1)
      ORDER BY start DESC;
      `,
      id,
    );

    const [jobs, history] = await Promise.all([jobPromise, historyPromise]);

    return {
      job: jobs[0],
      history,
    };
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
        singleQuotes: true,
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
      "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND job_state != 'disabled' order by nextRun LIMIT ?",
      limit,
    );
  }

  public async queryJobs({ limit }: JobQuery = {}): Promise<JobItem[]> {
    const values = [];
    if (limit) {
      values.push(limit);
    }
    return this.query(
      "SELECT * FROM jobs " +
        "WHERE (nextRun IS NULL OR nextRun < NOW()) " +
        "AND state = 'waiting' AND job_state != 'disabled' " +
        "order by nextRun" +
        (limit ? " LIMIT ?" : ""),
      values,
    );
  }

  public async getAllJobs(): Promise<JobItem[]> {
    return this.query("SELECT id, name, state, runningSince, nextRun, job_state, `interval`, type FROM jobs;");
  }

  public getJobsById(jobIds: number[]): Promise<JobItem[]> {
    return this.queryInList(
      "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND id IN (??);",
      [jobIds],
    ) as Promise<JobItem[]>;
  }

  public getJobsByName(names: string[]): Promise<JobItem[]> {
    return this.queryInList(
      "SELECT * FROM jobs WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND name IN (??);",
      [names],
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
            "(`type`, `name`, `state`, `interval`, `deleteAfterRun`, `runAfter`, `arguments`, `nextRun`, `job_state`) " +
            "VALUES (?,?,?,?,?,?,?,?, 'enabled')",
          [value.type, value.name, JobState.WAITING, value.interval, value.deleteAfterRun, runAfter, args, nextRun],
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
      // @ts-expect-error
      delete value.runImmediately;
      return value as unknown as JobItem;
    });
  }

  public async removeJobs(jobs: JobItem | JobItem[], finished?: Date): EmptyPromise {
    const params = multiSingle(jobs, (val) => val.id);
    const result = await this.queryInList("DELETE FROM jobs WHERE id IN (??);", [params]);
    multiSingle(result, (value) => storeModifications("job", "delete", value));

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

  public async updateJobsEnable(id: Id, enabled: boolean): EmptyPromise {
    await this.query("UPDATE jobs SET job_state = ? WHERE id = ?", [enabled ? "enabled" : "disabled", id]);
  }

  public async updateJobs(jobs: JobItem | JobItem[], finished?: Date): EmptyPromise {
    await promiseMultiSingle(jobs, (value: JobItem) => {
      return this.update(
        "jobs",
        (updates, values) => {
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
        },
        {
          column: "id",
          value: value.id,
        },
      );
    });

    if (finished) {
      await this.addJobHistory(jobs, finished);
    }
  }

  public getJobsInState(state: JobState): Promise<JobItem[]> {
    return this.query("SELECT * FROM jobs WHERE state = ? order by nextRun", state);
  }

  /**
   * Query for JobHistoryItems.
   *
   * @param since Date of the earliest possible JobHistoryItem
   * @param limit max number of results or all if negative
   * @returns a Query object
   */
  public async getJobHistoryStream(since: Date, limit: number): Promise<TypedQuery<JobHistoryItem>> {
    let query = "SELECT * FROM job_history WHERE start < ? ORDER BY start DESC";
    const values = [since.toISOString()] as any[];
    console.log(values);

    if (limit >= 0) {
      query += " LIMIT ?;";
      values.push(limit);
    }
    return this.queryStream(query, values);
  }

  public async getJobHistory(): Promise<JobHistoryItem[]> {
    return this.query("SELECT * FROM job_history ORDER BY start;");
  }

  private async addJobHistory(jobs: JobItem | JobItem[], finished: Date): EmptyPromise {
    await promiseMultiSingle(jobs, async (value: JobItem) => {
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

      const jobTrack = {
        modifications: store.get("modifications") || {},
        network: store.get("network") || {
          count: 0,
          sent: 0,
          received: 0,
          history: [],
        },
        queryCount: store.get("queryCount") || 0,
      } as JobTrack;

      let [item] = (await this.query("SELECT * FROM job_stat_summary WHERE name = ?", [
        value.name,
      ])) as JobStatSummary[];

      if (!item) {
        item = {
          name: value.name,
          type: value.type,
          count: 0,
          failed: 0,
          succeeded: 0,
          network_requests: 0,
          network_send: 0,
          network_received: 0,
          duration: 0,
          updated: 0,
          created: 0,
          deleted: 0,
          sql_queries: 0,
          lagging: 0,
          min_network_requests: 0,
          min_network_send: 0,
          min_network_received: 0,
          min_duration: 0,
          min_updated: 0,
          min_created: 0,
          min_deleted: 0,
          min_sql_queries: 0,
          min_lagging: 0,
          max_network_requests: 0,
          max_network_send: 0,
          max_network_received: 0,
          max_duration: 0,
          max_updated: 0,
          max_created: 0,
          max_deleted: 0,
          max_sql_queries: 0,
          max_lagging: 0,
        };
      }
      item.count++;
      const modifications = Object.values(jobTrack.modifications);
      modifications.forEach((value) => {
        const created = value.created;
        item.created += created;
        item.min_created = Math.min(item.min_created, created);
        item.max_created = Math.max(item.max_created, created);

        item.updated += value.updated;
        item.min_updated = Math.min(item.min_updated, value.updated);
        item.max_updated = Math.max(item.max_updated, value.updated);

        item.deleted += value.deleted;
        item.min_deleted = Math.min(item.min_deleted, value.deleted);
        item.max_deleted = Math.max(item.max_deleted, value.deleted);
      });
      item.sql_queries = jobTrack.queryCount;
      item.min_sql_queries = Math.min(jobTrack.queryCount);
      item.max_sql_queries = Math.max(jobTrack.queryCount);

      item.failed += result === "failed" ? 1 : 0;
      item.succeeded += result === "success" ? 1 : 0;

      const startTime = value.runningSince?.getTime() || 0;

      const lagging = (value.runningSince?.getTime() || 0) - (value.previousScheduledAt?.getTime() || startTime);
      item.lagging = lagging;
      item.min_lagging = Math.min(item.min_lagging, lagging);
      item.max_lagging = Math.max(item.max_lagging, lagging);

      const duration = finished.getTime() - startTime;
      item.duration = duration;
      item.min_duration = Math.min(item.min_duration, duration);
      item.max_duration = Math.max(item.max_duration, duration);

      const keys = [
        "name",
        "type",
        "count",
        "failed",
        "succeeded",
        "network_requests",
        "min_network_requests",
        "max_network_requests",
        "network_send",
        "min_network_send",
        "max_network_send",
        "network_received",
        "min_network_received",
        "max_network_received",
        "duration",
        "min_duration",
        "max_duration",
        "lagging",
        "min_lagging",
        "max_lagging",
        "updated",
        "min_updated",
        "max_updated",
        "created",
        "min_created",
        "max_created",
        "deleted",
        "min_deleted",
        "max_deleted",
        "sql_queries",
        "min_sql_queries",
        "max_sql_queries",
      ] as Array<keyof JobStatSummary>;

      const insertColumns = keys.join(", ");
      const params = keys.map(() => "?").join(", ");
      const updates = keys.map((key) => key + " = VALUES(" + key + ")").join(", ");
      const values = keys.map((key) => item[key]);

      await this.query(
        `INSERT INTO job_stat_summary (${insertColumns}) VALUES (${params}) ON DUPLICATE KEY UPDATE ${updates}`,
        values,
      );

      let created = 0;
      let updated = 0;
      let deleted = 0;
      modifications.forEach((value) => {
        created += value.created;
        updated += value.updated;
        deleted += value.deleted;
      });

      const queries = jobTrack.queryCount;
      const network_received = jobTrack.network.received || 0;
      const network_send = jobTrack.network.sent || 0;
      const network_requests = jobTrack.network.count || 0;

      return this.query(
        "INSERT INTO job_history (id, type, name, deleteAfterRun, runAfter, scheduled_at, start, end, result, message, context, arguments, created, updated, deleted, queries, network_queries, network_received, network_send)" +
          " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
        [
          value.id,
          value.type,
          value.name,
          value.deleteAfterRun,
          value.runAfter,
          value.previousScheduledAt || value.runningSince,
          value.runningSince,
          finished,
          result,
          message,
          // context take too much space, ignore it for now
          "",
          args,
          created,
          updated,
          deleted,
          queries,
          network_requests,
          network_received,
          network_send,
        ],
      );
    });
  }
}
