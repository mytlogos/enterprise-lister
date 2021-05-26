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
 *
 * @openapi
 * tags:
 *  name: Job
 *  description: API for Jobs
 */
export function jobsRouter(): Router {
  const router = Router();

  const jobRoute = router.route("");

  /**
   * @openapi
   * /api/user/jobs:
   *    get:
   *      tags: [Job]
   *      description: Get all Jobs
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/JobItem"
   *          description: the user
   */
  jobRoute.get(getJobs);

  /**
   * @openapi
   * /api/user/jobs/enable:
   *    put:
   *      tags: [Job]
   *      description: Enable or disable a single Job
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                jobId:
   *                  $ref: "#/components/schemas/Id"
   *                enabled:
   *                  type: boolean
   *        required: true
   *      responses:
   *        200:
   *          description: no body
   */
  router.post("/enable", postJobEnable);

  const statsRouter = Router();

  /**
   * @openapi
   * /api/user/jobs/stats/all:
   *    get:
   *      tags: [Job]
   *      description: Get Job stats over current history
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/AllJobStats"
   *          description: Job Stats over whole current history.
   */
  statsRouter.get("/all", getJobsStats);

  /**
   * @openapi
   * /api/user/jobs/stats/grouped:
   *    get:
   *      tags: [Job]
   *      description: Get Job Stats of from each Job over whole current history.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/JobStats"
   *          description: Array of JobStats
   */
  statsRouter.get("/grouped", getJobsStatsGrouped);

  /**
   * @openapi
   * /api/user/jobs/stats/detail:
   *    get:
   *      tags: [Job]
   *      description: get current user
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: id
   *        in: query
   *        description: Job Id
   *        required: true
   *        schema:
   *          $ref: "#/components/schemas/Id"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/JobDetails"
   *          description: the user
   */
  statsRouter.get("/detail", getJobDetails);

  /**
   * @openapi
   * /api/user/jobs/stats/timed:
   *    get:
   *      tags: [Job]
   *      description: Get Job Stats per Time Bucket.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: bucket
   *        in: query
   *        description: Time Bucket - day, hour or minute
   *        required: true
   *        schema:
   *          type: string
   *      - name: groupByDomain
   *        in: query
   *        description: Group results by scraper domain if true
   *        required: false
   *        schema:
   *          type: boolean
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/TimeJobStats"
   *          description: the user
   */
  statsRouter.get("/timed", getJobStatsTimed);

  /**
   * @openapi
   * /api/user/jobs/stats/summary:
   *    get:
   *      tags: [Job]
   *      description: Get living Job stats.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/JobStatSummary"
   *          description: Job Stats of each Job
   */
  statsRouter.get("/summary", getJobsStatsSummary);

  router.use("/stats", statsRouter);
  return router;
}
