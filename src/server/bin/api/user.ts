import {
  appEventStorage,
  episodeStorage,
  internalListStorage,
  jobStorage,
  mediumStorage,
  storage,
  userStorage,
} from "bin/database/storages/storage";
import { filterScrapeAble, downloadEpisodes, loadToc, search as searchMedium } from "bin/externals/scraperTools";
import { TocRequest } from "bin/externals/types";
import logger from "bin/logger";
import { Errors, getDate, isError, isInvalidId, isString, stringToNumberList, toArray } from "bin/tools";
import { JobRequest, ScrapeName, AppEventFilter, AppEventProgram, AppEventType, AppEvent } from "bin/types";
import { Handler, Router } from "express";
import { extractQueryParam, createHandler } from "./apiTools";
import { externalUserRouter } from "./externalUser";
import { hooksRouter } from "./hooks";
import { jobsRouter } from "./jobs";
import { listRouter } from "./list";
import { mediumRouter } from "./medium";
import { newsRouter } from "./news";
import { processRouter } from "./process";

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

export const addBookmarked = createHandler((req) => {
  const { uuid, bookmarked } = req.body;
  const protocol = /^https?:\/\//;

  if (bookmarked && bookmarked.length && bookmarked.every((url: any) => isString(url) && protocol.test(url))) {
    const scrapeAble = filterScrapeAble(bookmarked);

    const storePromise = jobStorage
      .addJobs(
        scrapeAble.available.map(
          (link: string): JobRequest => {
            return {
              name: `${ScrapeName.oneTimeToc}-${link}`,
              type: ScrapeName.oneTimeToc,
              runImmediately: true,
              deleteAfterRun: true,
              interval: -1,
              arguments: JSON.stringify({
                url: link,
                uuid,
              } as TocRequest),
            };
          },
        ),
      )
      .then(() => scrapeAble.unavailable);
    return storePromise;
  } else {
    return Promise.reject(Errors.INVALID_INPUT);
  }
});

export const addToc = createHandler((req) => {
  const { uuid, toc, mediumId } = req.body;
  const protocol = /^https?:\/\//;

  if (protocol.test(toc) && Number.isInteger(mediumId) && mediumId > 0) {
    const storePromise = jobStorage
      .addJobs({
        name: `${ScrapeName.oneTimeToc}-${toc}`,
        type: ScrapeName.oneTimeToc,
        runImmediately: true,
        deleteAfterRun: true,
        interval: -1,
        arguments: JSON.stringify({
          url: toc,
          uuid,
          mediumId,
        } as TocRequest),
      })
      .then(() => true);
    return storePromise;
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

export const getLists = createHandler((req) => {
  const uuid = extractQueryParam(req, "uuid");
  return internalListStorage.getUserLists(uuid);
});

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

export const getAllAppEvents = createHandler((req) => {
  const filter = {} as AppEventFilter;
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

/**
 * Creates the User Api Router.
 */
export function userRouter(): Router {
  const router = Router();

  // authenticate user, every route and middleware
  // after this middleware should be protected with this now
  router.use(authenticate);

  const userRoute = router.route("");

  // check if an user is logged in for ip
  userRoute.get(getUser);
  userRoute.put(putUser);
  userRoute.delete(deleteUser);

  router.post("/logout", logout);
  router.get("/lists", getLists);
  router.post("/bookmarked", addBookmarked);
  router.get("/associated", getAssociatedEpisode);
  router.get("/searchtoc", searchToc);
  router.post("/toc", addToc);
  router.get("/toc", getToc);
  router.delete("/toc", deleteToc);
  router.get("/search", search);
  router.get("/stats", getStats);
  router.get("/new", getNew);
  router.get("/download", downloadEpisode);
  router.get("/events", getAllAppEvents);

  router.use("/medium", mediumRouter());
  router.use("/jobs", jobsRouter());
  router.use("/hook", hooksRouter());
  router.use("/news", newsRouter());
  router.use("/list", listRouter());
  router.use("/process", processRouter());
  router.use("/externalUser", externalUserRouter());

  return router;
}
