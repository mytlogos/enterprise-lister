import { externalUserStorage, jobStorage } from "../database/storages/storage";
import { factory } from "../externals/listManager";
import { Errors, isString } from "../tools";
import { DisplayExternalUser, ExternalUser, ScrapeName } from "../types";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";

function toDisplayExternalUser(value: ExternalUser): DisplayExternalUser {
  return {
    identifier: value.identifier,
    lists: value.lists,
    localUuid: value.localUuid,
    type: value.type,
    uuid: value.uuid,
  };
}
export const getExternalUser = createHandler((req) => {
  const externalUuidString = extractQueryParam(req, "externalUuid");

  if (!externalUuidString || !isString(externalUuidString)) {
    // TODO: 23.07.2019 check if valid uuid
    return Promise.reject(Errors.INVALID_INPUT);
  }
  try {
    let externalUuid;
    if (externalUuidString.startsWith("[") && externalUuidString.endsWith("]")) {
      externalUuid = externalUuidString
        .substr(1, externalUuidString.length - 2)
        .split(",")
        .map((value) => value.trim());
    } else {
      externalUuid = externalUuidString;
    }
    return externalUserStorage.getExternalUser(externalUuid).then(
      (value): DisplayExternalUser => {
        if (Array.isArray(value)) {
          throw Error("Did not expect an Array");
        }
        return toDisplayExternalUser(value);
      },
    );
  } catch (e) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
});

export const postExternalUser = createHandler((req) => {
  const { uuid, externalUser } = req.body;

  if (!externalUser) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return (async () => {
    const listManager = factory(Number(externalUser.type));
    const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });

    if (!valid) {
      return Promise.reject(new Error(Errors.INVALID_DATA));
    }
    delete externalUser.pwd;
    externalUser.cookies = listManager.stringifyCookies();

    return externalUserStorage.addExternalUser(uuid, externalUser).then((value) => {
      if (Array.isArray(value)) {
        throw Error("Did not expect an Array");
      }
      return toDisplayExternalUser(value);
    });
  })();
});

export const deleteExternalUser = createHandler((req) => {
  const { externalUuid, uuid } = req.body;
  if (!externalUuid) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return externalUserStorage.deleteExternalUser(externalUuid, uuid);
});

export const getAllExternalUser = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return externalUserStorage.getAll(uuid);
});

export const refreshExternalUser = createHandler((req) => {
  const externalUuid = extractQueryParam(req, "externalUuid");
  if (!externalUuid) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  const externalUserWithCookies = externalUserStorage.getExternalUserWithCookies(externalUuid);
  const storePromise = externalUserWithCookies.then((value) =>
    jobStorage.addJobs({
      type: ScrapeName.oneTimeUser,
      interval: -1,
      deleteAfterRun: true,
      runImmediately: true,
      name: `${ScrapeName.oneTimeUser}-${value.uuid}`,
      arguments: JSON.stringify({
        link: value.uuid,
        userId: value.userUuid,
        externalUserId: value.uuid,
        info: value.cookies,
      }),
    }),
  );
  return storePromise.then(() => true);
});

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
   *          type: string
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
