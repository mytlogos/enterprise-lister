"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const database_1 = require("./database/database");
const listManager_1 = require("./externals/listManager");
const logger_1 = tslib_1.__importDefault(require("./logger"));
const scraperTools_1 = require("./externals/scraperTools");
const tools_1 = require("./tools");
exports.getUnusedMedia = (req, res) => {
    sendResult(res, database_1.Storage.getMediaInWait());
};
exports.readNews = (req, res) => {
    const { uuid, read } = req.body;
    if (!read || !tools_1.isString(read)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    const currentlyReadNews = tools_1.stringToNumberList(read);
    sendResult(res, database_1.Storage.markNewsRead(uuid, currentlyReadNews));
};
exports.processReadEpisode = (req, res) => {
    const { uuid, result } = req.body;
    if (!result) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.markEpisodeRead(uuid, result));
};
exports.processProgress = (req, res) => {
    const { uuid, progress } = req.body;
    if (!progress) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.setProgress(uuid, progress));
};
exports.refreshExternalUser = (req, res) => {
    const externalUuid = extractQueryParam(req, "externalUuid");
    if (!externalUuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    const externalUserWithCookies = database_1.Storage.getExternalUserWithCookies(externalUuid);
    const storePromise = externalUserWithCookies.then((value) => database_1.Storage.addScrape({
        type: scraperTools_1.ScrapeTypes.ONETIMEUSER,
        link: value.uuid,
        userId: value.userUuid,
        externalUserId: value.uuid,
        info: value.cookies
    }));
    sendResult(res, storePromise);
};
exports.processResult = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.processResult(req.body));
};
exports.saveResult = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.saveResult(req.body));
};
exports.checkLogin = (req, res) => {
    sendResult(res, database_1.Storage.userLoginStatus(req.ip));
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
    if (bookmarked && bookmarked.length && bookmarked.every((url) => tools_1.isString(url) && protocol.test(url))) {
        const storePromise = database_1.Storage.addScrape(bookmarked.map((link) => {
            return { type: scraperTools_1.ScrapeTypes.ONETIMETOC, link, userId: uuid };
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
        const storePromise = database_1.Storage.addScrape({ type: scraperTools_1.ScrapeTypes.ONETIMETOC, link: toc, userId: uuid, mediumId });
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
    }
    sendResult(res, database_1.Storage
        .getEpisode(episodes, uuid)
        .then((fullEpisodes) => scraperTools_1.downloadEpisodes(fullEpisodes.filter((value) => value))));
};
exports.getList = (req, res) => {
    let listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");
    if (!listId || !media) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    if (tools_1.isString(listId)) {
        listId = tools_1.stringToNumberList(listId);
    }
    media = tools_1.stringToNumberList(media);
    sendResult(res, database_1.Storage.getList(listId, media, uuid));
};
exports.postList = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.addList(uuid, list));
};
exports.putList = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.addList(uuid, list));
};
exports.deleteList = (req, res) => {
    const { listId, uuid } = req.body;
    if (!listId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.deleteList(listId, uuid));
};
exports.getListMedium = (req, res) => {
    const listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");
    media = tools_1.stringToNumberList(media);
    if (!listId || !media || (Array.isArray(media) && !media.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.getList(listId, media, uuid));
};
exports.postListMedium = (req, res) => {
    const { listId, mediumId, uuid } = req.body;
    if (!listId || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.addItemToList(listId, mediumId, uuid));
};
exports.putListMedium = (req, res) => {
    const { oldListId, newListId, mediumId, uuid } = req.body;
    if (!oldListId || !newListId || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.moveMedium(oldListId, newListId, mediumId, uuid));
};
exports.deleteListMedium = (req, res) => {
    const { listId, mediumId, uuid } = req.body;
    if (!listId || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.removeMedium(listId, mediumId, uuid));
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
        }
        sendResult(res, database_1.Storage.getParts(partId, uuid));
    }
    else {
        sendResult(res, database_1.Storage.getMediumParts(mediumId, uuid));
    }
};
exports.postPart = (req, res) => {
    const { part, mediumId, uuid } = req.body;
    if (!part || !mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    part.mediumId = mediumId;
    sendResult(res, database_1.Storage.addPart(part, uuid));
};
exports.putPart = (req, res) => {
    const { part, uuid } = req.body;
    if (!part) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.updatePart(part, uuid));
};
exports.deletePart = (req, res) => {
    const { partId, uuid } = req.body;
    if (!partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.deletePart(partId, uuid));
};
exports.getEpisode = (req, res) => {
    let episodeId = extractQueryParam(req, "episodeId");
    const uuid = extractQueryParam(req, "uuid");
    // if it is a string, it is likely a list of episodeIds was send
    if (tools_1.isString(episodeId)) {
        episodeId = tools_1.stringToNumberList(episodeId);
    }
    if (!episodeId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.getEpisode(episodeId, uuid));
};
exports.postEpisode = (req, res) => {
    const { episode, partId, uuid } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length) || !partId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    if (Array.isArray(episode)) {
        episode.forEach((value) => value.partId = partId);
    }
    else {
        episode.partId = partId;
    }
    sendResult(res, database_1.Storage.addEpisode(episode, uuid));
};
exports.putEpisode = (req, res) => {
    const { episode, uuid } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.updateEpisode(episode, uuid));
};
exports.deleteEpisode = (req, res) => {
    const { episodeId, uuid } = req.body;
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.deletePart(episodeId, uuid));
};
exports.getExternalUser = (req, res) => {
    const externalUuid = extractQueryParam(req, "externalUuid");
    if (!externalUuid) {
        // TODO: 23.07.2019 check if valid uuid
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.getExternalUser(externalUuid));
};
exports.postExternalUser = (req, res) => {
    const { uuid, externalUser } = req.body;
    if (!externalUser) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
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
};
exports.deleteExternalUser = (req, res) => {
    const { externalUuid, uuid } = req.body;
    if (!externalUuid) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.deleteExternalUser(externalUuid, uuid));
};
exports.putUser = (req, res) => {
    const { uuid, user } = req.body;
    if (!user) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.updateUser(uuid, user));
};
exports.deleteUser = (req, res) => {
    const { uuid } = req.body;
    sendResult(res, database_1.Storage.deleteUser(uuid));
};
exports.getProgress = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    const episodeId = extractQueryParam(req, "episodeId");
    if (!episodeId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.getProgress(uuid, episodeId));
};
exports.postProgress = (req, res) => {
    const { uuid, episodeId, progress } = req.body;
    if (!episodeId || progress == null) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    try {
        const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
        sendResult(res, database_1.Storage.addProgress(uuid, episodeId, progress, readDate));
    }
    catch (e) {
        console.log(e);
        logger_1.default.error(e);
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
};
exports.putProgress = (req, res) => {
    const { uuid, episodeId, progress } = req.body;
    if (!episodeId || progress == null) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    try {
        const readDate = req.body.readDate ? new Date(req.body.readDate) : null;
        sendResult(res, database_1.Storage.updateProgress(uuid, episodeId, progress, readDate));
    }
    catch (e) {
        console.log(e);
        logger_1.default.error(e);
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
};
exports.deleteProgress = (req, res) => {
    const { uuid, episodeId } = req.body;
    if (!episodeId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.removeProgress(uuid, episodeId));
};
exports.getMedium = (req, res) => {
    let mediumId = extractQueryParam(req, "mediumId");
    const uuid = extractQueryParam(req, "uuid");
    if (!mediumId) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    if (!Number.isInteger(mediumId)) {
        mediumId = tools_1.stringToNumberList(mediumId);
    }
    sendResult(res, database_1.Storage.getMedium(mediumId, uuid));
};
exports.postMedium = (req, res) => {
    const { uuid, medium } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.addMedium(medium, uuid));
};
exports.putMedium = (req, res) => {
    const { medium, uuid } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    sendResult(res, database_1.Storage.updateMedium(medium, uuid));
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
    if (!uuid || !session) {
        uuid = extractQueryParam(req, "uuid");
        session = extractQueryParam(req, "session");
    }
    if (!uuid || !session) {
        sendResult(res, Promise.reject(tools_1.Errors.INVALID_INPUT));
    }
    database_1.Storage
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
// fixme an error showed that req.query.something does not assign on first call, only on second???
function extractQueryParam(request, key) {
    let value = request.query[key];
    if (value == null) {
        value = request.query[key];
    }
    return value;
}
//# sourceMappingURL=userMiddleware.js.map