import { newsStorage } from "enterprise-core/dist/database/storages/storage";
import { Router } from "express";
import { GetNews, getNewsSchema, ReadNews, readNewsSchema } from "../validation";
import { castQuery, createHandler, extractQueryParam, stopper } from "./apiTools";

export const getNews = createHandler(
  (req) => {
    const { uuid, from: fromString, to: toString, newsId } = castQuery<GetNews>(req);

    // if newsIds is specified, send only these news
    if (newsId) {
      return newsStorage.getNews(uuid, undefined, undefined, newsId);
    } else {
      // else send it based on time
      const from = !fromString || fromString == null ? undefined : new Date(fromString);
      const to = !toString || toString == null ? undefined : new Date(toString);

      return newsStorage.getNews(uuid, from, to);
    }
  },
  { query: getNewsSchema },
);

export const getAllNews = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return newsStorage.getAll(uuid);
});

export const readNews = createHandler(
  (req) => {
    const { uuid, read }: ReadNews = req.body;
    return newsStorage.markRead(uuid, read);
  },
  { body: readNewsSchema },
);

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
