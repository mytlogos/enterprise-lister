import { hookStorage } from "bin/database/storages/storage";
import { load } from "bin/externals/hookManager";
import { isInvalidId, Errors } from "bin/tools";
import { ScraperHook } from "bin/types";
import { Handler, Router } from "express";
import { sendResult } from "./apiTools";

export const getAllHooks: Handler = (_req, res) => {
  sendResult(
    res,
    load(true).then(() => hookStorage.getAllStream()),
  );
};

export const putHook: Handler = (req, res) => {
  const { hook }: { hook: ScraperHook } = req.body;

  if (!hook || isInvalidId(hook.id)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(res, hookStorage.updateScraperHook(hook));
};

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
