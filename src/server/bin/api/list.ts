import { internalListStorage } from "../database/storages/storage";
import { Errors, stringToNumberList, isNumberOrArray, isString } from "../tools";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";

export const getList = createHandler((req) => {
  let listId: string | number[] = extractQueryParam(req, "listId");
  const uuid = extractQueryParam(req, "uuid");
  let media: string | number[] = extractQueryParam(req, "media");

  if (!media) {
    media = "";
  }
  if (!listId) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  if (isString(listId)) {
    listId = stringToNumberList(listId);
  }
  media = stringToNumberList(media);

  return internalListStorage.getList(listId, media, uuid);
});

export const postList = createHandler((req) => {
  const { uuid, list } = req.body;
  if (!list) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.addList(uuid, list);
});

export const putList = createHandler((req) => {
  const { uuid, list } = req.body;
  if (!list) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  // TODO: 05.09.2019 should this not be update list?
  return internalListStorage.addList(uuid, list);
});

export const deleteList = createHandler((req) => {
  const { listId, uuid } = req.body;
  if (!listId || !Number.isInteger(listId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.deleteList(listId, uuid);
});

export const getListMedium = createHandler((req) => {
  const listId = Number.parseInt(extractQueryParam(req, "listId"));
  const uuid = extractQueryParam(req, "uuid");
  let media: string | number[] = extractQueryParam(req, "media");

  if (!media || !isString(media)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  media = stringToNumberList(media);

  if (!listId || (Array.isArray(media) && !media.length)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.getList(listId, media, uuid);
});

export const postListMedium = createHandler((req) => {
  const { listId, mediumId, uuid } = req.body;

  if (!listId || !Number.isInteger(listId) || !mediumId || !isNumberOrArray(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.addItemToList({ listId, id: mediumId }, uuid);
});

export const putListMedium = createHandler((req) => {
  const { oldListId, newListId } = req.body;
  let { mediumId } = req.body;

  if (!Number.isInteger(mediumId)) {
    // FIXME: should expect number[] not string
    if (isString(mediumId)) {
      mediumId = stringToNumberList(mediumId);

      if (!mediumId.length) {
        return Promise.resolve(false);
      }
    } else {
      mediumId = undefined;
    }
  }
  if (!oldListId || !newListId || !mediumId) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.moveMedium(oldListId, newListId, mediumId);
});

export const deleteListMedium = createHandler((req) => {
  const { listId } = req.body;
  let { mediumId } = req.body;

  // FIXME: expect number[] nod string
  // if it is a string, it is likely a list of episodeIds was send
  if (isString(mediumId)) {
    mediumId = stringToNumberList(mediumId);
  }
  if (!listId || !mediumId || !isNumberOrArray(mediumId)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return internalListStorage.removeMedium(listId, mediumId);
});

export const getAllLists = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return internalListStorage.getUserLists(uuid);
});

/**
 * Creates the List API Router.
 *
 * @openapi
 * tags:
 *  name: List
 *  description: API for Lists
 */
export function listRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/list/all:
   *    get:
   *      tags: [List]
   *      description: get all Lists of the current User
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
   *                  $ref: "#/components/schemas/List"
   *          description: List array
   */
  router.get("/all", getAllLists);

  const listMediumRoute = router.route("/medium");

  /**
   * @openapi
   * /api/user/list/medium:
   *    get:
   *      tags: [List]
   *      description: get all Lists of the current User
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: listId
   *        in: query
   *        description: List Id to query for
   *        required: true
   *        schema:
   *          $ref: "#/components/schemas/Id"
   *      - name: media
   *        in: query
   *        description: Media Ids to query for
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
   *                  $ref: "#/components/schemas/ListMedia"
   *          description: List array
   */
  listMediumRoute.get(getListMedium);

  /**
   * @openapi
   * /api/user/list/medium:
   *    post:
   *      tags: [List]
   *      description: Add Medium to List
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
   *                listId:
   *                  $ref: "#/components/schemas/Id"
   *                mediumId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if adding item to list succeeded
   */
  listMediumRoute.post(postListMedium);

  /**
   * @openapi
   * /api/user/list/medium:
   *    put:
   *      tags: [List]
   *      description: Move Medium from one List to another
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
   *                oldListId:
   *                  $ref: "#/components/schemas/Id"
   *                newListId:
   *                  $ref: "#/components/schemas/Id"
   *                mediumId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if moving succeeded
   */
  listMediumRoute.put(putListMedium);

  /**
   * @openapi
   * /api/user/list/medium:
   *    delete:
   *      tags: [List]
   *      description: logout current user
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
   *                listId:
   *                  $ref: "#/components/schemas/Id"
   *                mediumId:
   *                  $ref: "#/components/schemas/Id"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if delete of item mapping succeeded
   */
  listMediumRoute.delete(deleteListMedium);

  const listRoute = router.route("");

  /**
   * @openapi
   * /api/user/list:
   *    get:
   *      tags: [List]
   *      description: Query for Lists and their Items
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: listId
   *        in: query
   *        description: List Ids to query for
   *        required: true
   *        schema:
   *          type: array
   *          items:
   *            $ref: "#/components/schemas/Id"
   *      - name: mediaId
   *        in: query
   *        description: Media Ids to query for
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
   *                  $ref: "#/components/schemas/ListMedia"
   *          description: List media object
   */
  listRoute.get(getList);

  /**
   * @openapi
   * /api/user/list:
   *    post:
   *      tags: [List]
   *      description: Create List for current User
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
   *                list:
   *                  $ref: "#/components/schemas/MinList"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/List"
   *          description: the newly created List
   */
  listRoute.post(postList);

  /**
   * @openapi
   * /api/user/list:
   *    put:
   *      tags: [List]
   *      description: Create List for current User
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
   *                list:
   *                  $ref: "#/components/schemas/MinList"
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/List"
   *          description: the newly created List
   */
  listRoute.put(putList);

  /**
   * @openapi
   * /api/user/list:
   *    delete:
   *      tags: [List]
   *      description: Delete given List and its Item Mappings
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
   *                listId:
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
  listRoute.delete(deleteList);

  return router;
}
