import {Errors, isError as isErrorCode, Storage} from "./database";
import {factory} from "./externals/listManager";
import {Handler, IRoute, Request, Response} from "express";

type RouteMiddleWare = (route: IRoute) => void;

export const processResult: Handler = (req, res) => {
    sendResult(res, Storage.processResult(req.body));
};

export const saveResult: Handler = (req, res) => {
    sendResult(res, Storage.saveResult(req.body));
};

export const checkLogin: Handler = (req, res) => {
    sendResult(res, Storage.userLoginStatus(req.ip));
};

export const login: Handler = (req, res) => {
    const {userName, pw} = req.body;
    sendResult(res, Storage.loginUser(userName, pw, req.ip));
};

export const register: Handler = (req, res) => {
    const {userName, pw} = req.body;
    sendResult(res, Storage.register(userName, pw, req.ip));
};

export const logout: Handler = (req, res) => {
    const {uuid} = req.body;
    sendResult(res, Storage.logoutUser(uuid, req.ip));
};
// fixme an error showed that req.query.something does not assign on first call, only on second???
export const addListApi: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const listId = extractQueryParam(req, "listId");
        sendResult(res, Storage.getList(listId));
    });
    route.post((req, res) => {
        const {uuid, list: list} = req.body;
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
        let media = extractQueryParam(req, "media");
        media = media.split(",");
        media = req.query.media.split(",").map((value: any) => Number(value));

        const listPromise = Storage
            .getList(listId)
            .then((obj) => obj.media.filter((value) => media.includes(value.id)));

        sendResult(res, listPromise);
    });
    route.post((req, res) => {
        const {listId, mediumId} = req.body;
        sendResult(res, Storage.addItemToList(listId, mediumId));
    });
    route.put((req, res) => {
        const {oldListId, newListId, mediumId} = req.body;
        sendResult(res, Storage.moveMedium(oldListId, newListId, mediumId));
    });
    route.delete((req, res) => {
        const {listId, mediumId} = req.body;
        sendResult(res, Storage.removeMedium(listId, mediumId));
    });
};

export const addPartRoute: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const mediumId = extractQueryParam(req, "mediumId");
        sendResult(res, Storage.getParts(mediumId));
    });
    route.post((req, res) => {
        const {part, mediumId} = req.body;
        sendResult(res, Storage.addPart(mediumId, part));
    });
    route.put((req, res) => {
        const {part} = req.body;
        sendResult(res, Storage.updatePart(part));
    });
    route.delete((req, res) => {
        const {partId} = req.body;
        sendResult(res, Storage.deletePart(partId));
    });
};

export const addEpisodeRoute: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        const episodeId = extractQueryParam(req, "episodeId");
        sendResult(res, Storage.getEpisode(episodeId));
    });
    route.post((req, res) => {
        const {medium, partId} = req.body;
        sendResult(res, Storage.addEpisode(partId, medium));
    });
    route.put((req, res) => {
        const {episode} = req.body;
        sendResult(res, Storage.updateEpisode(episode));
    });
    route.delete((req, res) => {
        const {episodeId} = req.body;
        sendResult(res, Storage.deletePart(episodeId));
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
                return Promise.reject(Errors.INVALID_DATA);
            }
            delete externalUser.pwd;
            externalUser.cookies = listManager.stringifyCookies();

            return Storage.addExternalUser(uuid, externalUser);
        });
    });
    route.delete((req, res) => {
        const {externalUuid} = req.body;
        sendResult(res, Storage.deleteExternalUser(externalUuid));
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
        const {uuid, episode_id, progress} = req.body;
        sendResult(res, Storage.addProgress(uuid, episode_id, progress));
    });
    router.put((req, res) => {
        const {uuid, episode_id, progress} = req.body;
        sendResult(res, Storage.updateProgress(uuid, episode_id, progress));
    });
    router.delete((req, res) => {
        const {uuid, episode_id} = req.body;
        sendResult(res, Storage.removeProgress(uuid, episode_id));
    });
};

export const addMediumApi: RouteMiddleWare = (route) => {
    route.get((req, res) => {
        let mediumId = extractQueryParam(req, "mediumId");
        if (!Number.isInteger(mediumId)) {
            mediumId = mediumId.split(",").map((value: any) => Number(value));
        }
        sendResult(res, Storage.getMedium(mediumId));
    });
    route.post((req, res) => {
        const {uuid, medium} = req.body;
        sendResult(res, Storage.addMedium(medium, uuid));
    });
    route.put((req, res) => {
        const {medium} = req.body;
        sendResult(res, Storage.updateMedium(medium));
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

    from = !from || from === "null" ? undefined : new Date(from);
    to = !to || to === "null" ? undefined : new Date(to);

    sendResult(res, Storage.getNews({uuid, since: from, till: to}));
};

export const authenticate: Handler = (req, res, next) => {
    let {uuid, session} = req.body;

    if (!uuid && !session) {
        uuid = extractQueryParam(req, "uuid");
        session = extractQueryParam(req, "session");
    }

    Storage
        .userLoginStatus(req.ip)
        .then((result) => {
            if (result && session === result.session && uuid === result.uuid) {
                next();
            } else {
                res.status(400).json({error: Errors.INVALID_SESSION});
            }
        })
        .catch((error) => res.status(500).json({error: isErrorCode(error) ? error : Errors.INVALID_MESSAGE}));
};

function sendResult(res: Response, promise: Promise<any>) {
    promise
        .then((result) => res.json(result))
        .catch((error) => {
            const errorCode = isErrorCode(error);
            res
                .status(errorCode ? 400 : 500)
                .json({error: errorCode ? error : Errors.INVALID_MESSAGE});
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
