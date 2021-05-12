import { newsStorage } from "../database/storages/storage";
import { stringToNumberList, Errors, isString } from "../tools";
import { Router } from "express";
import { createHandler, extractQueryParam, stopper } from "./apiTools";

export const getNews = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  let from: string | Date | undefined = extractQueryParam(req, "from", true);
  let to: string | Date | undefined = extractQueryParam(req, "to", true);
  let newsIds: string | number[] | undefined = extractQueryParam(req, "newsId", true);

  // if newsIds is specified, send only these news
  if (isString(newsIds)) {
    newsIds = stringToNumberList(newsIds);
    return newsStorage.getNews(uuid, undefined, undefined, newsIds);
  } else {
    // else send it based on time
    from = !from || from === "null" ? undefined : new Date(from);
    to = !to || to === "null" ? undefined : new Date(to);

    return newsStorage.getNews(uuid, from, to);
  }
});

export const getAllNews = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return newsStorage.getAll(uuid);
});

export const readNews = createHandler((req) => {
  const { uuid, read } = req.body;
  // TODO: change this validation, should expect a number[]
  if (!read || !isString(read)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  const currentlyReadNews = stringToNumberList(read);

  return newsStorage.markRead(uuid, currentlyReadNews);
});

/**
 * Creates the User Api Router.
 *
 * @openapi
 * tags:
 *  name: News
 *  description: API for News
 */
export function newsRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api/user/news/read:
   *    post:
   *      tags: [News]
   *      description: Update Read Status of News
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
   *                read:
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
   *          description: true if update succeeded
   */
  router.post("/read", readNews);

  /**
   * @openapi
   * /api/user/news/all:
   *    get:
   *      tags: [News]
   *      description: Query for all News
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
   *                  $ref: "#/components/schemas/News"
   *          description: array of objects
   */
  router.get("/all", getAllNews);

  // TODO: 30.06.2019 get Request does not want to work
  // TODO: 21.07.2019 update: testing this with intellij rest client does seem to work
  //  now is just needs to tested with the normal clients e.g. website and android app

  /**
   * @openapi
   * /api/user/news:
   *    get:
   *      tags: [News]
   *      description: get current user
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: from
   *        in: query
   *        description: Date in ISO
   *        required: false
   *        schema:
   *          type: string
   *      - name: to
   *        in: query
   *        description: Date in ISO
   *        required: false
   *        schema:
   *          type: string
   *      - name: newsId
   *        in: query
   *        description: link to scrape
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
   *                  $ref: "#/components/schemas/News"
   *          description: array of news
   */
  router.get("", getNews);
  router.use(stopper);
  return router;
}
