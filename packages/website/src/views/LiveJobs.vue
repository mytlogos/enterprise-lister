<template>
  <div>
    <div class="container-fluid">
      <div class="w-50">
        <div class="row">
          <span class="col-sm-3">Created: {{ data.created }}</span>
          <span class="col-sm-3">Updated: {{ data.updated }}</span>
          <span class="col-sm-3">Deleted: {{ data.deleted }}</span>
        </div>
        <div class="row">
          <span class="col-sm-3">Database Queries: {{ data.databaseQueries }}</span>
          <span class="col-sm-3">Network Queries: {{ data.networkQueries }}</span>
        </div>
        <div class="row">
          <span class="col-sm-3">Success: {{ data.succeeded }}</span>
          <span class="col-sm-3">Failure: {{ data.failed }}</span>
          <span class="col-sm-3">Other: {{ data.other }}</span>
        </div>
        <div class="row">
          <span class="col-sm-3">
            JobQueue:
            <span title="Active Jobs">{{ data.jobQueueCurrent }}</span>
            /
            <span title="Queued Jobs">{{ data.jobQueueQueued }}</span>
            /
            <span title="Maximum Size">{{ data.jobQueueMax }}</span>
          </span>
        </div>
      </div>
      <div class="row">
        <div class="col-sm-4">
          RequestQueues:
          <ul class="list-group live">
            <li
              v-for="item in data.requestQueues"
              :key="item.queueName"
              class="list-group-item row"
              :class="{ 'bg-light': !item.working }"
              :title="item.working ? 'Queue is active' : 'Queue is not active'"
            >
              <span class="col-sm-4 d-inline-block" title="Queue Name"> {{ item.queueName }}</span>
              <span class="col-sm-4 d-inline-block" title="Maximum Interval">{{ item.maxInterval }}</span>
              <span class="col-sm-4 d-inline-block" title="Queued">{{ item.queued }}</span>
            </li>
          </ul>
        </div>
        <div class="col-sm-6">
          JobQueue:
          <ul class="list-group live">
            <li v-for="item in data.activeJobs" :key="item.id" class="list-group-item row">
              <span class="col-sm-3"> {{ formatDate(item.start) }}</span>
              <span class="col-sm-3">{{ item.name }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      id="offcanvasBottom"
      class="offcanvas offcanvas-bottom h-auto bg-warning"
      tabindex="-1"
      data-bs-backdrop="false"
      data-bs-keyboard="false"
      data-bs-scroll="true"
    >
      <div class="offcanvas-body d-flex justify-content-center p-2">
        <span class="my-auto mx-2">Lost Connection to Server</span>
        <button class="btn btn-primary btn-sm" type="button" @click="reconnect">Reconnect</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ChannelMessage, RequestQueueChannelMessage } from "enterprise-scraper/dist/externals/types";
import { onMounted, reactive } from "vue";
import { formatDate } from "../init";
import websocket, { findByType } from "../websocket";
import OffCanvas from "bootstrap/js/dist/offcanvas";
import { onBeforeRouteLeave } from "vue-router";

interface ActiveJob {
  name: string;
  id: number;
  start: Date;
}

const data = reactive({
  activeJobs: [] as ActiveJob[],
  created: 0,
  updated: 0,
  deleted: 0,
  databaseQueries: 0,
  networkQueries: 0,
  succeeded: 0,
  failed: 0,
  other: 0,
  jobQueueMax: 0,
  jobQueueCurrent: 0,
  jobQueueQueued: 0,
  requestQueues: [] as RequestQueueChannelMessage[],
  offcanvas: null as null | OffCanvas,
  websocketsChannel: {
    jobs: false,
    jobqueue: false,
    requestqueue: false,
  },
});

addJobListener();
addJobQueueListener();
addRequestQueueListener();

// LIFECYCLE EVENTS
onBeforeRouteLeave(() => {
  websocket.removeEventListener("connected", connectedListener);
  websocket.removeEventListener("disconnected", disconnectedListener);
  websocket.removeEventListener("jobs", jobListener);
  websocket.removeEventListener("jobqueue", jobQueueListener);
  websocket.removeEventListener("requestqueue", requestQueueListener);
  data.offcanvas?.dispose();
});

onMounted(() => {
  data.offcanvas = new OffCanvas("#offcanvasBottom");
  websocket.addEventListener("connected", connectedListener);
  websocket.addEventListener("disconnected", disconnectedListener);

  if (!websocket.isConnected) {
    data.offcanvas.show(document.body);
  }
});

function reconnect() {
  // clear active jobs
  data.activeJobs.length = 0;
  websocket.connect();
}

function listenToJobs() {
  if (!data.websocketsChannel.jobs) {
    data.websocketsChannel.jobs = true;
    websocket.send("START_JOBS");
  }
}

function listenToJobqueue() {
  if (!data.websocketsChannel.jobqueue) {
    data.websocketsChannel.jobqueue = true;
    websocket.send("START_JOBQUEUE");
  }
}

function listenToRequestQueue() {
  if (!data.websocketsChannel.requestqueue) {
    data.websocketsChannel.requestqueue = true;
    websocket.send("START_REQUESTQUEUE");
  }
}

function connectedListener() {
  data.offcanvas?.hide();
  listenToRequestQueue();
  listenToJobqueue();
  listenToJobs();
}

function disconnectedListener() {
  data.websocketsChannel.jobs = false;
  data.websocketsChannel.jobqueue = false;
  data.websocketsChannel.requestqueue = false;
  data.offcanvas?.show(document.body);
}

function jobListener(msg: findByType<ChannelMessage, "jobs">): void {
  if (msg.type === "started") {
    data.activeJobs.unshift({ name: msg.jobName, id: msg.jobId, start: new Date(msg.timestamp) });
  } else if (msg.type === "finished") {
    const index = data.activeJobs.findIndex((value) => value.id === msg.jobId);

    if (index >= 0) {
      data.activeJobs.splice(index, 1);
    }
    if (msg.result === "success") {
      data.succeeded++;
    } else if (msg.result === "failed") {
      data.failed++;
    } else {
      data.other++;
    }
    Object.values(msg.jobTrack.modifications).forEach((modification) => {
      data.created += modification.created;
      data.updated += modification.updated;
      data.deleted += modification.deleted;
    });
    data.networkQueries += msg.jobTrack.network.count;
    data.databaseQueries += msg.jobTrack.queryCount;
  }
}

function addJobListener() {
  try {
    websocket.addEventListener("jobs", jobListener);
    listenToJobs();
  } catch (error) {
    console.error(error);
  }
}

function jobQueueListener(msg: findByType<ChannelMessage, "jobqueue">) {
  data.jobQueueCurrent = msg.active;
  data.jobQueueQueued = msg.queued;
  data.jobQueueMax = msg.max;
}

function addJobQueueListener() {
  try {
    websocket.addEventListener("jobqueue", jobQueueListener);
    listenToJobqueue();
  } catch (error) {
    console.error(error);
  }
}

function requestQueueListener(msg: findByType<ChannelMessage, "requestqueue">) {
  // if it is working it does not show the current item as queued.
  // to make it less confusing, display the current item as queued
  if (msg.working) {
    msg.queued++;
  }
  const index = data.requestQueues.findIndex(
    (value) => value.queueName === msg.queueName && value.maxInterval === msg.maxInterval,
  );
  if (index >= 0) {
    data.requestQueues[index] = msg;
  } else {
    data.requestQueues.push(msg);
  }
}

function addRequestQueueListener() {
  try {
    websocket.addEventListener("requestqueue", requestQueueListener);
    listenToRequestQueue();
  } catch (error) {
    console.error(error);
  }
}
</script>
<style scoped>
@media (max-width: 576px) {
  li.row {
    margin: 0;
  }
}
@media (min-width: 576px) {
  .live {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }
}
</style>
