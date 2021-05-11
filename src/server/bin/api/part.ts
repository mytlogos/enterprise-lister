import { partStorage } from "../database/storages/storage";
import { stringToNumberList, Errors, isString } from "../tools";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";
import { episodeRouter } from "./episode";

export const getAllParts = createHandler(() => {
  return partStorage.getAll();
});

export const getPart = createHandler((req) => {
  const mediumIdString = extractQueryParam(req, "mediumId", true);
  const uuid = extractQueryParam(req, "uuid");

  if (mediumIdString == null) {
    let partId: string | number[] = extractQueryParam(req, "partId");
    // if it is a string, it is likely a list of partIds was send
    if (isString(partId)) {
      partId = stringToNumberList(partId);
    }
    if (!partId || (!Array.isArray(partId) && !Number.isInteger(partId))) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    return partStorage.getParts(partId, uuid);
  } else {
    const mediumId = Number.parseInt(mediumIdString);
    if (!Number.isInteger(mediumId)) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    return partStorage.getMediumParts(mediumId, uuid);
  }
});
export const getPartItems = createHandler((req) => {
  let partId: string | number[] = extractQueryParam(req, "part");

  // if it is a string, it is likely a list of partIds was send
  if (isString(partId)) {
    partId = stringToNumberList(partId);
  }
  if (!partId || !Array.isArray(partId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return partStorage.getPartItems(partId);
});
export const getPartReleases = createHandler((req) => {
  let partId: string | number[] = extractQueryParam(req, "part");

  // if it is a string, it is likely a list of partIds was send
  if (isString(partId)) {
    partId = stringToNumberList(partId);
  }
  if (!partId || !Array.isArray(partId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return partStorage.getPartReleases(partId);
});
export const postPart = createHandler((req) => {
  const { part, mediumId } = req.body;
  if (!part || !mediumId || !Number.isInteger(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  part.mediumId = mediumId;
  return partStorage.addPart(part);
});
export const putPart = createHandler((req) => {
  const { part } = req.body;
  if (!part) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return partStorage.updatePart(part);
});
export const deletePart = createHandler((req) => {
  const { partId } = req.body;
  if (!partId || !Number.isInteger(partId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return partStorage.deletePart(partId);
});

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
