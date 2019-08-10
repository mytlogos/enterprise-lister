import { Connection } from "promise-mysql";
import { Episode, EpisodeContentData, EpisodeRelease, ExternalList, ExternalUser, Invalidation, LikeMedium, LikeMediumQuery, List, Medium, MetaResult, MultiSingle, News, Part, ProgressResult, ReadEpisode, Result, ScrapeItem, ShallowPart, SimpleEpisode, SimpleMedium, SimpleUser, Synonyms, TocSearchMedium, User } from "../types";
import { MediumInWait } from "./databaseTypes";
import { ScrapeTypes } from "../externals/scraperTools";
import { Trigger } from "./trigger";
export interface DbTrigger {
    Trigger: string;
    Event: string;
    Timing: string;
    Table: string;
}
/**
 * A Class for consecutive queries on the same connection.
 */
export declare class QueryContext {
    private con;
    private uuid;
    constructor(con: Connection);
    setUuid(uuid?: string): this;
    /**
     *
     */
    useDatabase(): Promise<void>;
    /**
     *
     */
    startTransaction(): Promise<void>;
    /**
     *
     */
    commit(): Promise<void>;
    /**
     *
     */
    rollback(): Promise<void>;
    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    start(): Promise<void>;
    getDatabaseVersion(): Promise<Array<{
        version: number;
    }>>;
    updateDatabaseVersion(version: number): Promise<number>;
    /**
     * Checks whether the main database exists currently.
     */
    databaseExists(): Promise<boolean>;
    createDatabase(): Promise<void>;
    getTables(): Promise<any[]>;
    getTriggers(): Promise<DbTrigger[]>;
    createTrigger(trigger: Trigger): any;
    dropTrigger(trigger: string): Promise<any>;
    createTable(table: string, columns: string[]): Promise<any>;
    addColumn(tableName: string, columnDefinition: string): Promise<any>;
    alterColumn(tableName: string, columnDefinition: string): Promise<any>;
    addUnique(tableName: string, indexName: string, ...columns: string[]): Promise<any>;
    dropIndex(tableName: string, indexName: string): Promise<any>;
    addForeignKey(tableName: string, constraintName: string, column: string, referencedTable: string, referencedColumn: string, onDelete?: string, onUpdate?: string): Promise<any>;
    dropForeignKey(tableName: string, indexName: string): Promise<any>;
    addPrimaryKey(tableName: string, ...columns: string[]): Promise<any>;
    dropPrimaryKey(tableName: string): Promise<any>;
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
     */
    register(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    loginUser(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean>;
    loggedInUser(ip: string): Promise<SimpleUser | null>;
    getUser(uuid: string, ip: string): Promise<User>;
    /**
     * Logs a user out.
     */
    logoutUser(uuid: string, ip: string): Promise<boolean>;
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    deleteUser(uuid: string): Promise<boolean>;
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    updateUser(uuid: string, user: {
        name?: string;
        newPassword?: string;
        password?: string;
    }): Promise<boolean>;
    /**
     * Verifies the password the user of
     * the given uuid.
     *
     * @param {string} uuid
     * @param {string} password
     * @return {Promise<boolean>}
     */
    verifyPassword(uuid: string, password: string): Promise<boolean>;
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    addList(uuid: string, { name, medium }: {
        name: string;
        medium: number;
    }): Promise<List>;
    /**
     * Returns all mediums of a list with
     * the list_id.
     */
    getList(listId: number | number[], media: number[], uuid: string): Promise<{
        list: List[] | List;
        media: Medium[];
    }>;
    /**
     * Recreates a list from storage.
     */
    createShallowList(storageList: {
        id: number;
        name: string;
        medium: number;
        user_uuid: string;
    }): Promise<List>;
    /**
     * Updates the properties of a list.
     */
    updateList(list: List): Promise<boolean>;
    /**
     * Deletes a single list irreversibly.
     */
    deleteList(listId: number, uuid: string): Promise<boolean>;
    /**
     * Returns all available lists for the given user.
     */
    getUserLists(uuid: string): Promise<List[]>;
    /**
     * Adds a medium to the storage.
     */
    addMedium(medium: SimpleMedium, uuid?: string): Promise<SimpleMedium>;
    /**
     *
     */
    getLatestReleases(mediumId: number): Promise<SimpleEpisode[]>;
    getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]>;
    getSimpleMedium(id: number | number[]): Promise<SimpleMedium | SimpleMedium[]>;
    getTocSearchMedia(): Promise<TocSearchMedium[]>;
    getTocSearchMedium(id: number): Promise<TocSearchMedium>;
    getMedium(id: number, uuid: string): Promise<Medium>;
    getMedium(id: number[], uuid: string): Promise<Medium[]>;
    getLikeMedium(likeMedia: LikeMediumQuery): Promise<LikeMedium>;
    getLikeMedium(likeMedia: LikeMediumQuery[]): Promise<LikeMedium[]>;
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium: SimpleMedium): Promise<boolean>;
    createFromMediaInWait(medium: MediumInWait, same?: MediumInWait[], listId?: number): Promise<Medium>;
    consumeMediaInWait(mediumId: number, same: MediumInWait[]): Promise<boolean>;
    getMediaInWait(): Promise<MediumInWait[]>;
    deleteMediaInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
    addMediumInWait(mediaInWait: MultiSingle<MediumInWait>): Promise<void>;
    getStandardPart(mediumId: number): Promise<ShallowPart | undefined>;
    /**
     * Returns all parts of an medium.
     */
    getMediumParts(mediumId: number, uuid?: string): Promise<Part[]>;
    getPartsEpisodeIndices(partId: number | number[]): Promise<Array<{
        partId: number;
        episodes: number[];
    }>>;
    /**
     * Returns all parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId: number, index: MultiSingle<number>, uuid?: string): Promise<Part[]>;
    getParts(partId: number, uuid: string): Promise<Part>;
    getParts(partId: number[], uuid: string): Promise<Part[]>;
    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part: Part): Promise<Part>;
    /**
     * Updates a part.
     */
    updatePart(part: Part): Promise<boolean>;
    /**
     * Deletes a part from the storage.
     */
    deletePart(id: number): Promise<boolean>;
    addRelease(releases: EpisodeRelease): Promise<EpisodeRelease>;
    addRelease(releases: EpisodeRelease[]): Promise<EpisodeRelease[]>;
    getSourcedReleases(sourceType: string, mediumId: number): Promise<Array<{
        sourceType: string;
        url: string;
        title: string;
        mediumId: number;
    }>>;
    updateRelease(releases: MultiSingle<EpisodeRelease>): Promise<void>;
    getEpisodeContentData(chapterLink: string): Promise<EpisodeContentData>;
    addEpisode(episode: SimpleEpisode): Promise<Episode>;
    addEpisode(episode: SimpleEpisode[]): Promise<Episode[]>;
    getEpisode(id: number, uuid: string): Promise<Episode>;
    getEpisode(id: number[], uuid: string): Promise<Episode[]>;
    getPartEpisodePerIndex(partId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>>;
    getMediumEpisodePerIndex(mediumId: number, index: MultiSingle<number>): Promise<MultiSingle<SimpleEpisode>>;
    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode: SimpleEpisode): Promise<boolean>;
    /**
     * Updates an episode from the storage.
     */
    moveEpisodeToPart(episodeId: MultiSingle<number>, partId: number): Promise<boolean>;
    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id: number): Promise<boolean>;
    /**
     * Adds a medium to the list.
     *
     * If no listId is available it selects the
     * 'Standard' List of the given user and adds it there.
     */
    addItemToList(external: boolean, medium: {
        id: number | number[];
        listId?: number;
    }, uuid?: string): Promise<boolean>;
    /**
     * Moves a medium from an old list to a new list.
     *
     * @return {Promise<boolean>}
     */
    moveMedium(oldListId: number, newListId: number, mediumId: number | number[]): Promise<boolean>;
    /**
     * Removes an item from a list.
     */
    removeMedium(listId: number, mediumId: number | number[], external?: boolean): Promise<boolean>;
    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser>;
    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid: string): Promise<boolean>;
    /**
     * Gets an external user.
     */
    getExternalUser(externalUuid: string): Promise<ExternalUser>;
    /**
     * Gets an external user with cookies, without items.
     */
    getExternalUserWithCookies(uuid: string): Promise<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>;
    /**
     *
     */
    getScrapeExternalUser(): Promise<Array<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>>;
    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     */
    createShallowExternalUser(storageUser: {
        name: string;
        uuid: string;
        service: number;
        local_uuid: string;
    }): Promise<ExternalUser>;
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    addExternalList(userUuid: string, externalList: ExternalList): Promise<ExternalList>;
    /**
     * Updates an external list.
     */
    updateExternalList(externalList: ExternalList): Promise<boolean>;
    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(uuid: string, externalListId: number | number[]): Promise<boolean>;
    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    getExternalList(id: number): Promise<ExternalList>;
    /**
     * Creates a shallow external List with only the id´s of their items
     * as list.
     *
     * @param {ExternalList} storageList
     * @return {Promise<ExternalList>}
     */
    createShallowExternalList(storageList: ExternalList): Promise<ExternalList>;
    /**
     * Gets an array of all lists of an user.
     */
    getExternalUserLists(uuid: string): Promise<ExternalList[]>;
    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId: number, mediumId: number): Promise<boolean>;
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid: string, episodeId: number | number[], progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid: string, episodeId: number): Promise<boolean>;
    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    setProgress(uuid: string, progressResult: ProgressResult | ProgressResult[]): Promise<void>;
    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid: string, episodeId: number): Promise<number>;
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid: string, episodeId: number, progress: number, readDate: Date | null): Promise<boolean>;
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     *
     * @param {News|Array<News>} news
     * @return {Promise<News|undefined|Array<News|undefined>>}
     */
    addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>>;
    getLatestNews(domain: string): Promise<News[]>;
    /**
     *
     */
    getNews(uuid: string, since?: Date, till?: Date, newsIds?: number[]): Promise<News[]>;
    /**
     *
     */
    deleteOldNews(): Promise<boolean>;
    /**
     *
     */
    addScrape(scrape: ScrapeItem | ScrapeItem[]): Promise<boolean>;
    /**
     *
     */
    getScrapes(): Promise<ScrapeItem[]>;
    /**
     *
     */
    removeScrape(link: string, type: ScrapeTypes): Promise<boolean>;
    /**
     *
     */
    linkNewsToMedium(): Promise<boolean>;
    /**
     *
     */
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean>;
    /**
     * Marks these news as read for the given user.
     */
    markRead(uuid: string, news: number[]): Promise<boolean>;
    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    markEpisodeRead(uuid: string, result: Result): Promise<void>;
    createStandardPart(mediumId: number): Promise<ShallowPart>;
    /**
     *
     */
    checkUnreadNewsCount(uuid: string): Promise<number>;
    /**
     *
     */
    checkUnreadNews(uuid: string): Promise<number[]>;
    getSynonyms(mediumId: number | number[]): Promise<Synonyms[]>;
    removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean>;
    addToc(mediumId: number, link: string): Promise<void>;
    getToc(mediumId: number): Promise<string[]>;
    getAllTocs(): Promise<Array<{
        link?: string;
        id: number;
    }>>;
    getChapterIndices(mediumId: number): Promise<number[]>;
    getAllChapterLinks(mediumId: number): Promise<string[]>;
    /**
     * Returns all user stored in storage.
     */
    showUser(): Promise<User[]>;
    /**
     * Deletes the whole storage.
     */
    clearAll(): Promise<boolean>;
    processResult(result: Result): Promise<MetaResult | MetaResult[]>;
    saveResult(result: Result): Promise<boolean>;
    getUnreadChapter(uuid: string): Promise<number[]>;
    getReadToday(uuid: string): Promise<ReadEpisode[]>;
    getPageInfo(link: string, key: string): Promise<{
        link: string;
        key: string;
        values: string[];
    }>;
    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;
    removePageInfo(link: string, key?: string, toDeleteValues?: string[]): Promise<void>;
    addInvalidation(value: string[]): Promise<void>;
    getInvalidated(uuid: string): Promise<Invalidation[]>;
    clearInvalidationTable(): Promise<any>;
    /**
     *
     * @param query
     * @param parameter
     */
    query(query: string, parameter?: any | any[]): Promise<any>;
    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    private _getUser;
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    private _delete;
    /**
     * Updates data from the storage.
     */
    private _update;
    private _multiInsert;
    private _queryInList;
    private _batchFunction;
    /**
     *
     * @param query
     * @param parameter
     * @private
     */
    private _queryStream;
}
