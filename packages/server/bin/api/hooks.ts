import { hookStorage } from "enterprise-core/dist/database/storages/storage";
import { load } from "enterprise-scraper/dist/externals/hookManager";
import { isInvalidId, Errors } from "enterprise-core/dist/tools";
import { ScraperHook } from "enterprise-core/dist/types";
import { Router } from "express";
import { createHandler } from "./apiTools";

export const getAllHooks = createHandler(() => {
  return load(true).then(() => hookStorage.getAllStream());
});

export const putHook = createHandler((req) => {
  const { hook }: { hook: ScraperHook } = req.body;

  if (!hook || isInvalidId(hook.id)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return hookStorage.updateScraperHook(hook);
});

/**
 * Creates the Hook API Router.
 *
 * @openapi
 * tags:
 *  name: Hook
 *  description: API for Scraper Hooks
 */
export function hooksRouter(): Router {
  const router = Router();

  const hookRoute = router.route("");

  /**
   * @openapi
   * /api/user/hook:
   *    get:
   *      tags: [Hook]
   *      description: Get all available Hooks
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/ScraperHook"
   *          description: true of refresh job successfully requested
   */
  hookRoute.get(getAllHooks);

  /**
   * @openapi
   * /api/user/hook:
   *    post:
   *      tags: [Hook]
   *      description: Update ScraperHook
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
   *                hook:
   *                  $ref: "#/components/schemas/ScraperHook"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  hookRoute.put(putHook);

  return router;
}
