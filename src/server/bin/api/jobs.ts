import { jobStorage } from "../database/storages/storage";
import { isInvalidId, Errors } from "../tools";
import { TimeBucket } from "../types";
import { Router } from "express";
import { extractQueryParam, createHandler } from "./apiTools";

export const getJobs = createHandler(() => {
  return jobStorage.getAllJobs();
});

export const postJobEnable = createHandler((req) => {
  const jobId = req.body.id;
  const enabled = req.body.enabled;

  if (isInvalidId(jobId)) {
    return Promise.reject(Errors.INVALID_DATA);
  }
  return jobStorage.updateJobsEnable(jobId, enabled);
});

export const getJobsStats = createHandler(() => {
  return jobStorage.getJobsStats();
});

export const getJobsStatsSummary = createHandler(() => {
  return jobStorage.getJobsStatsSummary();
});

export const getJobsStatsGrouped = createHandler(() => {
  return jobStorage.getJobsStatsGrouped();
});

export const getJobDetails = createHandler((req) => {
  const id = Number.parseInt(extractQueryParam(req, "id"));

  if (isInvalidId(id)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return jobStorage.getJobDetails(id);
});

export const getJobStatsTimed = createHandler((req) => {
  const bucket = extractQueryParam(req, "bucket");
  const groupByDomain = (extractQueryParam(req, "groupByDomain") || "").toLowerCase() === "true";

  if (!["day", "hour", "minute"].includes(bucket)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return jobStorage.getJobsStatsTimed(bucket as TimeBucket, groupByDomain);
});

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
