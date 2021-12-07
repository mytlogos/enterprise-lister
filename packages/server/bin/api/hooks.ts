import { customHookStorage, hookStorage } from "enterprise-core/dist/database/storages/storage";
import { load } from "enterprise-scraper/dist/externals/hookManager";
import { isInvalidId, Errors } from "enterprise-core/dist/tools";
import { runAsync } from "enterprise-core/dist/asyncStorage";
import { ScraperHook, CustomHook } from "enterprise-core/dist/types";
import { HookConfig } from "enterprise-scraper/dist/externals/custom/types";
import { createHook } from "enterprise-scraper/dist/externals/custom/customScraper";
import { Router } from "express";
import { createHandler } from "./apiTools";
import { HookTest } from "@/types";
import { CustomHookError } from "enterprise-scraper/dist/externals/custom/errors";
import { RestResponseError } from "../errors";

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

const testHook = createHandler(async (req) => {
  const { config, key, param }: HookTest = req.body;
  const allowed: Array<keyof HookConfig> = ["download", "news", "search", "toc"];

  if (!allowed.includes(key)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  const hook = createHook(config);

  const store = new Map();

  return runAsync(0, store, async () => {
    let resultPromise;
    if (key === "download" && hook.contentDownloadAdapter) {
      resultPromise = hook.contentDownloadAdapter(param);
    } else if (key === "news" && hook.newsAdapter) {
      resultPromise = hook.newsAdapter();
    } else if (key === "search" && hook.searchAdapter) {
      resultPromise = hook.searchAdapter(param, hook.medium);
    } else if (key === "toc" && hook.tocAdapter) {
      resultPromise = hook.tocAdapter(param);
    } else {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    try {
      return await resultPromise;
    } catch (error) {
      // translate custom hook errors into RestResponseError for informing user
      if (error instanceof CustomHookError) {
        error.data.trace = Object.fromEntries(store);
        throw new RestResponseError(error.code, error.msg, error.data);
      } else {
        throw error;
      }
    }
  });
});

const createCustomHook = createHandler((req) => {
  const { hook }: { hook: CustomHook } = req.body;
  return customHookStorage.addHook(hook);
});

const updateCustomHook = createHandler((req) => {
  const { hook }: { hook: CustomHook } = req.body;
  return customHookStorage.updateHook(hook);
});

const getAllCustomHooks = createHandler(() => {
  return customHookStorage.getHooks();
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

  router.post("/test", testHook);

  const customHookRoute = router.route("/custom");
  customHookRoute.post(createCustomHook);
  customHookRoute.put(updateCustomHook);
  customHookRoute.get(getAllCustomHooks);

  return router;
}
