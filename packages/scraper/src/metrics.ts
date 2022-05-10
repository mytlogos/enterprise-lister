import { Counter, Gauge } from "prom-client";
import { channel } from "diagnostics_channel";
import { EndJobChannelMessage, JobQueueChannelMessage } from "./externals/types";

const jobMaxCount = new Gauge({
  name: "scraper_job_count_max",
  help: "Maximum number of jobs",
});

const jobQueueCount = new Gauge({
  name: "scraper_job_count_queue",
  help: "Number of queued jobs",
});

const jobActiveCount = new Gauge({
  name: "scraper_job_count_active",
  help: "Number of active jobs",
});

const jobResultCount = new Counter({
  name: "scraper_job_result_count",
  help: "Count of finished jobs",
  labelNames: ["result", "jobType"],
});

const jobModificationsCount = new Counter({
  name: "scraper_job_modification_count",
  help: "Count of modified database entities",
  labelNames: ["type", "entity", "jobType"],
});

const jobDBQueryCount = new Counter({
  name: "scraper_job_db_queries_count",
  help: "Number of database queries",
  labelNames: ["jobType"],
});

const jobNetworkQueryCount = new Counter({
  name: "scraper_job_network_query_count",
  help: "Number of network queries",
  labelNames: ["jobType"],
});

const jobNetworkSendCount = new Counter({
  name: "scraper_job_bytes_send_count",
  help: "Network bytes send",
  labelNames: ["jobType"],
});

const jobNetworkReceivedCount = new Counter({
  name: "scraper_job_bytes_received_count",
  help: "Network bytes received",
  labelNames: ["jobType"],
});

channel("enterprise-jobqueue").subscribe((message) => {
  if (message && typeof message !== "object") {
    return;
  }
  // @ts-expect-error
  if ("messageType" in message && message.messageType === "jobqueue") {
    const item = message as any as JobQueueChannelMessage;

    jobMaxCount.set(item.max);
    jobQueueCount.set(item.queued);
    jobActiveCount.set(item.active);
  }
});

channel("enterprise-jobs").subscribe((message) => {
  if (message && typeof message !== "object") {
    return;
  }
  // @ts-expect-error
  if ("messageType" in message && message.messageType === "jobs" && message.type === "finished") {
    const item = message as any as EndJobChannelMessage;

    jobResultCount.inc({ result: item.result, jobType: item.jobType }, 1);

    for (const [key, value] of Object.entries(item.jobTrack.modifications)) {
      jobModificationsCount.inc({ type: "delete", entity: key, jobType: item.jobType }, value.deleted);
      jobModificationsCount.inc({ type: "update", entity: key, jobType: item.jobType }, value.updated);
      jobModificationsCount.inc({ type: "insert", entity: key, jobType: item.jobType }, value.created);
    }

    jobDBQueryCount.inc({ jobType: item.jobType }, item.jobTrack.queryCount);
    jobNetworkQueryCount.inc({ jobType: item.jobType }, item.jobTrack.network.count);
    jobNetworkSendCount.inc({ jobType: item.jobType }, item.jobTrack.network.sent);
    jobNetworkReceivedCount.inc({ jobType: item.jobType }, item.jobTrack.network.received);
  }
});
