import { externalUserStorage, jobStorage } from "bin/database/storages/storage";
import { factory } from "bin/externals/listManager";
import { Errors, isString } from "bin/tools";
import { ScrapeName } from "bin/types";
import { Handler, Router } from "express";
import { extractQueryParam, sendResult } from "./apiTools";

export const getExternalUser: Handler = (req, res) => {
  const externalUuidString = extractQueryParam(req, "externalUuid");

  if (!externalUuidString || !isString(externalUuidString)) {
    // TODO: 23.07.2019 check if valid uuid
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
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
    sendResult(res, externalUserStorage.getExternalUser(externalUuid));
  } catch (e) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
};
export const postExternalUser: Handler = (req, res) => {
  const { uuid, externalUser } = req.body;

  if (!externalUser) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(
    res,
    (async () => {
      const listManager = factory(Number(externalUser.type));
      const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });

      if (!valid) {
        return Promise.reject(new Error(Errors.INVALID_DATA));
      }
      delete externalUser.pwd;
      externalUser.cookies = listManager.stringifyCookies();

      return externalUserStorage.addExternalUser(uuid, externalUser);
    })(),
  );
};
export const deleteExternalUser: Handler = (req, res) => {
  const { externalUuid, uuid } = req.body;
  if (!externalUuid) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, externalUserStorage.deleteExternalUser(externalUuid, uuid));
};

export const getAllExternalUser: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, externalUserStorage.getAll(uuid));
};

export const refreshExternalUser: Handler = (req, res) => {
  const externalUuid = extractQueryParam(req, "externalUuid");
  if (!externalUuid) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
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
  sendResult(res, storePromise);
};

export function externalUserRouter(): Router {
  const router = Router();
  router.get("/refresh", refreshExternalUser);
  router.get("/all", getAllExternalUser);

  const externalUserRoute = router.route("");
  externalUserRoute.get(getExternalUser);
  externalUserRoute.post(postExternalUser);
  externalUserRoute.delete(deleteExternalUser);
  return router;
}
