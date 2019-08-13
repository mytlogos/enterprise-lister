import mySql from "promise-mysql";
import env from "../env";
import {
    Episode,
    EpisodeContentData,
    EpisodeRelease,
    ExternalList,
    ExternalUser,
    Invalidation,
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
import {delay} from "../tools";
import {MediumInWait} from "./databaseTypes";
import {ScrapeTypes} from "../externals/scraperTools";
import {SchemaManager} from "./schemaManager";

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
        // release connection into the pool
        await pool.releaseConnection(con);
    }
    return result;
}

async function doTransaction<T>(callback: ContextCallback<T>, context: QueryContext, transaction: boolean,
                                attempts = 0): Promise<T> {
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
    } catch (e) {
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
    database: "enterprise"
});

let errorAtStart = false;
let running = false;


/**
 * @type {Promise<Storage>|void}
 */
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
            startPromise = inContext(
                (context) => manager.checkTableSchema(context),
                true,
            ).catch((error) => {
                logger.error(error);
                console.log(error);
                errorAtStart = true;
                return Promise.reject("Database error occurred while starting");
            });
        } catch (e) {
            errorAtStart = true;
            startPromise = Promise.reject("Error in database schema");
            logger.error(e);
            console.log(e);
        }
    }
}

export interface Storage {
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

    removeMedium(listId: number, mediumId: number, uuid?: string): Promise<boolean>;

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

    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]>;

    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;

    updateProgress(uuid: string, mediumId: number, progress: number, readDate: (Date | null)): Promise<boolean>;

    showUser(): Promise<User[]>;

    addScrape(scrape: (ScrapeItem | ScrapeItem[])): Promise<boolean>;

    processResult(result: Result): Promise<MetaResult | MetaResult[]>;

    getExternalList(id: number): Promise<ExternalList>;

    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: (Date | null)): Promise<boolean>;

    logoutUser(uuid: string, ip: string): Promise<boolean>;

    stop(): Promise<void>;

    addEpisode(episode: SimpleEpisode, uuid?: string): Promise<SimpleEpisode>;

    addEpisode(episode: SimpleEpisode[], uuid?: string): Promise<SimpleEpisode[]>;

    updateEpisode(episode: SimpleEpisode, uuid?: string): Promise<boolean>;

    moveEpisodeToPart(episodeId: MultiSingle<number>, partId: number): Promise<boolean>;

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

    removeScrape(link: string, type: ScrapeTypes): Promise<boolean>;

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

    getAllTocs(): Promise<Array<{ link?: string, id: number }>>;

    getChapterIndices(mediumId: number): Promise<number[]>;

    getAllChapterLinks(mediumId: number): Promise<string[]>;

    getTocSearchMedium(id: number): Promise<TocSearchMedium>;

    getTocSearchMedia(): Promise<TocSearchMedium[]>;

    deleteOldNews(): Promise<boolean>;
}

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
        return inContext((context) => context.setUuid(uuid).addMedium(medium, uuid));
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
    getAllTocs(): Promise<Array<{ link?: string, id: number }>> {
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
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]> {
        return inContext((context) => context.getMediumParts(mediumId, uuid));
    },

    getStandardPart(mediumId: number): Promise<ShallowPart | undefined> {
        return inContext((context) => context.getStandardPart(mediumId));
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

    moveEpisodeToPart(episodeId: MultiSingle<number>, partId: number) {
        return inContext((context) => context.moveEpisodeToPart(episodeId, partId));
    },

    /**
     * Gets an episode from the storage.
     */
    // @ts-ignore
    getEpisode(id: number | number[], uuid: string): Promise<Episode | Episode[]> {
        // @ts-ignore
        return inContext((context) => context.getEpisode(id, uuid));
    },

    /**
     *
     */
    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>> {
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
    removeMedium(listId: number, mediumId: number, uuid?: string): Promise<boolean> {
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
    removeScrape(link: string, type: ScrapeTypes): Promise<boolean> {
        return inContext((context) => context.removeScrape(link, type));
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
