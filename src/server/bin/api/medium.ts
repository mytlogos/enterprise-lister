import { mediumStorage, mediumInWaitStorage, episodeStorage } from "../database/storages/storage";
import logger from "../logger";
import { isInvalidId, Errors, isInvalidSimpleMedium, isString, stringToNumberList, isNumberOrArray } from "../tools";
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
 *
 * @openapi
 * tags:
 *  name: Medium
 *  description: API for Media
 */
export function mediumRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/medium/unused:
   *    get:
   *      tags: [Medium]
   *      description: Query for MediumInWaits
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: limit
   *        in: query
   *        description: Limit of Results to return
   *        required: false
   *        schema:
   *          type: integer
   *      - name: medium
   *        in: query
   *        description: Medium type to filter
   *        required: false
   *        schema:
   *          type: integer
   *      - name: title
   *        in: query
   *        description: Title to query
   *        required: false
   *        schema:
   *          type: string
   *      - name: link
   *        in: query
   *        description: Link to query for
   *        required: false
   *        schema:
   *          type: string
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/MediumInWait"
   *          description: query results
   */
  router.get("/unused", getUnusedMedia);

  /**
   * @openapi
   * /api/user/medium/all:
   *    get:
   *      tags: [Medium]
   *      description: Get Ids of all Media.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/Id"
   *          description: array of ids
   */
  router.get("/all", getAllMedia);

  /**
   * @openapi
   * /api/user/medium/allFull:
   *    get:
   *      tags: [Medium]
   *      description: Get all Media
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/SimpleMedium"
   *          description: array of media
   */
  router.get("/allFull", getAllMediaFull);

  /**
   * @openapi
   * /api/user/medium/allSecondary:
   *    get:
   *      tags: [User]
   *      description: Get all secondary Data of Media.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/SecondaryMedium"
   *          description: array of objects
   */
  router.get("/allSecondary", getAllSecondary);

  /**
   * @openapi
   * /api/user/medium/releases:
   *    get:
   *      tags: [Medium]
   *      description: Get Releases of a Medium
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: id
   *        in: query
   *        description: Medium id to query releases for
   *        required: true
   *        schema:
   *          $ref: "#/components/schemas/Id"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/MediumRelease"
   *          description: the user
   */
  router.get("/releases", getMediumReleases);

  /**
   * @openapi
   * /api/user/medium/unused:
   *    put:
   *      tags: [Medium]
   *      description: Add Tocs from MediumInWaits to existing Medium and delete the used MediumInWaits
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                mediumId:
   *                  $ref: "#/components/schemas/Id"
   *                tocsMedia:
   *                  type: array
   *                  items:
   *                  $ref: "#/components/schemas/MediumInWait"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  router.put("/unused", putConsumeUnusedMedia);

  /**
   * @openapi
   * /api/user/medium/create:
   *    post:
   *      tags: [Medium]
   *      description: Create Medium from MediumInWaits and delete the used MediumInWaits
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                createMedium:
   *                  $ref: "#/components/schemas/MediumInWait"
   *                tocsMedia:
   *                  type: array
   *                  items:
   *                  $ref: "#/components/schemas/MediumInWait"
   *                listId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Medium"
   *          description: newly created medium
   */
  router.post("/create", postCreateFromUnusedMedia);

  /**
   * @openapi
   * /api/user/medium/split:
   *    post:
   *      tags: [Medium]
   *      description: Split a Toc from one Medium and create a new one based on the given destinationMedium.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                sourceId:
   *                  $ref: "#/components/schemas/Id"
   *                destinationMedium:
   *                  $ref: "#/components/schemas/SimpleMedium"
   *                toc:
   *                  type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Id"
   *          description: the Id of the new Medium or zero
   */
  router.post("/split", postSplitMedium);

  /**
   * @openapi
   * /api/user/medium/merge:
   *    post:
   *      tags: [Medium]
   *      description: Merge two Media.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                sourceId:
   *                  $ref: "#/components/schemas/Id"
   *                destinationId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if merge succeeded
   */
  router.post("/merge", postMergeMedia);

  /**
   * @openapi
   * /api/user/medium/transfer:
   *    put:
   *      tags: [User]
   *      description: Transfer a Toc from one Medium to another.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                sourceId:
   *                  $ref: "#/components/schemas/Id"
   *                destinationId:
   *                  $ref: "#/components/schemas/Id"
   *                toc:
   *                  type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if transfer succeeded
   */
  router.post("/transfer", postTransferToc);
  router.use("/part", partRouter());

  const mediumRoute = router.route("");

  /**
   * @openapi
   * /api/user/medium:
   *    get:
   *      tags: [Medium]
   *      description: Query Media.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: mediumId
   *        in: query
   *        description: Ids of the Media to query for
   *        required: true
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/Medium"
   *          description: array of objects
   */
  mediumRoute.get(getMedium);

  /**
   * @openapi
   * /api/user/medium:
   *    post:
   *      tags: [Medium]
   *      description: Create a Medium.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                medium:
   *                  $ref: "#/components/schemas/SimpleMedium"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/SimpleMedium"
   *          description: the newly created medium
   */
  mediumRoute.post(postMedium);

  /**
   * @openapi
   * /api/user/medium:
   *    put:
   *      tags: [Medium]
   *      description: Update Medium.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                user:
   *                  $ref: "#/components/schemas/UpdateMedium"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  mediumRoute.put(putMedium);

  const progressRoute = router.route("/progress");

  /**
   * @openapi
   * /api/user/medium/progress:
   *    get:
   *      tags: [User]
   *      description: Get the Read Progress of a given Episode Id.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: episodeId
   *        in: query
   *        description: Id of Episode to get the progress from
   *        required: true
   *        schema:
   *          $ref: "#/components/schemas/Id"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: number
   *          description: the progress
   */
  progressRoute.get(getProgress);

  /**
   * @openapi
   * /api/user/medium/progress:
   *    post:
   *      tags: [Medium]
   *      description: Update the Progress for the given Episode.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                episodeId:
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/Id"
   *                progress:
   *                  type: number
   *                readDate:
   *                  type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  progressRoute.post(postProgress);

  /**
   * @openapi
   * /api/user/medium/progress:
   *    put:
   *      tags: [Medium]
   *      description: Update the Progress for the given Episode.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                episodeId:
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/Id"
   *                progress:
   *                  type: number
   *                readDate:
   *                  type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  progressRoute.put(putProgress);

  /**
   * @openapi
   * /api/user/medium/progress:
   *    put:
   *      tags: [Medium]
   *      description: Remove Progress for the given Episode.
   *      requestBody:
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                session:
   *                  type: string
   *                episodeId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if delete succeeded
   */
  progressRoute.delete(deleteProgress);

  return router;
}
