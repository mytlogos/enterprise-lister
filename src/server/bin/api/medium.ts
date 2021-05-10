import { mediumStorage, mediumInWaitStorage, episodeStorage } from "bin/database/storages/storage";
import logger from "bin/logger";
import { isInvalidId, Errors, isInvalidSimpleMedium, isString, stringToNumberList, isNumberOrArray } from "bin/tools";
import { Router } from "express";
import { extractQueryParam, createHandler } from "./apiTools";
import { partRouter } from "./part";

export const postMergeMedia = createHandler((req) => {
  const { sourceId, destinationId } = req.body;
  if (isInvalidId(sourceId) || isInvalidId(destinationId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  } else {
    return mediumStorage.mergeMedia(sourceId, destinationId);
  }
});

export const postSplitMedium = createHandler((req) => {
  const { sourceId, destinationMedium, toc } = req.body;
  if (
    isInvalidId(sourceId) ||
    !destinationMedium ||
    isInvalidSimpleMedium(destinationMedium) ||
    !/^https?:\/\//.test(toc)
  ) {
    return Promise.reject(Errors.INVALID_INPUT);
  } else {
    return mediumStorage.splitMedium(sourceId, destinationMedium, toc);
  }
});

export const postTransferToc = createHandler((req) => {
  const { sourceId, destinationId, toc } = req.body;
  if (isInvalidId(sourceId) || isInvalidId(destinationId) || !/^https?:\/\//.test(toc)) {
    return Promise.reject(Errors.INVALID_INPUT);
  } else {
    return mediumStorage.transferToc(sourceId, destinationId, toc);
  }
});

export const getAllMedia = createHandler(() => {
  return mediumStorage.getAllMedia();
});

export const putConsumeUnusedMedia = createHandler((req) => {
  const { mediumId, tocsMedia } = req.body;

  if (mediumId <= 0 || !tocsMedia || !Array.isArray(tocsMedia) || !tocsMedia.length) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return mediumInWaitStorage.consumeMediaInWait(mediumId, tocsMedia);
});

export const postCreateFromUnusedMedia = createHandler((req) => {
  const { createMedium, tocsMedia, listId } = req.body;

  if (!createMedium || listId <= 0 || (tocsMedia && !Array.isArray(tocsMedia))) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return mediumInWaitStorage.createFromMediaInWait(createMedium, tocsMedia, listId);
});

export const getUnusedMedia = createHandler((req) => {
  const limit = Number(extractQueryParam(req, "limit", true));
  const medium = Number(extractQueryParam(req, "medium", true));
  const title = extractQueryParam(req, "title", true);
  const link = extractQueryParam(req, "link", true);

  return mediumInWaitStorage.getMediaInWait({
    limit,
    medium,
    title,
    link,
  });
});

export const getMedium = createHandler((req) => {
  let mediumId: string | number | number[] = extractQueryParam(req, "mediumId");
  const uuid = extractQueryParam(req, "uuid");

  mediumId = Number(mediumId);

  if (!mediumId && !Number.isNaN(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  if (!Number.isInteger(mediumId)) {
    mediumId = extractQueryParam(req, "mediumId");
    mediumId = stringToNumberList(mediumId);
  }
  if (!mediumId || !isNumberOrArray(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return mediumStorage.getMedium(mediumId, uuid);
});

export const postMedium = createHandler((req) => {
  const { uuid, medium } = req.body;
  if (!medium) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return mediumStorage.addMedium(medium, uuid);
});
export const putMedium = createHandler((req) => {
  const { medium } = req.body;
  if (!medium) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return mediumStorage.updateMedium(medium);
});

export const getAllMediaFull = createHandler(() => {
  return mediumStorage.getAllMediaFull();
});

export const getAllSecondary = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return mediumStorage.getAllSecondary(uuid);
});

export const getProgress = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  const episodeIdString = extractQueryParam(req, "episodeId");

  const episodeId = Number.parseInt(episodeIdString);

  if (!episodeId || !Number.isInteger(episodeId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.getProgress(uuid, episodeId);
});

export const postProgress = createHandler((req) => {
  const { uuid, progress } = req.body;
  let episodeId = req.body.episodeId;

  if (isString(episodeId)) {
    episodeId = stringToNumberList(episodeId);
  }

  if (!episodeId || !isNumberOrArray(episodeId) || progress == null) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  try {
    const readDate = req.body.readDate ? new Date(req.body.readDate) : new Date();
    return episodeStorage.addProgress(uuid, episodeId, progress, readDate);
  } catch (e) {
    logger.error(e);
    return Promise.reject(Errors.INVALID_INPUT);
  }
});

export const putProgress = postProgress;

export const deleteProgress = createHandler((req) => {
  const { uuid, episodeId } = req.body;
  if (!episodeId || !Number.isInteger(episodeId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.removeProgress(uuid, episodeId);
});

export const getMediumReleases = createHandler((req) => {
  const mediumId = Number.parseInt(extractQueryParam(req, "id"));
  const uuid = extractQueryParam(req, "uuid");

  if (isInvalidId(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return episodeStorage.getMediumReleases(mediumId, uuid);
});

/**
 * Creates the Medium API Router.
 * Adds the Part Api to the Medium Api.
 */
export function mediumRouter(): Router {
  const router = Router();

  router.get("/unused", getUnusedMedia);
  router.get("/all", getAllMedia);
  router.get("/allFull", getAllMediaFull);
  router.get("/allSecondary", getAllSecondary);
  router.get("/releases", getMediumReleases);
  router.put("/unused", putConsumeUnusedMedia);
  router.post("/create", postCreateFromUnusedMedia);
  router.post("/split", postSplitMedium);
  router.post("/merge", postMergeMedia);
  router.post("/transfer", postTransferToc);
  router.use("/part", partRouter());

  const mediumRoute = router.route("");
  mediumRoute.get(getMedium);
  mediumRoute.post(postMedium);
  mediumRoute.put(putMedium);

  const progressRoute = router.route("/progress");
  progressRoute.get(getProgress);
  progressRoute.post(postProgress);
  progressRoute.put(putProgress);
  progressRoute.delete(deleteProgress);

  return router;
}
