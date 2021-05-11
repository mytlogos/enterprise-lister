import { externalUserStorage, jobStorage } from "../database/storages/storage";
import { factory } from "../externals/listManager";
import { Errors, isString } from "../tools";
import { ScrapeName } from "../types";
import { Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";

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
    return externalUserStorage.getExternalUser(externalUuid);
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

    return externalUserStorage.addExternalUser(uuid, externalUser);
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
  return storePromise;
});

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
