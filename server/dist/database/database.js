"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const env_1 = tslib_1.__importDefault(require("../env"));
const databaseValidator_1 = require("./databaseValidator");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const queryContext_1 = require("./queryContext");
const databaseSchema_1 = require("./databaseSchema");
const tools_1 = require("../tools");
// setInterval(
//     () => StateProcessor
//         .startRound()
//         .then((value) => {
//             if (!value || !value.length) {
//                 return;
//             }
//             return inContext((invalidatorContext) => invalidatorContext.addInvalidation(value));
//         })
//         .catch((reason) => {
//             console.log(reason);
//             logger.error(reason);
//         }),
//     5000
// );
/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
async function inContext(callback, transaction = true) {
    if (!running) {
        // if inContext is called without Storage being active
        return Promise.reject("Not started");
    }
    if (errorAtStart) {
        return Promise.reject("Error occurred while starting Database. Database may not be accessible");
    }
    if (startPromise) {
        await startPromise;
    }
    const pool = await poolPromise;
    const con = await pool.getConnection();
    const context = new queryContext_1.QueryContext(con);
    let result;
    try {
        result = await doTransaction(callback, context, transaction);
    }
    finally {
        // release connection into the pool
        await pool.releaseConnection(con);
    }
    return result;
}
exports.inContext = inContext;
async function doTransaction(callback, context, transaction, attempts = 0) {
    let result;
    try {
        // if transaction, start it
        if (transaction) {
            await context.startTransaction();
        }
        // let callback run with context
        result = await callback(context);
        // if transaction and no error till now, commit it and return result
        if (transaction) {
            await context.commit();
        }
    }
    catch (e) {
        // if it could not be commit due to error, roll back and rethrow error
        if (transaction) {
            // if there is a transaction first rollback and then throw error
            await context.rollback();
        }
        // if it is an deadlock or lock wait timeout error, restart transaction after a delay at max five times
        if ((e.errno === 1213 || e.errno === 1205) && attempts < 5) {
            await tools_1.delay(500);
            return doTransaction(callback, context, transaction, ++attempts);
        }
        else {
            // if it isn't an deadlock error, or still an deadlock after five attempts, rethrow error
            throw e;
        }
    }
    return result;
}
const poolPromise = promise_mysql_1.default.createPool({
    connectionLimit: env_1.default.dbConLimit,
    host: env_1.default.dbHost,
    user: env_1.default.dbUser,
    password: env_1.default.dbPassword,
    // charset/collation of the current database and tables
    charset: "utf8mb4",
    // we assume that the database exists already
    database: "enterprise"
});
let errorAtStart = false;
let running = false;
/**
 * @type {Promise<Storage>|void}
 */
let startPromise;
/**
 * Checks the database for incorrect structure
 * and tries to correct these.
 */
function start() {
    if (!running) {
        running = true;
        try {
            databaseValidator_1.StateProcessor.initTableSchema(databaseSchema_1.databaseSchema);
            startPromise = inContext((context) => databaseValidator_1.StateProcessor.checkTableSchema(context), true).catch((error) => {
                logger_1.default.error(error);
                console.log(error);
                errorAtStart = true;
                return Promise.reject("Database error occurred while starting");
            });
        }
        catch (e) {
            errorAtStart = true;
            startPromise = Promise.reject("Error in database schema");
            logger_1.default.error(e);
            console.log(e);
        }
    }
}
exports.Storage = {
    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop() {
        running = false;
        startPromise = null;
        return Promise.resolve(poolPromise.then((value) => value.end()));
    },
    /**
     * Registers an User if the userName is free.
     * Returns a Error Code if userName is already
     * in use.
     *
     * If it succeeded, it tries to log the user in
     * immediately.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @return {Promise<{session: string, uuid: string}>}
     */
    register(userName, password, ip) {
        return inContext((context) => context.register(userName, password, ip));
    },
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @return {Promise<User>}
     */
    loginUser(userName, password, ip) {
        return inContext((context) => context.loginUser(userName, password, ip));
    },
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @return {Promise<User|null>}
     */
    // @ts-ignore
    userLoginStatus(ip, uuid, session) {
        return inContext((context) => context.userLoginStatus(ip, uuid, session));
    },
    /**
     * Logs a user out.
     *
     * @return {Promise<boolean>}
     */
    logoutUser(uuid, ip) {
        return inContext((context) => context.logoutUser(uuid, ip));
    },
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     *
     * @return {Promise<boolean>}
     */
    deleteUser(uuid) {
        return inContext((context) => context.deleteUser(uuid));
    },
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @return {Promise<boolean>}
     */
    updateUser(uuid, user) {
        return inContext((context) => context.setUuid(uuid).updateUser(uuid, user));
    },
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    addList(uuid, list) {
        return inContext((context) => context.setUuid(uuid).addList(uuid, list));
    },
    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<SimpleMedium>}>}
     */
    getList(listId, media, uuid) {
        return inContext((context) => context.getList(listId, media, uuid));
    },
    /**
     * Updates the properties of a list.
     */
    updateList(list) {
        return inContext((context) => context.setUuid(list.userUuid).updateList(list));
    },
    /**
     * Deletes a list irreversibly.
     */
    deleteList(listId, uuid) {
        return inContext((context) => context.setUuid(uuid).deleteList(listId, uuid));
    },
    /**
     * Returns all available lists for the given user.
     *
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid) {
        return inContext((context) => context.getUserLists(uuid));
    },
    /**
     * Adds a medium to the storage.
     *
     * @return {Promise<SimpleMedium>}
     */
    addMedium(medium, uuid) {
        return inContext((context) => context.setUuid(uuid).addMedium(medium, uuid));
    },
    /**
     * Gets one or multiple media from the storage.
     */
    getLatestReleases(mediumId) {
        return inContext((context) => context.getLatestReleases(mediumId));
    },
    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id, uuid) {
        // @ts-ignore
        return inContext((context) => context.getMedium(id, uuid));
    },
    /**
     * Gets one or multiple media from the storage, which are like the input.
     */
    // @ts-ignore
    getLikeMedium(likeMedia) {
        // @ts-ignore
        return inContext((context) => context.getLikeMedium(likeMedia));
    },
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium, uuid) {
        return inContext((context) => context.setUuid(uuid).updateMedium(medium));
    },
    getMediaInWait() {
        return inContext((context) => context.getMediaInWait());
    },
    deleteMediaInWait(mediaInWait) {
        return inContext((context) => context.deleteMediaInWait(mediaInWait));
    },
    addMediumInWait(mediaInWait) {
        return inContext((context) => context.addMediumInWait(mediaInWait));
    },
    /**
     */
    addSynonyms(synonyms, uuid) {
        return inContext((context) => context.setUuid(uuid).addSynonyms(synonyms));
    },
    /**
     */
    addToc(mediumId, link) {
        return inContext((context) => context.addToc(mediumId, link));
    },
    /**
     */
    getTocs(mediumId) {
        return inContext((context) => context.getToc(mediumId));
    },
    /**
     */
    getAllTocs() {
        return inContext((context) => context.getAllTocs());
    },
    /**
     */
    getChapterIndices(mediumId) {
        return inContext((context) => context.getChapterIndices(mediumId));
    },
    getAllChapterLinks(mediumId) {
        return inContext((context) => context.getAllChapterLinks(mediumId));
    },
    getTocSearchMedia() {
        return inContext((context) => context.getTocSearchMedia());
    },
    getTocSearchMedium(id) {
        return inContext((context) => context.getTocSearchMedium(id));
    },
    /**
     *
     */
    removeSynonyms(synonyms, uuid) {
        return inContext((context) => context.setUuid(uuid).removeSynonyms(synonyms));
    },
    /**
     *
     */
    getSynonyms(mediumId) {
        return inContext((context) => context.getSynonyms(mediumId));
    },
    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumParts(mediumId, uuid) {
        return inContext((context) => context.getMediumParts(mediumId, uuid));
    },
    getStandardPart(mediumId) {
        return inContext((context) => context.getStandardPart(mediumId));
    },
    /**
     * Returns parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId, index, uuid) {
        return inContext((context) => context.getMediumPartsPerIndex(mediumId, index, uuid));
    },
    getPartsEpisodeIndices(partId) {
        return inContext((context) => context.getPartsEpisodeIndices(partId));
    },
    /**
     * Returns one or multiple parts with their episode.
     */
    getParts(partsId, uuid) {
        // @ts-ignore
        return inContext((context) => context.getParts(partsId, uuid));
    },
    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part, uuid) {
        return inContext((context) => context.setUuid(uuid).addPart(part));
    },
    /**
     * Updates a part.
     */
    updatePart(part, uuid) {
        return inContext((context) => context.setUuid(uuid).updatePart(part));
    },
    /**
     * Creates the Standard Part for all non part-indexed episodes for the given mediumId.
     */
    createStandardPart(mediumId) {
        return inContext((context) => context.createStandardPart(mediumId));
    },
    /**
     * Deletes a part from the storage.
     */
    deletePart(id, uuid) {
        return inContext((context) => context.setUuid(uuid).deletePart(id));
    },
    /**
     * Adds a episode of a part to the storage.
     */
    // @ts-ignore
    addEpisode(episode, uuid) {
        // @ts-ignore
        return inContext((context) => context.setUuid(uuid).addEpisode(episode));
    },
    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode, uuid) {
        return inContext((context) => context.setUuid(uuid).updateEpisode(episode));
    },
    moveEpisodeToPart(episodeId, partId) {
        return inContext((context) => context.moveEpisodeToPart(episodeId, partId));
    },
    /**
     * Gets an episode from the storage.
     */
    // @ts-ignore
    getEpisode(id, uuid) {
        // @ts-ignore
        return inContext((context) => context.getEpisode(id, uuid));
    },
    /**
     *
     */
    getPartEpisodePerIndex(partId, index) {
        return inContext((context) => context.getPartEpisodePerIndex(partId, index));
    },
    /**
     *
     */
    // @ts-ignore
    getMediumEpisodePerIndex(mediumId, index) {
        return inContext((context) => context.getMediumEpisodePerIndex(mediumId, index));
    },
    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id, uuid) {
        return inContext((context) => context.setUuid(uuid).deleteEpisode(id));
    },
    // @ts-ignore
    addRelease(releases) {
        // @ts-ignore
        return inContext((context) => context.addRelease(releases));
    },
    // @ts-ignore
    updateRelease(releases) {
        return inContext((context) => context.updateRelease(releases));
    },
    getSourcedReleases(sourceType, mediumId) {
        return inContext((context) => context.getSourcedReleases(sourceType, mediumId));
    },
    getPageInfo(link, key) {
        return inContext((context) => context.getPageInfo(link, key));
    },
    updatePageInfo(link, key, values, toDeleteValues) {
        return inContext((context) => context.updatePageInfo(link, key, values, toDeleteValues));
    },
    removePageInfo(link, key) {
        return inContext((context) => context.removePageInfo(link, key));
    },
    /**
     * Adds a medium to a list.
     */
    addItemToList(listId, mediumId, uuid) {
        return inContext((context) => context.setUuid(uuid).addItemToList(false, { listId, id: mediumId }));
    },
    /**
     * Moves a medium from an old list to a new list.
     */
    moveMedium(oldListId, newListId, mediumId, uuid) {
        return inContext((context) => context.setUuid(uuid).moveMedium(newListId, mediumId, oldListId));
    },
    getSimpleMedium(id) {
        return inContext((context) => context.getSimpleMedium(id));
    },
    /**
     * Removes an item from a list.
     */
    removeMedium(listId, mediumId, uuid) {
        return inContext((context) => context.setUuid(uuid).removeMedium(listId, mediumId));
    },
    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid, externalUser) {
        return inContext((context) => context.setUuid(localUuid).addExternalUser(localUuid, externalUser));
    },
    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid, uuid) {
        return inContext((context) => context.setUuid(uuid).deleteExternalUser(externalUuid));
    },
    /**
     * Gets an external user.
     */
    getExternalUser(uuid) {
        return inContext((context) => context.getExternalUser(uuid));
    },
    /**
     * Gets an external user with cookies, without items.
     */
    getExternalUserWithCookies(uuid) {
        return inContext((context) => context.getExternalUserWithCookies(uuid));
    },
    /**
     *
     */
    getScrapeExternalUser() {
        return inContext((context) => context.getScrapeExternalUser());
    },
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser) {
        return inContext((context) => context.setUuid(externalUser.localUuid).updateExternalUser(externalUser));
    },
    /**
     * Adds an external list of an user to the storage.
     */
    addExternalList(userUuid, externalList, uuid) {
        return inContext((context) => context.setUuid(uuid).addExternalList(userUuid, externalList));
    },
    /**
     * Updates an external list.
     */
    updateExternalList(externalList, uuid) {
        return inContext((context) => context.setUuid(uuid).updateExternalList(externalList));
    },
    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(externalUuid, externalListId, uuid) {
        return inContext((context) => context.setUuid(uuid).removeExternalList(externalUuid, externalListId));
    },
    /**
     * Gets an external list from the storage.
     */
    getExternalList(id) {
        return inContext((context) => context.getExternalList(id));
    },
    /**
     * Gets all external lists from the externalUser from the storage.
     */
    getExternalLists(uuid) {
        return inContext((context) => context.getExternalUserLists(uuid));
    },
    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId, mediumId, uuid) {
        return inContext((context) => context.setUuid(uuid).addItemToList(true, { listId, id: mediumId }));
    },
    /**
     * Removes a medium from an external list in the storage.
     */
    removeItemFromExternalList(listId, mediumId, uuid) {
        return inContext((context) => context.setUuid(uuid).removeMedium(listId, mediumId, true));
    },
    /**
     *
     */
    setProgress(uuid, progressResult) {
        return inContext((context) => context.setUuid(uuid).setProgress(uuid, progressResult));
    },
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid, episodeId, progress, readDate) {
        return inContext((context) => context.setUuid(uuid).addProgress(uuid, episodeId, progress, readDate));
    },
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid, episodeId) {
        return inContext((context) => context.setUuid(uuid).removeProgress(uuid, episodeId));
    },
    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid, episodeId) {
        return inContext((context) => context.getProgress(uuid, episodeId));
    },
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid, mediumId, progress, readDate) {
        return inContext((context) => context.setUuid(uuid).updateProgress(uuid, mediumId, progress, readDate));
    },
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     */
    addNews(news) {
        return inContext((context) => context.addNews(news));
    },
    /**
     *
     */
    // tslint:disable-next-line
    getNews({ uuid, since, till, newsIds }) {
        return inContext((context) => context.getNews(uuid, since, till, newsIds));
    },
    /**
     *
     */
    deleteOldNews() {
        return inContext((context) => context.deleteOldNews());
    },
    /**
     *
     * @param result
     */
    processResult(result) {
        return inContext((context) => context.processResult(result));
    },
    /**
     *
     * @param result
     */
    saveResult(result) {
        return inContext((context) => context.saveResult(result));
    },
    /**
     *
     */
    addScrape(scrape) {
        return inContext((context) => context.addScrape(scrape));
    },
    /**
     *
     */
    getScrapes() {
        return inContext((context) => context.getScrapes());
    },
    /**
     *
     */
    removeScrape(link, type) {
        return inContext((context) => context.removeScrape(link, type));
    },
    /**
     *
     */
    showUser() {
        return inContext((context) => context.showUser());
    },
    /**
     *
     */
    linkNewsToMedium() {
        return inContext((context) => context.linkNewsToMedium());
    },
    /**
     * Marks these news as read for the given user.
     */
    markNewsRead(uuid, news) {
        return inContext((context) => context.setUuid(uuid).markRead(uuid, news));
    },
    /**
     * Marks these news as read for the given user.
     */
    markEpisodeRead(uuid, result) {
        return inContext((context) => context.setUuid(uuid).markEpisodeRead(uuid, result));
    },
    /**
     * Marks these news as read for the given user.
     */
    checkUnreadNews(uuid) {
        return inContext((context) => context.checkUnreadNewsCount(uuid));
    },
    /**
     *
     */
    getInvalidated(uuid) {
        return inContext((context) => context.getInvalidated(uuid));
    },
    getLatestNews(domain) {
        return inContext((context) => context.getLatestNews(domain));
    },
    /**
     *
     */
    removeLinkNewsToMedium(newsId, mediumId) {
        return inContext((context) => context.removeLinkNewsToMedium(newsId, mediumId));
    },
    clear() {
        return inContext((context) => context.clearAll());
    },
};
/**
 *
 */
exports.startStorage = () => start();
//# sourceMappingURL=database.js.map