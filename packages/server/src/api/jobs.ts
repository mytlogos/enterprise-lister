import { jobStorage } from "enterprise-core/dist/database/storages/storage";
import { Router } from "express";
import {
  GetHistoryJobs,
  GetHistoryJobsPaginated,
  getHistoryJobsPaginatedSchema,
  getHistoryJobsSchema,
  GetJobDetails,
  getJobDetailsSchema,
  GetJobStatsTimed,
  getJobStatsTimedSchema,
  PostJobEnable,
} from "../validation";
import { createHandler, castQuery } from "./apiTools";

export const getJobs = createHandler(() => {
  return jobStorage.getAllJobs();
});

export const getHistoryJobs = createHandler(
  (req) => {
    const { since: sinceString, limit } = castQuery<GetHistoryJobs>(req);
    let since = new Date(sinceString || "");

    if (Number.isNaN(since.getTime())) {
      since = new Date();
    }

    return jobStorage.getJobHistoryStream(since, limit || -1);
  },
  { query: getHistoryJobsSchema },
);

export const getHistoryJobsPaginated = createHandler(
  (req) => {
    const query = castQuery<GetHistoryJobsPaginated>(req);
    let since = new Date(query.since || "");

    if (Number.isNaN(since.getTime())) {
      since = new Date();
    }

    return jobStorage.getJobHistoryPaginated({
      since,
      limit: query.limit ?? 0,
      name: query.name,
      result: query.result,
      type: query.type,
    });
  },
  { query: getHistoryJobsPaginatedSchema },
);

export const postJobEnable = createHandler((req) => {
  const { id, enabled }: PostJobEnable = req.body;
  return jobStorage.updateJobsEnable(id, enabled);
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

export const getJobDetails = createHandler(
  (req) => {
    const { id } = castQuery<GetJobDetails>(req);
    return jobStorage.getJobDetails(id);
  },
  { query: getJobDetailsSchema },
);

export const getJobStatsTimed = createHandler(
  (req) => {
    const { bucket, groupByDomain } = castQuery<GetJobStatsTimed>(req);
    return jobStorage.getJobsStatsTimed(bucket, groupByDomain);
  },
  { query: getJobStatsTimedSchema },
);

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
   * /api/user/jobs/history:
   *    get:
   *      tags: [Job]
   *      description: Get all Job History Items
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: since
   *        in: query
   *        description: Date to get the Items from
   *        required: false
   *        schema:
   *          type: string
   *      - name: limit
   *        in: query
   *        description: Max Items to return
   *        required: false
   *        schema:
   *          type: integer
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/JobHistoryItem"
   *          description: queried job history
   */
  router.get("/history", getHistoryJobs);
  router.get("/history-paginated", getHistoryJobsPaginated);

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
