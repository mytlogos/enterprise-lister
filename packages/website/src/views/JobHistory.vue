<template>
  <div>
    <toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <label for="modifications" style="margin-left: 5em">Min. Modifications</label>
          <input-number
            id="modifications"
            v-model="data.minModifications"
            show-buttons
            button-layout="horizontal"
            decrement-button-class="p-button-danger"
            increment-button-class="p-button-success"
            increment-button-icon="pi pi-plus"
            decrement-button-icon="pi pi-minus"
            :min="0"
          />
        </span>
        <Dropdown v-model="data.type" :options="types" placeholder="Any" :show-clear="true" />
      </template>
    </toolbar>

    <DataTable
      v-model:rows="data.rowsPerPage"
      v-model:filters="data.filters"
      v-model:expandedRows="expandedRows"
      class="p-datatable-sm"
      :value="computedJobs"
      :loading="data.loading"
      striped-rows
      :paginator="true"
      :lazy="true"
      :total-records="data.total"
      :auto-layout="true"
      :page-link-size="3"
      data-key="key"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink RowsPerPageDropdown"
      :rows-per-page-options="[100, 200, 500]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      paginator-position="both"
      filter-display="row"
      @page="onPage"
      @filter="onFilter"
    >
      <template #empty>
        <div class="text-center my-5">No records found.</div>
      </template>
      <Column :expander="true" header-style="width: 3rem" />
      <Column field="name" header="Name" :show-filter-menu="false">
        <template #body="slotProps">
          {{ nameToString(slotProps.data.name) }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            class="p-column-filter"
            placeholder="Search by name"
            @keydown.enter="filterCallback()"
          />
        </template>
      </Column>
      <Column field="state" header="Status" :show-filter-menu="false">
        <template #body="slotProps">
          <tag :value="slotProps.data.state" :severity="jobStateResult(slotProps.data.state)" />
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
      <Column field="start" header="Start">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.start) }}
        </template>
      </Column>
      <Column field="end" header="End">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.end) }}
        </template>
      </Column>
      <Column field="duration" header="Duration">
        <template #body="slotProps">
          {{ round(slotProps.data.duration, 2) }}
        </template>
      </Column>
      <Column field="network" header="Network">
        <template #body="slotProps">
          {{ round(slotProps.data.network, 2) }}
        </template>
      </Column>
      <Column field="received" header="Received">
        <template #body="slotProps">
          {{ round(slotProps.data.received, 2) }}
        </template>
      </Column>
      <Column field="queries" header="Queries">
        <template #body="slotProps">
          {{ round(slotProps.data.queries, 2) }}
        </template>
      </Column>
      <Column field="modifications" header="Modifications">
        <template #body="slotProps">
          {{ round(slotProps.data.modifications, 2) }}
        </template>
      </Column>
      <template #expansion="slotProps">
        <div>
          <router-link v-slot="{ navigate }" :to="{ name: 'job', params: { jobId: slotProps.data.jobId } }" custom>
            <p-button label="View Job" @click="navigate" />
          </router-link>
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
import { computed, reactive, ref, watch } from "vue";
import { formatDate, round, recordToArray } from "../init";
import { HttpClient } from "../Httpclient";
import { JobTrack, Modification } from "../siteTypes";
import { JobHistoryResult, ScrapeName } from "enterprise-core/dist/types";
import { FilterMatchMode } from "primevue/api";
import { useMediaStore } from "../store/media";
import { useToast } from "primevue/usetoast";

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

interface HistoryItem {
  name: string;
  state: "success" | "failed" | "warning" | string;
  start: Date;
  end: Date;
  duration: number;
  network: number;
  received: number;
  queries: number;
  modifications: number;
  error: JobTrack["error"];
  networkHistory: NonNullable<JobTrack["network"]["history"]>;
  modificationsDetail: NonNullable<JobTrack["modifications"]>;
  jobId: number;
}

interface PageEvent {
  filters: unknown;
  first: number;
  multiSortMeta: unknown[];
  originalEvent: unknown;
  page: number;
  pageCount: number;
  rows: number;
  sortField: null;
  sortOrder: null;
}

interface FilterEvent {
  filters: {
    state: { value: undefined | JobHistoryResult; matchMode: string };
    name: { value: undefined | string; matchMode: string };
  };
  first: number;
  multiSortMeta: unknown[];
  originalEvent: unknown;
  rows: number;
  sortField: null;
  sortOrder: null;
}

const mediaStore = useMediaStore();
const types = [
  ScrapeName.checkTocs,
  ScrapeName.feed,
  ScrapeName.news,
  ScrapeName.newsAdapter,
  ScrapeName.oneTimeToc,
  ScrapeName.oneTimeUser,
  ScrapeName.queueExternalUser,
  ScrapeName.queueTocs,
  ScrapeName.remapMediaParts,
  ScrapeName.searchForToc,
  ScrapeName.toc,
];
const statuses: JobHistoryResult[] = ["failed", "success", "warning"];
const data = reactive({
  jobs: [] as HistoryItem[],
  now: new Date(),
  minModifications: -1,
  loading: false,
  total: 0,
  rowsPerPage: 100,
  currentPage: 0,
  pages: [] as Date[],
  state: undefined as undefined | JobHistoryResult,
  type: undefined as undefined | ScrapeName,
  name: undefined as undefined | string,
  filters: {
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    state: { value: null, matchMode: FilterMatchMode.EQUALS },
  },
});
const expandedRows = ref([]);

const computedJobs = computed(() => {
  return data.jobs.filter((item) => item.modifications >= data.minModifications);
});

watch(
  () => [data.currentPage, data.rowsPerPage, data.name, data.state, data.type],
  () => fetch(),
  { immediate: true },
);

const toast = useToast();

function onPage(event: PageEvent) {
  data.currentPage = event.page;
}

function onFilter(event: FilterEvent) {
  data.name = event.filters.name.value;
  data.state = event.filters.state.value;
  console.log(event);
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

async function fetch() {
  if (data.loading) {
    return;
  }
  data.loading = true;
  try {
    // fetch storage jobs data
    const pagination = await HttpClient.getJobHistoryPaginated({
      limit: data.rowsPerPage,
      since: data.pages[data.currentPage]?.toISOString(),
      name: data.name,
      result: data.state,
      type: data.type,
    });
    data.total = pagination.total;

    if (pagination.next) {
      data.pages[data.currentPage + 1] = new Date(pagination.next);
    }

    data.jobs = pagination.items.map((item) => {
      let track: JobTrack | undefined;
      try {
        track = JSON.parse(item.message as string);
      } catch (error) {
        // ignore parse errors
      }
      const start = new Date(item.start);
      const end = new Date(item.end);
      return {
        name: item.name,
        state: item.result,
        start,
        end,
        duration: end.getTime() - start.getTime(),
        network: track?.network.count ?? 0,
        received: track?.network.received ?? 0,
        queries: track?.queryCount ?? 0,
        modifications: Object.values(track?.modifications ?? {}).reduce(
          (previous: number, current: Modification): number => {
            return previous + current.created + current.deleted + current.updated;
          },
          0,
        ),
        error: track?.error,
        modificationsDetail: track?.modifications ?? {},
        networkHistory: track?.network.history ?? [],
        jobId: item.id,
        key: item.id + "-" + item.end,
      };
    });
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Failed to load History",
    });
  }
  data.loading = false;
}
</script>
