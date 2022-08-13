<template>
  <div>
    <h1>Name: {{ data.job ? nameToString(data.job.name) : "Unknown" }}</h1>
    <div class="form-check form-switch">
      <input id="enabledSwitch" v-model="enabled" type="checkbox" class="form-check-input" />
      <label class="form-check-label" for="enabledSwitch">Job enabled</label>
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
        <template v-for="(item, index) in data.history" :key="item.id">
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
            <td>{{ itemToRelativeTime(item) }}</td>
            <td>
              {{ trackingStat(item, (value) => String(value.network.count || 0)) }}
            </td>
            <td>
              {{ trackingStat(item, (value) => String(value.network.received || 0)) }}
            </td>
            <td>
              {{ trackingStat(item, (value) => String(value.queryCount || 0)) }}
            </td>
            <td>{{ formatDate(item.start) }}</td>
            <td>{{ formatDate(item.end) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { reactive, ref, watchEffect } from "vue";
import { Job, JobHistoryItem, JobTrack } from "../siteTypes";
import { formatDate, absoluteToRelative, isString } from "../init";
import { useMediaStore } from "../store/media";

interface Data {
  job?: Job;
  history: JobHistoryItem[];
}

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

const mediaStore = useMediaStore();
const props = defineProps<{ id: number }>();
const data = reactive<Data>({
  job: undefined,
  history: [],
});
const enabled = ref(true);

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
HttpClient.getJobDetails(props.id).then((value) => {
  data.job = value.job;
  enabled.value = value.job?.job_state === "enabled";

  for (const history of value.history) {
    try {
      history.message = JSON.parse(history.message as string);
    } catch {
      // ignore it as it may not be json but a plain string
    }
    history.start = new Date(history.start);
    history.end = new Date(history.end);
  }
  data.history = value.history;
});

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

function itemToRelativeTime(item: JobHistoryItem): string {
  if (!item.start || !item.end) {
    console.log("Wrong Item:", item);
    return "";
  }
  return absoluteToRelative(item.start, item.end);
}

function trackingStat(item: JobHistoryItem, accessor: (track: JobTrack) => string): string {
  return isString(item.message) ? "" : accessor(item.message);
}
</script>
