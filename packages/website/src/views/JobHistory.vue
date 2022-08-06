<template>
  <div>
    <toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <label for="modifications" style="margin-left: 5em">Min. Modifications</label>
          <input-number
            id="modifications"
            v-model="minModifications"
            show-buttons
            button-layout="horizontal"
            decrement-button-class="p-button-danger"
            increment-button-class="p-button-success"
            increment-button-icon="pi pi-plus"
            decrement-button-icon="pi pi-minus"
            :min="0"
          />
        </span>
      </template>
    </toolbar>

    <DataTable
      class="p-datatable-sm"
      :value="computedJobs"
      :loading="loading"
      striped-rows
      :paginator="true"
      :rows="100"
      :auto-layout="true"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rows-per-page-options="[100, 200, 500]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      paginator-position="both"
    >
      <template #empty>
        <div class="text-center my-5">No records found.</div>
      </template>
      <Column field="name" header="Name">
        <template #body="slotProps">
          {{ nameToString(slotProps.data.name) }}
        </template>
      </Column>
      <Column field="date" header="Status">
        <template #body="slotProps">
          <tag :value="slotProps.data.state" :severity="jobStateResult(slotProps.data)" />
        </template>
      </Column>
      <Column field="start" header="Start">
        <template #body="slotProps">
          {{ dateToString(slotProps.data.start) }}
        </template>
      </Column>
      <Column field="end" header="End">
        <template #body="slotProps">
          {{ dateToString(slotProps.data.end) }}
        </template>
      </Column>
      <Column field="duration" header="Duration">
        <template #body="slotProps">
          {{ round(slotProps.data.duration) }}
        </template>
      </Column>
      <Column field="network" header="Network">
        <template #body="slotProps">
          {{ round(slotProps.data.network) }}
        </template>
      </Column>
      <Column field="received" header="Received">
        <template #body="slotProps">
          {{ round(slotProps.data.received) }}
        </template>
      </Column>
      <Column field="queries" header="Queries">
        <template #body="slotProps">
          {{ round(slotProps.data.queries) }}
        </template>
      </Column>
      <Column field="modifications" header="Modifications">
        <template #body="slotProps">
          {{ round(slotProps.data.modifications) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { formatDate, round } from "../init";
import { HttpClient } from "../Httpclient";
import { JobTrack, Modification } from "../siteTypes";

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
}

export default defineComponent({
  name: "JobHistory",
  data() {
    return {
      jobs: [] as HistoryItem[],
      now: new Date(),
      minModifications: -1,
      loading: false,
    };
  },
  computed: {
    computedJobs(): HistoryItem[] {
      return this.jobs.filter((item) => item.modifications >= this.minModifications);
    },
  },
  mounted() {
    this.fetch();
  },
  methods: {
    jobStateResult(historyItem: HistoryItem) {
      switch (historyItem.state) {
        case "success":
          return "success";
        case "failed":
          return "danger";
        case "warning":
          return "warning";
        default:
          return "info";
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
      return `Toc: ${medium ? (medium.title as string) : "Deleted Medium"} of ${domainName?.[2] || ""}`;
    },
    round(value: number): number {
      return round(value, 2);
    },
    async fetch() {
      if (this.loading) {
        return;
      }
      this.loading = true;
      try {
        // fetch storage jobs data
        const history = await HttpClient.getJobHistory(undefined, 100);
        this.jobs = history.map((item) => {
          let track: JobTrack | undefined;
          try {
            track = JSON.parse(item.message);
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
            network: track?.network.count || 0,
            received: track?.network.received || 0,
            queries: track?.queryCount || 0,
            modifications: Object.values(track?.modifications || {}).reduce(
              (previous: number, current: Modification): number => {
                return previous + current.created + current.deleted + current.updated;
              },
              0,
            ),
          };
        });
      } catch (error) {
        this.$toast.add({
          severity: "error",
          summary: "Failed to load History",
        });
      }
      this.loading = false;
    },
  },
});
</script>
