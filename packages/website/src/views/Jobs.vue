<template>
  <div class="container-fluid">
    <h1 id="jobs-title">Jobs</h1>
    <div class="row">
      <span class="col-2">Running Jobs: {{ data.summary.running }}</span>
      <span class="col-2">Network Queries: </span>
      <span class="col"
        >{{ data.totalJobsStats.minnetwork }}-{{ data.totalJobsStats.avgnetwork }}-{{
          data.totalJobsStats.maxnetwork
        }}</span
      >
    </div>
    <div class="row">
      <span class="col-2">Waiting Jobs: {{ data.summary.waiting }}</span>
      <span class="col-2">Network Send: </span>
      <span class="col"
        >{{ data.totalJobsStats.minsend }}-{{ round(data.totalJobsStats.avgsend, 2) }}-{{
          data.totalJobsStats.maxsend
        }}</span
      >
    </div>
    <div class="row">
      <span class="col-2"
        >Lagging Jobs:
        <span
          class="badge"
          :class="
            data.summary.lagging / (data.summary.waiting + data.summary.running) > 0.1 ? 'bg-danger' : 'bg-success'
          "
        >
          {{ data.summary.lagging }}
        </span>
      </span>
      <span class="col-2">Network Received:</span>
      <span class="col"
        >{{ data.totalJobsStats.minreceived }}-{{ round(data.totalJobsStats.avgreceived, 2) }}-{{
          data.totalJobsStats.maxreceived
        }}</span
      >
    </div>
    <div class="row">
      <span class="col-2">Total Jobs failed: {{ round(data.totalJobsStats.failed * 100, 2) }}%</span>
      <span class="col-2">SQL Queries: </span>
      <span class="col"
        >{{ data.totalJobsStats.minQ }}-{{ round(data.totalJobsStats.queries, 2) }}-{{ data.totalJobsStats.maxQ }}</span
      >
    </div>
    <div class="row">
      <span class="col-2">Total Jobs succeeded: {{ round(data.totalJobsStats.succeeded * 100, 2) }}%</span>
      <span class="col-2">Duration: </span>
      <span class="col"
        >{{ data.totalJobsStats.minD }}-{{ round(data.totalJobsStats.avgduration, 2) }}-{{
          data.totalJobsStats.maxD
        }}</span
      >
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Created: </span>
      <span class="col">{{ data.totalJobsStats.allcreate }}</span>
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Updated: </span>
      <span class="col">{{ data.totalJobsStats.allupdate }}</span>
    </div>
    <div class="row">
      <span class="col-2" />
      <span class="col-2">Deleted: </span>
      <span class="col">{{ data.totalJobsStats.alldelete }}</span>
    </div>
    <data-table
      v-model:filters="data.filters"
      class="p-datatable-sm"
      :loading="data.isLoading"
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
        <template #body="slotProps">{{ dateToRelative(slotProps.data.runningSince) }}</template>
      </column>
      <column field="runningSince" header="Running Since" sortable>
        <template #body="slotProps">{{ dateToString(slotProps.data.runningSince) }}</template>
      </column>
      <column field="nextRun" header="Next Run" sortable>
        <template #body="slotProps">{{ dateToString(slotProps.data.nextRun) }}</template>
      </column>
      <column field="failed" header="Failed" sortable>
        <template #body="slotProps">{{ round(slotProps.data.failed, 2) }}</template>
      </column>
      <column field="duration" header="Avg Duration" sortable>
        <template #body="slotProps">{{ round(slotProps.data.duration, 2) }}</template>
      </column>
      <column field="network_requests" header="Network" sortable>
        <template #body="slotProps">{{ round(slotProps.data.network_requests, 2) }}</template>
      </column>
      <column field="network_received" header="Received" sortable>
        <template #body="slotProps">{{ round(slotProps.data.network_received, 2) }}</template>
      </column>
      <column field="lagging" header="Lagging" sortable>
        <template #body="slotProps">{{ round(slotProps.data.lagging, 2) }}</template>
      </column>
      <column field="sql_queries" header="SQL Queries" sortable>
        <template #body="slotProps">{{ round(slotProps.data.sql_queries, 2) }}</template>
      </column>
      <column field="count" header="Count" sortable />
    </data-table>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { computed, reactive } from "vue";
import { AllJobStats, Job } from "../siteTypes";
import { absoluteToRelative, formatDate, round } from "../init";
import { JobStatSummary } from "enterprise-core/dist/types";
import { FilterMatchMode } from "primevue/api";
import { useMediaStore } from "../store/media";
import { useToast } from "primevue/usetoast";

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

const mediaStore = useMediaStore();
const data = reactive<Data>({
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
});

// COMPUTED
const computedJobs = computed((): JobItem[] => {
  const jobs = [...data.jobStats];
  const sortEntries = Object.entries(data.sortedOn) as Array<[keyof JobItem, number]>;
  console.log("Sorting Jobs on Fields: " + JSON.stringify(data.sortedOn));

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
});

// TODO: add filtering
loadData();

// FUNCTIONS
const toast = useToast();

function getDefaultJobStatSummmary(): JobStatSummary {
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
  };
}

async function loadData() {
  if (data.isLoading) {
    return;
  }
  data.isLoading = true;
  const summaryPromise = HttpClient.getJobsStatsSummary();
  const jobPromise = HttpClient.getJobs();
  const nameMap: Record<string, JobItem> = {};

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
        // waiting jobs should not have data value set
        datum.runningSince = null;
      }
      if (datum.job_state !== "disabled") {
        nameMap[datum.name] = Object.assign({}, defaultJobStatSummmary, datum);
      }
    }
    data.summary.running = running;
    data.summary.waiting = waiting;
    data.summary.lagging = lagging;
  } catch (error) {
    toast.add({
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
    data.jobStats = Object.values(nameMap);
  } catch (error) {
    toast.add({
      summary: "Error quering JobsSummaries",
      detail: error + "",
      closable: true,
      severity: "error",
    });
  }

  data.jobStats = Object.values(nameMap);
  data.isLoading = false;
}

function dateToString(date?: Date | null): string {
  if (!date) {
    return "";
  }
  return formatDate(date, true);
}

function nameToString(name: string): string {
  const match = tocRegex.exec(name);

  if (!match) {
    return name;
  }
  const id = Number.parseInt(match[1]);
  const medium = mediaStore.media[id];
  const link = match[2];
  const domainName = domainRegex.exec(link);
  return `Toc: ${medium?.title || "Deleted Medium"} of ${domainName?.[2] || ""}`;
}

function dateToRelative(date?: Date | null): string {
  if (!date) {
    return "";
  }
  return absoluteToRelative(date, data.now);
}
</script>
