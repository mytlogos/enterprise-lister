import {
  JobRequest,
  JobState,
  JobStats,
  AllJobStats,
  EmptyPromise,
  Optional,
  JobDetails,
  JobStatFilter,
  BasicJobStats,
  TimeBucket,
  TimeJobStats,
  PropertyNames,
  TypedQuery,
  Id,
  JobStatSummary,
  JobTrack,
  QueryJobHistory,
  Paginated,
} from "../../types";
import { isString, promiseMultiSingle, defaultNetworkTrack } from "../../tools";
import logger from "../../logger";
import { escapeLike } from "../storages/storageTools";
import { requireStore, StoreKey } from "../../asyncStorage";
import { DatabaseError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import {
  SimpleJob,
  simpleJob,
  SimpleJobHistory,
  simpleJobHistory,
  SimpleJobStatSummary,
  simpleJobStatSummary,
} from "../databaseTypes";
import { joinAnd, joinComma } from "./helper";

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

export class JobContext extends QueryContext {
  public async getJobsStats(): Promise<AllJobStats> {
    const results: readonly AllJobStats[] = await this.getStats();
    return results[0];
  }

  public getJobsStatsGrouped(): Promise<JobStats[]> {
    return this.getStats({ type: "named" });
  }

  public getJobsStatsTimed(bucket: TimeBucket, groupByDomain: boolean): Promise<TimeJobStats[]> {
    return this.getStats({ type: "timed", unit: bucket, groupByDomain });
  }

  private async getStats<Stat extends BasicJobStats>(statFilter?: JobStatFilter): Promise<Stat[]> {
    const filterColumn = [];
    const groupBy = [];
    let minMax = true;

    if (statFilter?.type === "named") {
      filterColumn.push(sql`name`);
      groupBy.push(sql.identifier(["name"]));
    } else if (statFilter?.type === "timed") {
      minMax = false;
      groupBy.push(sql.identifier(["timepoint"]));

      if (statFilter.groupByDomain) {
        groupBy.push(sql`name`);
        filterColumn.push(sql`name`);
      }

      if (statFilter.unit === "day") {
        filterColumn.push(sql`name`);
        filterColumn.push(sql`date_trunc('day', start) as timepoint`);
      } else if (statFilter.unit === "hour") {
        filterColumn.push(sql`date_trunc('hour', start) as timepoint`);
      } else if (statFilter.unit === "minute") {
        filterColumn.push(sql`date_trunc('minute', start) as timepoint`);
      }
    }
    const empty = sql``;
    const values = (await this.con.any(
      sql`
        SELECT 
        ${filterColumn.length ? sql`${joinComma(filterColumn)},` : sql``}
        AVG(network_queries) as avgnetwork, 
            AVG(network_queries) as avgnetwork, 
        AVG(network_queries) as avgnetwork, 
        ${minMax ? sql`MIN(network_queries) as minnetwork,` : empty} 
        ${minMax ? sql`MAX(network_queries) as maxnetwork, ` : empty} 
        AVG(network_received) as avgreceived, 
            AVG(network_received) as avgreceived, 
        AVG(network_received) as avgreceived, 
        ${minMax ? sql`MIN(network_received) as minreceived,` : empty}  
        ${minMax ? sql`MAX(network_received) as maxreceived, ` : empty} 
        AVG(network_send) as avgsend, 
            AVG(network_send) as avgsend, 
        AVG(network_send) as avgsend, 
        ${minMax ? sql`MIN(network_send) as minsend, ` : empty} 
        ${minMax ? sql`MAX(network_send) as maxsend, ` : empty} 
        AVG(duration) as avgduration, 
            AVG(duration) as avgduration, 
        AVG(duration) as avgduration, 
        ${minMax ? sql`MAX(duration) maxD, ` : empty} 
        ${minMax ? sql`MIN(duration) minD,` : empty} 
        Count(*) as count,
        AVG(lagging) as avglagging,
        SUM(updated) as allupdate,
        SUM(created) as allcreate,
        SUM(deleted) as alldelete,
        AVG(CASE WHEN "result" = 'failed' THEN 1 ELSE 0 END) as failed, 
            AVG(CASE WHEN "result" = 'failed' THEN 1 ELSE 0 END) as failed, 
        AVG(CASE WHEN "result" = 'failed' THEN 1 ELSE 0 END) as failed, 
        AVG(CASE WHEN "result" = 'success' THEN 1 ELSE 0 END) as succeeded,
        AVG(queries) as queries${minMax ? sql`,` : empty}
        ${minMax ? sql`MAX(queries) maxQ, ` : empty} 
        ${minMax ? sql`MIN(CASE WHEN queries = 0 THEN NULL ELSE queries END) minQ` : empty} 
        FROM job_history
        ${groupBy.length ? sql`GROUP BY ${joinComma(groupBy)}` : empty};`,
    )) as unknown as Array<JobStats & TimeJobStats>;

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

      for (const value of values) {
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

        values.push(value.value as any);
      }
    }
    return values as any[];
  }

  public getJobsStatsSummary(): Promise<readonly JobStatSummary[]> {
    // TODO: typing this beast
    return this.con.any(sql`SELECT * FROM job_stat_summary;`);
  }

  public async getJobDetails(id: number): Promise<JobDetails> {
    const jobPromise = this.con.maybeOne(sql.type(simpleJob)`SELECT * FROM jobs WHERE id = ${id}`);
    const historyPromise = this.con.any(
      sql.type(simpleJobHistory)`
      SELECT
        id, name, type, start, "end", arguments, result, message, context,
        scheduled_at, created, updated, deleted, queries, network_queries,
        network_received, network_send, lagging, duration
      FROM job_history
      WHERE name = (SELECT name FROM job_history WHERE id = ${id} LIMIT 1)
      ORDER BY start DESC;
      `,
    );

    const [job, history] = await Promise.all([jobPromise, historyPromise]);

    return {
      job,
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
        throw new TypeError(`trying to delete jobs from column '${column}' without a string value: ${value + ""}`);
      }
      const like = escapeLike(value, {
        noBoundaries: true,
        singleQuotes: true,
      });
      await this.con.query(sql`DELETE FROM jobs WHERE ${sql.identifier([column])} LIKE ${like};`);
      // FIXME: storeModifications("job", "delete", result);
    }
  }

  public async getJobs(limit = 50): Promise<readonly SimpleJob[]> {
    if (limit <= 0 || !limit) {
      limit = 50;
    }
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs
      WHERE (nextRun IS NULL OR nextRun < NOW()) AND state = 'waiting' AND enabled != 'disabled' order by nextRun LIMIT ${limit};`,
    );
  }

  public async queryJobs({ limit }: JobQuery = {}): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs
      WHERE (next_run IS NULL OR next_run < NOW())
      AND state = 'waiting' AND enabled
      order by next_run
      ${limit ? sql` LIMIT ${limit}` : sql``}`,
    );
  }

  public async getAllJobs(): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs;`,
    );
  }

  public async getJobsById(jobIds: readonly number[]): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs
      WHERE id = ANY(${sql.array(jobIds, "int8")});`,
    );
  }

  public async getJobsByName(names: readonly string[]): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs 
      WHERE (next_run IS NULL OR next_run < NOW()) AND state = 'waiting' AND name = ANY(${sql.array(names, "text")});`,
    );
  }

  public async getJobsInState(state: JobState): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs 
      WHERE state = ${state} order by next_run`,
    );
  }

  public async stopJobs(): EmptyPromise {
    await this.con.query(sql`UPDATE jobs SET state = ${JobState.WAITING}`);
    await this.con.query(sql`CREATE TEMPORARY TABLE tmp_jobs (id INT NOT NULL)`);
    await this.con.query(sql`INSERT INTO tmp_jobs SELECT id from jobs`);
    await this.con.query(
      sql`DELETE FROM jobs WHERE run_after IS NOT NULL AND run_after NOT IN (SELECT id FROM tmp_jobs)`,
    );
    await this.con.query(sql`DROP TABLE tmp_jobs`);
  }

  public async getAfterJobs(id: number): Promise<readonly SimpleJob[]> {
    return this.con.any(
      sql.type(simpleJob)`
      SELECT id, type, name, state, interval, delete_after_run,
      running_since, run_after, last_run, next_run, arguments, enabled
      FROM jobs 
      WHERE run_after = ${id} AND state != 'running';`,
    );
  }

  public async addJobs(jobs: JobRequest[]): Promise<readonly SimpleJob[]> {
    const now = new Date();
    const currentJobs = await this.getAllJobs();

    return Promise.all(
      jobs.map(async (value: JobRequest): Promise<SimpleJob> => {
        let args = value.arguments;
        if (value.arguments && !isString(value.arguments)) {
          args = JSON.stringify(value.arguments);
        }
        let runAfter: Optional<number>;

        // @ts-expect-error
        if (value.runAfter?.id && Number.isInteger(value.runAfter.id)) {
          // @ts-expect-error
          runAfter = value.runAfter.id;
        }
        const foundJob = currentJobs.find((job) => job.name === value.name);

        if (foundJob) {
          return foundJob;
        } else {
          const nextRun = value.runImmediately ? sql.timestamp(now) : null;
          const maybeJob = await this.con.maybeOne(
            sql.type(simpleJob)`INSERT INTO jobs
            (type, name, state, interval, delete_after_run, run_after, arguments, next_run, enabled)
            VALUES (
              ${value.type},${value.name},${JobState.WAITING},${value.interval},
              ${value.deleteAfterRun},${runAfter ?? null},${args ?? null},${nextRun}, true
            ) ON CONFLICT DO NOTHING
            RETURNING id, type, name, state, interval, delete_after_run, run_after, arguments, next_run, enabled;`,
          );
          // the only reason it should fail to insert is when its name constraint is violated
          if (!maybeJob) {
            throw new DatabaseError("could not add job: " + JSON.stringify(value) + " nor find it");
          }
          return maybeJob;
          // FIXME: storeModifications("job", "insert", result);
        }
      }),
    );
  }

  public async removeJobs(jobs: readonly SimpleJob[]): EmptyPromise {
    const params = jobs.map((val) => val.id);
    await this.con.query(sql`DELETE FROM jobs WHERE id = ANY(${sql.array(params, "int8")});`);
    // FIXME: multiSingle(result, (value) => storeModifications("job", "delete", value));
  }

  public async removeFinishedJob(job: SimpleJob, finished: Date, previousScheduledAt: Date | undefined): EmptyPromise {
    await this.con.query(sql`DELETE FROM jobs WHERE id = ${job.id};`);
    // FIXME: multiSingle(result, (value) => storeModifications("job", "delete", value));
    await this.addJobHistory(job, finished, previousScheduledAt);
  }

  public async removeJob(key: string | number): EmptyPromise {
    await this.con.query(sql`DELETE FROM jobs WHERE ${isString(key) ? sql`name` : sql`id`} = ${key}`);
    // FIXME: storeModifications("job", "delete", result);
  }

  public async updateJobsEnable(id: Id, enabled: boolean): EmptyPromise {
    await this.con.query(sql`UPDATE jobs SET enabled = ${enabled} WHERE id = ${id}`);
  }

  public async updateJobs(job: SimpleJob | SimpleJob[]): EmptyPromise {
    await promiseMultiSingle(job, (value: SimpleJob) => {
      return this.update(
        "jobs",
        () => {
          // for now updateJobs is used only to switch between the running states running and waiting
          if (value.state === JobState.RUNNING && !value.runningSince) {
            throw new ValidationError("No running_since value on running job!");
          }
          let args = value.arguments;

          if (value.arguments && !isString(value.arguments)) {
            args = JSON.stringify(value.arguments);
          }
          const updates = [];
          updates.push(sql`state = ${value.state}`);
          updates.push(sql`running_since = ${value.runningSince ? sql.timestamp(value.runningSince) : null}`);
          updates.push(sql`last_run = ${value.lastRun ? sql.timestamp(value.lastRun) : null}`);
          updates.push(sql`next_run = ${value.nextRun ? sql.timestamp(value.nextRun) : null}`);
          updates.push(sql`arguments = ${args ?? null}`);
          return updates;
        },
        {
          column: "id",
          value: value.id,
        },
      );
    });
  }

  public async updateFinishedJob(job: SimpleJob, finished: Date, previousScheduledAt: Date | undefined): EmptyPromise {
    await this.updateJobs(job);
    await this.addJobHistory(job, finished, previousScheduledAt);
  }

  /**
   * Query for JobHistoryItems.
   *
   * @param since Date of the earliest possible JobHistoryItem
   * @param limit max number of results or all if negative
   * @returns a Query object
   */
  public async getJobHistoryStream(since: Date, limit: number): Promise<TypedQuery<SimpleJobHistory>> {
    return this.stream(sql.type(simpleJobHistory)`
    SELECT 
    id, arguments, message, context, scheduled_at,
    created, updated, deleted, queries,
    network_queries, network_received, network_send,
    lagging, duration, type, name, start, "end", result
    FROM job_history
    WHERE start < ${sql.timestamp(since)}
    ORDER BY start DESC${limit >= 0 ? sql` LIMIT ${limit}` : sql``}`);
  }

  public async getJobHistory(): Promise<readonly SimpleJobHistory[]> {
    return this.con.any(
      sql.type(simpleJobHistory)`
      SELECT 
      id, arguments, message, context, scheduled_at,
      created, updated, deleted, queries,
      network_queries, network_received, network_send,
      lagging, duration, type, name, start, "end", result
      FROM job_history
      ORDER BY start`,
    );
  }

  /**
   * Return a paginated query result.
   * Returns at most 1000 items but at least 5.
   *
   * @param filter the query filter
   * @returns an array of items
   */
  public async getJobHistoryPaginated(filter: QueryJobHistory): Promise<Paginated<SimpleJobHistory, "start">> {
    // to transform the date into the correct form in the local timezone
    // else the database misses it with the timezoneoffset
    const since = new Date(filter.since);
    since.setMinutes(since.getMinutes() - since.getTimezoneOffset());

    const conditions = [sql`start < ${sql.timestamp(since)}`];

    if (filter.name) {
      conditions.push(sql`name like ${"%" + filter.name + "%"}`);
    }

    if (filter.type) {
      conditions.push(sql`type = ${filter.type}`);
    }

    if (filter.result) {
      conditions.push(sql`type = ${filter.result}`);
    }

    const totalPromise = this.con.oneFirst<{ total: number }>(
      sql`SELECT count(*) as total FROM job_history WHERE ${joinAnd(conditions)}`,
    );
    const items = await this.con.any(
      sql.type(simpleJobHistory)`
      SELECT 
      id, arguments, message, context, scheduled_at,
      created, updated, deleted, queries,
      network_queries, network_received, network_send,
      lagging, duration, type, name, start, "end", result
      FROM job_history
      WHERE ${joinAnd(conditions)}
      ORDER BY start DESC
      LIMIT ${Math.max(Math.min(filter.limit, 1000), 5)}`,
    );
    const total = await totalPromise;

    return {
      items,
      next: items[items.length - 1] && new Date(items[items.length - 1].start),
      total,
    };
  }

  private async addJobHistory(job: SimpleJob, finished: Date, previousScheduledAt: Date | undefined): EmptyPromise {
    let args = job.arguments;

    if (job.arguments && !isString(job.arguments)) {
      args = JSON.stringify(job.arguments);
    }

    const store = requireStore();
    const result = store.get(StoreKey.RESULT) || "success";
    const message = store.get(StoreKey.MESSAGE) || JSON.stringify({ message: "No Message" });

    const jobTrack: JobTrack = {
      modifications: store.get(StoreKey.MODIFICATIONS) || {},
      network: store.get(StoreKey.NETWORK) || defaultNetworkTrack(),
      queryCount: store.get(StoreKey.QUERY_COUNT) || 0,
    };

    let item = await this.con.maybeOne(
      sql.type(simpleJobStatSummary)`SELECT * FROM job_stat_summary WHERE name = ${job.name}`,
    );

    item ??= {
      name: job.name,
      type: job.type,
      count: 0,
      failed: 0,
      succeeded: 0,
      networkRequests: 0,
      minNetworkRequests: 0,
      maxNetworkRequests: 0,
      networkSend: 0,
      minNetworkSend: 0,
      maxNetworkSend: 0,
      networkReceived: 0,
      minNetworkReceived: 0,
      maxNetworkReceived: 0,
      duration: 0,
      minDuration: 0,
      maxDuration: 0,
      updated: 0,
      minUpdated: 0,
      maxUpdated: 0,
      created: 0,
      minCreated: 0,
      maxCreated: 0,
      deleted: 0,
      minDeleted: 0,
      maxDeleted: 0,
      sqlQueries: 0,
      minSqlQueries: 0,
      maxSqlQueries: 0,
      lagging: 0,
      minLagging: 0,
      maxLagging: 0,
    };
    item.count++;

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const modification of Object.values(jobTrack.modifications)) {
      created += modification.created;
      updated += modification.updated;
      deleted += modification.deleted;

      item.created += modification.created;
      item.minCreated = Math.min(item.minCreated, modification.created);
      item.maxCreated = Math.max(item.maxCreated, modification.created);

      item.updated += modification.updated;
      item.minUpdated = Math.min(item.minUpdated, modification.updated);
      item.maxUpdated = Math.max(item.maxUpdated, modification.updated);

      item.deleted += modification.deleted;
      item.minDeleted = Math.min(item.minDeleted, modification.deleted);
      item.maxDeleted = Math.max(item.maxDeleted, modification.deleted);
    }

    item.sqlQueries = jobTrack.queryCount;
    item.minSqlQueries = Math.min(jobTrack.queryCount, item.minSqlQueries);
    item.maxSqlQueries = Math.max(jobTrack.queryCount, item.maxSqlQueries);

    item.failed += result === "failed" ? 1 : 0;
    item.succeeded += result === "success" ? 1 : 0;

    const startTime = job.runningSince?.getTime() || 0;

    const lagging = (job.runningSince?.getTime() || 0) - (previousScheduledAt?.getTime() || startTime);
    item.lagging = lagging;
    item.minLagging = Math.min(item.minLagging, lagging);
    item.maxLagging = Math.max(item.maxLagging, lagging);

    const duration = finished.getTime() - startTime;
    item.duration = duration;
    item.minDuration = Math.min(item.minDuration, duration);
    item.maxDuration = Math.max(item.maxDuration, duration);

    const insertColumns = [];
    const insertValues = [];
    const updates = [];

    for (const key of Object.keys(item)) {
      const identifier = sql.identifier([key]);
      insertColumns.push(sql.identifier([key]));
      insertValues.push(sql`${item[key as keyof SimpleJobStatSummary]}`);
      updates.push(sql`${identifier} = EXCLUDED.${identifier}`);
    }

    // update job stat summary
    await this.con.query(
      sql`
      INSERT INTO job_stat_summary
      (${joinComma(insertColumns)})
      VALUES (${joinComma(insertValues)})
      ON CONFLICT (name) DO UPDATE SET ${joinComma(updates)}`,
    );

    const queries = jobTrack.queryCount;
    const networkReceived = jobTrack.network.received || 0;
    const networkSend = jobTrack.network.sent || 0;
    const networkRequests = jobTrack.network.count || 0;

    const scheduledAt = previousScheduledAt ?? job.runningSince;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const runningSince = sql.timestamp(job.runningSince!);

    await this.con.query(
      sql`INSERT INTO job_history 
      (
        id, type, name, scheduled_at, start, "end", result, message,
        context, arguments, created, updated, deleted, queries, network_queries, network_received, network_send
      ) VALUES (
        ${job.id},${job.name},${job.name},${scheduledAt ? sql.timestamp(scheduledAt) : null},
        ${runningSince},${sql.timestamp(finished)},${result},${sql.jsonb(message)},${""},${args ?? null},
        ${created},${updated},${deleted},${queries},${networkRequests},${networkReceived},${networkSend}
      );`,
    );
  }
}
