import { internalListStorage } from "../database/storages/storage";
import { Errors, stringToNumberList, isNumberOrArray, isString } from "../tools";
import { Handler, Router } from "express";
import { createHandler, extractQueryParam } from "./apiTools";
import { getLists } from "./user";

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
 */
export function listRouter(): Router {
  const router = Router();
  router.get("/all", getAllLists);

  const listMediumRoute = router.route("/medium");
  listMediumRoute.get(getListMedium);
  listMediumRoute.post(postListMedium);
  listMediumRoute.put(putListMedium);
  listMediumRoute.delete(deleteListMedium);

  const listRoute = router.route("");
  listRoute.get(getList);
  listRoute.post(postList);
  listRoute.put(putList);
  listRoute.delete(deleteList);

  return router;
}
