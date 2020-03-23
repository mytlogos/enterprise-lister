import mySql from "promise-mysql";
import env from "../env";
import {
    Episode,
    EpisodeContentData,
    EpisodeRelease,
    ExternalList,
    ExternalUser,
    FullPart,
    Invalidation,
    JobItem,
    JobRequest,
    LikeMedium,
    LikeMediumQuery,
    List,
    Medium,
    MetaResult,
    MultiSingle,
    News,
    Part,
    ProgressResult,
    Result,
    ScrapeItem,
    ShallowPart,
    SimpleEpisode,
    SimpleMedium,
    SimpleRelease,
    SimpleUser,
    Synonyms,
    TocSearchMedium,
    User
} from "../types";
import logger from "../logger";
import {QueryContext} from "./queryContext";
import {databaseSchema} from "./databaseSchema";
import {delay, isQuery} from "../tools";
import {MediumInWait} from "./databaseTypes";
import {SchemaManager} from "./schemaManager";
import {Query} from "mysql";
import {ScrapeType} from "../externals/types";

type ContextCallback<T> = (context: QueryContext) => Promise<T>;


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
export async function inContext<T>(callback: ContextCallback<T>, transaction = true): Promise<T> {
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
    const context = new QueryContext(con);

    let result;
    try {
        result = await doTransaction(callback, context, transaction);
    } finally {
        if (isQuery(result)) {
            const query: Query = result;
            query.on("end", () => {
                pool.releaseConnection(con);
            });
        } else {
            // release connection into the pool
            await pool.releaseConnection(con);
        }
    }
    return result;
}

// tslint:disable-next-line
async function catchTransactionError<T>(transaction: boolean, context: QueryContext, e: any, attempts: number, callback: ContextCallback<T>) {
// if it could not be commit due to error, roll back and rethrow error
    if (transaction) {
        // if there is a transaction first rollback and then throw error
        await context.rollback();
    }
    // if it is an deadlock or lock wait timeout error, restart transaction after a delay at max five times
    if ((e.errno === 1213 || e.errno === 1205) && attempts < 5) {
        await delay(500);
        return doTransaction(callback, context, transaction, ++attempts);
    } else {
        // if it isn't an deadlock error, or still an deadlock after five attempts, rethrow error
        throw e;
    }
}

async function doTransaction<T>(callback: ContextCallback<T>, context: QueryContext, transaction: boolean,
                                attempts = 0): Promise<T> {
    let result: T;
    try {
        // if transaction, start it
        if (transaction) {
            await context.startTransaction();
        }
        // let callback run with context
        result = await callback(context);

        if (isQuery(result)) {
            const query: Query = result;
            let error = false;
            // TODO: 31.08.2019 returning query object does not allow normal error handling,
            //  maybe return own stream where the control is completely in my own hands
            query
                .on("error", (err) => {
                    error = true;
                    if (transaction) {
                        context.rollback();
                    }
                    logger.error(err);
                })
                .on("end", () => {
                    if (!error && transaction) {
                        context.commit();
                    }
                });
            // if transaction and no error till now, commit it and return result
        } else if (transaction) {
            await context.commit();
        }
    } catch (e) {
        return await catchTransactionError(transaction, context, e, attempts, callback);
    }
    return result;
}

const poolPromise = mySql.createPool({
    connectionLimit: env.dbConLimit,
    host: env.dbHost,
    user: env.dbUser,
    password: env.dbPassword,
    // charset/collation of the current database and tables
    charset: "utf8mb4",
    // we assume that the database exists already
    database: "enterprise",
    typeCast(field, next) {
        if (field.type === "TINY" && field.length === 1) {
            return (field.string() === "1"); // 1 = true, 0 = false
        } else {
            return next();
        }
    }
});

let errorAtStart = false;
let running = false;


let startPromise: Promise<void> | null;

/**
 * Checks the database for incorrect structure
 * and tries to correct these.
 */
function start(): void {
    if (!running) {
        running = true;
        try {
            const manager = new SchemaManager();
            manager.initTableSchema(databaseSchema);
            // @ts-ignore
            startPromise = inContext(
                // @ts-ignore
                (context) => manager.checkTableSchema(context),
                true,
            ).catch((error) => {
                logger.error(error);
                errorAtStart = true;
                return Promise.reject("Database error occurred while starting");
            });
        } catch (e) {
            errorAtStart = true;
            startPromise = Promise.reject("Error in database schema");
            logger.error(e);
        }
    }
}

export interface Storage {
    getOverLappingParts(id: number, nonStandardPartIds: number[]): Promise<number[]>;

    stopJobs(): Promise<void>;

    getAfterJobs(id: number): Promise<JobItem[]>;

    getJobs(): Promise<JobItem[]>;

    addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]>;

    removeJobs(jobs: JobItem | JobItem[]): Promise<void>;

    removeJob(key: string | number): Promise<void>;

    updateJobs(jobs: JobItem | JobItem[]): Promise<void>;

    queueNewTocs(): Promise<void>;

    deleteRelease(release: EpisodeRelease): Promise<void>;

    getEpisodeLinks(knownEpisodeIds: number[]): Promise<SimpleRelease[]>;

    getEpisodeContent(chapterLink: string): Promise<EpisodeContentData>;

    getPageInfo(link: string, key: string): Promise<{ link: string, key: string, values: string[] }>;

    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;

    removePageInfo(link: string, key?: string): Promise<void>;

    addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;

    addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;

    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void>;

    getSourcedReleases(sourceType: string, mediumId: number):
        Promise<Array<{ sourceType: string, url: string, title: string, mediumId: number }>>;

    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium>;

    getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;

    getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;

    updatePart(part: Part, uuid?: string): Promise<boolean>;

    getUser(uuid: string, ip: string): Promise<User>;

    loggedInUser(ip: string): Promise<SimpleUser | null>;

    userLoginStatus(ip: string, uuid: string, session: string): Promise<boolean>;

    removeSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;

    updateExternalList(externalList: ExternalList, uuid?: string): Promise<boolean>;

    getProgress(uuid: string, episodeId: number): Promise<number>;

    moveMedium(oldListId: number, newListId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;

    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;

    removeMedium(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;

    addNews(news: (News | News[])): Promise<News | Array<News | undefined> | undefined>;

    getScrapes(): Promise<ScrapeItem[]>;

    createStandardPart(mediumId: number): Promise<ShallowPart>;

    deletePart(id: number, uuid?: string): Promise<boolean>;

    getList(listId: (number | number[]), media: number[], uuid: string): Promise<{
        list: List | List[]; media: Medium[]
    }>;

    getSynonyms(mediumId: (number | number[])): Promise<Synonyms[]>;

    getScrapeExternalUser(): Promise<Array<{ userUuid: string; type: number; uuid: string; cookies: string }>>;

    removeProgress(uuid: string, episodeId: number): Promise<boolean>;

    addItemToExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;

    markEpisodeRead(uuid: string, result: Result): Promise<void>;

    getMediumParts(mediumId: number, uuid: string): Promise<FullPart[]>;

    getMediumParts(mediumId: number): Promise<ShallowPart[]>;

    getMediumPartIds(mediumId: number): Promise<number[]>;

    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;

    getStandardPartId(mediumId: number): Promise<number | undefined>;

    updateProgress(uuid: string, mediumId: number, progress: number, readDate: (Date | null)): Promise<boolean>;

    showUser(): Promise<User[]>;

    addScrape(scrape: (ScrapeItem | ScrapeItem[])): Promise<boolean>;

    processResult(result: Result): Promise<MetaResult | MetaResult[]>;

    getExternalList(id: number): Promise<ExternalList>;

    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean>;

    logoutUser(uuid: string, ip: string): Promise<boolean>;

    stop(): Promise<void>;

    addEpisode(episode: SimpleEpisode, uuid?: string): Promise<SimpleEpisode>;

    addEpisode(episode: SimpleEpisode[], uuid?: string): Promise<SimpleEpisode[]>;

    updateEpisode(episode: SimpleEpisode, uuid?: string): Promise<boolean>;

    moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean>;

    deleteUser(uuid: string): Promise<boolean>;

    addPart(part: Part, uuid?: string): Promise<Part>;

    getLatestNews(domain: string): Promise<News[]>;

    getMedium(id: (number | number[]), uuid: string): Promise<Medium | Medium[]>;

    getAllMedia(): Promise<number[]>;

    deleteList(listId: number, uuid: string): Promise<boolean>;

    updateMedium(medium: SimpleMedium, uuid?: string): Promise<boolean>;

    createFromMediaInWait(createMedium: any, tocsMedia: any, listId: any): Promise<any>;

    consumeMediaInWait(mediumId: number, tocsMedia: MediumInWait[]): Promise<boolean>;

    getMediaInWait(): Promise<MediumInWait[]>;

    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;

    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;

    getExternalLists(uuid: string): Promise<ExternalList[]>;

    saveResult(result: Result): Promise<boolean>;

    setProgress(uuid: string, progressResult: (ProgressResult | ProgressResult[])): Promise<void>;

    getNews({uuid, since, till, newsIds}: {
        uuid: string; since?: Date; till?: Date; newsIds?: number[]
    }): Promise<News[]>;

    checkUnreadNews(uuid: string): Promise<number>;

    getUserLists(uuid: string): Promise<List[]>;

    loginUser(userName: string, password: string, ip: string): Promise<User>;

    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser>;

    addList(uuid: string, list: { name: string; medium: number }): Promise<List>;

    removeItemFromExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean>;

    updateList(list: List): Promise<boolean>;

    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]>;

    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{ partId: number, episodes: number[] }>>;

    getParts(partsId: (number | number[]), uuid: string): Promise<Part[] | Part>;

    getInvalidated(uuid: string): Promise<Invalidation[]>;

    getInvalidatedStream(uuid: string): Promise<Query>;

    markNewsRead(uuid: string, news: number[]): Promise<boolean>;

    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;

    addItemToList(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean>;

    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean>;

    clear(): Promise<boolean>;

    updateUser(uuid: string, user: { name?: string; newPassword?: string; password?: string }): Promise<boolean>;

    getExternalUserWithCookies(uuid: string): Promise<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string
    }>;

    addExternalList(userUuid: string, externalList: ExternalList, uuid?: string): Promise<ExternalList>;

    removeScrape(link: string, type: ScrapeType): Promise<boolean>;

    updateScrape(url: string, scrapeType: ScrapeType, nextScrape: number): void;

    deleteEpisode(id: number, uuid?: string): Promise<boolean>;

    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;

    addSynonyms(synonyms: (Synonyms | Synonyms[]), uuid?: string): Promise<boolean>;

    addToc(mediumId: number, link: string): Promise<void>;

    linkNewsToMedium(): Promise<boolean>;

    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>>;

    getMediumEpisodePerIndex(mediumId: number, index: number[]): Promise<SimpleEpisode[]>;

    getMediumEpisodePerIndex(mediumId: number, index: number): Promise<SimpleEpisode>;

    getEpisode(id: number, uuid: string): Promise<Episode>;

    getEpisode(id: number[], uuid: string): Promise<Episode[]>;

    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]>;

    getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]>;

    getExternalUser(uuid: string): Promise<ExternalUser>;

    deleteExternalUser(externalUuid: string, uuid?: string): Promise<boolean>;

    register(userName: string, password: string, ip: string): Promise<User>;

    removeExternalList(externalUuid: string, externalListId: (number | number[]), uuid?: string): Promise<boolean>;

    saveMediumSettings(mediumId: number, settings: any): Promise<void>;

    saveListSettings(listId: number, settings: any): Promise<void>;

    saveExternalListSettings(listId: number, settings: any): Promise<void>;

    saveAppSettings(listId: number, settings: any): Promise<void>;

    saveSettings(listId: number, settings: any): Promise<void>;

    getTocs(mediumId: number): Promise<string[]>;

    getAllMediaTocs(): Promise<Array<{ link?: string, id: number }>>;

    getAllTocs(): Promise<Array<{ link: string, id: number }>>;

    getChapterIndices(mediumId: number): Promise<number[]>;

    getAllChapterLinks(mediumId: number): Promise<string[]>;

    getTocSearchMedium(id: number): Promise<TocSearchMedium>;

    getTocSearchMedia(): Promise<TocSearchMedium[]>;

    deleteOldNews(): Promise<boolean>;
}

// @ts-ignore
export const Storage: Storage = {

    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop(): Promise<void> {
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
    register(userName: string, password: string, ip: string): Promise<User> {
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
    loginUser(userName: string, password: string, ip: string): Promise<User> {
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
    userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean> {
        return inContext((context) => context.userLoginStatus(ip, uuid, session));
    },

    /**
     * Get the user for the given uuid.
     *
     * @return {Promise<SimpleUser>}
     */
    // @ts-ignore
    getUser(uuid: string, ip: string): Promise<User> {
        return inContext((context) => context.getUser(uuid, ip));
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
    loggedInUser(ip: string): Promise<SimpleUser | null> {
        return inContext((context) => context.loggedInUser(ip));
    },

    /**
     * Logs a user out.
     *
     * @return {Promise<boolean>}
     */
    logoutUser(uuid: string, ip: string): Promise<boolean> {
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
    deleteUser(uuid: string): Promise<boolean> {
        return inContext((context) => context.deleteUser(uuid));
    },

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @return {Promise<boolean>}
     */
    updateUser(uuid: string, user: { name?: string, newPassword?: string, password?: string }): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updateUser(uuid, user));
    },

    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    addList(uuid: string, list: { name: string, medium: number }): Promise<List> {
        return inContext((context) => context.setUuid(uuid).addList(uuid, list));
    },

    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<SimpleMedium>}>}
     */
    getList(listId: number | number[], media: number[], uuid: string):
        Promise<{ list: List | List[], media: Medium[] }> {

        return inContext((context) => context.getList(listId, media, uuid));
    },

    /**
     * Updates the properties of a list.
     */
    updateList(list: List): Promise<boolean> {
        return inContext((context) => context.setUuid(list.userUuid).updateList(list));
    },

    /**
     * Deletes a list irreversibly.
     */
    deleteList(listId: number, uuid: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).deleteList(listId, uuid));
    },

    /**
     * Returns all available lists for the given user.
     *
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid: string): Promise<List[]> {
        return inContext((context) => context.getUserLists(uuid));
    },

    /**
     * Adds a medium to the storage.
     *
     * @return {Promise<SimpleMedium>}
     */
    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium> {
        return inContext((context) => context.addMedium(medium, uuid));
    },

    /**
     * Gets one or multiple media from the storage.
     */
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]> {
        return inContext((context) => context.getLatestReleases(mediumId));
    },

    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id: number | number[], uuid: string): Promise<Medium | Medium[]> {
        // @ts-ignore
        return inContext((context) => context.getMedium(id, uuid));
    },

    /**
     * Gets one or multiple media from the storage.
     */
    getAllMedia(): Promise<number[]> {
        // @ts-ignore
        return inContext((context) => context.getAllMedia());
    },

    /**
     * Gets one or multiple media from the storage, which are like the input.
     */
    // @ts-ignore
    getLikeMedium(likeMedia: LikeMediumQuery | LikeMediumQuery[]): Promise<LikeMedium | LikeMedium[]> {
        // @ts-ignore
        return inContext((context) => context.getLikeMedium(likeMedia));
    },

    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium: SimpleMedium, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updateMedium(medium));
    },

    getMediaInWait(): Promise<MediumInWait[]> {
        return inContext((context) => context.getMediaInWait());
    },

    createFromMediaInWait(createMedium: MediumInWait, tocsMedia?: MediumInWait[], listId?: number): Promise<Medium> {
        return inContext((context) => context.createFromMediaInWait(createMedium, tocsMedia, listId));
    },

    consumeMediaInWait(mediumId: number, tocsMedia: MediumInWait[]): Promise<boolean> {
        return inContext((context) => context.consumeMediaInWait(mediumId, tocsMedia));
    },

    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void> {
        return inContext((context) => context.deleteMediaInWait(mediaInWait));
    },

    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void> {
        return inContext((context) => context.addMediumInWait(mediaInWait));
    },

    /**
     */
    addSynonyms(synonyms: Synonyms | Synonyms[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).addSynonyms(synonyms));
    },

    /**
     */
    addToc(mediumId: number, link: string): Promise<void> {
        return inContext((context) => context.addToc(mediumId, link));
    },

    /**
     */
    getTocs(mediumId: number): Promise<string[]> {
        return inContext((context) => context.getToc(mediumId));
    },

    /**
     */
    getAllMediaTocs(): Promise<Array<{ link?: string, id: number }>> {
        return inContext((context) => context.getAllMediaTocs());
    },

    /**
     */
    getAllTocs(): Promise<Array<{ link: string, id: number }>> {
        return inContext((context) => context.getAllTocs());
    },

    /**
     */
    getChapterIndices(mediumId: number): Promise<number[]> {
        return inContext((context) => context.getChapterIndices(mediumId));
    },

    getAllChapterLinks(mediumId: number): Promise<string[]> {
        return inContext((context) => context.getAllChapterLinks(mediumId));
    },

    getTocSearchMedia(): Promise<TocSearchMedium[]> {
        return inContext((context) => context.getTocSearchMedia());
    },

    getTocSearchMedium(id: number): Promise<TocSearchMedium> {
        return inContext((context) => context.getTocSearchMedium(id));
    },

    /**
     *
     */
    removeSynonyms(synonyms: Synonyms | Synonyms[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).removeSynonyms(synonyms));
    },

    /**
     *
     */
    getSynonyms(mediumId: number | number[]): Promise<Synonyms[]> {
        return inContext((context) => context.getSynonyms(mediumId));
    },

    /**
     * Returns all parts of an medium with their episodes.
     */
    // @ts-ignore
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]> {
        return inContext((context) => context.getMediumParts(mediumId, uuid));
    },

    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumPartIds(mediumId: number): Promise<number[]> {
        return inContext((context) => context.getMediumPartIds(mediumId));
    },

    getStandardPart(mediumId: number): Promise<ShallowPart | undefined> {
        return inContext((context) => context.getStandardPart(mediumId));
    },

    getStandardPartId(mediumId: number): Promise<number | undefined> {
        return inContext((context) => context.getStandardPartId(mediumId));
    },

    /**
     * Returns parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]> {
        return inContext((context) => context.getMediumPartsPerIndex(mediumId, index, uuid));
    },

    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{ partId: number, episodes: number[] }>> {
        return inContext((context) => context.getPartsEpisodeIndices(partId));
    },

    /**
     * Returns one or multiple parts with their episode.
     */
    getParts(partsId: number | number[], uuid: string): Promise<Part[] | Part> {
        // @ts-ignore
        return inContext((context) => context.getParts(partsId, uuid));
    },

    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part: Part, uuid?: string): Promise<Part> {
        return inContext((context) => context.setUuid(uuid).addPart(part));
    },

    /**
     * Updates a part.
     */
    updatePart(part: Part, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updatePart(part));
    },

    /**
     * Creates the Standard Part for all non part-indexed episodes for the given mediumId.
     */
    createStandardPart(mediumId: number): Promise<ShallowPart> {
        return inContext((context) => context.createStandardPart(mediumId));
    },

    /**
     * Deletes a part from the storage.
     */
    deletePart(id: number, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).deletePart(id));
    },

    /**
     * Adds a episode of a part to the storage.
     */
    // @ts-ignore
    addEpisode(episode: MultiSingle<SimpleEpisode>, uuid?: string)
        : Promise<MultiSingle<SimpleEpisode>> {
        // @ts-ignore
        return inContext((context) => context.setUuid(uuid).addEpisode(episode));
    },

    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode: SimpleEpisode, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updateEpisode(episode));
    },

    moveEpisodeToPart(oldPartId: number, newPartId: number) {
        return inContext((context) => context.moveEpisodeToPart(oldPartId, newPartId));
    },

    /**
     * Gets an episode from the storage.
     */
    // @ts-ignore
    getEpisode(id: number | number[], uuid: string): Promise<Episode | Episode[]> {
        // @ts-ignore
        return inContext((context) => context.getEpisode(id, uuid));
    },

    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]> {
        return inContext((context) => context.getReleases(episodeId));
    },

    getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]> {
        return inContext((context) => context.getReleasesByHost(episodeId, host));
    },

    /**
     *
     */
    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>> {
        // @ts-ignore
        return inContext((context) => context.getPartEpisodePerIndex(partId, index));
    },

    /**
     *
     */
    // @ts-ignore
    getMediumEpisodePerIndex(mediumId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>> {
        return inContext((context) => context.getMediumEpisodePerIndex(mediumId, index));
    },

    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id: number, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).deleteEpisode(id));
    },

    // @ts-ignore
    addRelease(releases: MultiSingle<EpisodeRelease>): Promise<MultiSingle<EpisodeRelease>> {
        // @ts-ignore
        return inContext((context) => context.addRelease(releases));
    },

    // @ts-ignore
    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void> {
        return inContext((context) => context.updateRelease(releases));
    },

    getSourcedReleases(sourceType: string, mediumId: number):
        Promise<Array<{ sourceType: string, url: string, title: string, mediumId: number }>> {
        return inContext((context) => context.getSourcedReleases(sourceType, mediumId));
    },

    deleteRelease(release: EpisodeRelease): Promise<void> {
        return inContext((context) => context.deleteRelease(release));
    },


    getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]> {
        return inContext((context) => context.getEpisodeLinks(episodeIds));
    },

    getEpisodeContent(chapterLink: string): Promise<EpisodeContentData> {
        return inContext((context) => context.getEpisodeContentData(chapterLink));
    },

    getPageInfo(link: string, key: string): Promise<{ link: string, key: string, values: string[] }> {
        return inContext((context) => context.getPageInfo(link, key));
    },

    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void> {
        return inContext((context) => context.updatePageInfo(link, key, values, toDeleteValues));
    },

    removePageInfo(link: string, key?: string): Promise<void> {
        return inContext((context) => context.removePageInfo(link, key));
    },

    queueNewTocs(): Promise<void> {
        return inContext((context) => context.queueNewTocs());
    },

    getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]> {
        return inContext((context) => context.getOverLappingParts(standardId, nonStandardPartIds));
    },

    stopJobs(): Promise<void> {
        return inContext((context) => context.stopJobs());
    },

    getJobs(limit?: number): Promise<JobItem[]> {
        return inContext((context) => context.getJobs(limit));
    },

    getAfterJobs(id: number): Promise<JobItem[]> {
        return inContext((context) => context.getAfterJobs(id));
    },

    addJobs(jobs: JobRequest | JobRequest[]): Promise<JobItem | JobItem[]> {
        return inContext((context) => context.addJobs(jobs));
    },

    removeJobs(jobs: JobItem | JobItem[]): Promise<void> {
        return inContext((context) => context.removeJobs(jobs));
    },

    removeJob(key: string | number): Promise<void> {
        return inContext((context) => context.removeJob(key));
    },

    updateJobs(jobs: JobItem | JobItem[]): Promise<void> {
        return inContext((context) => context.updateJobs(jobs));
    },

    /**
     * Adds a medium to a list.
     */
    addItemToList(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).addItemToList(false, {listId, id: mediumId}));
    },

    /**
     * Moves a medium from an old list to a new list.
     */
    moveMedium(oldListId: number, newListId: number, mediumId: number | number[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).moveMedium(oldListId, newListId, mediumId));
    },

    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]> {
        return inContext((context) => context.getSimpleMedium(id));
    },

    /**
     * Removes an item from a list.
     */
    removeMedium(listId: number, mediumId: number | number[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).removeMedium(listId, mediumId));
    },

    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser> {
        return inContext((context) => context.setUuid(localUuid).addExternalUser(localUuid, externalUser));
    },

    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid: string, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).deleteExternalUser(externalUuid));

    },

    /**
     * Gets an external user.
     */
    getExternalUser(uuid: string): Promise<ExternalUser> {
        return inContext((context) => context.getExternalUser(uuid));
    },

    /**
     * Gets an external user with cookies, without items.
     */
    getExternalUserWithCookies(uuid: string)
        : Promise<{ userUuid: string, type: number, uuid: string, cookies: string }> {

        return inContext((context) => context.getExternalUserWithCookies(uuid));
    },

    /**
     *
     */
    getScrapeExternalUser(): Promise<Array<{ userUuid: string, type: number, uuid: string, cookies: string }>> {
        return inContext((context) => context.getScrapeExternalUser());
    },

    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
        return inContext((context) => context.setUuid(externalUser.localUuid).updateExternalUser(externalUser));
    },

    /**
     * Adds an external list of an user to the storage.
     */
    addExternalList(userUuid: string, externalList: ExternalList, uuid?: string): Promise<ExternalList> {
        return inContext((context) => context.setUuid(uuid).addExternalList(userUuid, externalList));
    },

    /**
     * Updates an external list.
     */
    updateExternalList(externalList: ExternalList, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updateExternalList(externalList));
    },

    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(externalUuid: string, externalListId: number | number[], uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).removeExternalList(externalUuid, externalListId));
    },

    /**
     * Gets an external list from the storage.
     */
    getExternalList(id: number): Promise<ExternalList> {
        return inContext((context) => context.getExternalList(id));
    },

    /**
     * Gets all external lists from the externalUser from the storage.
     */
    getExternalLists(uuid: string): Promise<ExternalList[]> {
        return inContext((context) => context.getExternalUserLists(uuid));
    },

    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).addItemToList(true, {listId, id: mediumId}));
    },

    /**
     * Removes a medium from an external list in the storage.
     */
    removeItemFromExternalList(listId: number, mediumId: number, uuid?: string): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).removeMedium(listId, mediumId, true));
    },

    /**
     *
     */
    setProgress(uuid: string, progressResult: ProgressResult | ProgressResult[]): Promise<void> {
        return inContext((context) => context.setUuid(uuid).setProgress(uuid, progressResult));
    },

    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).addProgress(uuid, episodeId, progress, readDate));
    },

    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid: string, episodeId: number): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).removeProgress(uuid, episodeId));
    },

    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid: string, episodeId: number): Promise<number> {
        return inContext((context) => context.getProgress(uuid, episodeId));
    },

    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid: string, mediumId: number, progress: number, readDate: Date | null): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).updateProgress(uuid, mediumId, progress, readDate));
    },


    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     */
    addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>> {
        return inContext((context) => context.addNews(news));
    },

    /**
     *
     */
    // tslint:disable-next-line
    getNews({uuid, since, till, newsIds}: { uuid: string, since?: Date, till?: Date, newsIds?: number[] }): Promise<News[]> {
        return inContext((context) => context.getNews(uuid, since, till, newsIds));
    },

    /**
     *
     */
    deleteOldNews(): Promise<boolean> {
        return inContext((context) => context.deleteOldNews());
    },

    /**
     *
     * @param result
     */
    processResult(result: Result): Promise<MetaResult | MetaResult[]> {
        return inContext((context) => context.processResult(result));
    },

    /**
     *
     * @param result
     */
    saveResult(result: Result): Promise<boolean> {
        return inContext((context) => context.saveResult(result));
    },

    /**
     *
     */
    addScrape(scrape: ScrapeItem | ScrapeItem[]): Promise<boolean> {
        return inContext((context) => context.addScrape(scrape));
    },

    /**
     *
     */
    getScrapes(): Promise<ScrapeItem[]> {
        return inContext((context) => context.getScrapes());
    },


    /**
     *
     */
    removeScrape(link: string, type: ScrapeType): Promise<boolean> {
        return inContext((context) => context.removeScrape(link, type));
    },

    updateScrape(link: string, type: ScrapeType, nextScrape: number): Promise<boolean> {
        return inContext((context) => context.updateScrape(link, type, nextScrape));
    },

    /**
     *
     */
    showUser(): Promise<User[]> {
        return inContext((context) => context.showUser());
    },


    /**
     *
     */
    linkNewsToMedium(): Promise<boolean> {
        return inContext((context) => context.linkNewsToMedium());
    },

    /**
     * Marks these news as read for the given user.
     */
    markNewsRead(uuid: string, news: number[]): Promise<boolean> {
        return inContext((context) => context.setUuid(uuid).markRead(uuid, news));
    },

    /**
     * Marks these news as read for the given user.
     */
    markEpisodeRead(uuid: string, result: Result): Promise<void> {
        return inContext((context) => context.setUuid(uuid).markEpisodeRead(uuid, result));
    },

    /**
     * Marks these news as read for the given user.
     */
    checkUnreadNews(uuid: string): Promise<number> {
        return inContext((context) => context.checkUnreadNewsCount(uuid));
    },

    /**
     *
     */
    getInvalidated(uuid: string): Promise<Invalidation[]> {
        return inContext((context) => context.getInvalidated(uuid));
    },
    /**
     *
     */
    getInvalidatedStream(uuid: string): Promise<Query> {
        return inContext((context) => context.getInvalidatedStream(uuid));
    },


    getLatestNews(domain: string): Promise<News[]> {
        return inContext((context) => context.getLatestNews(domain));
    },


    /**
     *
     */
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeLinkNewsToMedium(newsId, mediumId));
    },

    clear(): Promise<boolean> {
        return inContext((context) => context.clearAll());
    },
};

/**
 *
 */
export const startStorage = () => start();
// TODO: 01.09.2019 check whether it should 'start' implicitly or explicitly
start();
