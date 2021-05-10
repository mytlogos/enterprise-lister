import { newsStorage } from "bin/database/storages/storage";
import { stringToNumberList, Errors, isString } from "bin/tools";
import { Handler, Router } from "express";
import { extractQueryParam, sendResult, stopper } from "./apiTools";

export const getNews: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  let from: string | Date | undefined = extractQueryParam(req, "from", true);
  let to: string | Date | undefined = extractQueryParam(req, "to", true);
  let newsIds: string | number[] | undefined = extractQueryParam(req, "newsId", true);

  // if newsIds is specified, send only these news
  if (isString(newsIds)) {
    newsIds = stringToNumberList(newsIds);
    sendResult(res, newsStorage.getNews(uuid, undefined, undefined, newsIds));
  } else {
    // else send it based on time
    from = !from || from === "null" ? undefined : new Date(from);
    to = !to || to === "null" ? undefined : new Date(to);

    sendResult(res, newsStorage.getNews(uuid, from, to));
  }
};

export const getAllNews: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, newsStorage.getAll(uuid));
};

export const readNews: Handler = (req, res) => {
  const { uuid, read } = req.body;
  // TODO: change this validation, should expect a number[]
  if (!read || !isString(read)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  const currentlyReadNews = stringToNumberList(read);

  sendResult(res, newsStorage.markRead(uuid, currentlyReadNews));
};

export function newsRouter(): Router {
  const router = Router();
  router.post("/read", readNews);
  router.get("/all", getAllNews);

  // TODO: 30.06.2019 get Request does not want to work
  // TODO: 21.07.2019 update: testing this with intellij rest client does seem to work
  //  now is just needs to tested with the normal clients e.g. website and android app
  router.get("", getNews);
  router.use(stopper);
  return router;
}
