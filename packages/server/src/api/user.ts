import {
  appEventStorage,
  databaseStorage,
  episodeStorage,
  jobStorage,
  mediumStorage,
  notificationStorage,
  storage,
  userStorage,
} from "enterprise-core/dist/database/storages/storage";
import {
  filterScrapeAble,
  downloadEpisodes,
  loadToc,
  search as searchMedium,
} from "enterprise-scraper/dist/externals/scraperTools";
import { TocRequest } from "enterprise-scraper/dist/externals/types";
import logger from "enterprise-core/dist/logger";
import {
  Errors,
  getDate,
  isError,
  isInvalidId,
  isString,
  stringToNumberList,
  toArray,
} from "enterprise-core/dist/tools";
import {
  JobRequest,
  ScrapeName,
  AppEventFilter,
  AppEventProgram,
  AppEventType,
  AppEvent,
  QueryItems,
  QueryItemsResult,
  Uuid,
} from "enterprise-core/dist/types";
import { Handler, Router } from "express";
import { extractQueryParam, createHandler } from "./apiTools";
import { externalUserRouter } from "./externalUser";
import { hooksRouter } from "./hooks";
import { jobsRouter } from "./jobs";
import { getAllLists, listRouter } from "./list";
import { mediumRouter } from "./medium";
import { newsRouter } from "./news";
import { processRouter } from "./process";
import { crawlerRouter } from "./crawler";
import { CrawlerStatus, DatabaseStatus, Status } from "../types";
import os from "os";
import { readFile } from "fs/promises";
import path from "path";
import appConfig from "enterprise-core/dist/env";
import requestPromise from "request-promise-native";

export const authenticate: Handler = (req, res, next) => {
  let { uuid, session } = req.body;

  if (!uuid || !session) {
    uuid = extractQueryParam(req, "uuid");
    session = extractQueryParam(req, "session");
  }
  if (!uuid || !isString(uuid) || !session || !isString(session)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  userStorage
    .userLoginStatus(req.ip, uuid, session)
    .then((result) => {
      if (result) {
        next();
      } else {
        res.status(400).json({ error: Errors.INVALID_SESSION });
      }
    })
    .catch((error) => {
      res.status(500).json({ error: isError(error) ? error : Errors.INVALID_MESSAGE });
      logger.error(error);
    });
};

const getUser = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return userStorage.getUser(uuid, req.ip);
});

export const putUser = createHandler((req) => {
  const { uuid, user } = req.body;
  if (!user) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return userStorage.updateUser(uuid, user);
});

export const deleteUser = createHandler((req) => {
  const { uuid } = req.body;
  return userStorage.deleteUser(uuid);
});

const logout = createHandler((req) => {
  const { uuid } = req.body;
  // TODO: should logout only with valid session
  if (!uuid) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return userStorage.logoutUser(uuid, req.ip);
});

export const addBookmarked = createHandler(async (req) => {
  const { uuid, bookmarked } = req.body;
  const protocol = /^https?:\/\//;

  if (bookmarked?.length && bookmarked.every((url: any) => isString(url) && protocol.test(url))) {
    const scrapeAble = await filterScrapeAble(bookmarked);
    return jobStorage
      .addJobs(
        scrapeAble.available.map((link: string): JobRequest => {
          const tocRequest: TocRequest = {
            url: link,
            uuid,
          };
          return {
            name: `${ScrapeName.oneTimeToc}-${link}`,
            type: ScrapeName.oneTimeToc,
            runImmediately: true,
            deleteAfterRun: true,
            interval: -1,
            arguments: JSON.stringify(tocRequest),
          };
        }),
      )
      .then(() => scrapeAble.unavailable);
  } else {
    return Promise.reject(Errors.INVALID_INPUT);
  }
});

export const addToc = createHandler((req) => {
  const { uuid, toc, mediumId } = req.body;
  const protocol = /^https?:\/\//;

  if (protocol.test(toc) && Number.isInteger(mediumId) && mediumId > 0) {
    const tocRequest: TocRequest = {
      url: toc,
      uuid,
      mediumId,
    };
    return jobStorage
      .addJobs({
        name: `${ScrapeName.oneTimeToc}-${toc as string}`,
        type: ScrapeName.oneTimeToc,
        runImmediately: true,
        deleteAfterRun: true,
        interval: -1,
        arguments: JSON.stringify(tocRequest),
      })
      .then(() => true);
  } else {
    return Promise.reject(Errors.INVALID_INPUT);
  }
});

export const downloadEpisode = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  const stringEpisode = extractQueryParam(req, "episode");

  if (!stringEpisode || !isString(stringEpisode)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  const episodes: number[] = stringToNumberList(stringEpisode);

  if (!episodes || !episodes.length) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage
    .getEpisode(episodes, uuid)
    .then((fullEpisodes) => downloadEpisodes(fullEpisodes.filter((value) => value)));
});

export const getLists = getAllLists;

export const getAssociatedEpisode = createHandler((req) => {
  const url = extractQueryParam(req, "url");

  if (!url || !isString(url) || !/^https?:\/\//.test(url)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return episodeStorage.getAssociatedEpisode(url);
});

export const search = createHandler((req) => {
  const text = extractQueryParam(req, "text");
  const medium = Number(extractQueryParam(req, "medium"));

  if (Number.isNaN(medium) || !text) {
    return Promise.reject(Errors.INVALID_INPUT);
  }
  return searchMedium(text, medium);
});

export const getStats = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return storage.getStats(uuid);
});

export const getNew = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  const date = extractQueryParam(req, "date");
  return storage.getNew(uuid, date ? new Date(date) : undefined);
});

export const searchToc = createHandler((req) => {
  const link = decodeURIComponent(extractQueryParam(req, "link", false));
  return loadToc(link);
});

export const getToc = createHandler((req) => {
  let media: string | number | number[] = extractQueryParam(req, "mediumId");

  const listMedia = stringToNumberList(media);

  if (!listMedia.length) {
    media = Number.parseInt(media);

    if (isInvalidId(media)) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    media = [media];
  } else {
    media = listMedia;
  }

  if (!media || !media.length) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return mediumStorage.getMediumTocs(media);
});

export const deleteToc = createHandler((req) => {
  let mediumId: string | number = extractQueryParam(req, "mediumId");
  const link = extractQueryParam(req, "link");

  mediumId = Number.parseInt(mediumId, 10);

  if (isInvalidId(mediumId) || !link || !isString(link)) {
    return Promise.reject(Errors.INVALID_INPUT);
  }

  return mediumStorage.removeMediumToc(mediumId, link);
});

export const getNotifications = createHandler((req) => {
  const from = extractQueryParam(req, "from");
  const uuid = extractQueryParam(req, "uuid");
  const read = extractQueryParam(req, "read");
  const sizeString = extractQueryParam(req, "size", true) || "0";

  const fromDate = getDate(from);
  const size = Number(sizeString);

  if (!fromDate || !uuid || Number.isNaN(size)) {
    throw new Error(Errors.INVALID_INPUT);
  }

  return notificationStorage.getNotifications(fromDate, uuid, read.toLowerCase() === "true", size);
});

export const getNotificationsCount = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  const read = extractQueryParam(req, "read");
  return notificationStorage.countNotifications(uuid, read.toLowerCase() === "true");
});

export const postReadAllNotifications = createHandler((req) => {
  const { uuid } = req.body;
  return notificationStorage.readAllNotifications(uuid);
});

export const postReadNotification = createHandler((req) => {
  const { id, uuid } = req.body;

  if (isInvalidId(id)) {
    return new Error(Errors.INVALID_INPUT);
  }

  return notificationStorage.readNotification(id, uuid);
});

export const getAllAppEvents = createHandler((req) => {
  const filter: AppEventFilter = {};
  const from = extractQueryParam(req, "from", true);

  if (from) {
    filter.fromDate = getDate(from) || undefined;
  }
  const to = extractQueryParam(req, "to", true);
  if (to) {
    filter.toDate = getDate(to) || undefined;
  }

  const program = extractQueryParam(req, "program", true);

  if (program) {
    const programs = toArray(program);

    if (programs) {
      filter.program = programs as AppEventProgram[];
    } else {
      filter.program = program as AppEventProgram;
    }
  }

  const type = extractQueryParam(req, "type", true);

  if (type) {
    const types = toArray(type);

    if (types) {
      filter.type = types as AppEventType[];
    } else {
      filter.type = type as AppEventType;
    }
  }
  const sortOrder = extractQueryParam(req, "sortOrder", true);

  if (sortOrder) {
    const sortOrders = toArray(sortOrder);

    if (sortOrders) {
      filter.sortOrder = sortOrders as Array<keyof AppEvent>;
    } else {
      filter.sortOrder = sortOrder as keyof AppEvent;
    }
  }
  return appEventStorage.getAppEvents(filter);
});

async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const [dbVersion] = await databaseStorage.getServerVersion();
    return {
      status: "available",
      host: `${appConfig.dbHost}:${appConfig.dbPort}`,
      type: "mariadb",
      version: dbVersion.version,
    };
  } catch (error) {
    return {
      status: "unavailable",
      host: `${appConfig.dbHost}:${appConfig.dbPort}`,
      type: "mariadb",
    };
  }
}

async function getCrawlerStatus(): Promise<CrawlerStatus> {
  try {
    const status = await requestPromise.get({
      url: `http://${appConfig.crawlerHost}:${appConfig.crawlerPort}/status`,
      timeout: 500, // milliseconds
    });

    let statusObject: CrawlerStatus;

    if (isString(status)) {
      statusObject = JSON.parse(status);
    } else if (status && typeof status === "object" && !Array.isArray(status)) {
      statusObject = status;
    } else {
      return {
        status: "invalid",
      };
    }

    statusObject.status = "available";
    return statusObject;
  } catch (error) {
    return {
      status: "unavailable",
    };
  }
}

const getStatus = createHandler(async (): Promise<Status> => {
  const packageJsonPath = path.join(path.dirname(path.dirname(__dirname)), "package.json");

  const [database, crawler, packageString] = await Promise.all([
    getDatabaseStatus(),
    getCrawlerStatus(),
    readFile(packageJsonPath, { encoding: "utf8" }),
  ]);

  let packageJson: any;

  try {
    packageJson = JSON.parse(packageString);
  } catch (error) {
    packageJson = { project_version: "Error" };
  }

  return {
    crawler,
    database,
    server: {
      cpu_average: os.loadavg(),
      memory: process.memoryUsage(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      uptime: os.uptime(),
      project_version: packageJson.version,
      node_version: process.version,
      config: {
        dbConLimit: appConfig.dbConLimit,
        dbHost: appConfig.dbHost,
        dbUser: appConfig.dbUser,
        dbPort: appConfig.dbPort,
        crawlerHost: appConfig.crawlerHost,
        crawlerPort: appConfig.crawlerPort,
        crawlerWSPort: appConfig.crawlerWSPort,
        port: appConfig.port,
        measure: appConfig.measure,
        development: appConfig.development,
        stopScrapeEvents: appConfig.stopScrapeEvents,
      },
    },
  };
});

const postLoad = createHandler(async (request): Promise<QueryItemsResult> => {
  const { items, uuid }: { items: QueryItems; uuid: Uuid } = request.body;
  return storage.queryItems(uuid, items);
});

/**
 * Creates the User Api Router.
 *
 * @openapi
 * tags:
 *  name: User
 *  description: API for Users
 * components:
 *  parameters:
 *    UserUuid:
 *      name: uuid
 *      in: query
 *      description: UUID of the user
 *      required: true
 *      schema:
 *        type: string
 *    UserSession:
 *      name: session
 *      in: query
 *      description: session identifier of the user
 *      required: true
 *      schema:
 *        type: string
 */
export function userRouter(): Router {
  const router = Router();

  // authenticate user, every route and middleware
  // after this middleware should be protected with this now
  router.use(authenticate);

  const userRoute = router.route("");

  /**
   * @openapi
   * /api/user:
   *    get:
   *      tags: [User]
   *      description: get current user
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/User"
   *          description: the user
   */
  userRoute.get(getUser);

  /**
   * @openapi
   * /api/user:
   *    put:
   *      tags: [User]
   *      description: update current user
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
   *                user:
   *                  type: object
   *                  properties:
   *                    name:
   *                      type: string
   *                    newPassword:
   *                      type: string
   *                    password:
   *                      type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if update succeeded
   */
  userRoute.put(putUser);

  /**
   * @openapi
   * /api/user:
   *    delete:
   *      tags: [User]
   *      description: delete current user account
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
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if delete succeeded
   */
  userRoute.delete(deleteUser);

  /**
   * @openapi
   * /api/user/logout:
   *    post:
   *      tags: [User]
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
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if logout succeeded
   */
  router.post("/logout", logout);

  /**
   * @openapi
   * /api/user/lists:
   *    get:
   *      tags: [User]
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
  router.get("/lists", getLists);

  /**
   * @openapi
   * /api/user/bookmarked:
   *    post:
   *      tags: [User]
   *      description: Add Toc Scrape Requests for an Array of Links
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
   *                bookmarked:
   *                  type: array
   *                  items:
   *                    type: string
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  type: string
   *          description: An array of currently unscrapeable Links
   */
  router.post("/bookmarked", addBookmarked);

  /**
   * @openapi
   * /api/user/associated:
   *    get:
   *      tags: [User]
   *      description: search for a single episode associated with the given link
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: url
   *        in: query
   *        description: link to look for
   *        required: true
   *        schema:
   *          type: string
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Id"
   *          description: the episode id
   */
  router.get("/associated", getAssociatedEpisode);

  /**
   * @openapi
   * /api/user/searchtoc:
   *    get:
   *      tags: [User]
   *      description: scrape all Tocs for the given Link
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: link
   *        in: query
   *        description: link to scrape
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
   *                  $ref: "#/components/schemas/Toc"
   *          description: Toc array
   */
  router.get("/searchtoc", searchToc);

  /**
   * @openapi
   * /api/user/toc:
   *    post:
   *      tags: [User]
   *      description: Add Toc Scrape Request for the toc link and specific mediumId.
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
   *                toc:
   *                  type: string
   *                mediumId:
   *                  type: integer
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if request successfully added
   */
  router.post("/toc", addToc);

  /**
   * @openapi
   * /api/user/toc:
   *    get:
   *      tags: [User]
   *      description: Get the Tocs for multiple Media.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: mediumId
   *        in: query
   *        description: Media to get the Tocs from
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
   *                  $ref: "#/components/schemas/FullMediumToc"
   *          description: FullMediumToc array
   */
  router.get("/toc", getToc);

  /**
   * @openapi
   * /api/user/toc:
   *    delete:
   *      tags: [User]
   *      description: Delete a Toc and all associated data.
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
   *                link:
   *                  type: string
   *                mediumId:
   *                  type: integer
   *        required: true
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: boolean
   *          description: true if toc was successfully deleted
   */
  router.delete("/toc", deleteToc);

  /**
   * @openapi
   * /api/user/search:
   *    get:
   *      tags: [User]
   *      description: Search for Media with the given Title and Medium Type.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: text
   *        in: query
   *        description: Title Text to search for
   *        required: true
   *        schema:
   *          type: string
   *      - name: medium
   *        in: query
   *        description: Medium Type to search for
   *        required: true
   *        schema:
   *          type: integer
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/SearchResult"
   *          description: Search Result array
   */
  router.get("/search", search);

  /**
   * @openapi
   * /api/user/stats:
   *    get:
   *      tags: [User]
   *      description: get current Stats of Data
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                items:
   *                  $ref: "#/components/schemas/DataStats"
   */
  router.get("/stats", getStats);

  /**
   * @openapi
   * /api/user/new:
   *    get:
   *      tags: [User]
   *      description: Get all new Data since the given Date.
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: date
   *        in: query
   *        description: Date since last request in ISO Format
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
   *                  $ref: "#/components/schemas/NewData"
   *          description: List array
   */
  router.get("/new", getNew);

  /**
   * @openapi
   * /api/user/download:
   *    get:
   *      tags: [User]
   *      description: Download Content for the given Episodes
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: episode
   *        in: query
   *        description: episode ids
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
   *                  $ref: "#/components/schemas/DownloadContent"
   *          description: DownloadContent array
   */
  router.get("/download", downloadEpisode);

  /**
   * @openapi
   * /api/user/events:
   *    get:
   *      tags: [User]
   *      description: get all Lists of the current User
   *      parameters:
   *      - $ref: "#/components/parameters/UserUuid"
   *      - $ref: "#/components/parameters/UserSession"
   *      - name: from
   *        in: query
   *        description: Date in ISO Format
   *        required: false
   *        schema:
   *          type: string
   *      - name: to
   *        in: query
   *        description: Date in ISO Format
   *        required: false
   *        schema:
   *          type: string
   *      - name: program
   *        in: query
   *        description: Program to Query for
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            type: string
   *      - name: type
   *        in: query
   *        description: Event Type
   *        required: false
   *        schema:
   *          type: array
   *          items:
   *            type: string
   *      - name: sortOrder
   *        in: query
   *        description: Sort Order for Events
   *        required: false
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
   *                  $ref: "#/components/schemas/AppEvent"
   *          description: List array
   */
  router.get("/events", getAllAppEvents);
  router.get("/status", getStatus);
  router.get("/notification", getNotifications);
  router.post("/notification-read", postReadNotification);
  router.post("/notification-read-all", postReadAllNotifications);
  router.get("/notification-count", getNotificationsCount);
  router.post("/load", postLoad);

  router.use("/medium", mediumRouter());
  router.use("/jobs", jobsRouter());
  router.use("/hook", hooksRouter());
  router.use("/news", newsRouter());
  router.use("/list", listRouter());
  router.use("/process", processRouter());
  router.use("/externalUser", externalUserRouter());
  router.use("/crawler", crawlerRouter());
  return router;
}
