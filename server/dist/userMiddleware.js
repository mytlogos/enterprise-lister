"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const storage_1 = require("./database/storages/storage");
const listManager_1 = require("./externals/listManager");
const stringify_stream_1 = tslib_1.__importDefault(require("stringify-stream"));
const logger_1 = require("./logger");
const scraperTools_1 = require("./externals/scraperTools");
const tools_1 = require("./tools");
const types_1 = require("./types");
const tunnel_1 = require("./tunnel");
const env_1 = tslib_1.__importDefault(require("./env"));
exports.search = (req, res) => {
    const text = extractQueryParam(req, "text");
    const medium = Number(extractQueryParam(req, "medium"));
    if (Number.isNaN(medium) || !text) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, scraperTools_1.search(text, medium));
};
exports.getStats = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, storage_1.storage.getStats(uuid));
};
exports.getNew = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    let date = extractQueryParam(req, "date");
    date = date ? new Date(date) : undefined;
    sendResult(res, storage_1.storage.getNew(uuid, date));
};
exports.getAllMedia = (req, res) => {
    sendResult(res, storage_1.mediumStorage.getAllMedia());
};
exports.putConsumeUnusedMedia = (req, res) => {
    const { mediumId, tocsMedia } = req.body;
    if (mediumId <= 0 || !tocsMedia || !Array.isArray(tocsMedia) || !tocsMedia.length) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.mediumInWaitStorage.consumeMediaInWait(mediumId, tocsMedia));
};
exports.postCreateFromUnusedMedia = (req, res) => {
    const { createMedium, tocsMedia, listId } = req.body;
    if (!createMedium || listId <= 0) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.mediumInWaitStorage.createFromMediaInWait(createMedium, tocsMedia, listId));
};
exports.getUnusedMedia = (req, res) => {
    sendResult(res, storage_1.mediumInWaitStorage.getMediaInWait());
};
exports.readNews = (req, res) => {
    const { uuid, read } = req.body;
    if (!read || !tools_1.isString(read)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    const currentlyReadNews = tools_1.stringToNumberList(read);
    sendResult(res, storage_1.newsStorage.markNewsRead(uuid, currentlyReadNews));
};
exports.processReadEpisode = (req, res) => {
    const { uuid, result } = req.body;
    if (!result) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.markEpisodeRead(uuid, result));
};
exports.processProgress = (req, res) => {
    const { uuid, progress } = req.body;
    if (!progress) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.setProgress(uuid, progress));
};
exports.refreshExternalUser = (req, res) => {
    const externalUuid = extractQueryParam(req, "externalUuid");
    if (!externalUuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    const externalUserWithCookies = storage_1.externalUserStorage.getExternalUserWithCookies(externalUuid);
    const storePromise = externalUserWithCookies.then((value) => storage_1.jobStorage.addJobs({
        type: types_1.ScrapeName.oneTimeUser,
        interval: -1,
        deleteAfterRun: true,
        runImmediately: true,
        name: `${types_1.ScrapeName.oneTimeUser}-${value.uuid}`,
        arguments: JSON.stringify({
            link: value.uuid,
            userId: value.userUuid,
            externalUserId: value.uuid,
            info: value.cookies
        })
    }));
    sendResult(res, storePromise);
};
exports.processResult = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.storage.processResult(req.body));
};
exports.saveResult = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.storage.saveResult(req.body));
};
exports.getTunnel = (req, res) => {
    sendResult(res, Promise.resolve(tunnel_1.getTunnelUrl()));
};
exports.getDev = (req, res) => {
    sendResult(res, Promise.resolve(Boolean(env_1.default.development)));
};
exports.checkLogin = (req, res) => {
    sendResult(res, storage_1.userStorage.loggedInUser(req.ip));
};
exports.getUser = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, storage_1.userStorage.getUser(uuid, req.ip));
};
exports.login = (req, res) => {
    const { userName, pw } = req.body;
    if (!userName || !pw) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.userStorage.loginUser(userName, pw, req.ip));
};
exports.register = (req, res) => {
    const { userName, pw } = req.body;
    if (!userName || !pw) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.userStorage.register(userName, pw, req.ip));
};
exports.logout = (req, res) => {
    const { uuid } = req.body;
    if (!uuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.userStorage.logoutUser(uuid, req.ip));
};
exports.getInvalidated = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    if (!uuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.storage.getInvalidatedStream(uuid));
};
exports.addBookmarked = (req, res) => {
    const { uuid, bookmarked } = req.body;
    const protocol = /^https?:\/\//;
    if (bookmarked && bookmarked.length && bookmarked.every((url) => tools_1.isString(url) && protocol.test(url))) {
        const storePromise = storage_1.jobStorage.addJobs(bookmarked.map((link) => {
            return {
                name: `${types_1.ScrapeName.oneTimeToc}-${link}`,
                type: types_1.ScrapeName.oneTimeToc,
                runImmediately: true,
                deleteAfterRun: true,
                interval: -1,
                arguments: JSON.stringify({
                    url: link,
                    uuid
                })
            };
        })).then((value) => Array.isArray(value) ? !!value.length : !!value);
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
        const storePromise = storage_1.jobStorage.addJobs({
            name: `${types_1.ScrapeName.oneTimeToc}-${toc}`,
            type: types_1.ScrapeName.oneTimeToc,
            runImmediately: true,
            deleteAfterRun: true,
            interval: -1,
            arguments: JSON.stringify({
                url: toc,
                uuid,
                mediumId
            })
        });
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
    if (!episodes || !episodes.length) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage
        .getEpisode(episodes, uuid)
        .then((fullEpisodes) => scraperTools_1.downloadEpisodes(fullEpisodes.filter((value) => value))));
};
exports.getList = (req, res) => {
    let listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");
    if (!media) {
        media = "";
    }
    if (!listId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    if (tools_1.isString(listId)) {
        listId = tools_1.stringToNumberList(listId);
    }
    media = tools_1.stringToNumberList(media);
    sendResult(res, storage_1.internalListStorage.getList(listId, media, uuid));
};
exports.postList = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.internalListStorage.addList(uuid, list));
};
exports.putList = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    // TODO: 05.09.2019 should this not be update list?
    sendResult(res, storage_1.internalListStorage.addList(uuid, list));
};
exports.deleteList = (req, res) => {
    const { listId, uuid } = req.body;
    if (!listId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.internalListStorage.deleteList(listId, uuid));
};
exports.getListMedium = (req, res) => {
    const listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");
    media = tools_1.stringToNumberList(media);
    if (!listId || !media || (Array.isArray(media) && !media.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.internalListStorage.getList(listId, media, uuid));
};
exports.postListMedium = (req, res) => {
    const { listId, mediumId, uuid } = req.body;
    if (!listId || !mediumId || (Array.isArray(mediumId) && !mediumId.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    // @ts-ignore
    sendResult(res, storage_1.internalListStorage.addItemToList(listId, mediumId, uuid));
};
exports.putListMedium = (req, res) => {
    const { oldListId, newListId } = req.body;
    let { mediumId } = req.body;
    if (Number.isNaN(mediumId)) {
        if (tools_1.isString(mediumId)) {
            mediumId = tools_1.stringToNumberList(mediumId);
            if (!mediumId.length) {
                sendResult(res, Promise.resolve(false));
                return;
            }
        }
        else {
            mediumId = undefined;
        }
    }
    if (!oldListId || !newListId || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.internalListStorage.moveMedium(oldListId, newListId, mediumId));
};
exports.deleteListMedium = (req, res) => {
    const { listId } = req.body;
    let { mediumId } = req.body;
    // if it is a string, it is likely a list of episodeIds was send
    if (tools_1.isString(mediumId)) {
        mediumId = tools_1.stringToNumberList(mediumId);
    }
    if (!listId || !mediumId || (Array.isArray(mediumId) && !mediumId.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.internalListStorage.removeMedium(listId, mediumId));
};
exports.getPart = (req, res) => {
    const mediumId = extractQueryParam(req, "mediumId");
    const uuid = extractQueryParam(req, "uuid");
    if (mediumId == null) {
        let partId = extractQueryParam(req, "partId");
        // if it is a string, it is likely a list of partIds was send
        if (tools_1.isString(partId)) {
            partId = tools_1.stringToNumberList(partId);
        }
        if (!partId) {
            sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
            return;
        }
        sendResult(res, storage_1.partStorage.getParts(partId, uuid));
    }
    else {
        sendResult(res, storage_1.partStorage.getMediumParts(mediumId, uuid));
    }
};
exports.getPartItems = (req, res) => {
    let partId = extractQueryParam(req, "part");
    // if it is a string, it is likely a list of partIds was send
    if (tools_1.isString(partId)) {
        partId = tools_1.stringToNumberList(partId);
    }
    if (!partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.partStorage.getPartItems(partId));
};
exports.getPartReleases = (req, res) => {
    let partId = extractQueryParam(req, "part");
    // if it is a string, it is likely a list of partIds was send
    if (tools_1.isString(partId)) {
        partId = tools_1.stringToNumberList(partId);
    }
    if (!partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.partStorage.getPartReleases(partId));
};
exports.postPart = (req, res) => {
    const { part, mediumId } = req.body;
    if (!part || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    part.mediumId = mediumId;
    sendResult(res, storage_1.partStorage.addPart(part));
};
exports.putPart = (req, res) => {
    const { part } = req.body;
    if (!part) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.partStorage.updatePart(part));
};
exports.deletePart = (req, res) => {
    const { partId } = req.body;
    if (!partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.partStorage.deletePart(partId));
};
exports.getEpisode = (req, res) => {
    let episodeId = extractQueryParam(req, "episodeId");
    const uuid = extractQueryParam(req, "uuid");
    // if it is a string, it is likely a list of episodeIds was send
    if (tools_1.isString(episodeId)) {
        episodeId = tools_1.stringToNumberList(episodeId);
    }
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.getEpisode(episodeId, uuid));
};
exports.postEpisode = (req, res) => {
    const { episode, partId } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length) || !partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    if (Array.isArray(episode)) {
        episode.forEach((value) => value.partId = partId);
    }
    else {
        episode.partId = partId;
    }
    sendResult(res, storage_1.episodeStorage.addEpisode(episode));
};
exports.putEpisode = (req, res) => {
    const { episode, uuid } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episode.updateEpisode(episode, uuid));
};
exports.deleteEpisode = (req, res) => {
    const { episodeId, uuid } = req.body;
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.deleteEpisode(episodeId));
};
exports.getExternalUser = (req, res) => {
    const externalUuid = extractQueryParam(req, "externalUuid");
    if (!externalUuid) {
        // TODO: 23.07.2019 check if valid uuid
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.externalUserStorage.getExternalUser(externalUuid));
};
exports.postExternalUser = (req, res) => {
    const { uuid, externalUser } = req.body;
    if (!externalUser) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResultCall(res, async () => {
        const listManager = listManager_1.factory(Number(externalUser.type));
        const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });
        if (!valid) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_DATA));
        }
        delete externalUser.pwd;
        externalUser.cookies = listManager.stringifyCookies();
        return storage_1.externalUserStorage.addExternalUser(uuid, externalUser);
    });
};
exports.deleteExternalUser = (req, res) => {
    const { externalUuid, uuid } = req.body;
    if (!externalUuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.externalUserStorage.deleteExternalUser(externalUuid, uuid));
};
exports.putUser = (req, res) => {
    const { uuid, user } = req.body;
    if (!user) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.userStorage.updateUser(uuid, user));
};
exports.deleteUser = (req, res) => {
    const { uuid } = req.body;
    sendResult(res, storage_1.userStorage.deleteUser(uuid));
};
exports.getProgress = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    const episodeId = extractQueryParam(req, "episodeId");
    if (!episodeId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.getProgress(uuid, episodeId));
};
exports.postProgress = (req, res) => {
    const { uuid, progress } = req.body;
    let episodeId = req.body.episodeId;
    if (!episodeId || progress == null) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    if (tools_1.isString(episodeId)) {
        episodeId = tools_1.stringToNumberList(episodeId);
    }
    try {
        const readDate = req.body.readDate ? new Date(req.body.readDate) : new Date();
        sendResult(res, storage_1.episodeStorage.addProgress(uuid, episodeId, progress, readDate));
    }
    catch (e) {
        logger_1.logError(e);
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
};
exports.putProgress = exports.postProgress;
exports.deleteProgress = (req, res) => {
    const { uuid, episodeId } = req.body;
    if (!episodeId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.episodeStorage.removeProgress(uuid, episodeId));
};
exports.getMedium = (req, res) => {
    let mediumId = extractQueryParam(req, "mediumId");
    const uuid = extractQueryParam(req, "uuid");
    mediumId = Number(mediumId);
    if (!mediumId && !Number.isNaN(mediumId)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    if (!Number.isInteger(mediumId)) {
        mediumId = extractQueryParam(req, "mediumId");
        mediumId = tools_1.stringToNumberList(mediumId);
    }
    if (!mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.mediumStorage.getMedium(mediumId, uuid));
};
exports.postMedium = (req, res) => {
    const { uuid, medium } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.mediumStorage.addMedium(medium, uuid));
};
exports.putMedium = (req, res) => {
    const { medium } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage_1.mediumStorage.updateMedium(medium));
};
exports.getLists = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, storage_1.internalListStorage.getUserLists(uuid));
};
exports.getNews = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    let from = extractQueryParam(req, "from");
    let to = extractQueryParam(req, "to");
    let newsIds = extractQueryParam(req, "newsId");
    // if newsIds is specified, send only these news
    if (tools_1.isString(newsIds)) {
        newsIds = tools_1.stringToNumberList(newsIds);
        sendResult(res, storage_1.newsStorage.getNews({ uuid, newsIds }));
    }
    else {
        // else send it based on time
        from = !from || from === "null" ? undefined : new Date(from);
        to = !to || to === "null" ? undefined : new Date(to);
        sendResult(res, storage_1.newsStorage.getNews({ uuid, since: from, till: to }));
    }
};
exports.authenticate = (req, res, next) => {
    let { uuid, session } = req.body;
    if (!uuid || !session) {
        uuid = extractQueryParam(req, "uuid");
        session = extractQueryParam(req, "session");
    }
    if (!uuid || !session) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
        return;
    }
    storage_1.userStorage
        .userLoginStatus(req.ip, uuid, session)
        .then((result) => {
        if (result) {
            next();
        }
        else {
            res.status(400).json({ error: tools_1.Errors.INVALID_SESSION });
        }
    })
        .catch((error) => {
        res.status(500).json({ error: tools_1.isError(error) ? error : tools_1.Errors.INVALID_MESSAGE });
        logger_1.logError(error);
    });
};
function sendResult(res, promise) {
    promise
        .then((result) => {
        if (tools_1.isQuery(result)) {
            result
                .stream({ objectMode: true, highWaterMark: 10 })
                .pipe(stringify_stream_1.default({ open: "[", close: "]" }))
                .pipe(res);
        }
        else {
            res.json(result);
        }
    })
        .catch((error) => {
        const errorCode = tools_1.isError(error);
        res
            .status(errorCode ? 400 : 500)
            .json({ error: errorCode ? error : tools_1.Errors.INVALID_MESSAGE });
        logger_1.logError(error);
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
// fixme an error showed that req.query.something does not assign on first call, only on second???
function extractQueryParam(request, key) {
    let value = request.query[key];
    if (value == null) {
        value = request.query[key];
    }
    return value;
}
//# sourceMappingURL=userMiddleware.js.map