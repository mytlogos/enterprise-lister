<template>
  <div class="container-fluid">
    <div class="row w-50">
      <span class="col-3">Created: {{ created }}</span>
      <span class="col-3">Updated: {{ updated }}</span>
      <span class="col-3">Deleted: {{ deleted }}</span>
    </div>
    <div class="row w-50">
      <span class="col-3">Database Queries: {{ databaseQueries }}</span>
      <span class="col-3">Network Queries: {{ networkQueries }}</span>
    </div>
    <div class="row w-50">
      <span class="col-3">Success: {{ succeeded }}</span>
      <span class="col-3">Failure: {{ failed }}</span>
      <span class="col-3">Other: {{ other }}</span>
    </div>
    <div class="row w-50">
      <span class="col-3">
        JobQueue:
        <span title="Active Jobs">{{ jobQueueCurrent }}</span>
        /
        <span title="Queued Jobs">{{ jobQueueQueued }}</span>
        /
        <span title="Maximum Size">{{ jobQueueMax }}</span>
      </span>
    </div>
    <div class="row">
      <div class="col-4">
        RequestQueues:
        <ul class="list-group">
          <li
            v-for="item in requestQueues"
            :key="item.queueName"
            class="list-group-item"
            :class="{ 'bg-light': !item.working }"
            :title="item.working ? 'Queue is active' : 'Queue is not active'"
          >
            <span class="col-4 d-inline-block" title="Queue Name"> {{ item.queueName }}</span>
            <span class="col-4 d-inline-block" title="Maximum Interval">{{ item.maxInterval }}</span>
            <span class="col-4 d-inline-block" title="Queued">{{ item.queued }}</span>
          </li>
        </ul>
      </div>
      <div class="col-6">
        JobQueue:
        <ul class="list-group">
          <li v-for="item in activeJobs" :key="item.id" class="list-group-item row">
            <span class="col-3"> {{ dateToString(item.start) }}</span>
            <span class="col-3">{{ item.name }}</span>
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
</template>
<script lang="ts">
import { RequestQueueChannelMessage } from "enterprise-scraper/dist/externals/types";
import { defineComponent } from "vue";
import { formatDate } from "../init";
import websocket, { WSEventListener } from "../websocket";
import OffCanvas from "bootstrap/js/dist/offcanvas";

interface ActiveJob {
  name: string;
  id: number;
  start: Date;
}

export default defineComponent({
  name: "LiveJobs",
  beforeRouteLeave() {
    if (this.jobListener) {
      websocket.removeEventListener("jobs", this.jobListener);
    }
    if (this.jobQueueListener) {
      websocket.removeEventListener("jobqueue", this.jobQueueListener);
    }
    if (this.requestQueueListener) {
      websocket.removeEventListener("requestqueue", this.requestQueueListener);
    }
    this.offcanvas?.dispose();
  },
  data() {
    return {
      activeJobs: [] as ActiveJob[],
      jobListener: null as null | WSEventListener<"jobs">,
      jobQueueListener: null as null | WSEventListener<"jobqueue">,
      requestQueueListener: null as null | WSEventListener<"requestqueue">,
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
    };
  },
  created() {
    this.addJobListener();
    this.addJobQueueListener();
    this.addRequestQueueListener();
  },
  mounted() {
    this.offcanvas = new OffCanvas("#offcanvasBottom");
    websocket.addEventListener("connected", () => {
      this.offcanvas?.hide();
      this.listenToRequestQueue();
      this.listenToJobqueue();
      this.listenToJobs();
    });
    websocket.addEventListener("disconnected", () => {
      this.websocketsChannel.jobs = false;
      this.websocketsChannel.jobqueue = false;
      this.websocketsChannel.requestqueue = false;
      this.offcanvas?.show(document.body);
    });

    if (!websocket.isConnected) {
      this.offcanvas.show(document.body);
    }
  },
  methods: {
    reconnect() {
      // clear active jobs
      this.activeJobs.length = 0;
      websocket.connect();
    },

    /**
     * Format a given Date to a german locale string.
     */
    dateToString(date: Date): string {
      return formatDate(date);
    },

    listenToJobs() {
      if (!this.websocketsChannel.jobs) {
        this.websocketsChannel.jobs = true;
        websocket.send("START_JOBS");
      }
    },

    listenToJobqueue() {
      if (!this.websocketsChannel.jobqueue) {
        this.websocketsChannel.jobqueue = true;
        websocket.send("START_JOBQUEUE");
      }
    },

    listenToRequestQueue() {
      if (!this.websocketsChannel.requestqueue) {
        this.websocketsChannel.requestqueue = true;
        websocket.send("START_REQUESTQUEUE");
      }
    },

    addJobListener() {
      this.jobListener = (msg) => {
        if (msg.type === "started") {
          this.activeJobs.unshift({ name: msg.jobName, id: msg.jobId, start: new Date(msg.timestamp) });
        } else if (msg.type === "finished") {
          const index = this.activeJobs.findIndex((value) => value.id === msg.jobId);

          if (index >= 0) {
            this.activeJobs.splice(index, 1);
          }
          if (msg.result === "success") {
            this.succeeded++;
          } else if (msg.result === "failed") {
            this.failed++;
          } else {
            this.other++;
          }
          Object.values(msg.jobTrack.modifications).forEach((modification) => {
            this.created += modification.created;
            this.updated += modification.updated;
            this.deleted += modification.deleted;
          });
          this.networkQueries += msg.jobTrack.network.count;
          this.databaseQueries += msg.jobTrack.queryCount;
        }
      };
      try {
        websocket.addEventListener("jobs", this.jobListener);
        this.listenToJobs();
      } catch (error) {
        console.error(error);
      }
    },

    addJobQueueListener() {
      this.jobQueueListener = (msg) => {
        this.jobQueueCurrent = msg.active;
        this.jobQueueQueued = msg.queued;
        this.jobQueueMax = msg.max;
      };
      try {
        websocket.addEventListener("jobqueue", this.jobQueueListener);
        this.listenToJobqueue();
      } catch (error) {
        console.error(error);
      }
    },
    addRequestQueueListener() {
      this.requestQueueListener = (msg) => {
        const index = this.requestQueues.findIndex(
          (value) => value.queueName === msg.queueName && value.maxInterval === msg.maxInterval,
        );
        if (index >= 0) {
          this.requestQueues[index] = msg;
        } else {
          this.requestQueues.push(msg);
        }
      };
      try {
        websocket.addEventListener("requestqueue", this.requestQueueListener);
        this.listenToRequestQueue();
      } catch (error) {
        console.error(error);
      }
    },
  },
});
</script>
