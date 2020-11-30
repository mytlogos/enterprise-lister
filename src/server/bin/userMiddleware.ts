import {
    episodeStorage,
    externalUserStorage,
    internalListStorage,
    jobStorage,
    mediumInWaitStorage,
    mediumStorage,
    newsStorage,
    partStorage,
    storage,
    userStorage
} from "./database/storages/storage";
import { factory } from "./externals/listManager";
import { Handler, Request, Response } from "express";
import stringify from "stringify-stream";
import logger from "./logger";
import { downloadEpisodes, filterScrapeAble, search as searchMedium, loadToc } from "./externals/scraperTools";
import { Errors, isError, isQuery, isString, stringToNumberList, getDate } from "./tools";
import { JobRequest, ScrapeName } from "./types";
import { TocRequest } from "./externals/types";
import { getTunnelUrls } from "./tunnel";
import env from "./env";

function isNumberOrArray(value: number | any[]) {
    return Array.isArray(value) ? value.length : Number.isInteger(value);
}

function isInvalidId(id: any): boolean {
    return !Number.isInteger(id) || id < 1;
}

function isInvalidSimpleMedium(medium: any): boolean {
    return medium.title == null || !isString(medium.title)
        // valid medium types are 1-8
        || !Number.isInteger(medium.medium) || medium.medium < 1 || medium.medium > 8;
}

export const searchToc: Handler = (req, res) => {
    const link = decodeURIComponent(extractQueryParam(req, "link"));
    sendResult(res, loadToc(link));
};

export const getToc: Handler = (req, res) => {
    let media = extractQueryParam(req, "mediumId");

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
    let mediumId = extractQueryParam(req, "mediumId");
    const link = extractQueryParam(req, "link");

    mediumId = Number.parseInt(mediumId, 10);

    if (isInvalidId(mediumId) || !link || !isString(link)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    sendResult(res, mediumStorage.removeMediumToc(mediumId, link));
};

export const postMergeMedia: Handler = (req, res) => {
    const { sourceId, destinationId } = req.body;
    if (isInvalidId(sourceId) || isInvalidId(destinationId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    } else {
        sendResult(res, mediumStorage.mergeMedia(sourceId, destinationId));
    }
};

export const postSplitMedium: Handler = (req, res) => {
    const { sourceId, destinationMedium, toc } = req.body;
    if (isInvalidId(sourceId)
        || !destinationMedium
        || isInvalidSimpleMedium(destinationMedium)
        || !/^https?:\/\//.test(toc)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    } else {
        sendResult(res, mediumStorage.splitMedium(sourceId, destinationMedium, toc));
    }
};

export const postTransferToc: Handler = (req, res) => {
    const { sourceId, destinationId, toc } = req.body;
    if (isInvalidId(sourceId)
        || isInvalidId(destinationId)
        || !/^https?:\/\//.test(toc)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    } else {
        sendResult(res, mediumStorage.transferToc(sourceId, destinationId, toc));
    }
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
    let date = extractQueryParam(req, "date");
    date = date ? new Date(date) : undefined;
    sendResult(res, storage.getNew(uuid, date));
};

export const getAllMedia: Handler = (req, res) => {
    sendResult(res, mediumStorage.getAllMedia());
};


export const putConsumeUnusedMedia: Handler = (req, res) => {
    const { mediumId, tocsMedia } = req.body;

    if (mediumId <= 0 || !tocsMedia || !Array.isArray(tocsMedia) || !tocsMedia.length) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, mediumInWaitStorage.consumeMediaInWait(mediumId, tocsMedia));
};

export const postCreateFromUnusedMedia: Handler = (req, res) => {
    const { createMedium, tocsMedia, listId } = req.body;

    if (!createMedium || listId <= 0 || (tocsMedia && !Array.isArray(tocsMedia))) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, mediumInWaitStorage.createFromMediaInWait(createMedium, tocsMedia, listId));
};
export const getUnusedMedia: Handler = (req, res) => {
    sendResult(res, mediumInWaitStorage.getMediaInWait());
};

export const readNews: Handler = (req, res) => {
    const { uuid, read } = req.body;
    if (!read || !isString(read)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    const currentlyReadNews = stringToNumberList(read);

    sendResult(res, newsStorage.markRead(uuid, currentlyReadNews));
};

export const processReadEpisode: Handler = (req, res) => {
    const { uuid, result } = req.body;
    if (!result) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.markEpisodeRead(uuid, result));
};

export const processProgress: Handler = (req, res) => {
    const { uuid, progress } = req.body;
    if (!progress) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.setProgress(uuid, progress));
};

export const refreshExternalUser: Handler = (req, res) => {
    const externalUuid = extractQueryParam(req, "externalUuid");
    if (!externalUuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    const externalUserWithCookies = externalUserStorage.getExternalUserWithCookies(externalUuid);
    const storePromise = externalUserWithCookies.then((value) => jobStorage.addJobs({
        type: ScrapeName.oneTimeUser,
        interval: -1,
        deleteAfterRun: true,
        runImmediately: true,
        name: `${ScrapeName.oneTimeUser}-${value.uuid}`,
        arguments: JSON.stringify({
            link: value.uuid,
            userId: value.userUuid,
            externalUserId: value.uuid,
            info: value.cookies
        })
    }));
    sendResult(res, storePromise);
};

export const processResult: Handler = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage.processResult(req.body));
};

export const saveResult: Handler = (req, res) => {
    if (!req.body) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage.saveResult(req.body));
};

export const getTunnel: Handler = (req, res) => {
    sendResult(res, Promise.resolve(getTunnelUrls()));
};

export const getDev: Handler = (req, res) => {
    sendResult(res, Promise.resolve(Boolean(env.development)));
};
export const checkLogin: Handler = (req, res) => {
    sendResult(res, userStorage.loggedInUser(req.ip));
};
export const getUser: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, userStorage.getUser(uuid, req.ip));
};

export const login: Handler = (req, res) => {
    const { userName, pw } = req.body;

    if (!userName || !isString(userName) || !pw || !isString(pw)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, userStorage.loginUser(userName, pw, req.ip));
};

export const register: Handler = (req, res) => {
    const { userName, pw } = req.body;

    if (!userName || !isString(userName) || !pw || !isString(pw)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, userStorage.register(userName, pw, req.ip));
};

export const logout: Handler = (req, res) => {
    const { uuid } = req.body;
    if (!uuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, userStorage.logoutUser(uuid, req.ip));
};

export const getInvalidated: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    if (!uuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, storage.getInvalidatedStream(uuid));
};

export const addBookmarked: Handler = (req, res) => {
    const { uuid, bookmarked } = req.body;
    const protocol = /^https?:\/\//;

    if (bookmarked && bookmarked.length && bookmarked.every((url: any) => isString(url) && protocol.test(url))) {
        const scrapeAble = filterScrapeAble(bookmarked);

        const storePromise = jobStorage.addJobs(scrapeAble.available.map((link: string): JobRequest => {
            return {
                name: `${ScrapeName.oneTimeToc}-${link}`,
                type: ScrapeName.oneTimeToc,
                runImmediately: true,
                deleteAfterRun: true,
                interval: -1,
                arguments: JSON.stringify({
                    url: link,
                    uuid
                } as TocRequest)
            };
        })).then(() => scrapeAble.unavailable);
        sendResult(res, storePromise);
    } else {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
};

export const addToc: Handler = (req, res) => {
    const { uuid, toc, mediumId } = req.body;
    const protocol = /^https?:\/\//;

    if (protocol.test(toc) && Number.isInteger(mediumId) && mediumId > 0) {
        const storePromise = jobStorage.addJobs({
            name: `${ScrapeName.oneTimeToc}-${toc}`,
            type: ScrapeName.oneTimeToc,
            runImmediately: true,
            deleteAfterRun: true,
            interval: -1,
            arguments: JSON.stringify({
                url: toc,
                uuid,
                mediumId
            } as TocRequest)
        }).then(() => true);
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
            .then((fullEpisodes) => downloadEpisodes(fullEpisodes.filter((value) => value))));
};
export const getList: Handler = (req, res) => {
    let listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");

    if (!media) {
        media = "";
    }
    if (!listId) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    if (isString(listId)) {
        listId = stringToNumberList(listId);
    }
    media = stringToNumberList(media);

    sendResult(res, internalListStorage.getList(listId, media, uuid));
};

export const postList: Handler = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.addList(uuid, list));
};

export const putList: Handler = (req, res) => {
    const { uuid, list } = req.body;
    if (!list) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    // TODO: 05.09.2019 should this not be update list?
    sendResult(res, internalListStorage.addList(uuid, list));
};
export const deleteList: Handler = (req, res) => {
    const { listId, uuid } = req.body;
    if (!listId || !Number.isInteger(listId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.deleteList(listId, uuid));
};
export const getListMedium: Handler = (req, res) => {
    const listId = extractQueryParam(req, "listId");
    const uuid = extractQueryParam(req, "uuid");
    let media = extractQueryParam(req, "media");

    if (!media || !isString(media)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    media = stringToNumberList(media);

    if (!listId || (Array.isArray(media) && !media.length)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.getList(listId, media, uuid));
};
export const postListMedium: Handler = (req, res) => {
    const { listId, mediumId, uuid } = req.body;

    if (!listId || !Number.isInteger(listId)
        || !mediumId || !isNumberOrArray(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.addItemToList({ listId, id: mediumId }, uuid));
};
export const putListMedium: Handler = (req, res) => {
    const { oldListId, newListId } = req.body;
    let { mediumId } = req.body;

    if (!Number.isInteger(mediumId)) {
        if (isString(mediumId)) {
            mediumId = stringToNumberList(mediumId);

            if (!mediumId.length) {
                sendResult(res, Promise.resolve(false));
                return;
            }
        } else {
            mediumId = undefined;
        }
    }
    if (!oldListId || !newListId || !mediumId) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.moveMedium(oldListId, newListId, mediumId));
};
export const deleteListMedium: Handler = (req, res) => {
    const { listId } = req.body;
    let { mediumId } = req.body;

    // if it is a string, it is likely a list of episodeIds was send
    if (isString(mediumId)) {
        mediumId = stringToNumberList(mediumId);
    }
    if (!listId || !mediumId || !isNumberOrArray(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, internalListStorage.removeMedium(listId, mediumId));
};
export const getPart: Handler = (req, res) => {
    const mediumId = extractQueryParam(req, "mediumId");
    const uuid = extractQueryParam(req, "uuid");

    if (mediumId == null) {
        let partId = extractQueryParam(req, "partId");
        // if it is a string, it is likely a list of partIds was send
        if (isString(partId)) {
            partId = stringToNumberList(partId);
        }
        if (!partId || (!Array.isArray(partId) && !Number.isInteger(partId))) {
            sendResult(res, Promise.reject(Errors.INVALID_INPUT));
            return;
        }
        sendResult(res, partStorage.getParts(partId, uuid));
    } else {
        if (!Number.isInteger(mediumId)) {
            sendResult(res, Promise.reject(Errors.INVALID_INPUT));
            return;
        }
        sendResult(res, partStorage.getMediumParts(mediumId, uuid));
    }
};
export const getPartItems: Handler = (req, res) => {
    let partId = extractQueryParam(req, "part");

    // if it is a string, it is likely a list of partIds was send
    if (isString(partId)) {
        partId = stringToNumberList(partId);
    }
    if (!partId || !Array.isArray(partId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, partStorage.getPartItems(partId));
};
export const getPartReleases: Handler = (req, res) => {
    let partId = extractQueryParam(req, "part");

    // if it is a string, it is likely a list of partIds was send
    if (isString(partId)) {
        partId = stringToNumberList(partId);
    }
    if (!partId || !Array.isArray(partId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, partStorage.getPartReleases(partId));
};
export const postPart: Handler = (req, res) => {
    const { part, mediumId } = req.body;
    if (!part || !mediumId || !Number.isInteger(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    part.mediumId = mediumId;
    sendResult(res, partStorage.addPart(part));
};
export const putPart: Handler = (req, res) => {
    const { part } = req.body;
    if (!part) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, partStorage.updatePart(part));
};
export const deletePart: Handler = (req, res) => {
    const { partId } = req.body;
    if (!partId || !Number.isInteger(partId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, partStorage.deletePart(partId));
};
export const getEpisode: Handler = (req, res) => {
    let episodeId = extractQueryParam(req, "episodeId");
    const uuid = extractQueryParam(req, "uuid");

    // if it is a string, it is likely a list of episodeIds was send
    if (isString(episodeId)) {
        episodeId = stringToNumberList(episodeId);
    }
    if (!episodeId || !isNumberOrArray(episodeId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.getEpisode(episodeId, uuid));
};
export const postEpisode: Handler = (req, res) => {
    const { episode, partId } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length) || !partId || !Number.isInteger(partId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    if (Array.isArray(episode)) {
        episode.forEach((value) => value.partId = partId);
    } else {
        episode.partId = partId;
    }
    sendResult(res, episodeStorage.addEpisode(episode));
};
export const putEpisode: Handler = (req, res) => {
    const { episode, uuid } = req.body;
    if (!episode || (Array.isArray(episode) && !episode.length)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episode.updateEpisode(episode, uuid));
};
export const deleteEpisode: Handler = (req, res) => {
    const { episodeId } = req.body;
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.deleteEpisode(episodeId));
};
export const getExternalUser: Handler = (req, res) => {
    const externalUuidString = extractQueryParam(req, "externalUuid");

    if (!externalUuidString || !isString(externalUuidString)) {
        // TODO: 23.07.2019 check if valid uuid
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    try {
        let externalUuid;
        if (externalUuidString.startsWith("[") && externalUuidString.endsWith("]")) {
            externalUuid = externalUuidString
                .substr(1, externalUuidString.length - 2)
                .split(",").map((value) => value.trim());
        } else {
            externalUuid = externalUuidString;
        }
        sendResult(res, externalUserStorage.getExternalUser(externalUuid));
    } catch (e) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
};
export const postExternalUser: Handler = (req, res) => {
    const { uuid, externalUser } = req.body;

    if (!externalUser) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResultCall(res, async () => {
        const listManager = factory(Number(externalUser.type));
        const valid = await listManager.test({ identifier: externalUser.identifier, password: externalUser.pwd });

        if (!valid) {
            return Promise.reject(new Error(Errors.INVALID_DATA));
        }
        delete externalUser.pwd;
        externalUser.cookies = listManager.stringifyCookies();

        return externalUserStorage.addExternalUser(uuid, externalUser);
    });
};
export const deleteExternalUser: Handler = (req, res) => {
    const { externalUuid, uuid } = req.body;
    if (!externalUuid) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, externalUserStorage.deleteExternalUser(externalUuid, uuid));
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
export const getProgress: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    const episodeId = extractQueryParam(req, "episodeId");
    if (!episodeId || !Number.isInteger(episodeId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.getProgress(uuid, episodeId));
};

export const postProgress: Handler = (req, res) => {
    const { uuid, progress } = req.body;
    let episodeId = req.body.episodeId;

    if (isString(episodeId)) {
        episodeId = stringToNumberList(episodeId);
    }

    if (!episodeId || !isNumberOrArray(episodeId) || progress == null) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    try {
        const readDate = req.body.readDate ? new Date(req.body.readDate) : new Date();
        sendResult(res, episodeStorage.addProgress(uuid, episodeId, progress, readDate));
    } catch (e) {
        logger.error(e);
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
    }
};

export const putProgress: Handler = postProgress;

export const deleteProgress: Handler = (req, res) => {
    const { uuid, episodeId } = req.body;
    if (!episodeId || !Number.isInteger(episodeId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, episodeStorage.removeProgress(uuid, episodeId));
};
export const getMedium: Handler = (req, res) => {
    let mediumId = extractQueryParam(req, "mediumId");
    const uuid = extractQueryParam(req, "uuid");

    mediumId = Number(mediumId);

    if (!mediumId && !Number.isNaN(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    if (!Number.isInteger(mediumId)) {
        mediumId = extractQueryParam(req, "mediumId");
        mediumId = stringToNumberList(mediumId);
    }
    if (!mediumId || !isNumberOrArray(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, mediumStorage.getMedium(mediumId, uuid));
};

export const postMedium: Handler = (req, res) => {
    const { uuid, medium } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, mediumStorage.addMedium(medium, uuid));
};
export const putMedium: Handler = (req, res) => {
    const { medium } = req.body;
    if (!medium) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, mediumStorage.updateMedium(medium));
};
export const getLists: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, internalListStorage.getUserLists(uuid));
};

export const getNews: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    let from = extractQueryParam(req, "from");
    let to = extractQueryParam(req, "to");
    let newsIds = extractQueryParam(req, "newsId");

    // if newsIds is specified, send only these news
    if (isString(newsIds)) {
        newsIds = stringToNumberList(newsIds);
        sendResult(res, newsStorage.getNews(uuid, undefined, undefined, newsIds));
    } else {
        // else send it based on time
        from = !from || from === "null" ? undefined : new Date(from);
        to = !to || to === "null" ? undefined : new Date(to);

        sendResult(res, newsStorage.getNews(uuid, from, to));
    }
};

export const getAllNews: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, newsStorage.getAll(uuid));
};


export const getAllParts: Handler = (req, res) => {
    sendResult(res, partStorage.getAll());
};

export const getAllMediaFull: Handler = (req, res) => {
    sendResult(res, mediumStorage.getAllMediaFull());
};

export const getAllSecondary: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, mediumStorage.getAllSecondary(uuid));
};


export const getAllLists: Handler = getLists;

export const getAllExternalUser: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, externalUserStorage.getAll(uuid));
};


export const getAllEpisodes: Handler = (req, res) => {
    const uuid = extractQueryParam(req, "uuid");
    sendResult(res, episodeStorage.getAll(uuid));
};

export const getAllReleases: Handler = (req, res) => {
    sendResult(res, episodeStorage.getAllReleases());
};

export const getDisplayReleases: Handler = (req, res) => {
    const latest = extractQueryParam(req, "latest");
    const until = extractQueryParam(req, "until");
    const read = extractQueryParam(req, "read") ? extractQueryParam(req, "read").toLowerCase() == "true" : null;
    const uuid = extractQueryParam(req, "uuid");

    const latestDate = getDate(latest);
    const untilDate = until ? getDate(until) : null;

    if (!isString(latest) || !latestDate || (until && !untilDate)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    sendResult(res, episodeStorage.getDisplayReleases(latestDate, untilDate, read, uuid));
};

export const getMediumReleases: Handler = (req, res) => {
    const mediumId = Number.parseInt(extractQueryParam(req, "id"));
    const uuid = extractQueryParam(req, "uuid");

    if (isInvalidId(mediumId)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    sendResult(res, episodeStorage.getMediumReleases(mediumId, uuid));
};

export const getJobs: Handler = (_req, res) => {
    sendResult(res, jobStorage.getAllJobs());
};

export const getJobsStats: Handler = (_req, res) => {
    sendResult(res, jobStorage.getJobsStats());
};

export const getJobsStatsGrouped: Handler = (_req, res) => {
    sendResult(res, jobStorage.getJobsStatsGrouped());
};

export const getJobDetails: Handler = (req, res) => {
    const id = Number.parseInt(extractQueryParam(req, "id"));

    if (isInvalidId(id)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }

    sendResult(res, jobStorage.getJobDetails(id));
};

export const getJobStatsTimed: Handler = (req, res) => {
    const bucket = extractQueryParam(req, "bucket");
    const groupByDomain = (extractQueryParam(req, "groupByDomain") || "").toLowerCase() === "true";

    if (!["day", "hour", "minute"].includes(bucket)) {
        sendResult(res, Promise.reject(Errors.INVALID_INPUT));
        return;
    }
    sendResult(res, jobStorage.getJobsStatsTimed(bucket, groupByDomain));
};

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

function sendResult(res: Response, promise: Promise<any>) {
    promise
        .then((result) => {
            if (isQuery(result)) {
                result
                    .stream({ objectMode: true, highWaterMark: 10 })
                    .pipe(stringify({ open: "[", close: "]" }))
                    // @ts-expect-error
                    .pipe(res);
            } else {
                // @ts-expect-error
                res.json(result);
            }
        })
        .catch((error) => {
            const errorCode = isError(error);
            res
                // @ts-expect-error
                .status(errorCode ? 400 : 500)
                .json({ error: errorCode ? error : Errors.INVALID_MESSAGE });

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

// FIXME an error showed that req.query.something does not assign on first call, only on second???
function extractQueryParam(request: Request, key: string) {
    // @ts-expect-error
    return request.query[key] || request.query[key];
}
