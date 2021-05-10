import { episodeStorage, storage } from "bin/database/storages/storage";
import { Errors } from "bin/tools";
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

export function processRouter(): Router {
  const router = Router();
  router.post("/result", processResult);
  router.post("/read", processReadEpisode);
  router.post("/progress", processProgress);
  return router;
}
