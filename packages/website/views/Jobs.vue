<template>
  <div class="container-fluid">
    <h1 id="jobs-title">Jobs</h1>
    <div class="row">
      <span class="col-2">Running Jobs: {{ summary.running }}</span>
      <span class="col-2">Network Queries: </span>
      <span class="col"
        >{{ totalJobsStats.minnetwork }}-{{ totalJobsStats.avgnetwork }}-{{ totalJobsStats.maxnetwork }}</span
      >
    </div>
    <div class="row">
      <span class="col-2">Waiting Jobs: {{ summary.waiting }}</span>
      <span class="col-2">Network Send: </span>
      <span class="col"
        >{{ totalJobsStats.minsend }}-{{ round(totalJobsStats.avgsend) }}-{{ totalJobsStats.maxsend }}</span
      >
    </div>
    <div class="row">
      <span class="col-2"
        >Lagging Jobs:
        <span
          class="badge"
          :class="summary.lagging / (summary.waiting + summary.running) > 0.1 ? 'badge-danger' : 'badge-success'"
        >
          {{ summary.lagging }}
        </span>
      </span>
      <span class="col-2">Network Received:</span>
      <span class="col"
        >{{ totalJobsStats.minreceived }}-{{ round(totalJobsStats.avgreceived) }}-{{ totalJobsStats.maxreceived }}</span
      >
    </div>
    <div class="row">
      <span class="col-2">Total Jobs failed: {{ round(totalJobsStats.failed * 100) }}%</span>
      <span class="col-2">SQL Queries: </span>
      <span class="col">{{ totalJobsStats.minQ }}-{{ round(totalJobsStats.queries) }}-{{ totalJobsStats.maxQ }}</span>
    </div>
    <div class="row">
      <span class="col-2">Total Jobs succeeded: {{ round(totalJobsStats.succeeded * 100) }}%</span>
      <span class="col-2">Duration: </span>
      <span class="col"
        >{{ totalJobsStats.minD }}-{{ round(totalJobsStats.avgduration) }}-{{ totalJobsStats.maxD }}</span
      >
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Created: </span>
      <span class="col">{{ totalJobsStats.allcreate }}</span>
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Updated: </span>
      <span class="col">{{ totalJobsStats.allupdate }}</span>
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Deleted: </span>
      <span class="col">{{ totalJobsStats.alldelete }}</span>
    </div>
    <table class="table" aria-describedby="jobs-title">
      <thead>
        <tr>
          <th scope="col">Nr.</th>
          <th scope="col" @click.left="toggleOrder('name')">
            Name
            <i class="fas" :class="sortedClass('name')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('state')">
            Status
            <i class="fas" :class="sortedClass('state')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('runningSince')">
            Time Running
            <i class="fas" :class="sortedClass('runningSince')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('runningSince')">
            Running Since
            <i class="fas" :class="sortedClass('runningSince')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('nextRun')">
            Next Run
            <i class="fas" :class="sortedClass('nextRun')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('failed')">
            Failure Rate
            <i class="fas" :class="sortedClass('failed')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('duration')">
            Avg Duration
            <i class="fas" :class="sortedClass('duration')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('network_requests')">
            Avg Network
            <i class="fas" :class="sortedClass('network_requests')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('network_received')">
            Avg Received
            <i class="fas" :class="sortedClass('network_received')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('sql_queries')">
            Avg Queries
            <i class="fas" :class="sortedClass('sql_queries')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('count')">
            Total Times Run
            <i class="fas" :class="sortedClass('count')" aria-hidden="true" />
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(job, index) in computedJobs" :key="job.name">
          <tr data-toggle="collapse" :data-target="'.collapse-' + index">
            <td>{{ index + 1 }}</td>
            <td>{{ nameToString(job.name) }}</td>
            <td>{{ job.state }}</td>
            <td>{{ absoluteToRelative(job.runningSince) }}</td>
            <td>{{ dateToString(job.runningSince) }}</td>
            <td>{{ dateToString(job.nextRun) }}</td>
            <td>{{ round(job.failed) }}</td>
            <td>
              {{ round(job.duration) }}
            </td>
            <td>
              {{ round(job.network_requests) }}
            </td>
            <td>
              {{ round(job.network_received) }}
            </td>
            <td>
              {{ round(job.lagging) }}
            </td>
            <td>{{ round(job.sql_queries) }}</td>
            <td>{{ job.count }}</td>
          </tr>
          <tr class="collapse" :class="'collapse-' + index">
            <!-- empty td as a natural margin left for index column -->
            <td />
            <td colspan="11">
              <router-link :to="{ name: 'job', params: { jobId: job.id } }" tag="a" class="btn btn-dark mb-2">
                View Job
              </router-link>
              <template v-if="job.id && liveJobs[job.id]">
                <table class="table table-sm table-hover">
                  <caption class="sr-only">
                    Time spent in Running or Waiting depending on contexts
                  </caption>
                  <thead>
                    <tr>
                      <th class="fit" scope="col">Context</th>
                      <th scope="col">Running</th>
                      <th scope="col">Waiting</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in totalRow(liveJobs[job.id])" :key="row">
                      <td class="fit">
                        {{ row.context }}
                      </td>
                      <td>
                        <div
                          class="bg-success"
                          style="padding: 3px 0"
                          :style="{
                            width: row.runningWidth + '%',
                          }"
                        >
                          {{ row.running }}ms
                        </div>
                      </td>
                      <td>
                        <div
                          class="bg-danger"
                          style="padding: 3px 0"
                          :style="{
                            width: row.waitingWidth + '%',
                          }"
                        >
                          {{ row.waiting }}ms
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td />
                      <td class="bg-success">
                        {{ liveJobs[job.id].running }}
                      </td>
                      <td class="bg-danger">
                        {{ liveJobs[job.id].waiting }}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div class="row">
                  <span class="col">Current: {{ liveJobs[job.id].context[liveJobs[job.id].context.length - 1] }}</span>
                </div>
              </template>
              <template v-else> No Live Jobs Data available </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { AllJobStats, Job } from "../siteTypes";
import { absoluteToRelative, formatDate, round } from "../init";
import { JobStatSummary } from "enterprise-server/bin/types";

interface LiveJob {
  /**
   * Time waiting in milliseconds
   */
  waiting: number;
  /**
   * Time running in milliseconds.
   */
  running: number;
  /**
   * Start DateTime since when it was waiting in epoch millis.
   */
  waitStart: number;
  /**
   * Start DateTime since when it was running in epoch millis.
   */
  runStart: number;
  /**
   * Labels for the Job
   */
  label: string[];
  /**
   * The async history.
   */
  history: HistoryItem[];
  /**
   * Rough ordered stack like contexts.
   */
  context: string[];
}

interface HistoryItem {
  duration: number;
  type: string;
  context: string;
  contexts: string[];
}

interface JobsSummary {
  running: number;
  waiting: number;
  lagging: number;
}

type JobItem = Partial<Job> & JobStatSummary;

interface Data {
  jobs: Job[];
  sortedOn: Partial<Record<keyof JobItem, number>>;
  now: Date;
  liveJobs: { [key: number]: LiveJob };
  summary: JobsSummary;
  totalJobsStats: AllJobStats;
  jobStats: JobItem[];
}

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

interface ContextPart {
  waiting: number;
  waitingWidth: number;
  running: number;
  runningWidth: number;
  context: string;
}

export default defineComponent({
  name: "Jobs",
  data(): Data {
    return {
      jobs: [],
      sortedOn: {
        state: 1,
        runningSince: 1,
        nextRun: 1,
      },
      now: new Date(),
      liveJobs: {},
      totalJobsStats: {
        count: 0,
        avgnetwork: 0,
        minnetwork: 0,
        maxnetwork: 0,
        avgreceived: 0,
        minreceived: 0,
        maxreceived: 0,
        avgsend: 0,
        minsend: 0,
        maxsend: 0,
        avgduration: 0,
        maxD: 0,
        minD: 0,
        allupdate: 0,
        allcreate: 0,
        alldelete: 0,
        failed: 0,
        succeeded: 0,
        queries: 0,
        maxQ: 0,
        minQ: 0,
        avglagging: 0,
      },
      jobStats: [],
      summary: {
        waiting: 0,
        running: 0,
        lagging: 0,
      },
    };
  },
  computed: {
    computedJobs(): JobItem[] {
      const jobs = [...this.jobStats];
      const sortEntries = Object.entries(this.sortedOn) as Array<[keyof JobItem, number]>;
      console.log("Sorting Jobs on Fields: " + JSON.stringify(this.sortedOn));

      jobs.sort((a, b) => {
        for (const [key, order] of sortEntries) {
          if (!order) {
            continue;
          }

          const aValue = a[key];
          const bValue = b[key];

          if (aValue && !bValue) {
            return 1;
          }
          if (!aValue && bValue) {
            return -1;
          }

          if (aValue && bValue) {
            if (aValue > bValue) {
              return 1 * order;
            }

            if (aValue < bValue) {
              return -1 * order;
            }
          }
        }
        return 0;
      });
      return jobs;
    },
  },
  async mounted() {
    // fetch storage jobs data
    const [data, stats] = await Promise.all([HttpClient.getJobs(), HttpClient.getJobsStatsSummary()]);

    let running = 0;
    let waiting = 0;
    let lagging = 0;
    const now = new Date();
    const nameMap = {} as Record<string, JobItem>;
    const defaultJobStatSummmary = {
      name: "",
      type: "",
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
    } as JobStatSummary;

    for (const datum of data) {
      if (datum.runningSince) {
        datum.runningSince = new Date(datum.runningSince);
      }
      if (datum.nextRun) {
        datum.nextRun = new Date(datum.nextRun);
      }
      if (datum.state === "running") {
        running++;
      } else {
        waiting++;
        if (datum.nextRun && datum.nextRun < now) {
          lagging++;
        }
        // waiting jobs should not have this value set
        datum.runningSince = null;
      }
      nameMap[datum.name] = Object.assign(datum, defaultJobStatSummmary);
    }
    this.summary.running = running;
    this.summary.waiting = waiting;
    this.summary.lagging = lagging;
    this.jobStats = stats
      .filter((value) => value.name in nameMap)
      .map((value) => Object.assign(nameMap[value.name], value));

    // fetch live jobs data
    await fetch("http://localhost:3003")
      .then((response) => response.json())
      .then((data: { [key: number]: LiveJob }) => {
        for (const datum of Object.values(data)) {
          for (const key of [...Object.keys(datum)]) {
            const newKey = key.replaceAll('"', "");
            // remap key if it contained quotes
            if (newKey !== key) {
              // @ts-expect-error
              datum[newKey] = datum[key];
              // @ts-expect-error
              delete datum[key];
            }
          }
          // maintain rough stack like order
          const contexts: string[] = [];
          for (const item of datum.history) {
            const itemContexts = item.context.split("--");
            item.contexts = itemContexts;

            for (const context of itemContexts) {
              if (!contexts.includes(context)) {
                contexts.push(context);
              }
            }
          }
          datum.context = contexts;
        }
        this.liveJobs = data;
        console.log("finished loading live data");
      })
      .catch(console.error);
  },
  methods: {
    sortedClass(key: keyof JobItem) {
      const value = this.sortedOn[key];
      if (!value) {
        return "fa-sort";
      }
      return value > 0 ? "fa-sort-up" : value < 0 ? "fa-sort-down" : "fa-sort";
    },
    toggleOrder(key: keyof JobItem): void {
      const order = this.sortedOn[key];

      if (order === 1 || order == null) {
        this.sortedOn[key] = -1;
      } else {
        // @ts-expect-error
        this.sortedOn[key] += 1;
      }
    },
    dateToString(date?: Date | null): string {
      if (!date) {
        return "";
      }
      return formatDate(date, true);
    },
    nameToString(name: string): string {
      const match = tocRegex.exec(name);

      if (!match) {
        return name;
      }
      const id = Number.parseInt(match[1]);
      const medium = this.$store.getters.getMedium(id);
      const link = match[2];
      const domainName = domainRegex.exec(link);
      return `Toc: ${medium ? medium.title : "Deleted Medium"} of ${domainName && domainName[2]}`;
    },
    absoluteToRelative(date?: Date | null): string {
      if (!date) {
        return "";
      }
      return absoluteToRelative(date, this.now);
    },
    totalRow(liveJob: LiveJob): ContextPart[] {
      const map = new Map<string, ContextPart>();
      for (const item of liveJob.history) {
        const context = item.contexts[item.contexts.length - 1];
        let value = map.get(context);

        if (!value) {
          value = { waiting: 0, waitingWidth: 0, running: 0, runningWidth: 0, context };
          map.set(context, value);
        }
        if (item.type === "waiting") {
          value.waiting += item.duration;
        } else {
          value.running += item.duration;
        }
      }
      const values = [...map.values()];
      const total = liveJob.waiting + liveJob.running;

      for (const value of values) {
        value.waitingWidth = (value.waiting / total) * 100;
        value.runningWidth = (value.running / total) * 100;
      }
      return values;
    },
    round(value: number): number {
      return round(value, 2);
    },
  },
});
</script>
<style scoped>
tr[data-toggle] {
  cursor: pointer;
}

.table td.fit,
.table th.fit {
  width: 1%;
  white-space: nowrap;
}
</style>
