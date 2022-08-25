import { Counter, Gauge } from "prom-client";
import { subscribe } from "diagnostics_channel";

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

subscribe("enterprise-jobqueue", (message) => {
  jobMaxCount.set(message.max);
  jobQueueCount.set(message.queued);
  jobActiveCount.set(message.active);
});

subscribe("enterprise-jobs", (message) => {
  if (message.type === "finished") {
    jobResultCount.inc({ result: message.result, jobType: message.jobType }, 1);

    for (const [key, value] of Object.entries(message.jobTrack.modifications)) {
      jobModificationsCount.inc({ type: "delete", entity: key, jobType: message.jobType }, value.deleted);
      jobModificationsCount.inc({ type: "update", entity: key, jobType: message.jobType }, value.updated);
      jobModificationsCount.inc({ type: "insert", entity: key, jobType: message.jobType }, value.created);
    }

    const label = { jobType: message.jobType };

    jobDBQueryCount.inc(label, message.jobTrack.queryCount);
    jobNetworkQueryCount.inc(label, message.jobTrack.network.count);
    jobNetworkSendCount.inc(label, message.jobTrack.network.sent);
    jobNetworkReceivedCount.inc(label, message.jobTrack.network.received);
  }
});
