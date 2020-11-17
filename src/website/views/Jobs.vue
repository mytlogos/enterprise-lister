<template>
  <div class="container-fluid">
    <h1 id="jobs-title">
      Jobs
    </h1>
    <div class="row">
      <span class="col-2">Running Jobs: {{ summary.running }}</span>
      <span class="col-2">Network Queries: </span>
      <span class="col">{{ totalJobsStats.minnetwork }}-{{ totalJobsStats.avgnetwork }}-{{ totalJobsStats.maxnetwork }}</span>
    </div>
    <div class="row">
      <span class="col-2">Waiting Jobs: {{ summary.waiting }}</span>
      <span class="col-2">Network Send: </span>
      <span class="col">{{ totalJobsStats.minsend }}-{{ round(totalJobsStats.avgsend) }}-{{ totalJobsStats.maxsend }}</span>
    </div>
    <div class="row">
      <span class="col-2">Lagging Jobs:
        <span
          class="badge"
          :class="(summary.lagging / (summary.waiting + summary.running)) > 0.1 ? 'badge-danger' : 'badge-success'"
        >
          {{ summary.lagging }}
        </span>
      </span>
      <span class="col-2">Network Received:</span>
      <span class="col">{{ totalJobsStats.minreceived }}-{{ round(totalJobsStats.avgreceived) }}-{{ totalJobsStats.maxreceived }}</span>
    </div>
    <div class="row">
      <span class="col-2">Total Jobs failed: {{ round(totalJobsStats.failed * 100) }}%</span>
      <span class="col-2">SQL Queries: </span>
      <span class="col">{{ totalJobsStats.minQ }}-{{ round(totalJobsStats.queries) }}-{{ totalJobsStats.maxQ }}</span>
    </div>
    <div class="row">
      <span class="col-2">Total Jobs succeeded: {{ round(totalJobsStats.succeeded * 100) }}%</span>
      <span class="col-2">Duration: </span>
      <span class="col">{{ totalJobsStats.minD }}-{{ round(totalJobsStats.avgduration) }}-{{ totalJobsStats.maxD }}</span>
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
    <table
      class="table"
      aria-describedby="jobs-title"
    >
      <thead>
        <tr>
          <th scope="col">
            Nr.
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('name')"
          >
            Name
            <i 
              class="fas"
              :class="sortedClass('name')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('state')"
          >
            Status
            <i 
              class="fas"
              :class="sortedClass('state')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('runningSince')"
          >
            Time Running
            <i 
              class="fas"
              :class="sortedClass('runningSince')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('runningSince')"
          >
            Running Since
            <i 
              class="fas"
              :class="sortedClass('runningSince')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('nextRun')"
          >
            Next Run 
            <i 
              class="fas"
              :class="sortedClass('nextRun')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('failed')"
          >
            Failure Rate
            <i 
              class="fas"
              :class="sortedClass('failed')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('avgduration')"
          >
            Avg Duration
            <i 
              class="fas"
              :class="sortedClass('avgduration')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('avgnetwork')"
          >
            Avg Network
            <i 
              class="fas"
              :class="sortedClass('avgnetwork')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('avgreceived')"
          >
            Avg Received
            <i 
              class="fas"
              :class="sortedClass('avgreceived')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('queries')"
          >
            Avg Queries
            <i 
              class="fas"
              :class="sortedClass('queries')" 
              aria-hidden="true"
            />
          </th>
          <th
            scope="col"
            @click.left="toggleOrder('count')"
          >
            Total Times Run
            <i 
              class="fas"
              :class="sortedClass('count')" 
              aria-hidden="true"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="(job, index) in computedJobs"
          :key="job.id"
        >
          <tr
            data-toggle="collapse"
            :data-target="'.collapse-' + index"
          >
            <td>{{ index + 1 }}</td>
            <td>{{ nameToString(job.name) }}</td>
            <td>{{ job.state }}</td>
            <td>{{ absoluteToRelative(job.runningSince) }}</td>
            <td>{{ dateToString(job.runningSince) }}</td>
            <td>{{ dateToString(job.nextRun) }}</td>
            <td>{{ jobStats[job.name]?.failed }}</td>
            <td>{{ jobStats[job.name]?.avgduration }}</td>
            <td>{{ jobStats[job.name]?.avgnetwork }}</td>
            <td>{{ jobStats[job.name]?.avgreceived }}</td>
            <td>{{ jobStats[job.name]?.queries }}</td>
            <td>{{ jobStats[job.name]?.count }}</td>
          </tr>
          <tr
            class="collapse"
            :class="'collapse-' + index"
          >
            <!-- empty td as a natural margin left for index column -->
            <td />
            <td colspan="5">
              <template v-if="liveJobs[job.id]">
                <table class="table table-sm table-hover">
                  <caption class="sr-only">
                    Time spent in Running or Waiting depending on contexts
                  </caption>
                  <thead>
                    <tr>
                      <th
                        class="fit"
                        scope="col"
                      >
                        Context
                      </th>
                      <th scope="col">
                        Running
                      </th>
                      <th scope="col">
                        Waiting
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in totalRow(liveJobs[job.id])"
                      :key="row"
                    >
                      <td class="fit">
                        {{ row.context }}
                      </td>
                      <td>
                        <div
                          class="bg-success"
                          style="padding: 3px 0"
                          :style="{
                            width: row.runningWidth + '%'
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
                            width: row.waitingWidth + '%'
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
              <template v-else>
                No Live Jobs Data available
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue"
import { AllJobStats, Job, JobStats, SimpleMedium } from "../siteTypes"
import { round } from "../init";

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

interface Data {
    jobs: Job[];
    sortedOn: Partial<Record<keyof Job | keyof JobStats, number>>;
    media: Map<number, SimpleMedium>;
    now: Date;
    liveJobs: { [key: number]: LiveJob };
    summary: JobsSummary;
    totalJobsStats: AllJobStats;
    jobStats: { [key: string]: JobStats };
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
                "state": 1,
                "runningSince": 1,
                "nextRun": 1
            },
            media: new Map(),
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
            },
            jobStats: {},
            summary: {
                waiting: 0,
                running: 0,
                lagging: 0,
            }
        };
    },
    computed: {
        computedJobs(): Job[] {
            const jobs = [...this.jobs];
            const sortEntries: Array<[string, number]> = Object.entries(this.sortedOn);
            console.log("Sorting Jobs on Fields: " + JSON.stringify(this.sortedOn))

            jobs.sort((a, b) => {
                const statsA = this.jobStats[a.name];
                const statsB = this.jobStats[b.name];

                for (const [key, order] of sortEntries) {
                    if (!order) {
                        continue;
                    }
                    const compareA = key in a ? a : statsA;
                    const compareB = key in b ? b : statsB;

                    if (!compareA || !compareB) {
                        continue;
                    }

                    if (compareA[key] > compareB[key]) {
                        return 1 * order;
                    }

                    if (compareA[key] < compareB[key]) {
                        return -1 * order;
                    }
                }
                return 0;
            });
            return jobs;
        }
    },
    mounted() {
        HttpClient.getAllMedia().then(data => {
            const media = new Map();

            for (const datum of data) {
                media.set(datum.id, datum);
            }

            this.media = media
        }).catch(console.error);

        // fetch storage jobs data
        HttpClient.getJobs().then(data => {
            let running = 0;
            let waiting = 0;
            let lagging = 0;
            const now = new Date();

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
                    if (datum.nextRun < now) {
                        lagging++;
                    }
                    // waiting jobs should not have this value set
                    datum.runningSince = null;
                }
            }
            this.summary.running = running;
            this.summary.waiting = waiting;
            this.summary.lagging = lagging;
            this.jobs = data;
        });

        HttpClient.getJobsStats().then(stats => this.totalJobsStats = stats);
        HttpClient.getJobsStatsGrouped().then(stats => {
            const currentNames = new Set(Object.keys(this.jobStats));

            for (const stat of stats) {
                this.jobStats[stat.name] = stat;
                currentNames.delete(stat.name);
            }

            // remove the mapping of names which are not in grouped
            for (const name of currentNames) {
                delete this.jobStats[name];
            }
        });

        // fetch live jobs data
        fetch("http://localhost:3003")
            .then(response => response.json())
            .then((data: { [key: number]: LiveJob }) => {
                for (const datum of Object.values(data)) {
                    for (const key of [...Object.keys(datum)]) {
                        const newKey = key.replaceAll("\"", "");
                        if (newKey !== key) {
                            datum[newKey] = datum[key];
                            delete datum[key];
                        }
                    }
                    // maintain rough stack like order
                    const contexts = [];
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
        sortedClass(key: keyof Job) {
            return this.sortedOn[key] > 0 ? "fa-sort-up" : this.sortedOn[key] < 0 ? "fa-sort-down" : "fa-sort";
        },
        toggleOrder(key: keyof Job): void {
            const order = this.sortedOn[key];

            if (order === 1 || order == null) {
                this.sortedOn[key] = -1;
            } else {
                this.sortedOn[key] += 1;
            }
        },
        dateToString(date?: Date | null): string {
            if (!date) {
                return "";
            }
            return date.toLocaleTimeString("de-DE");
        },
        nameToString(name: string): string {
            const match = tocRegex.exec(name);

            if (!match) {
                return name;
            }
            const id = Number.parseInt(match[1]);
            const medium = this.media.get(id);
            const link = match[2];
            const domainName = domainRegex.exec(link);
            return `Toc: ${medium ? medium.title : "Deleted Medium"} of ${domainName[2]}`;
        },
        absoluteToRelative(date?: Date | null): string {
            if (!date) {
                return "";
            }
            let seconds = (this.now.getTime() - date.getTime()) / 1000;
            let result = [];

            if (seconds > 3600) {
                result.push(Math.floor(seconds / 3600) + "h");
                seconds = seconds % 3600;
            }
            if (seconds > 60) {
                result.push(Math.floor(seconds / 60) + "m");
                seconds = seconds % 60;
            }
            if (seconds > 0) {
                result.push(Math.floor(seconds) + "s");
            }
            if (result.length) {
                return result.join(" ");
            } else {
                return "0 s";
            }
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
            const values = [...map.values()]
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
    }
})
</script>
<style scoped>
tr[data-toggle] {
    cursor: pointer;
}

.table td.fit, .table th.fit {
    width: 1%;
    white-space: nowrap;
}
</style>