import { episodeStorage, storage } from "enterprise-core/dist/database/storages/storage";
import { Errors } from "enterprise-core/dist/tools";
import { Router } from "express";
import { createHandler } from "./apiTools";

export const processReadEpisode = createHandler((req) => {
  const { uuid, result } = req.body;
  if (!result) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.markEpisodeRead(uuid, result);
});

export const processProgress = createHandler((req) => {
  const { uuid, progress } = req.body;
  if (!progress) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.setProgress(uuid, progress);
});

export const processResult = createHandler((req) => {
  if (!req.body) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return storage.processResult(req.body);
});

/**
 * @openapi
 * tags:
 *  name: Process
 *  description: API for Process
 */
export function processRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/process/result:
   *    post:
   *      tags: [Process]
   *      description: Process a Result, TODO
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  router.post("/result", processResult);

  /**
   * @openapi
   * /api/user/process/read:
   *    post:
   *      tags: [Process]
   *      description: Process Result.
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
   *                result:
   *                  $ref: "#/components/schemas/Result"
   *        required: true
   *      responses:
   *        200:
   *          description: no body
   */
  router.post("/read", processReadEpisode);

  /**
   * @openapi
   * /api/user/process/progress:
   *    post:
   *      tags: [Process]
   *      description: Process Progress Result.
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
   *                progress:
   *                  $ref: "#/components/schemas/ProgressResult"
   *        required: true
   *      responses:
   *        200:
   *          description: no body
   */
  router.post("/progress", processProgress);
  return router;
}
