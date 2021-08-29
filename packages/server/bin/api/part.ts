import { partStorage } from "enterprise-core/dist/database/storages/storage";
import { stringToNumberList, Errors, isString } from "enterprise-core/dist/tools";
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
 *
 * @openapi
 * tags:
 *  name: Part
 *  description: API for Parts
 */
export function partRouter(): Router {
  const router = Router();

  router.use("/episode", episodeRouter());

  const partRoute = router.route("");

  /**
   * @openapi
   * /api/user/medium/part:
   *    get:
   *      tags: [Part]
   *      description: Get Parts of an medium or specific part ids.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: mediumId
   *        in: query
   *        description: Medium to get the Parts from
   *        required: false
   *        schema:
   *          $ref: "#/components/schemas/Id"
   *      - name: partId
   *        in: query
   *        description: PartIds of
   *        required: false
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
   *                  $ref: "#/components/schemas/Part"
   *          description: array of objects
   */
  partRoute.get(getPart);

  /**
   * @openapi
   * /api/user/medium/part:
   *    post:
   *      tags: [Part]
   *      description: Create Part
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
   *                part:
   *                  $ref: "#/components/schemas/AddPart"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Part"
   *          description: true if update succeeded
   */
  partRoute.post(postPart);

  /**
   * @openapi
   * /api/user/medium/part:
   *    put:
   *      tags: [Part]
   *      description: Update part
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
   *                part:
   *                  $ref: "#/components/schemas/Part"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  partRoute.put(putPart);

  /**
   * @openapi
   * /api/user/medium/part:
   *    delete:
   *      tags: [Part]
   *      description: Delete a Part
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
   *                partId:
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
  partRoute.delete(deletePart);

  /**
   * @openapi
   * /api/user/medium/part/all:
   *    get:
   *      tags: [User]
   *      description: get current user
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/MinPart"
   *          description: array of objects
   */
  router.get("/all", getAllParts);

  /**
   * @openapi
   * /api/user/medium/part/items:
   *    get:
   *      tags: [Part]
   *      description: Get Part Mappings
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: part
   *        in: query
   *        description: Ids of the Parts to query for
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
   *                type: object
   *          description: Mapping of Part Id and its Episode Ids.
   */
  router.get("/items", getPartItems);

  /**
   * @openapi
   * /api/user/medium/part/releases:
   *    get:
   *      tags: [Part]
   *      description: Get all Releases of specific Parts.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: part
   *        in: query
   *        description: Ids of the Parts to query for
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
   *                type: object
   *          description: Mapping of Part Id and its SimpleReleases.
   */
  router.get("/releases", getPartReleases);

  return router;
}
