import {Storage} from "../database/database";
import {factory} from "../externals/listManager";
import {Handler, IRoute, Request, Response} from "express";
import logger from "../logger";
import {downloadEpisodes, ScrapeType} from "../externals/scraperTools";
import {Errors, isError, isString, stringToNumberList} from "../tools";

type RouteMiddleWare = (route: IRoute) => void;

export const processResult: Handler = (req, res) => {
    sendResult(res, Storage.processResult(req.body));
};

export const saveResult: Handler = (req, res) => {
    sendResult(res, Storage.saveResult(req.body));
};

export const checkLogin: Handler = (req, res) => {
    sendResult(res, Storage.loggedInUser(req.ip));
};

export const login: Handler = (req, res) => {
    const {userName, pw} = req.body;

    if (!userName || !pw) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
    sendResult(res, Storage.loginUser(userName, pw, req.ip));
};

export const register: Handler = (req, res) => {
    const {userName, pw} = req.body;

    if (!userName || !pw) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
    sendResult(res, Storage.register(userName, pw, req.ip));
};

export const logout: Handler = (req, res) => {
    const {uuid} = req.body;
    if (!uuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
    sendResult(res, Storage.logoutUser(uuid, req.ip));
};

export const getInvalidated: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    if (!uuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
    sendResult(res, Storage.getInvalidated(uuid));
};

export const addBookmarked: Handler = (req, res) => {
    const {uuid, bookmarked} = req.body;
    const protocol = /^https?:\/\//;

    if (bookmarked && bookmarked.length && bookmarked.every((link: any) => isString(link) && protocol.test(link))) {
        const storePromise = Storage.addScrape(bookmarked.map((link: string) => {
            return {type: ScrapeType.ONETIMETOC, link, userId: uuid};
        }));
        sendResult(res, storePromise);
    } else {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
};

export const addToc: Handler = (req, res) => {
    const {uuid, toc, mediumId} = req.body;
    const protocol = /^https?:\/\//;

    if (protocol.test(toc) && Number.isInteger(mediumId) && mediumId > 0) {
        const storePromise = Storage.addScrape({type: ScrapeType.TOC, link: toc, userId: uuid, mediumId});
        sendResult(res, storePromise);
    } else {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
};

export const downloadEpisode: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    const stringEpisode = extractQueryParam(req, "episode");
    const episodes: number[] = stringToNumberList(stringEpisode);

    sendResult(
        res,
        Storage
            .getEpisode(episodes, uuid)
            .then((fullEpisodes) => downloadEpisodes(fullEpisodes.filter((value) => value))));
};

// fixme an error showed that req.query.something does not assign on first call, only on second???
export const addListApi: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        let listId = extractQueryParam(req, "listId");
        const uuid = extractQueryParam(req, "uuid");
        let media = extractQueryParam(req, "media");

        if (isString(listId)) {
            listId = stringToNumberList(listId);
        }
        media = stringToNumberList(media);

        sendResult(res, Storage.getList(listId, media, uuid));
    });
    route.post((req, res) => {
        const {uuid, list} = req.body;
        sendResult(res, Storage.addList(uuid, list));
    });
    route.put((req, res) => {
        const {list} = req.body;
        sendResult(res, Storage.updateList(list));
    });
    route.delete((req, res) => {
        const {listId, uuid} = req.body;
        sendResult(res, Storage.deleteList(listId, uuid));
    });
};

export const addListMediumRoute: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const listId = extractQueryParam(req, "listId");
        const uuid = extractQueryParam(req, "uuid");
        let media = extractQueryParam(req, "media");
        media = stringToNumberList(media);

        sendResult(res, Storage.getList(listId, media, uuid));
    });
    route.post((req, res) => {
        const {listId, mediumId, uuid} = req.body;
        sendResult(res, Storage.addItemToList(listId, mediumId, uuid));
    });
    route.put((req, res) => {
        const {oldListId, newListId, mediumId, uuid} = req.body;
        sendResult(res, Storage.moveMedium(oldListId, newListId, mediumId, uuid));
    });
    route.delete((req, res) => {
        const {listId, mediumId, uuid} = req.body;
        sendResult(res, Storage.removeMedium(listId, mediumId, uuid));
    });
};

export const addPartRoute: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const mediumId = extractQueryParam(req, "mediumId");
        const uuid = extractQueryParam(req, "uuid");

        if (mediumId == null) {
            let partId = extractQueryParam(req, "partId");
            // if it is a string, it is likely a list of partIds was send
            if (isString(partId)) {
                partId = stringToNumberList(partId);
            }
            sendResult(res, Storage.getParts(partId, uuid));
        } else {
            sendResult(res, Storage.getMediumParts(mediumId, uuid));
        }
    });
    route.post((req, res) => {
        const {part, mediumId, uuid} = req.body;
        part.mediumId = mediumId;
        sendResult(res, Storage.addPart(part, uuid));
    });
    route.put((req, res) => {
        const {part, uuid} = req.body;
        sendResult(res, Storage.updatePart(part, uuid));
    });
    route.delete((req, res) => {
        const {partId, uuid} = req.body;
        sendResult(res, Storage.deletePart(partId, uuid));
    });
};

export const addEpisodeRoute: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        let episodeId = extractQueryParam(req, "episodeId");
        const uuid = extractQueryParam(req, "uuid");

        // if it is a string, it is likely a list of episodeIds was send
        if (isString(episodeId)) {
            episodeId = stringToNumberList(episodeId);
        }
        sendResult(res, Storage.getEpisode(episodeId, uuid));
    });
    route.post((req, res) => {
        const {episode, partId, uuid} = req.body;
        episode.partId = partId;
        sendResult(res, Storage.addEpisode(episode, uuid));
    });
    route.put((req, res) => {
        const {episode, uuid} = req.body;
        sendResult(res, Storage.updateEpisode(episode, uuid));
    });
    route.delete((req, res) => {
        const {episodeId, uuid} = req.body;
        sendResult(res, Storage.deletePart(episodeId, uuid));
    });
};

export const addExternalUserApi: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const externalUuid = extractQueryParam(req, "externalUuid");
        sendResult(res, Storage.getExternalUser(externalUuid));
    });
    route.post((req, res) => {
        const {uuid, externalUser} = req.body;

        sendResultCall(res, async () => {
            const listManager = factory(Number(externalUser.type));
            const valid = await listManager.test({identifier: externalUser.identifier, password: externalUser.pwd});

            if (!valid) {
                return Promise.reject(new Error(Errors.INVALID_DATA));
            }
            delete externalUser.pwd;
            externalUser.cookies = listManager.stringifyCookies();

            return Storage.addExternalUser(uuid, externalUser);
        });
    });
    route.delete((req, res) => {
        const {externalUuid, uuid} = req.body;
        sendResult(res, Storage.deleteExternalUser(externalUuid, uuid));
    });
};

export const addUserApi: RouteMiddleWare = (router) => {
    router.put((req, res) => {
        const {uuid, user} = req.body;
        sendResult(res, Storage.updateUser(uuid, user));
    });
    router.delete((req, res) => {
        const {uuid} = req.body;
        sendResult(res, Storage.deleteUser(uuid));
    });
};

export const addProgressRoute: RouteMiddleWare = (router) => {
    router.get((req, res) => {
        const uuid = extractQueryParam(req, "uuid");
        const episodeId = extractQueryParam(req, "episodeId");
        sendResult(res, Storage.getProgress(uuid, episodeId));
    });
    router.post((req, res) => {
        const {uuid, episodeId, progress} = req.body;
        try {
            const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
            sendResult(res, Storage.addProgress(uuid, episodeId, progress, readDate));
        } catch (e) {
            console.log(e);
            logger.error(e);
            sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        }
    });
    router.put((req, res) => {
        const {uuid, episodeId, progress} = req.body;
        try {
            const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
            sendResult(res, Storage.updateProgress(uuid, episodeId, progress, readDate));
        } catch (e) {
            console.log(e);
            logger.error(e);
            sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        }
    });
    router.delete((req, res) => {
        const {uuid, episodeId} = req.body;
        sendResult(res, Storage.removeProgress(uuid, episodeId));
    });
};

export const addMediumApi: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        let mediumId = extractQueryParam(req, "mediumId");
        const uuid = extractQueryParam(req, "uuid");

        if (!Number.isInteger(mediumId)) {
            mediumId = stringToNumberList(mediumId);
        }
        sendResult(res, Storage.getMedium(mediumId, uuid));
    });
    route.post((req, res) => {
        const {uuid, medium} = req.body;
        sendResult(res, Storage.addMedium(medium, uuid));
    });
    route.put((req, res) => {
        const {medium, uuid} = req.body;
        sendResult(res, Storage.updateMedium(medium, uuid));
    });
};

export const addSuggestionsRoute: RouteMiddleWare = (route) => {
    // todo implement suggestions api for auto complete
};

export const getLists: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, Storage.getUserLists(uuid));
};

export const getNews: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    let from = extractQueryParam(req, "from");
    let to = extractQueryParam(req, "to");
    let newsIds = extractQueryParam(req, "newsId");

    // if newsIds is specified, send only these news
    if (isString(newsIds)) {
        newsIds = stringToNumberList(newsIds);
        sendResult(res, Storage.getNews({uuid, newsIds}));
    } else {
        // else send it based on time
        from = !from || from === "null" ? undefined : new Date(from);
        to = !to || to === "null" ? undefined : new Date(to);

        sendResult(res, Storage.getNews({uuid, since: from, till: to}));
    }
};

export const authenticate: Handler = (req, res, next) => {
    let {uuid, session} = req.body;

    if (!uuid && !session) {
        uuid = extractQueryParam(req, "uuid");
        session = extractQueryParam(req, "session");
    }

    Storage
        .loggedInUser(req.ip)
        .then((result) => {
            if (result && session === result.session && uuid === result.uuid) {
                next();
            } else {
                res.status(400).json({error: Errors.INVALID_SESSION});
            }
        })
        .catch((error) => {
            res.status(500).json({error: isError(error) ? error : Errors.INVALID_MESSAGE});
            logger.error(error);
        });
};

function sendResult(res: Response, promise: Promise<any>) {
    promise
        .then((result) => {
            res.json(result);
        })
        .catch((error) => {
            const errorCode = isError(error);
            res
                .status(errorCode ? 400 : 500)
                .json({error: errorCode ? error : Errors.INVALID_MESSAGE});

            console.log(error);
            logger.error(error);
        });
}

function sendResultCall(res: Response, callback: () => any) {
    let result;
    try {
        result = callback();
    } catch (e) {
        result = Promise.reject(e);
    }

    if (!result || !(result instanceof Promise)) {
        result = Promise.resolve(result);
    }
    sendResult(res, result);
}

function extractQueryParam(request: Request, key: string) {
    let value = request.query[key];

    if (value == null) {
        value = request.query[key];
    }
    return value;
}
