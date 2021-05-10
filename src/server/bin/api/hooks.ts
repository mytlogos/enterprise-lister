import { hookStorage } from "bin/database/storages/storage";
import { load } from "bin/externals/hookManager";
import { isInvalidId, Errors } from "bin/tools";
import { ScraperHook } from "bin/types";
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
 */
export function hooksRouter(): Router {
  const router = Router();

  const hookRoute = router.route("");
  hookRoute.get(getAllHooks);
  hookRoute.put(putHook);

  return router;
}
