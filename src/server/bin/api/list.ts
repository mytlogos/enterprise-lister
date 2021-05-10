import { internalListStorage } from "bin/database/storages/storage";
import { Errors, stringToNumberList, isNumberOrArray, isString } from "bin/tools";
import { Handler, Router } from "express";
import { extractQueryParam, sendResult } from "./apiTools";
import { getLists } from "./user";

export const getList: Handler = (req, res) => {
  let listId: string | number[] = extractQueryParam(req, "listId");
  const uuid = extractQueryParam(req, "uuid");
  let media: string | number[] = extractQueryParam(req, "media");

  if (!media) {
    media = "";
  }
  if (!listId) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  if (isString(listId)) {
    listId = stringToNumberList(listId);
  }
  media = stringToNumberList(media);

  sendResult(res, internalListStorage.getList(listId, media, uuid));
};

export const postList: Handler = (req, res) => {
  const { uuid, list } = req.body;
  if (!list) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.addList(uuid, list));
};

export const putList: Handler = (req, res) => {
  const { uuid, list } = req.body;
  if (!list) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  // TODO: 05.09.2019 should this not be update list?
  sendResult(res, internalListStorage.addList(uuid, list));
};
export const deleteList: Handler = (req, res) => {
  const { listId, uuid } = req.body;
  if (!listId || !Number.isInteger(listId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.deleteList(listId, uuid));
};
export const getListMedium: Handler = (req, res) => {
  const listId = Number.parseInt(extractQueryParam(req, "listId"));
  const uuid = extractQueryParam(req, "uuid");
  let media: string | number[] = extractQueryParam(req, "media");

  if (!media || !isString(media)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  media = stringToNumberList(media);

  if (!listId || (Array.isArray(media) && !media.length)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.getList(listId, media, uuid));
};
export const postListMedium: Handler = (req, res) => {
  const { listId, mediumId, uuid } = req.body;

  if (!listId || !Number.isInteger(listId) || !mediumId || !isNumberOrArray(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.addItemToList({ listId, id: mediumId }, uuid));
};
export const putListMedium: Handler = (req, res) => {
  const { oldListId, newListId } = req.body;
  let { mediumId } = req.body;

  if (!Number.isInteger(mediumId)) {
    // FIXME: should expect number[] not string
    if (isString(mediumId)) {
      mediumId = stringToNumberList(mediumId);

      if (!mediumId.length) {
        sendResult(res, Promise.resolve(false));
        return;
      }
    } else {
      mediumId = undefined;
    }
  }
  if (!oldListId || !newListId || !mediumId) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.moveMedium(oldListId, newListId, mediumId));
};
export const deleteListMedium: Handler = (req, res) => {
  const { listId } = req.body;
  let { mediumId } = req.body;

  // FIXME: expect number[] nod string
  // if it is a string, it is likely a list of episodeIds was send
  if (isString(mediumId)) {
    mediumId = stringToNumberList(mediumId);
  }
  if (!listId || !mediumId || !isNumberOrArray(mediumId)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, internalListStorage.removeMedium(listId, mediumId));
};

export const getAllLists: Handler = getLists;

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
