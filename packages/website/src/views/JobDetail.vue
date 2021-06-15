<template>
  <div>
    <h1>Name: {{ job ? nameToString(job.name) : "Unknown" }}</h1>
    <div class="custom-control custom-switch">
      <input id="enabledSwitch" v-model="enabled" type="checkbox" class="custom-control-input" />
      <label class="custom-control-label" for="enabledSwitch">Job enabled</label>
    </div>
    <table class="table table-hover">
      <caption class="sr-only">
        Job History
      </caption>
      <thead>
        <tr>
          <th scope="col">Nr.</th>
          <th scope="col">Name</th>
          <th scope="col">Result</th>
          <th scope="col">Duration</th>
          <th scope="col">Network</th>
          <th scope="col">Received</th>
          <th scope="col">Queries</th>
          <th scope="col">Start</th>
          <th scope="col">End</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(item, index) in history" :key="item.id">
          <tr data-bs-toggle="collapse" :data-bs-target="'.collapse-' + index">
            <td>{{ index + 1 }}</td>
            <td>{{ nameToString(item.name) }}</td>
            <td>
              <span
                class="badge"
                :class="
                  item.result === 'success'
                    ? 'bg-success'
                    : item.result === 'failed'
                    ? 'bg-danger'
                    : item.result === 'warning'
                    ? 'bg-warning text-dark'
                    : 'bg-light text-dark'
                "
              >
                {{ item.result }}
              </span>
            </td>
            <td>{{ absoluteToRelative(item) }}</td>
            <td>
              {{ trackingStat(item, (value) => String(value.network.count || 0)) }}
            </td>
            <td>
              {{ trackingStat(item, (value) => String(value.network.received || 0)) }}
            </td>
            <td>
              {{ trackingStat(item, (value) => String(value.queryCount || 0)) }}
            </td>
            <td>{{ dateToString(item.start) }}</td>
            <td>{{ dateToString(item.end) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { Job, JobHistoryItem, JobTrack } from "../siteTypes";
import { formatDate, absoluteToRelative, isString } from "../init";

interface Data {
  job?: Job;
  enabled: boolean;
  history: JobHistoryItem[];
}

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

export default defineComponent({
  name: "JobDetail",
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  data(): Data {
    return {
      job: undefined,
      enabled: true,
      history: [],
    };
  },
  watch: {
    enabled() {
      const job = this.job;

      if (!job) {
        this.enabled = false;
        return;
      }

      const jobEnabled = this.job?.job_state === "enabled";

      if (this.enabled !== jobEnabled) {
        HttpClient.postJobEnabled(job.id, this.enabled)
          .then(() => {
            // commit ui change to job object
            job.job_state = this.enabled ? "enabled" : "disabled";
          })
          .catch(() => {
            // revert ui change on error
            this.enabled = jobEnabled;
          });
      }
    },
  },
  mounted() {
    HttpClient.getJobDetails(this.id).then((value) => {
      this.job = value.job;
      this.enabled = value.job?.job_state === "enabled";

      for (const history of value.history) {
        try {
          history.message = JSON.parse(history.message as string);
        } catch {
          // ignore it as it may not be json but a plain string
        }
        history.start = new Date(history.start);
        history.end = new Date(history.end);
      }
      this.history = value.history;
    });
  },
  methods: {
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
    dateToString(date?: Date | null): string {
      if (!date) {
        return "";
      }
      return formatDate(date);
    },
    absoluteToRelative(item: JobHistoryItem): string {
      if (!item.start || !item.end) {
        console.log("Wrong Item:", item);
        return "";
      }
      return absoluteToRelative(item.start, item.end);
    },
    trackingStat(item: JobHistoryItem, accessor: (track: JobTrack) => string): string {
      return isString(item.message) ? "" : accessor(item.message);
    },
  },
});
</script>
