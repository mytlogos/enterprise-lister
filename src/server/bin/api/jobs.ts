import { jobStorage } from "bin/database/storages/storage";
import { isInvalidId, Errors } from "bin/tools";
import { TimeBucket } from "bin/types";
import { Handler, Router } from "express";
import { sendResult, extractQueryParam } from "./apiTools";

export const getJobs: Handler = (_req, res) => {
  sendResult(res, jobStorage.getAllJobs());
};

export const postJobEnable: Handler = (req, res) => {
  const jobId = req.body.id;
  const enabled = req.body.enabled;

  if (isInvalidId(jobId)) {
    sendResult(res, Promise.reject(Errors.INVALID_DATA));
    return;
  }
  sendResult(res, jobStorage.updateJobsEnable(jobId, enabled));
};

export const getJobsStats: Handler = (_req, res) => {
  sendResult(res, jobStorage.getJobsStats());
};

export const getJobsStatsSummary: Handler = (_req, res) => {
  sendResult(res, jobStorage.getJobsStatsSummary());
};

export const getJobsStatsGrouped: Handler = (_req, res) => {
  sendResult(res, jobStorage.getJobsStatsGrouped());
};

export const getJobDetails: Handler = (req, res) => {
  const id = Number.parseInt(extractQueryParam(req, "id"));

  if (isInvalidId(id)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(res, jobStorage.getJobDetails(id));
};

export const getJobStatsTimed: Handler = (req, res) => {
  const bucket = extractQueryParam(req, "bucket");
  const groupByDomain = (extractQueryParam(req, "groupByDomain") || "").toLowerCase() === "true";

  if (!["day", "hour", "minute"].includes(bucket)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, jobStorage.getJobsStatsTimed(bucket as TimeBucket, groupByDomain));
};

/**
 * Creates the Jobs API Router.
 */
export function jobsRouter(): Router {
  const router = Router();

  const jobRoute = router.route("");
  jobRoute.get(getJobs);
  router.post("/enable", postJobEnable);

  const statsRouter = Router();
  statsRouter.get("/all", getJobsStats);
  statsRouter.get("/grouped", getJobsStatsGrouped);
  statsRouter.get("/detail", getJobDetails);
  statsRouter.get("/timed", getJobStatsTimed);
  statsRouter.get("/summary", getJobsStatsSummary);

  router.use("/stats", statsRouter);
  return router;
}
