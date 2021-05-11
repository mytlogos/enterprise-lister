import { episodeStorage } from "../database/storages/storage";
import { stringToNumberList, isNumberOrArray, Errors, getDate, isString } from "../tools";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";

export const getEpisode = createHandler((req) => {
  let episodeId: string | number[] = extractQueryParam(req, "episodeId");
  const uuid = extractQueryParam(req, "uuid");

  // if it is a string, it is likely a list of episodeIds was send
  if (isString(episodeId)) {
    episodeId = stringToNumberList(episodeId);
  }
  if (!episodeId || !isNumberOrArray(episodeId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.getEpisode(episodeId, uuid);
});

export const postEpisode = createHandler((req) => {
  const { episode, partId } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length) || !partId || !Number.isInteger(partId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episode)) {
    episode.forEach((value) => (value.partId = partId));
  } else {
    episode.partId = partId;
  }
  return episodeStorage.addEpisode(episode);
});

export const putEpisode = createHandler(async (req) => {
  const { episode } = req.body;
  if (!episode || (Array.isArray(episode) && !episode.length)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episode)) {
    const values = await Promise.all(episode.map((value) => episodeStorage.updateEpisode(value)));
    return values.findIndex((value) => value) >= 0;
  } else {
    return episodeStorage.updateEpisode(episode);
  }
});

export const deleteEpisode = createHandler(async (req) => {
  const { episodeId } = req.body;
  if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (Array.isArray(episodeId)) {
    const values = await Promise.all(episodeId.map((value) => episodeStorage.updateEpisode(value)));
    return values.findIndex((value) => value) >= 0;
  } else {
    return episodeStorage.deleteEpisode(episodeId);
  }
});

export const getAllEpisodes = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return episodeStorage.getAll(uuid);
});

export const getAllReleases = createHandler(() => {
  return episodeStorage.getAllReleases();
});

export const getDisplayReleases = createHandler((req) => {
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
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return episodeStorage.getDisplayReleases(
    latestDate,
    untilDate,
    read,
    uuid,
    ignoredLists,
    requiredLists,
    ignoredMedia,
    requiredMedia,
  );
});

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
