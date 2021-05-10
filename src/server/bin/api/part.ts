import { partStorage } from "bin/database/storages/storage";
import { stringToNumberList, Errors, isString } from "bin/tools";
import { Handler, Router } from "express";
import { extractQueryParam, sendResult } from "./apiTools";
import { episodeRouter } from "./episode";

export const getAllParts: Handler = (_req, res) => {
  sendResult(res, partStorage.getAll());
};

export const getPart: Handler = (req, res) => {
  const mediumIdString = extractQueryParam(req, "mediumId", true);
  const uuid = extractQueryParam(req, "uuid");

  if (mediumIdString == null) {
    let partId: string | number[] = extractQueryParam(req, "partId");
    // if it is a string, it is likely a list of partIds was send
    if (isString(partId)) {
      partId = stringToNumberList(partId);
    }
    if (!partId || (!Array.isArray(partId) && !Number.isInteger(partId))) {
      sendResult(res, Promise.reject(Errors.INVALID_INPUT));
      return;
    }
    sendResult(res, partStorage.getParts(partId, uuid));
  } else {
    const mediumId = Number.parseInt(mediumIdString);
    if (!Number.isInteger(mediumId)) {
      sendResult(res, Promise.reject(Errors.INVALID_INPUT));
      return;
    }
    sendResult(res, partStorage.getMediumParts(mediumId, uuid));
  }
};
export const getPartItems: Handler = (req, res) => {
  let partId: string | number[] = extractQueryParam(req, "part");

  // if it is a string, it is likely a list of partIds was send
  if (isString(partId)) {
    partId = stringToNumberList(partId);
  }
  if (!partId || !Array.isArray(partId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, partStorage.getPartItems(partId));
};
export const getPartReleases: Handler = (req, res) => {
  let partId: string | number[] = extractQueryParam(req, "part");

  // if it is a string, it is likely a list of partIds was send
  if (isString(partId)) {
    partId = stringToNumberList(partId);
  }
  if (!partId || !Array.isArray(partId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, partStorage.getPartReleases(partId));
};
export const postPart: Handler = (req, res) => {
  const { part, mediumId } = req.body;
  if (!part || !mediumId || !Number.isInteger(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  part.mediumId = mediumId;
  sendResult(res, partStorage.addPart(part));
};
export const putPart: Handler = (req, res) => {
  const { part } = req.body;
  if (!part) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, partStorage.updatePart(part));
};
export const deletePart: Handler = (req, res) => {
  const { partId } = req.body;
  if (!partId || !Number.isInteger(partId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, partStorage.deletePart(partId));
};

/**
 * Creates the Part Api Router.
 * Adds the Episode Api Route to the Part Api Router.
 */
export function partRouter(): Router {
  const router = Router();

  router.use("/episode", episodeRouter());

  const partRoute = router.route("");
  partRoute.get(getPart);
  partRoute.post(postPart);
  partRoute.put(putPart);
  partRoute.delete(deletePart);
  router.get("/all", getAllParts);
  router.get("/items", getPartItems);
  router.get("/releases", getPartReleases);

  return router;
}
