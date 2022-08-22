<template>
  <div>
    <h1>Name: {{ data.job ? nameToString(data.job.name) : "Unknown" }}</h1>
    <div class="form-check form-switch">
      <input id="enabledSwitch" v-model="enabled" type="checkbox" class="form-check-input" />
      <label class="form-check-label" for="enabledSwitch">Job enabled</label>
    </div>
    <DataTable
      v-model:filters="data.filters"
      v-model:expandedRows="expandedRows"
      class="p-datatable-sm"
      :value="data.history"
      :loading="data.loading"
      striped-rows
      :paginator="true"
      :auto-layout="true"
      :rows="100"
      data-key="key"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink RowsPerPageDropdown"
      :rows-per-page-options="[100, 200, 500]"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      paginator-position="both"
      filter-display="row"
    >
      <template #empty>
        <div class="text-center my-5">No records found.</div>
      </template>
      <Column :expander="true" header-style="width: 3rem" />
      <Column field="state" header="Status" :show-filter-menu="false">
        <template #body="slotProps">
          <tag :value="slotProps.data.result" :severity="jobStateResult(slotProps.data.result)" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Dropdown
            v-model="filterModel.value"
            :options="statuses"
            placeholder="Any"
            class="p-column-filter"
            :show-clear="true"
            @change="filterCallback()"
          >
            <template #value="slotProps">
              <tag :value="slotProps.value || 'Any'" :severity="jobStateResult(slotProps.value)" />
            </template>
            <template #option="slotProps">
              <tag :value="slotProps.option" :severity="jobStateResult(slotProps.option)" />
            </template>
          </Dropdown>
        </template>
      </Column>
      <Column field="duration" header="Duration" :sortable="true">
        <template #body="slotProps"> {{ slotProps.data.duration }}s </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber v-model="filterModel.value" @keydown.enter="filterCallback()" />
        </template>
      </Column>
      <Column field="network" header="Network" :sortable="true">
        <template #body="slotProps">
          {{ slotProps.data.network_queries }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber v-model="filterModel.value" @keydown.enter="filterCallback()" />
        </template>
      </Column>
      <Column field="received" header="Received" :sortable="true">
        <template #body="slotProps">
          {{ slotProps.data.network_received }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber v-model="filterModel.value" @keydown.enter="filterCallback()" />
        </template>
      </Column>
      <Column field="queries" header="Queries" :sortable="true">
        <template #body="slotProps">
          {{ slotProps.data.queries }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber v-model="filterModel.value" @keydown.enter="filterCallback()" />
        </template>
      </Column>
      <Column field="modifications" header="Modifications" :sortable="true">
        <template #body="slotProps">
          {{ slotProps.data.modifications }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber v-model="filterModel.value" @keydown.enter="filterCallback()" />
        </template>
      </Column>
      <Column field="start" header="Start" :sortable="true">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.start) }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Calendar
            v-model="filterModel.value"
            date-format="mm/dd/yy"
            placeholder="mm/dd/yyyy"
            @date-select="filterCallback"
          />
        </template>
      </Column>
      <Column field="end" header="End" :sortable="true">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.end) }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Calendar
            v-model="filterModel.value"
            date-format="mm/dd/yy"
            placeholder="mm/dd/yyyy"
            @date-select="filterCallback"
          />
        </template>
      </Column>
      <template #expansion="slotProps">
        <div>
          <div v-if="slotProps.data.error">{{ slotProps.data.error.name }}: {{ slotProps.data.error.message }}</div>
          <h6>Modifications</h6>
          <data-table
            v-if="Object.keys(slotProps.data).length"
            :value="recordToArray(slotProps.data.modificationsDetail)"
          >
            <template #empty>
              <div class="text-center my-5">No records found.</div>
            </template>
            <Column field="key" header="Type" />
            <Column field="created" header="Created" />
            <Column field="updated" header="Updated" />
            <Column field="deleted" header="Deleted" />
          </data-table>
          <span v-else>: None</span>
          <h6>Network History</h6>
          <ul class="list-group">
            <li v-for="(item, index) in slotProps.data.networkHistory" :key="index" class="list-group-item">
              {{ item.url }} - {{ item.method }} - {{ item.statusCode }}
            </li>
          </ul>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { reactive, ref, watchEffect } from "vue";
import { Job, JobHistoryItem, JobTrack } from "../siteTypes";
import { formatDate, recordToArray } from "../init";
import { useMediaStore } from "../store/media";
import { JobHistoryResult, Modification } from "enterprise-core/dist/types";
import { FilterMatchMode } from "primevue/api";

interface Data {
  job?: Job;
  history: JobHistoryItem[];
  loading: boolean;
  filters: any;
}

const statuses: JobHistoryResult[] = ["failed", "success", "warning"];
const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

const mediaStore = useMediaStore();
const props = defineProps<{ id: number }>();
const data = reactive<Data>({
  job: undefined,
  history: [],
  loading: true,
  filters: {
    state: { value: null, matchMode: FilterMatchMode.EQUALS },
    duration: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
    network: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
    received: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
    queries: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
    modifications: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
    start: { value: null, matchMode: FilterMatchMode.DATE_AFTER },
    end: { value: null, matchMode: FilterMatchMode.DATE_AFTER },
  },
});
const enabled = ref(true);
const expandedRows = ref([]);

// WATCHES
watchEffect(() => {
  const job = data.job;

  if (!job) {
    enabled.value = false;
    return;
  }

  const jobEnabled = data.job?.job_state === "enabled";

  if (enabled.value !== jobEnabled) {
    HttpClient.postJobEnabled(job.id, enabled.value)
      .then(() => {
        // commit ui change to job object
        job.job_state = enabled.value ? "enabled" : "disabled";
      })
      .catch(() => {
        // revert ui change on error
        enabled.value = jobEnabled;
      });
  }
});

// GENERIC SETUP
HttpClient.getJobDetails(props.id)
  .then((value) => {
    data.job = value.job;
    enabled.value = value.job?.job_state === "enabled";

    for (const history of value.history) {
      let track: JobTrack | undefined;
      try {
        track = JSON.parse(history.message as string);
        history.message = track as JobTrack;
      } catch {
        // ignore it as it may not be json but a plain string
      }
      history.start = new Date(history.start);
      history.end = new Date(history.end);
      // @ts-expect-error
      history.modificationsDetail = track?.modifications ?? {};
      // @ts-expect-error
      history.modifications = Object.values(history.modificationsDetail).reduce(
        // @ts-expect-error
        (previous: number, current: Modification) => {
          return previous + current.created + current.updated + current.deleted;
        },
        0,
      );
      // @ts-expect-error
      history.networkHistory = track?.network.history ?? [];
      // @ts-expect-error
      history.jobId = history.id;
      // @ts-expect-error
      history.key = history.id + "-" + history.end;
    }
    data.history = value.history;
  })
  .finally(() => (data.loading = false));

// FUNCTIONS
function nameToString(name: string): string {
  const match = tocRegex.exec(name);

  if (!match) {
    return name;
  }
  const id = Number.parseInt(match[1]);
  const medium = mediaStore.media[id];
  const link = match[2];
  const domainName = domainRegex.exec(link);
  return `Toc: ${medium ? medium.title : "Deleted Medium"} of ${domainName?.[2] || ""}`;
}

function jobStateResult(state: JobHistoryResult) {
  switch (state) {
    case "success":
      return "success";
    case "failed":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}
</script>
