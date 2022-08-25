import { partStorage } from "enterprise-core/dist/database/storages/storage";
import { Errors } from "enterprise-core/dist/tools";
import { Part } from "enterprise-core/dist/types";
import { Router } from "express";
import {
  DeletePart,
  deletePartSchema,
  GetPart,
  GetPartItems,
  getPartItemsSchema,
  GetPartReleases,
  getPartReleasesSchema,
  getPartSchema,
  PostPart,
  postPartSchema,
  PutPart,
  putPartSchema,
} from "../validation";
import { castQuery, createHandler } from "./apiTools";
import { episodeRouter } from "./episode";

export const getAllParts = createHandler(() => {
  return partStorage.getAll();
});

export const getPart = createHandler(
  (req) => {
    const { mediumId, uuid, partId } = castQuery<GetPart>(req);

    if (mediumId == null) {
      if (!partId) {
        return Promise.reject(Errors.INVALID_INPUT);
      }
      return partStorage.getParts(partId, uuid);
    } else {
      return partStorage.getMediumParts(mediumId, uuid);
    }
  },
  { query: getPartSchema },
);

export const getPartItems = createHandler(
  (req) => {
    const { part } = castQuery<GetPartItems>(req);
    return partStorage.getPartItems(part);
  },
  { query: getPartItemsSchema },
);

export const getPartReleases = createHandler(
  (req) => {
    const { part } = castQuery<GetPartReleases>(req);
    return partStorage.getPartReleases(part);
  },
  { query: getPartReleasesSchema },
);

export const postPart = createHandler(
  (req) => {
    const { part, mediumId }: PostPart = req.body;
    return partStorage.addPart({ ...part, mediumId });
  },
  { body: postPartSchema },
);

export const putPart = createHandler(
  (req) => {
    const { part }: PutPart = req.body;
    const updatePart: Part = { ...part, episodes: [] };
    return partStorage.updatePart(updatePart);
  },
  { body: putPartSchema },
);

export const deletePart = createHandler(
  (req) => {
    const { partId }: DeletePart = req.body;
    return partStorage.deletePart(partId);
  },
  { body: deletePartSchema },
);

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
