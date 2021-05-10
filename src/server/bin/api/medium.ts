import { mediumStorage, mediumInWaitStorage, episodeStorage } from "bin/database/storages/storage";
import logger from "bin/logger";
import { isInvalidId, Errors, isInvalidSimpleMedium, isString, stringToNumberList, isNumberOrArray } from "bin/tools";
import { Handler, Router } from "express";
import { sendResult, extractQueryParam } from "./apiTools";
import { partRouter } from "./part";

export const postMergeMedia: Handler = (req, res) => {
  const { sourceId, destinationId } = req.body;
  if (isInvalidId(sourceId) || isInvalidId(destinationId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  } else {
    sendResult(res, mediumStorage.mergeMedia(sourceId, destinationId));
  }
};

export const postSplitMedium: Handler = (req, res) => {
  const { sourceId, destinationMedium, toc } = req.body;
  if (
    isInvalidId(sourceId) ||
    !destinationMedium ||
    isInvalidSimpleMedium(destinationMedium) ||
    !/^https?:\/\//.test(toc)
  ) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  } else {
    sendResult(res, mediumStorage.splitMedium(sourceId, destinationMedium, toc));
  }
};

export const postTransferToc: Handler = (req, res) => {
  const { sourceId, destinationId, toc } = req.body;
  if (isInvalidId(sourceId) || isInvalidId(destinationId) || !/^https?:\/\//.test(toc)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  } else {
    sendResult(res, mediumStorage.transferToc(sourceId, destinationId, toc));
  }
};

export const getAllMedia: Handler = (_req, res) => {
  sendResult(res, mediumStorage.getAllMedia());
};

export const putConsumeUnusedMedia: Handler = (req, res) => {
  const { mediumId, tocsMedia } = req.body;

  if (mediumId <= 0 || !tocsMedia || !Array.isArray(tocsMedia) || !tocsMedia.length) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, mediumInWaitStorage.consumeMediaInWait(mediumId, tocsMedia));
};

export const postCreateFromUnusedMedia: Handler = (req, res) => {
  const { createMedium, tocsMedia, listId } = req.body;

  if (!createMedium || listId <= 0 || (tocsMedia && !Array.isArray(tocsMedia))) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, mediumInWaitStorage.createFromMediaInWait(createMedium, tocsMedia, listId));
};

export const getUnusedMedia: Handler = (req, res) => {
  const limit = Number(extractQueryParam(req, "limit", true));
  const medium = Number(extractQueryParam(req, "medium", true));
  const title = extractQueryParam(req, "title", true);
  const link = extractQueryParam(req, "link", true);

  sendResult(
    res,
    mediumInWaitStorage.getMediaInWait({
      limit,
      medium,
      title,
      link,
    }),
  );
};

export const getMedium: Handler = (req, res) => {
  let mediumId: string | number | number[] = extractQueryParam(req, "mediumId");
  const uuid = extractQueryParam(req, "uuid");

  mediumId = Number(mediumId);

  if (!mediumId && !Number.isNaN(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  if (!Number.isInteger(mediumId)) {
    mediumId = extractQueryParam(req, "mediumId");
    mediumId = stringToNumberList(mediumId);
  }
  if (!mediumId || !isNumberOrArray(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, mediumStorage.getMedium(mediumId, uuid));
};

export const postMedium: Handler = (req, res) => {
  const { uuid, medium } = req.body;
  if (!medium) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, mediumStorage.addMedium(medium, uuid));
};
export const putMedium: Handler = (req, res) => {
  const { medium } = req.body;
  if (!medium) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, mediumStorage.updateMedium(medium));
};

export const getAllMediaFull: Handler = (_req, res) => {
  sendResult(res, mediumStorage.getAllMediaFull());
};

export const getAllSecondary: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, mediumStorage.getAllSecondary(uuid));
};

export const getProgress: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  const episodeIdString = extractQueryParam(req, "episodeId");

  const episodeId = Number.parseInt(episodeIdString);

  if (!episodeId || !Number.isInteger(episodeId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.getProgress(uuid, episodeId));
};

export const postProgress: Handler = (req, res) => {
  const { uuid, progress } = req.body;
  let episodeId = req.body.episodeId;

  if (isString(episodeId)) {
    episodeId = stringToNumberList(episodeId);
  }

  if (!episodeId || !isNumberOrArray(episodeId) || progress == null) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  try {
    const readDate = req.body.readDate ? new Date(req.body.readDate) : new Date();
    sendResult(res, episodeStorage.addProgress(uuid, episodeId, progress, readDate));
  } catch (e) {
    logger.error(e);
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
  }
};

export const putProgress: Handler = postProgress;

export const deleteProgress: Handler = (req, res) => {
  const { uuid, episodeId } = req.body;
  if (!episodeId || !Number.isInteger(episodeId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.removeProgress(uuid, episodeId));
};

export const getMediumReleases: Handler = (req, res) => {
  const mediumId = Number.parseInt(extractQueryParam(req, "id"));
  const uuid = extractQueryParam(req, "uuid");

  if (isInvalidId(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(res, episodeStorage.getMediumReleases(mediumId, uuid));
};

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
