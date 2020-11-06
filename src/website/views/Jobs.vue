<template>
  <div class="container-fluid">
    <h1 id="jobs-title">
      Jobs
    </h1>
    <div class="row">
      <span class="col">Running Jobs: {{ summary.running }}</span>
    </div>
    <div class="row">
      <span class="col">Waiting Jobs: {{ summary.waiting }}</span>
    </div>
    <div class="row">
      <span class="col">Lagging Jobs:
        <span
          class="badge"
          :class="(summary.lagging / (summary.waiting + summary.running)) > 0.1 ? 'badge-danger' : 'badge-success'"
        >
          {{ summary.lagging }}
        </span>
      </span>
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
          <th scope="col">
            Name
          </th>
          <th scope="col">
            Status
          </th>
          <th scope="col">
            Time Running
          </th>
          <th scope="col">
            Running Since
          </th>
          <th scope="col">
            Next Run
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
import { Job, SimpleMedium } from "../siteTypes"

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
    sortedOn: Array<keyof Job>;
    media: Map<number, SimpleMedium>;
    now: Date;
    liveJobs: { [key: number]: LiveJob };
    summary: JobsSummary;
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
            sortedOn: ["state", "runningSince", "nextRun"],
            media: new Map(),
            now: new Date(),
            liveJobs: {},
            summary: {
                waiting: 0,
                running: 0,
                lagging: 0,
            }
        };
    },
    computed: {
        computedJobs(): Job[] {
            const jobs = [...this.jobs]
            jobs.sort((a, b) => {
                for (const sort of this.sortedOn) {
                    if (a[sort] > b[sort]) {
                        return 1;
                    }

                    if (a[sort] < b[sort]) {
                        return -1;
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
        }
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