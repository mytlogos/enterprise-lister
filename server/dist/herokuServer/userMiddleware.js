"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const database_1 = require("../database/database");
const listManager_1 = require("../externals/listManager");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const scraperTools_1 = require("../externals/scraperTools");
const tools_1 = require("../tools");
exports.processResult = (req, res) => {
    sendResult(res, database_1.Storage.processResult(req.body));
};
exports.saveResult = (req, res) => {
    sendResult(res, database_1.Storage.saveResult(req.body));
};
exports.checkLogin = (req, res) => {
    sendResult(res, database_1.Storage.loggedInUser(req.ip));
};
exports.login = (req, res) => {
    const { userName, pw } = req.body;
    if (!userName || !pw) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.loginUser(userName, pw, req.ip));
};
exports.register = (req, res) => {
    const { userName, pw } = req.body;
    if (!userName || !pw) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.register(userName, pw, req.ip));
};
exports.logout = (req, res) => {
    const { uuid } = req.body;
    if (!uuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.logoutUser(uuid, req.ip));
};
exports.getInvalidated = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    if (!uuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.getInvalidated(uuid));
};
exports.addBookmarked = (req, res) => {
    const { uuid, bookmarked } = req.body;
    const protocol = /^https?:\/\//;
    if (bookmarked && bookmarked.length && bookmarked.every((link) => tools_1.isString(link) && protocol.test(link))) {
        const storePromise = database_1.Storage.addScrape(bookmarked.map((link) => {
            return { type: scraperTools_1.ScrapeType.ONETIMETOC, link, userId: uuid };
        }));
        sendResult(res, storePromise);
    }
    else {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
};
exports.addToc = (req, res) => {
    const { uuid, toc, mediumId } = req.body;
    const protocol = /^https?:\/\//;
    if (protocol.test(toc) && Number.isInteger(mediumId) && mediumId > 0) {
        const storePromise = database_1.Storage.addScrape({ type: scraperTools_1.ScrapeType.TOC, link: toc, userId: uuid, mediumId });
        sendResult(res, storePromise);
    }
    else {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
};
exports.downloadEpisode = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    const stringEpisode = extractQueryParam(req, "episode");
    const episodes = tools_1.stringToNumberList(stringEpisode);
    sendResult(res, database_1.Storage
        .getEpisode(episodes, uuid)
        .then((fullEpisodes) => scraperTools_1.downloadEpisodes(fullEpisodes.filter((value) => value))));
};
// fixme an error showed that req.query.something does not assign on first call, only on second???
exports.addListApi = (route) => {
    route.get((req, res) => {
        let listId = extractQueryParam(req, "listId");
        const uuid = extractQueryParam(req, "uuid");
        let media = extractQueryParam(req, "media");
        if (tools_1.isString(listId)) {
            listId = tools_1.stringToNumberList(listId);
        }
        media = tools_1.stringToNumberList(media);
        sendResult(res, database_1.Storage.getList(listId, media, uuid));
    });
    route.post((req, res) => {
        const { uuid, list } = req.body;
        sendResult(res, database_1.Storage.addList(uuid, list));
    });
    route.put((req, res) => {
        const { list } = req.body;
        sendResult(res, database_1.Storage.updateList(list));
    });
    route.delete((req, res) => {
        const { listId, uuid } = req.body;
        sendResult(res, database_1.Storage.deleteList(listId, uuid));
    });
};
exports.addListMediumRoute = (route) => {
    route.get((req, res) => {
        const listId = extractQueryParam(req, "listId");
        const uuid = extractQueryParam(req, "uuid");
        let media = extractQueryParam(req, "media");
        media = tools_1.stringToNumberList(media);
        sendResult(res, database_1.Storage.getList(listId, media, uuid));
    });
    route.post((req, res) => {
        const { listId, mediumId, uuid } = req.body;
        sendResult(res, database_1.Storage.addItemToList(listId, mediumId, uuid));
    });
    route.put((req, res) => {
        const { oldListId, newListId, mediumId, uuid } = req.body;
        sendResult(res, database_1.Storage.moveMedium(oldListId, newListId, mediumId, uuid));
    });
    route.delete((req, res) => {
        const { listId, mediumId, uuid } = req.body;
        sendResult(res, database_1.Storage.removeMedium(listId, mediumId, uuid));
    });
};
exports.addPartRoute = (route) => {
    route.get((req, res) => {
        const mediumId = extractQueryParam(req, "mediumId");
        const uuid = extractQueryParam(req, "uuid");
        if (mediumId == null) {
            let partId = extractQueryParam(req, "partId");
            // if it is a string, it is likely a list of partIds was send
            if (tools_1.isString(partId)) {
                partId = tools_1.stringToNumberList(partId);
            }
            sendResult(res, database_1.Storage.getParts(partId, uuid));
        }
        else {
            sendResult(res, database_1.Storage.getMediumParts(mediumId, uuid));
        }
    });
    route.post((req, res) => {
        const { part, mediumId, uuid } = req.body;
        part.mediumId = mediumId;
        sendResult(res, database_1.Storage.addPart(part, uuid));
    });
    route.put((req, res) => {
        const { part, uuid } = req.body;
        sendResult(res, database_1.Storage.updatePart(part, uuid));
    });
    route.delete((req, res) => {
        const { partId, uuid } = req.body;
        sendResult(res, database_1.Storage.deletePart(partId, uuid));
    });
};
exports.addEpisodeRoute = (route) => {
    route.get((req, res) => {
        let episodeId = extractQueryParam(req, "episodeId");
        const uuid = extractQueryParam(req, "uuid");
        // if it is a string, it is likely a list of episodeIds was send
        if (tools_1.isString(episodeId)) {
            episodeId = tools_1.stringToNumberList(episodeId);
        }
        sendResult(res, database_1.Storage.getEpisode(episodeId, uuid));
    });
    route.post((req, res) => {
        const { episode, partId, uuid } = req.body;
        episode.partId = partId;
        sendResult(res, database_1.Storage.addEpisode(episode, uuid));
    });
    route.put((req, res) => {
        const { episode, uuid } = req.body;
        sendResult(res, database_1.Storage.updateEpisode(episode, uuid));
    });
    route.delete((req, res) => {
        const { episodeId, uuid } = req.body;
        sendResult(res, database_1.Storage.deletePart(episodeId, uuid));
    });
};
exports.addExternalUserApi = (route) => {
    route.get((req, res) => {
        const externalUuid = extractQueryParam(req, "externalUuid");
        sendResult(res, database_1.Storage.getExternalUser(externalUuid));
    });
    route.post((req, res) => {
        const { uuid, externalUser } = req.body;
        sendResultCall(res, async () => {
            const listManager = listManager_1.factory(Number(externalUser.type));
            const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });
            if (!valid) {
                return Promise.reject(new Error(tools_1.Errors.INVALID_DATA));
            }
            delete externalUser.pwd;
            externalUser.cookies = listManager.stringifyCookies();
            return database_1.Storage.addExternalUser(uuid, externalUser);
        });
    });
    route.delete((req, res) => {
        const { externalUuid, uuid } = req.body;
        sendResult(res, database_1.Storage.deleteExternalUser(externalUuid, uuid));
    });
};
exports.addUserApi = (router) => {
    router.put((req, res) => {
        const { uuid, user } = req.body;
        sendResult(res, database_1.Storage.updateUser(uuid, user));
    });
    router.delete((req, res) => {
        const { uuid } = req.body;
        sendResult(res, database_1.Storage.deleteUser(uuid));
    });
};
exports.addProgressRoute = (router) => {
    router.get((req, res) => {
        const uuid = extractQueryParam(req, "uuid");
        const episodeId = extractQueryParam(req, "episodeId");
        sendResult(res, database_1.Storage.getProgress(uuid, episodeId));
    });
    router.post((req, res) => {
        const { uuid, episodeId, progress } = req.body;
        try {
            const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
            sendResult(res, database_1.Storage.addProgress(uuid, episodeId, progress, readDate));
        }
        catch (e) {
            console.log(e);
            logger_1.default.error(e);
            sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        }
    });
    router.put((req, res) => {
        const { uuid, episodeId, progress } = req.body;
        try {
            const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
            sendResult(res, database_1.Storage.updateProgress(uuid, episodeId, progress, readDate));
        }
        catch (e) {
            console.log(e);
            logger_1.default.error(e);
            sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        }
    });
    router.delete((req, res) => {
        const { uuid, episodeId } = req.body;
        sendResult(res, database_1.Storage.removeProgress(uuid, episodeId));
    });
};
exports.addMediumApi = (route) => {
    route.get((req, res) => {
        let mediumId = extractQueryParam(req, "mediumId");
        const uuid = extractQueryParam(req, "uuid");
        if (!Number.isInteger(mediumId)) {
            mediumId = tools_1.stringToNumberList(mediumId);
        }
        sendResult(res, database_1.Storage.getMedium(mediumId, uuid));
    });
    route.post((req, res) => {
        const { uuid, medium } = req.body;
        sendResult(res, database_1.Storage.addMedium(medium, uuid));
    });
    route.put((req, res) => {
        const { medium, uuid } = req.body;
        sendResult(res, database_1.Storage.updateMedium(medium, uuid));
    });
};
exports.addSuggestionsRoute = (route) => {
    // todo implement suggestions api for auto complete
};
exports.getLists = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, database_1.Storage.getUserLists(uuid));
};
exports.getNews = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    let from = extractQueryParam(req, "from");
    let to = extractQueryParam(req, "to");
    let newsIds = extractQueryParam(req, "newsId");
    // if newsIds is specified, send only these news
    if (tools_1.isString(newsIds)) {
        newsIds = tools_1.stringToNumberList(newsIds);
        sendResult(res, database_1.Storage.getNews({ uuid, newsIds }));
    }
    else {
        // else send it based on time
        from = !from || from === "null" ? undefined : new Date(from);
        to = !to || to === "null" ? undefined : new Date(to);
        sendResult(res, database_1.Storage.getNews({ uuid, since: from, till: to }));
    }
};
exports.authenticate = (req, res, next) => {
    let { uuid, session } = req.body;
    if (!uuid && !session) {
        uuid = extractQueryParam(req, "uuid");
        session = extractQueryParam(req, "session");
    }
    database_1.Storage
        .loggedInUser(req.ip)
        .then((result) => {
        if (result && session === result.session && uuid === result.uuid) {
            next();
        }
        else {
            res.status(400).json({ error: tools_1.Errors.INVALID_SESSION });
        }
    })
        .catch((error) => {
        res.status(500).json({ error: tools_1.isError(error) ? error : tools_1.Errors.INVALID_MESSAGE });
        logger_1.default.error(error);
    });
};
function sendResult(res, promise) {
    promise
        .then((result) => {
        res.json(result);
    })
        .catch((error) => {
        const errorCode = tools_1.isError(error);
        res
            .status(errorCode ? 400 : 500)
            .json({ error: errorCode ? error : tools_1.Errors.INVALID_MESSAGE });
        console.log(error);
        logger_1.default.error(error);
    });
}
function sendResultCall(res, callback) {
    let result;
    try {
        result = callback();
    }
    catch (e) {
        result = Promise.reject(e);
    }
    if (!result || !(result instanceof Promise)) {
        result = Promise.resolve(result);
    }
    sendResult(res, result);
}
function extractQueryParam(request, key) {
    let value = request.query[key];
    if (value == null) {
        value = request.query[key];
    }
    return value;
}
//# sourceMappingURL=userMiddleware.js.map