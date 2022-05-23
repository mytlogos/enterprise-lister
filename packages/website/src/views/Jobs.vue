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
          :class="summary.lagging / (summary.waiting + summary.running) > 0.1 ? 'bg-danger' : 'bg-success'"
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
    <data-table
      v-model:filters="filters"
      class="p-datatable-sm"
      :loading="isLoading"
      :value="computedJobs"
      striped-rows
      paginator-position="both"
      :paginator="true"
      :rows="20"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rows-per-page-options="[20, 40, 60]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <column field="name" header="Name" sortable>
        <template #body="slotProps">
          <router-link :to="{ name: 'job', params: { jobId: slotProps.data.id } }">
            {{ nameToString(slotProps.data.name) }}
          </router-link>
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Search by Name" />
        </template>
      </column>
      <column field="state" header="Status" sortable />
      <column field="runningSince" header="Time Running" sortable>
        <template #body="slotProps">{{ absoluteToRelative(slotProps.data.runningSince) }}</template>
      </column>
      <column field="runningSince" header="Running Since" sortable>
        <template #body="slotProps">{{ dateToString(slotProps.data.runningSince) }}</template>
      </column>
      <column field="nextRun" header="Next Run" sortable>
        <template #body="slotProps">{{ dateToString(slotProps.data.nextRun) }}</template>
      </column>
      <column field="failed" header="Failed" sortable>
        <template #body="slotProps">{{ round(slotProps.data.failed) }}</template>
      </column>
      <column field="duration" header="Avg Duration" sortable>
        <template #body="slotProps">{{ round(slotProps.data.duration) }}</template>
      </column>
      <column field="network_requests" header="Network" sortable>
        <template #body="slotProps">{{ round(slotProps.data.network_requests) }}</template>
      </column>
      <column field="network_received" header="Received" sortable>
        <template #body="slotProps">{{ round(slotProps.data.network_received) }}</template>
      </column>
      <column field="lagging" header="Lagging" sortable>
        <template #body="slotProps">{{ round(slotProps.data.lagging) }}</template>
      </column>
      <column field="sql_queries" header="SQL Queries" sortable>
        <template #body="slotProps">{{ round(slotProps.data.sql_queries) }}</template>
      </column>
      <column field="count" header="Count" sortable />
    </data-table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { AllJobStats, Job } from "../siteTypes";
import { absoluteToRelative, formatDate, round } from "../init";
import { JobStatSummary } from "enterprise-core/src/types";
import { FilterMatchMode, FilterOperator } from "primevue/api";

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
  filters: Record<string, any>;
  isLoading: boolean;
}

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

function getDefaultJobStatSummmary() {
  return {
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
}

export default defineComponent({
  name: "Jobs",
  data(): Data {
    return {
      isLoading: false,
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
      filters: {
        name: { value: null, matchMode: FilterMatchMode.CONTAINS },
      },
    };
  },
  computed: {
    computedJobs(): JobItem[] {
      const jobs = [...this.jobStats];
      const sortEntries = Object.entries(this.sortedOn) as Array<[keyof JobItem, number]>;
      console.log("Sorting Jobs on Fields: " + JSON.stringify(this.sortedOn));

      jobs.sort((a, b) => {
        if (a.job_state === "enabled" && b.job_state === "disabled") {
          return 1;
        }
        if (a.job_state === "disabled" && b.job_state === "enabled") {
          return -1;
        }
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
    // TODO: add filtering
    this.loadData();
  },
  methods: {
    async loadData() {
      if (this.isLoading) {
        return;
      }
      this.isLoading = true;
      const summaryPromise = HttpClient.getJobsStatsSummary();
      const jobPromise = HttpClient.getJobs();
      const nameMap = {} as Record<string, JobItem>;

      try {
        let running = 0;
        let waiting = 0;
        let lagging = 0;
        const now = new Date();
        const defaultJobStatSummmary = getDefaultJobStatSummmary();
        const jobs = await jobPromise;

        for (const datum of jobs) {
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
            // only enabled jobs can lag
            if (datum.nextRun && datum.nextRun < now && datum.job_state !== "disabled") {
              lagging++;
            }
            // waiting jobs should not have this value set
            datum.runningSince = null;
          }
          if (datum.job_state !== "disabled") {
            nameMap[datum.name] = Object.assign({}, defaultJobStatSummmary, datum);
          }
        }
        this.summary.running = running;
        this.summary.waiting = waiting;
        this.summary.lagging = lagging;
      } catch (error) {
        this.$toast.add({
          summary: "Error quering Jobs",
          detail: error + "",
          closable: true,
          severity: "error",
        });
      }
      try {
        const stats = await summaryPromise;

        for (const value of stats) {
          if (value.name in nameMap) {
            Object.assign(nameMap[value.name], value);
          }
        }
        this.jobStats = Object.values(nameMap);
      } catch (error) {
        this.$toast.add({
          summary: "Error quering JobsSummaries",
          detail: error + "",
          closable: true,
          severity: "error",
        });
      }

      this.jobStats = Object.values(nameMap);
      this.isLoading = false;
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
    round(value: number): number {
      return round(value, 2);
    },
  },
});
</script>
