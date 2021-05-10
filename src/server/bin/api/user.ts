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
import { sendResult, extractQueryParam } from "./apiTools";
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
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
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

const getUser: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, userStorage.getUser(uuid, req.ip));
};

export const putUser: Handler = (req, res) => {
  const { uuid, user } = req.body;
  if (!user) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, userStorage.updateUser(uuid, user));
};

export const deleteUser: Handler = (req, res) => {
  const { uuid } = req.body;
  sendResult(res, userStorage.deleteUser(uuid));
};

const logout: Handler = (req, res) => {
  const { uuid } = req.body;
  // TODO: should logout only with valid session
  if (!uuid) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, userStorage.logoutUser(uuid, req.ip));
};

export const addBookmarked: Handler = (req, res) => {
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
    sendResult(res, storePromise);
  } else {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
  }
};

export const addToc: Handler = (req, res) => {
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
    sendResult(res, storePromise);
  } else {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
  }
};

export const downloadEpisode: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  const stringEpisode = extractQueryParam(req, "episode");

  if (!stringEpisode || !isString(stringEpisode)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  const episodes: number[] = stringToNumberList(stringEpisode);

  if (!episodes || !episodes.length) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(
    res,
    episodeStorage
      .getEpisode(episodes, uuid)
      .then((fullEpisodes) => downloadEpisodes(fullEpisodes.filter((value) => value))),
  );
};

export const getLists: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, internalListStorage.getUserLists(uuid));
};

export const getAssociatedEpisode: Handler = (req, res) => {
  const url = extractQueryParam(req, "url");

  if (!url || !isString(url) || !/^https?:\/\//.test(url)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, episodeStorage.getAssociatedEpisode(url));
};

export const search: Handler = (req, res) => {
  const text = extractQueryParam(req, "text");
  const medium = Number(extractQueryParam(req, "medium"));

  if (Number.isNaN(medium) || !text) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }
  sendResult(res, searchMedium(text, medium));
};

export const getStats: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  sendResult(res, storage.getStats(uuid));
};

export const getNew: Handler = (req, res) => {
  const uuid = extractQueryParam(req, "uuid");
  const date = extractQueryParam(req, "date");
  sendResult(res, storage.getNew(uuid, date ? new Date(date) : undefined));
};

export const searchToc: Handler = (req, res) => {
  const link = decodeURIComponent(extractQueryParam(req, "link", false));
  sendResult(res, loadToc(link));
};

export const getToc: Handler = (req, res) => {
  let media: string | number | number[] = extractQueryParam(req, "mediumId");

  const listMedia = stringToNumberList(media);

  if (!listMedia.length) {
    media = Number.parseInt(media);

    if (isInvalidId(media)) {
      sendResult(res, Promise.reject(Errors.INVALID_INPUT));
      return;
    }
    media = [media];
  } else {
    media = listMedia;
  }

  if (!media || !media.length) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(res, mediumStorage.getMediumTocs(media));
};

export const deleteToc: Handler = (req, res) => {
  let mediumId: string | number = extractQueryParam(req, "mediumId");
  const link = extractQueryParam(req, "link");

  mediumId = Number.parseInt(mediumId, 10);

  if (isInvalidId(mediumId) || !link || !isString(link)) {
    sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    return;
  }

  sendResult(res, mediumStorage.removeMediumToc(mediumId, link));
};

export const getAllAppEvents: Handler = (req, res) => {
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
  sendResult(res, appEventStorage.getAppEvents(filter));
};

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
