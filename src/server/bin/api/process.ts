import { episodeStorage, storage } from "bin/database/storages/storage";
import { Errors } from "bin/tools";
import { Handler, Router } from "express";
import { sendResult } from "./apiTools";

export const processReadEpisode: Handler = (req, res) => {
  const { uuid, result } = req.body;
  if (!result) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.markEpisodeRead(uuid, result));
};

export const processProgress: Handler = (req, res) => {
  const { uuid, progress } = req.body;
  if (!progress) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.setProgress(uuid, progress));
};

export const processResult: Handler = (req, res) => {
  if (!req.body) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, storage.processResult(req.body));
};

export function processRouter(): Router {
  const router = Router();
  router.post("/result", processResult);
  router.post("/read", processReadEpisode);
  router.post("/progress", processProgress);
  return router;
}
