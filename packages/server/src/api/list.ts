import { internalListStorage } from "enterprise-core/dist/database/storages/storage";
import { Router } from "express";
import {
  DeleteList,
  DeleteListMedium,
  deleteListMediumSchema,
  deleteListSchema,
  GetList,
  GetListMedium,
  getListMediumSchema,
  getListSchema,
  PostList,
  postListMediumSchema,
  postListSchema,
  PutListMedium,
  putListMediumSchema,
} from "../validation";
import { castQuery, createHandler, extractQueryParam } from "./apiTools";

export const getList = createHandler(
  (req) => {
    const { listId, media, uuid } = castQuery<GetList>(req);
    return internalListStorage.getList(listId, media || [], uuid);
  },
  { query: getListSchema },
);

export const postList = createHandler(
  (req) => {
    const { uuid, list }: PostList = req.body;
    return internalListStorage.addList(uuid, list);
  },
  { body: postListSchema },
);

export const putList = createHandler(
  (req) => {
    const { uuid, list }: PostList = req.body;
    // TODO: 05.09.2019 should this not be update list?
    return internalListStorage.addList(uuid, list);
  },
  { body: postListSchema },
);

export const deleteList = createHandler(
  (req) => {
    const { listId, uuid }: DeleteList = req.body;
    return internalListStorage.deleteList(listId, uuid);
  },
  { body: deleteListSchema },
);

export const getListMedium = createHandler(
  (req) => {
    const { listId, media, uuid } = castQuery<GetListMedium>(req);
    return internalListStorage.getList(listId, media, uuid);
  },
  { query: getListMediumSchema },
);

export const postListMedium = createHandler(
  (req) => {
    const { listId, mediumId, uuid } = req.body;
    return internalListStorage.addItemToList({ listId, id: mediumId }, uuid);
  },
  { body: postListMediumSchema },
);

export const putListMedium = createHandler(
  (req) => {
    const { oldListId, newListId, mediumId }: PutListMedium = req.body;
    return internalListStorage.moveMedium(oldListId, newListId, mediumId);
  },
  { body: putListMediumSchema },
);

export const deleteListMedium = createHandler(
  (req) => {
    const { listId, mediumId }: DeleteListMedium = req.body;
    return internalListStorage.removeMedium(listId, mediumId);
  },
  { body: deleteListMediumSchema },
);

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
   *                $ref: "#/components/schemas/ListMedia"
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
   *                  type: array
   *                  items:
   *                    $ref: "#/components/schemas/Id"
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
