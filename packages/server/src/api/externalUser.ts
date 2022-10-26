import { externalUserStorage, jobStorage } from "enterprise-core/dist/database/storages/storage";
import { factory } from "enterprise-scraper/dist/externals/listManager";
import { Errors } from "enterprise-core/dist/tools";
import { Insert, ScrapeName } from "enterprise-core/dist/types";
import { Router } from "express";
import { castQuery, createHandler, extractQueryParam } from "./apiTools";
import { ValidationError } from "enterprise-core/dist/error";
import {
  DeleteExternalUser,
  deleteExternalUserSchema,
  GetExternalUser,
  getExternalUserSchema,
  PostExternalUser,
  postExternalUserSchema,
  RefreshExternalUser,
  refreshExternalUserSchema,
} from "../validation";
import {
  BasicDisplayExternalUser,
  DisplayExternalUser,
  SimpleExternalUser,
} from "enterprise-core/dist/database/databaseTypes";

function toDisplayExternalUser(value: BasicDisplayExternalUser): DisplayExternalUser {
  return {
    identifier: value.identifier,
    localUuid: value.localUuid,
    type: value.type,
    uuid: value.uuid,
    lists: [],
  };
}

export const getExternalUser = createHandler(
  async (req) => {
    const { externalUuid } = castQuery<GetExternalUser>(req);
    const value = await externalUserStorage.getExternalUser(externalUuid);
    return value.map(toDisplayExternalUser);
  },
  { query: getExternalUserSchema },
);

export const postExternalUser = createHandler(
  async (req) => {
    const { uuid, externalUser }: PostExternalUser = req.body;
    const listManager = factory(Number(externalUser.type));
    const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });

    if (!valid) {
      throw new ValidationError(Errors.INVALID_DATA);
    }
    const addExternalUser: Insert<SimpleExternalUser> = {
      identifier: externalUser.identifier,
      localUuid: uuid,
      type: externalUser.type,
      uuid: "",
      cookies: listManager.stringifyCookies(),
    };

    return externalUserStorage.addExternalUser(uuid, addExternalUser).then((value) => {
      if (Array.isArray(value)) {
        // is this check even necessary?
        throw new ValidationError("Did not expect an Array");
      }
      return toDisplayExternalUser(value);
    });
  },
  { body: postExternalUserSchema },
);

export const deleteExternalUser = createHandler(
  (req) => {
    const { externalUuid, uuid }: DeleteExternalUser = req.body;
    return externalUserStorage.deleteExternalUser(externalUuid, uuid);
  },
  { body: deleteExternalUserSchema },
);

export const getAllExternalUser = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return externalUserStorage.getAll(uuid);
});

export const refreshExternalUser = createHandler(
  async (req) => {
    const { externalUuid } = castQuery<RefreshExternalUser>(req);

    const externalUserWithCookies = await externalUserStorage.getSimpleExternalUser(externalUuid);

    await jobStorage.addJobs([
      {
        type: ScrapeName.oneTimeUser,
        interval: -1,
        deleteAfterRun: true,
        runImmediately: true,
        name: `${ScrapeName.oneTimeUser}-${externalUserWithCookies.uuid}`,
        arguments: JSON.stringify({
          link: externalUserWithCookies.uuid,
          userId: externalUserWithCookies.localUuid,
          externalUserId: externalUserWithCookies.uuid,
          info: externalUserWithCookies.cookies,
        }),
      },
    ]);
    return true;
  },
  { query: refreshExternalUserSchema },
);

/**
 * Creates the ExternalUser API Router.
 *
 * @openapi
 * tags:
 *  name: ExternalUser
 *  description: API for ExternalUser
 */
export function externalUserRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/externalUser/refresh:
   *    get:
   *      tags: [ExternalUser]
   *      description: Request a Refresh Job for an external User.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: externalUuid
   *        in: query
   *        description: Uuid of the External User
   *        required: true
   *        schema:
   *          type: string
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true of refresh job successfully requested
   */
  router.get("/refresh", refreshExternalUser);

  /**
   * @openapi
   * /api/user/externalUser/all:
   *    get:
   *      tags: [ExternalUser]
   *      description: Get all ExternalUser
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
   *                  $ref: "#/components/schemas/DisplayExternalUser"
   *          description: ExternalUser array
   */
  router.get("/all", getAllExternalUser);

  const externalUserRoute = router.route("");

  /**
   * @openapi
   * /api/user/externalUser:
   *    get:
   *      tags: [ExternalUser]
   *      description: Query ExternalUser.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: externalUuid
   *        in: query
   *        description: Uuid of the External User
   *        required: true
   *        schema:
   *          type: array
   *          items:
   *            type: string
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/DisplayExternalUser"
   *          description: ExternalUser array
   */
  externalUserRoute.get(getExternalUser);

  /**
   * @openapi
   * /api/user/externalUser:
   *    post:
   *      tags: [ExternalUser]
   *      description: Create Externaluser
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
   *                externalUser:
   *                  type: object
   *                  properties:
   *                    type:
   *                      type: number
   *                    pwd:
   *                      type: string
   *                    identifier:
   *                      type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/DisplayExternalUser"
   *          description: newly created ExternalUser array
   */
  externalUserRoute.post(postExternalUser);

  /**
   * @openapi
   * /api/user/externalUser:
   *    delete:
   *      tags: [ExternalUser]
   *      description: Delete a ExternalUser and its associated Data.
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
   *                externalUuid:
   *                  type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if delete was a success
   */
  externalUserRoute.delete(deleteExternalUser);
  return router;
}
