import { episodeStorage } from "bin/database/storages/storage";
import { stringToNumberList, isNumberOrArray, Errors, getDate, isString } from "bin/tools";
import { Handler, Router } from "express";
import { extractQueryParam, sendResult } from "./apiTools";

export const getEpisode: Handler = (req, res) => {
  let episodeId: string | number[] = extractQueryParam(req, "episodeId");
  const uuid = extractQueryParam(req, "uuid");

  // if it is a string, it is likely a list of episodeIds was send
  if (isString(episodeId)) {
    episodeId = stringToNumberList(episodeId);
  }
  if (!episodeId || !isNumberOrArray(episodeId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.getEpisode(episodeId, uuid));
};
export const postEpisode: Handler = (req, res) => {
  const { episode, partId } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length) || !partId || !Number.isInteger(partId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  if (Array.isArray(episode)) {
    episode.forEach((value) => (value.partId = partId));
  } else {
    episode.partId = partId;
  }
  sendResult(res, episodeStorage.addEpisode(episode));
};
export const putEpisode: Handler = (req, res) => {
  const { episode } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  if (Array.isArray(episode)) {
    sendResult(
      res,
      Promise.all(episode.map((value) => episodeStorage.updateEpisode(value))).then((values) => {
        // check if at least one updated
        return values.findIndex((value) => value) >= 0;
      }),
    );
  } else {
    sendResult(res, episodeStorage.updateEpisode(episode));
  }
};
export const deleteEpisode: Handler = (req, res) => {
  const { episodeId } = req.body;
  if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  if (Array.isArray(episodeId)) {
    sendResult(
      res,
      Promise.all(episodeId.map((value) => episodeStorage.updateEpisode(value))).then((values) => {
        // check if at least one updated
        return values.findIndex((value) => value) >= 0;
      }),
    );
  } else {
    sendResult(res, episodeStorage.updateEpisode(episodeId));
  }
  sendResult(res, episodeStorage.deleteEpisode(episodeId));
};

export const getAllEpisodes: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, episodeStorage.getAll(uuid));
};

export const getAllReleases: Handler = (_req, res) => {
  sendResult(res, episodeStorage.getAllReleases());
};

export const getDisplayReleases: Handler = (req, res) => {
  const latest = extractQueryParam(req, "latest");
  const until = extractQueryParam(req, "until", true);
  const read = extractQueryParam(req, "read", true) ? extractQueryParam(req, "read").toLowerCase() == "true" : null;
  const uuid = extractQueryParam(req, "uuid");
  const ignoredLists = stringToNumberList(extractQueryParam(req, "ignore_lists", true) || "");
  const requiredLists = stringToNumberList(extractQueryParam(req, "only_lists", true) || "");
  const ignoredMedia = stringToNumberList(extractQueryParam(req, "ignore_media", true) || "");
  const requiredMedia = stringToNumberList(extractQueryParam(req, "only_media", true) || "");

  const latestDate = getDate(latest);
  const untilDate = until ? getDate(until) : null;

  if (!isString(latest) || !latestDate || (until && !untilDate)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(
    res,
    episodeStorage.getDisplayReleases(
      latestDate,
      untilDate,
      read,
      uuid,
      ignoredLists,
      requiredLists,
      ignoredMedia,
      requiredMedia,
    ),
  );
};

export function episodeRouter(): Router {
  const router = Router();
  router.get("/all", getAllEpisodes);
  router.get("/releases/all", getAllReleases);
  router.get("/releases/display", getDisplayReleases);

  const episodeRoute = router.route("");
  episodeRoute.get(getEpisode);
  episodeRoute.post(postEpisode);
  episodeRoute.put(putEpisode);
  episodeRoute.delete(deleteEpisode);
  return router;
}
