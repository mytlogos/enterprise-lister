import { Counter, Gauge, Histogram, exponentialBuckets } from "prom-client";
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
  labelNames: ["result", "jobType", "hook"],
});

const jobModificationsCount = new Counter({
  name: "scraper_job_modification_count",
  help: "Count of modified database entities",
  labelNames: ["type", "entity", "jobType", "hook"],
});

const jobDBQueryCount = new Counter({
  name: "scraper_job_db_queries_count",
  help: "Number of database queries",
  labelNames: ["jobType", "hook"],
});

const jobNetworkQueryCount = new Counter({
  name: "scraper_job_network_query_count",
  help: "Number of network queries",
  labelNames: ["jobType", "hook"],
});

const jobNetworkSendCount = new Counter({
  name: "scraper_job_bytes_send_count",
  help: "Network bytes send",
  labelNames: ["jobType", "hook"],
});

const jobNetworkReceivedCount = new Counter({
  name: "scraper_job_bytes_received_count",
  help: "Network bytes received",
  labelNames: ["jobType", "hook"],
});

const jobNetworkRetryCount = new Counter({
  name: "scraper_job_request_retry_count",
  help: "Number of request retries",
  labelNames: ["jobType", "hook"],
});

const jobNetworkCloudflareCount = new Counter({
  name: "scraper_job_cloudflare_count",
  help: "Count Clouflare encountered",
  labelNames: ["jobType", "hook"],
});

const jobNetworkCloudflareSolvedCount = new Counter({
  name: "scraper_job_cloudflare_solved_count",
  help: "Count Clouflare challenges solved",
  labelNames: ["jobType", "hook"],
});

const jobNetworkPuppeteerCount = new Counter({
  name: "scraper_job_puppeteer_used_count",
  help: "Count Puppeteer used",
  labelNames: ["jobType", "hook"],
});

const jobDuration = new Histogram({
  name: "scraper_job_duration_seconds",
  help: "Duration of the job in seconds from to start to end",
  buckets: exponentialBuckets(1, 2, 10),
  labelNames: ["jobType", "hook"],
});

subscribe("enterprise-jobqueue", (message) => {
  jobMaxCount.set(message.max);
  jobQueueCount.set(message.queued);
  jobActiveCount.set(message.active);
});

subscribe("enterprise-jobs", (message) => {
  if (message.type === "finished") {
    // TODO: currently silently ignore multiple used hooks, only a single one should be used anyway
    const hook = message.jobTrack.network.hooksUsed[0];

    jobResultCount.inc({ result: message.result, jobType: message.jobType, hook }, 1);

    for (const [key, value] of Object.entries(message.jobTrack.modifications)) {
      jobModificationsCount.inc({ type: "delete", entity: key, jobType: message.jobType, hook }, value.deleted);
      jobModificationsCount.inc({ type: "update", entity: key, jobType: message.jobType, hook }, value.updated);
      jobModificationsCount.inc({ type: "insert", entity: key, jobType: message.jobType, hook }, value.created);
    }

    // if no hook was used, let it be undefined
    const label = { jobType: message.jobType, hook };

    // convert milliseconds to seconds
    jobDuration.observe(label, message.duration / 1000);
    jobNetworkRetryCount.inc(label, message.jobTrack.network.retryCount);
    jobNetworkCloudflareCount.inc(label, message.jobTrack.network.cloudflareCount);
    jobNetworkCloudflareSolvedCount.inc(label, message.jobTrack.network.cloudflareSolved);
    jobNetworkPuppeteerCount.inc(label, message.jobTrack.network.puppeteerCount);
    jobDBQueryCount.inc(label, message.jobTrack.queryCount);
    jobNetworkQueryCount.inc(label, message.jobTrack.network.count);
    jobNetworkSendCount.inc(label, message.jobTrack.network.sent);
    jobNetworkReceivedCount.inc(label, message.jobTrack.network.received);
  }
});
