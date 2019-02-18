import mySql, {Connection} from "promise-mysql";
import crypt from "crypto";
import bcrypt from "bcrypt-nodejs";
import {multiSingle, promiseMultiSingle} from "./tools";
import uuidGenerator from "uuid/v1";
import sessionGenerator from "uuid/v4";
import env from "./env";
import {
    Episode,
    ExternalList,
    ExternalUser,
    LikeMedium,
    List,
    Medium,
    MetaResult,
    News,
    Part,
    Result,
    ScrapeItem,
    Synonyms,
    User
} from "./types";


/**
 * Escapes the Characters for an Like with the '|' char.
 */
function escapeLike(s: string,
                    {
                        singleQuotes = false,
                        noBoundaries = false,
                        noRightBoundary = false,
                        noLeftBoundary = false
                    } = {}): string {

    s = s.replace(/([%_])/g, "|$1");

    if (singleQuotes) {
        s = s.replace(/[´`']/g, "_");
    }
    if (noBoundaries) {
        s = "%" + s + "%";
    } else if (noLeftBoundary) {
        s = "%" + s;
    } else if (noRightBoundary) {
        s = s + "%";
    }
    return s;
}

interface Hash {
    salt?: string;
    hash: string;
}

interface Hasher {
    tag: string;

    hash(text: string, saltLength?: number): Hash;

    equals(text: string, hash: string, salt: string): boolean;
}

interface ShaHasher extends Hasher {
    innerHash(text: string, salt: string): string;
}

const ShaHash: ShaHasher = {
    tag: "sha512",

    /**
     *
     * @param {number} saltLength
     * @param {string} text
     * @return {{salt: string, hash: string}}
     */
    hash(text: string, saltLength: number = 20): { salt: string, hash: string } {
        const salt = crypt.randomBytes(Math.ceil(saltLength / 2))
            .toString("hex") // convert to hexadecimal format
            .slice(0, saltLength); // return required number of characters */
        return {salt, hash: this.innerHash(text, salt)};
    },

    innerHash(text, salt) {
        const hash = crypt.createHash("sha512");
        hash.update(salt + text);
        return hash.digest("hex");
    },


    /**
     * Checks whether the text hashes to the same hash.
     */
    equals(text, hash, salt) {
        return this.innerHash(text, salt) === hash;
    },
};
const BcryptHash: Hasher = {
    tag: "bcrypt",

    hash(text) {
        return {salt: undefined, hash: bcrypt.hashSync(text)};
    },

    /**
     * Checks whether the text hashes to the same hash.
     *
     * @param {string} text
     * @param {string} hash
     * @return boolean
     */
    equals(text, hash) {
        return bcrypt.compareSync(text, hash);
    },
};
const Hashes: Hasher[] = [ShaHash, BcryptHash];

/**
 * Checks whether the password equals to the given hash
 * of the specified algorithm.
 *
 * Return true if it does, else false.
 *
 * @param {string} password
 * @param {string} hash
 * @param {string} alg
 * @param {string} salt
 * @return {boolean}
 * @private
 */
const verifyPassword = (password: string, hash: string, alg: string, salt: string) => {
    const hashAlgorithm = Hashes.find((value) => value.tag === alg);

    if (!hashAlgorithm) {
        throw Error("no such algorithm " + alg);
    }

    return hashAlgorithm.equals(password, hash, salt);
};

const StandardHash: Hasher = BcryptHash;

const database = "enterprise";

interface Errors {
    USER_EXISTS_ALREADY: number;
    INVALID_INPUT: number;
    INVALID_DATA: number;
    USER_DOES_NOT_EXIST: number;
    CORRUPT_DATA: number;
    UNKNOWN: number;
    INVALID_MESSAGE: number;
    INVALID_SESSION: number;
    DOES_NOT_EXIST: number;
    UNSUCCESSFUL: number;

    [key: string]: number;
}

export const Errors: Errors = {
    USER_EXISTS_ALREADY: 0x1,
    INVALID_INPUT: 0x2,
    INVALID_DATA: 0x4,
    USER_DOES_NOT_EXIST: 0x8,
    CORRUPT_DATA: 0x10,
    UNKNOWN: 0x20,
    INVALID_MESSAGE: 0x40,
    INVALID_SESSION: 0x80,
    DOES_NOT_EXIST: 0x100,
    UNSUCCESSFUL: 0x200,
};

interface ResultKeys {
    novel: number;
    volume: number;
    volIndex: number;
    chapter: number;
    chapIndex: number;
}

const ResultKeys: ResultKeys = {
    novel: 0x1,
    volume: 0x2,
    volIndex: 0x4,
    chapter: 0x8,
    chapIndex: 0x10,
};

interface MediaType {
    TEXT: number;
    AUDIO: number;
    VIDEO: number;
    IMAGE: number;

    [key: string]: number;
}

export const MediaType: MediaType = {
    TEXT: 0x1,
    AUDIO: 0x2,
    VIDEO: 0x4,
    IMAGE: 0x8,
};

function allTypes() {
    let types = 0;
    for (const key of Object.keys(MediaType)) {
        types |= MediaType[key];
    }
    return types;
}


/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export async function inContext<T>(callback: (context: QueryContext) => Promise<T>, transaction = true,
                                   allowDatabase = true) {
    if (!running) {
        // if inContext is called without Storage being active
        return Promise.reject("Not started");
    }
    if (startPromise) {
        await startPromise;
    }
    const con = await pool.getConnection();
    const context = new QueryContext(con);

    // don't use database if it is explicitly disallowed
    if (allowDatabase) {
        await context.useDatabase();
    }
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
        throw e;
    } finally {
        // release connection into the pool
        await pool.releaseConnection(con);
    }
    return result;
}


const pool = mySql.createPool({
    connectionLimit: env.dbConLimit,
    host: env.dbHost,
    user: env.dbUser,
    password: env.dbPassword,
    bigNumberStrings: true,
});
const standardListName = "Standard";

interface Tables {
    [key: string]: string;
}

const Tables: Tables = {
    lists:
        "name VARCHAR(200) NOT NULL UNIQUE," +
        "uuid VARCHAR(200) NOT NULL," +
        "salt VARCHAR(200)," +
        "password VARCHAR(200) NOT NULL," +
        "alg VARCHAR(100) NOT NULL," +
        "PRIMARY KEY(uuid)",
    external_user:
        "name VARCHAR(200) NOT NULL," +
        "uuid VARCHAR(200) NOT NULL," +
        "local_uuid VARCHAR(200) NOT NULL," +
        "service INT NOT NULL," +
        "cookies TEXT," +
        "last_scrape DATETIME," +
        "PRIMARY KEY(uuid)," +
        "FOREIGN KEY(local_uuid) REFERENCES user(uuid)",
    user_log:
        "user_uuid VARCHAR(255) NOT NULL," +
        "ip VARCHAR(255)," +
        "session_key VARCHAR(255)," +
        "acquisition_date VARCHAR(40)," +
        "PRIMARY KEY(session_key)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    external_reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "url VARCHAR(200) NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)",
    medium:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "countryOfOrigin VARCHAR(200)," +
        "languageOfOrigin VARCHAR(200)," +
        "author VARCHAR(200)," +
        "artist VARCHAR(200)," +
        "title VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "lang VARCHAR(200)," +
        "stateOrigin INT," +
        "stateTL INT," +
        "series VARCHAR(200)," +
        "universe VARCHAR(200)," +
        "PRIMARY KEY(id)",
    medium_synonyms:
        "medium_id INT UNSIGNED, " +
        "synonym VARCHAR(200) NOT NULL, " +
        "PRIMARY KEY(medium_id, synonym), " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    external_list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES external_reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    part:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    episode:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "part_id INT UNSIGNED NOT NULL," +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "url TEXT NOT NULL," +
        "releaseDate DATETIME NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(part_id) REFERENCES part(id)",
    user_episode:
        "user_uuid VARCHAR(200) NOT NULL," +
        "episode_id INT UNSIGNED NOT NULL," +
        "progress FLOAT UNSIGNED NOT NULL," +
        "PRIMARY KEY(user_uuid, episode_id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)",
    scrape_board:
        "link TEXT NOT NULL," +
        "last_date DATETIME NOT NULL," +
        "type INT UNSIGNED NOT NULL," +
        "uuid VARCHAR(200)," +
        "medium_id INT UNSIGNED," +
        "PRIMARY KEY(link(767))," +
        "FOREIGN KEY(uuid) REFERENCES external_user(uuid)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    news_board:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "title TEXT NOT NULL," +
        "link VARCHAR(700) UNIQUE NOT NULL," +
        "date DATETIME NOT NULL",
    news_user:
        "news_id INT UNSIGNED NOT NULL, " +
        "user_id VARCHAR(200) NOT NULL, " +
        "FOREIGN KEY (user_id) REFERENCES user(uuid), " +
        "FOREIGN KEY (news_id) REFERENCES news_board(id), " +
        "PRIMARY KEY (news_id, user_id)",
    news_medium:
        "news_id INT UNSIGNED NOT NULL, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)," +
        "FOREIGN KEY(news_id) REFERENCES news_board(id)",
    meta_corrections:
        "link TEXT NOT NULL," +
        "replaced TEXT NOT NULL," +
        "startIndex INT UNSIGNED NOT NULL," +
        "endIndex INT UNSIGNED NOT NULL," +
        "fieldKey INT UNSIGNED NOT NULL," +
        "PRIMARY KEY (link(367), replaced(367), startIndex, endIndex)",
};
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
        startPromise = inContext((context) => context.start(), true, false)
            .catch((error) => {
                console.log(error);
                errorAtStart = true;
            });
    }
}

export const Storage = {

    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop(): Promise<void> {
        running = false;
        startPromise = null;
        return Promise.resolve(pool.end());
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
    register(userName: string, password: string, ip: string): Promise<{ session: string, uuid: string }> {
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
    userLoginStatus(ip: string): Promise<User | null> {
        return inContext((context) => context.userLoginStatus(ip));
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
        return inContext((context) => context.updateUser(uuid, user));
    },

    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    addList(uuid: string, list: { name: string, medium: number }): Promise<List> {
        return inContext((context) => context.addList(uuid, list));
    },

    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<Medium>}>}
     */
    getList(listId: number): Promise<{ list: List, media: Medium[] }> {
        return inContext((context) => context.getList(listId));
    },

    /**
     * Updates the properties of a list.
     */
    updateList(list: List): Promise<boolean> {
        return inContext((context) => context.updateList(list));
    },

    /**
     * Deletes a list irreversibly.
     */
    deleteList(listId: number, uuid: string): Promise<boolean> {
        return inContext((context) => context.deleteList(listId, uuid));
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
     * @return {Promise<Medium>}
     */
    addMedium(medium: Medium, uuid?: string): Promise<Medium> {
        return inContext((context) => context.addMedium(medium, uuid));
    },

    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id: number | number[]): Promise<Medium | Medium[]> {
        return inContext((context) => context.getMedium(id));
    },

    /**
     * Gets one or multiple media from the storage, which are like the input.
     */
    getLikeMedium(likeMedia: { title: string, link: string } | Array<{ title: string, link: string }>)
        : Promise<LikeMedium | LikeMedium[]> {

        return inContext((context) => context.getLikeMedium(likeMedia));
    },

    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium: Medium): Promise<boolean> {
        return inContext((context) => context.updateMedium(medium));
    },

    /**
     */
    addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        // todo implement this
        return inContext((context) => context.addSynonyms(synonyms));
    },

    /**
     *
     */
    removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        // todo implement this
        return inContext((context) => context.removeSynonyms(synonyms));
    },

    /**
     *
     */
    getSynonyms(mediumId: number | number[]): Promise<Array<{ mediumId: number, synonym: string[] }>> {
        // todo implement this
        return inContext((context) => context.getSynonyms(mediumId));
    },

    /**
     * Returns all parts of an medium.
     */
    getParts(mediumId: number): Promise<Part[]> {
        return inContext((context) => context.getParts(mediumId));
    },

    /**
     * Adds a part of an medium to the storage.
     */
    addPart(mediumId: number, part: Part): Promise<Part> {
        return inContext((context) => context.addPart(mediumId, part));
    },

    /**
     * Updates a part.
     */
    updatePart(part: Part): Promise<boolean> {
        return inContext((context) => context.updatePart(part));
    },

    /**
     * Deletes a part from the storage.
     */
    deletePart(id: number): Promise<boolean> {
        return inContext((context) => context.deletePart(id));
    },

    /**
     * Adds a episode of a part to the storage.
     */
    addEpisode(partId: number, episode: Episode): Promise<Episode> {
        return inContext((context) => context.addEpisode(partId, episode));
    },

    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode: Episode): Promise<boolean> {
        return inContext((context) => context.updateEpisode(episode));
    },

    /**
     * Gets an episode from the storage.
     */
    getEpisode(id: number): Promise<Episode> {
        return inContext((context) => context.getEpisode(id));
    },

    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id: number): Promise<boolean> {
        return inContext((context) => context.deleteEpisode(id));
    },

    /**
     * Adds a medium to a list.
     */
    addItemToList(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.addItemToList(false, {listId, id: mediumId}));
    },

    /**
     * Moves a medium from an old list to a new list.
     */
    moveMedium(oldListId: number, newListId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.moveMedium(newListId, mediumId, oldListId));
    },

    /**
     * Removes an item from a list.
     */
    removeMedium(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeMedium(listId, mediumId));
    },

    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser> {
        return inContext((context) => context.addExternalUser(localUuid, externalUser));
    },

    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid: string): Promise<boolean> {
        return inContext((context) => context.deleteExternalUser(externalUuid));

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
        return inContext((context) => context.updateExternalUser(externalUser));
    },

    /**
     * Adds an external list of an user to the storage.
     */
    addExternalList(userUuid: string, externalList: ExternalList): Promise<ExternalList> {
        return inContext((context) => context.addExternalList(userUuid, externalList));
    },

    /**
     * Updates an external list.
     */
    updateExternalList(externalList: ExternalList): Promise<boolean> {
        return inContext((context) => context.updateExternalList(externalList));
    },

    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(uuid: string, externalListId: number | number[]): Promise<boolean> {
        return inContext((context) => context.removeExternalList(uuid, externalListId));
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
    addItemToExternalList(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.addItemToList(true, {listId, id: mediumId}));
    },

    /**
     * Removes a medium from an external list in the storage.
     */
    removeItemFromExternalList(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeMedium(listId, mediumId, true));
    },

    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid: string, episodeId: number, progress: number): Promise<boolean> {
        return inContext((context) => context.addProgress(uuid, episodeId, progress));
    },

    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid: string, episodeId: number): Promise<boolean> {
        return inContext((context) => context.removeProgress(uuid, episodeId));
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
    updateProgress(uuid: string, mediumId: number, progress: number): Promise<boolean> {
        return inContext((context) => context.updateProgress(uuid, mediumId, progress));
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
    getNews({uuid, since, till}: { uuid: string, since: Date | undefined, till: Date | undefined }): Promise<News[]> {
        return inContext((context) => context.getNews(since, till, uuid));
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
    removeScrape(link: string): Promise<boolean> {
        return inContext((context) => context.removeScrape(link));
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
     *
     */
    linkNewsToEpisode(news: News[]): Promise<boolean> {
        return inContext((context) => context.linkNewsToEpisode(news));
    },


    /**
     * Marks these news as read for the given user.
     */
    markNewsRead(uuid: string, news: number[]): Promise<boolean> {
        return inContext((context) => context.markRead(uuid, news));
    },

    /**
     * Marks these news as read for the given user.
     */
    markEpisodeRead(uuid: string, result: Result): Promise<void> {
        return inContext((context) => context.markEpisodeRead(uuid, result));
    },

    /**
     * Marks these news as read for the given user.
     */
    checkUnread(uuid: string): Promise<number> {
        return inContext((context) => context.checkUnread(uuid));
    },

    /**
     *
     */
    removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeLinkNewsToMedium(newsId, mediumId));
    },

    clear(): Promise<boolean> {
        return inContext((context) => context.clearAll(), false, false);
    },
};

/**
 * A Class for consecutive queries on the same connection.
 */
class QueryContext {

    public con: Connection;

    constructor(con: Connection) {
        this.con = con;
    }

    /**
     *
     */
    public useDatabase(): Promise<void> {
        return this._query(`USE ${database};`);
    }


    /**
     *
     */
    public startTransaction(): Promise<void> {
        return this._query("START TRANSACTION;");
    }


    /**
     *
     */
    public commit(): Promise<void> {
        return this._query("COMMIT;");
    }


    /**
     *
     */
    public rollback(): Promise<void> {
        return this._query("ROLLBACK;");
    }


    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    public async start(): Promise<void> {
        const exists = await this.databaseExists();
        if (!exists) {
            await this._query(`CREATE DATABASE ${database};`);
        }
        // set database as current database
        await this.useDatabase();
        // display all current tables
        const tables = await this._query("SHOW TABLES;");

        // create tables which do not exist
        await Promise.all(Object.keys(Tables)
            .filter((table) => !tables.find((value: any) => value[`Tables_in_${database}`] === table))
            .map((table) => this._query(`CREATE TABLE ${table}(${Tables[table]});`)));
    }

    /**
     * Checks whether the main database exists currently.
     */
    public async databaseExists(): Promise<boolean> {
        const databases = await this._query("SHOW DATABASES;");
        return databases.find((data: { Database: string }) => data.Database === database) != null;
    }

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
    public async register(userName: string, password: string, ip: string): Promise<User> {
        if (!userName || !password) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        const user = await this._query(`SELECT * FROM user WHERE name = ?;`, userName);
        // if there is a result in array, userName is not new, so abort
        if (user.length) {
            return Promise.reject(Errors.USER_EXISTS_ALREADY);
        }
        // if userName is new, proceed to register
        const id = uuidGenerator();
        const {salt, hash} = StandardHash.hash(password);

        // insert the full user and loginUser right after
        await this._query(
            "INSERT INTO user (name, uuid, salt, alg, password) VALUES (?,?,?,?,?);",
            [userName, id, salt, StandardHash.tag, hash],
        );

        // every user gets a standard list for everything that got no list assigned
        // this standard list name 'Standard' is reserved for this purpose
        await this.addList(id, {name: standardListName, medium: allTypes()});

        return this.loginUser(userName, password, ip);
    }

    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    public async loginUser(userName: string, password: string, ip: string): Promise<User> {
        if (!userName || !password) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        const result = await this._query("SELECT * FROM user WHERE name = ?;", userName);

        if (!result.length) {
            return Promise.reject(Errors.USER_DOES_NOT_EXIST);
        } else if (result.length !== 1) {
            return Promise.reject(Errors.CORRUPT_DATA);
        }

        const user = result[0];
        const uuid = user.uuid;

        if (!verifyPassword(password, user.password, user.alg, user.salt)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        // if there exists a session already for that device, remove it
        await this._delete("user_log", {column: "ip", value: ip});

        // generate session key
        const session = sessionGenerator();
        const date = new Date().toISOString();

        await this._query(
            "INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (?,?,?,?);",
            [uuid, ip, session, date],
        );

        return this.getUser(uuid, session);
    }


    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    public async userLoginStatus(ip: string): Promise<User | null> {
        const result = await this._query("SELECT * FROM user_log WHERE ip = ?;", ip);

        const sessionRecord = result[0];

        if (!sessionRecord) {
            return null;
        }

        const session = sessionRecord.session_key;

        if (session) {
            return this.getUser(sessionRecord.user_uuid, session);
        }
        return null;
    }

    /**
     * Logs a user out.
     */
    public logoutUser(uuid: string, ip: string): Promise<boolean> {
        return this._delete("user_log", {column: "ip", value: ip});
    }

    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    public async deleteUser(uuid: string): Promise<boolean> {
        // todo delete all associated data
        // remove in sequence:
        // user_log => list_medium => reading_list
        // => external_list_medium => external_reading_list
        // => external_user => user_episode
        // delete sessions
        await this._delete("user_log", {column: "user_uuid", value: uuid});

        // delete reading lists contents
        await this._query(
            "DELETE FROM list_medium " +
            "WHERE list_id in " +
            "(SELECT id FROM reading_list " +
            "WHERE user_uuid = ?);"
            , uuid,
        );
        // delete lists
        await this._delete("reading_list", {column: "user_uuid", value: uuid});
        // delete external reading lists contents
        await this._query(
            "DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user " +
            "WHERE local_uuid = ?));",
            uuid,
        );

        // delete external lists
        await this._query(
            "DELETE FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user WHERE local_uuid = ?);",
            uuid,
        );
        // delete external user
        await this._delete("external_user", {column: "local_uuid", value: uuid});

        // delete progress track?
        await this._delete("user_episode", {column: "user_uuid", value: uuid});

        // delete user itself
        // todo check if delete was successful, what if not?
        return this._delete("user", {column: "uuid", value: uuid});
    }

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    public async updateUser(uuid: string,
                            user: { name?: string, newPassword?: string, password?: string }): Promise<boolean> {

        if (user.newPassword && user.password) {
            await this.verifyPassword(uuid, user.password);
        }
        return this._update("user", "uuid", uuid, (updates, values) => {
            if (user.name) {
                updates.push("name = ?");
                values.push(user.name);
            }

            if (user.newPassword) {
                if (!user.password) {
                    return Promise.reject(Errors.INVALID_INPUT);
                }
                const {salt, hash} = StandardHash.hash(user.newPassword);

                updates.push("alg = ?");
                values.push(StandardHash.tag);

                updates.push("salt = ?");
                values.push(salt);

                updates.push("password = ?");
                values.push(hash);
            }
        });
    }

    /**
     * Verifies the password the user of
     * the given uuid.
     *
     * @param {string} uuid
     * @param {string} password
     * @return {Promise<boolean>}
     */
    public async verifyPassword(uuid: string, password: string): Promise<boolean> {
        const result = await this._query("SELECT password, alg, salt FROM user WHERE uuid = ?", uuid);
        const user = result[0];
        return verifyPassword(password, user.password, user.alg, user.salt);
    }

    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    public async addList(uuid: string, {name, medium}: { name: string, medium: number }): Promise<List> {
        const result = await this._query(
            "INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)",
            [uuid, name, medium],
        );
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        return {
            id: result.insertId,
            items: [],
            name,
            medium,
        };
    }

    /**
     * Returns all mediums of a list with
     * the list_id.
     */
    public async getList(listId: number): Promise<{ list: List, media: Medium[] }> {
        const result = await this._query("SELECT * FROM reading_list WHERE id = ?;", listId);
        const list = await this.createShallowList(result[0]);

        // todo this seems really inefficient
        // todo look at this again, may be an error!

        const media = await this.getMedium(list.items);

        // @ts-ignore
        return {list, media};
    }


    /**
     * Recreates a list from storage.
     */
    public async createShallowList(storageList: { id: number, name: string, medium: number }): Promise<List> {
        if (!storageList.name) {
            // @ts-ignore
            throw Error(Errors.INVALID_INPUT);
        }

        const list: List = {
            items: [],
            name: storageList.name,
            medium: storageList.medium,
            id: storageList.id,
        };

        const result = await this._query("SELECT medium_id FROM list_medium WHERE list_id = ?", storageList.id);
        await list.items.push(...result.map((value: any) => value.medium_id));

        return list;
    }

    /**
     * Updates the properties of a list.
     */
    public async updateList(list: List): Promise<boolean> {
        return this._update("reading_list", "id", list.id, (updates, values) => {
            if (list.name) {
                updates.push("name = ?");
                values.push(list.name);
            }

            if (list.medium) {
                updates.push("medium = ?");
                values.push(list.medium);
            }
        });
    }

    /**
     * Deletes a single list irreversibly.
     */
    public async deleteList(listId: number, uuid: string): Promise<boolean> {
        const result = await this._query(
            "SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?",
            [listId, uuid],
        );

        // first check if such a list does exist for the given user
        if (!result.length) {
            return Promise.reject(Errors.DOES_NOT_EXIST);
        }
        // first remove all links between a list and their media
        await this._delete("list_medium", {column: "list_id", value: listId});
        // lastly delete the list itself
        return this._delete("reading_list", {column: "id", value: listId});
    }

    /**
     * Returns all available lists for the given user.
     */
    public async getUserLists(uuid: string): Promise<List[]> {
        // query all available lists for user
        const result = await this._query(
            "SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;",
            [uuid, uuid],
        );

        // query a shallow list, so that only the id´s of their media is contained
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowList(value)));
    }

    /**
     * Adds a medium to the storage.
     */
    public async addMedium(medium: Medium, uuid?: string): Promise<Medium> {
        if (!medium || !medium.medium || !medium.title) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        const result = await this._query(
            "INSERT INTO medium(medium, title) VALUES (?,?);",
            [medium.medium, medium.title],
        );
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        const newMedium = {...medium, id: result.insertId};

        // if it should be added to an list, do it right away
        if (uuid) {
            // add item to listId of medium or the standard list
            await this.addItemToList(false, newMedium, uuid);
        }
        return newMedium;
    }

    /**
     * Gets one or multiple media from the storage.
     */
    public getMedium(id: number | number[]): Promise<Medium | Medium[]> {
        // @ts-ignore
        return promiseMultiSingle(id, async (value: number) => {
            let result = await this._query(`SELECT * FROM medium WHERE medium.id =?;`, value);
            result = result[0];
            return {
                id: result.id,
                countryOfOrigin: result.countryOfOrigin,
                languageOfOrigin: result.languageOfOrigin,
                author: result.author,
                title: result.title,
                medium: result.medium,
                artist: result.artist,
                lang: result.lang,
                stateOrigin: result.stateOrigin,
                stateTL: result.stateTL,
                series: result.series,
                universe: result.universe,
                parts: [],
            };
        });
    }

    /**
     * Gets one or multiple media from the storage.
     */
    public getLikeMedium(likeMedia: { title: string, link: string } | Array<{ title: string, link: string }>)
        : Promise<LikeMedium | LikeMedium[]> {

        // @ts-ignore
        return promiseMultiSingle(likeMedia, async (value) => {
            const escapedLinkQuery = escapeLike(value.link, {noRightBoundary: true});

            const result = await this._query(
                "SELECT id FROM medium WHERE title = ? OR id IN " +
                "(SELECT medium_id FROM scrape_board WHERE medium_id IS NOT NULL AND link LIKE ?);",
                [value.title, escapedLinkQuery]);

            return result.length && {
                medium: result[0],
                title: value.title,
                link: value.link,
            };
        });
    }

    /**
     * Updates a medium from the storage.
     */
    public updateMedium(medium: Medium): Promise<boolean> {
        return this._update("medium", "id", medium.id, (updates, values) => {
            for (const key of Object.keys(medium)) {
                if (key === "synonyms" || key === "id") {
                    continue;
                }
                const value = medium[key];

                if (value === null) {
                    updates.push(`${key} = NULL`);
                } else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        });
    }

    /**
     * Returns all parts of an medium.
     */
    public async getParts(mediumId: number): Promise<Part[]> {
        // select all parts from a medium
        const result = await this._query("SELECT * FROM medium_part WHERE medium_id =?;", mediumId);

        // recreate shallow parts
        // @ts-ignore
        return Promise.all(result.map(async (value: any) => {
            const part: any = await this._query("SELECT * FROM part WHERE id = ?", value.part_id);
            // query episodes of part and return part
            const episodes = await this._query("SELECT id FROM episode WHERE part_id = ?", part.id);
            part.episodes = [...episodes.map((episode: any) => episode.id)];
            return part;
        }));
    }

    /**
     * Adds a part of an medium to the storage.
     */
    public async addPart(mediumId: number, part: Part): Promise<Part> {
        const result = await this._query(
            "INSERT INTO part (medium_id, title, totalIndex, partialIndex) VALUES (?,?,?,?);",
            [mediumId, part.title, part.totalIndex, part.partialIndex],
        );

        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID ${result.insertId}`);
        }
        // todo add episodes
        return {
            id: result.insertId,
            title: part.title,
            partialIndex: part.partialIndex,
            totalIndex: part.totalIndex,
            episodes: [],
        };
    }

    /**
     * Updates a part.
     */
    public updatePart(part: Part): Promise<boolean> {
        return this._update("part", "id", part.id, (updates, values) => {
            if (part.title) {
                updates.push("title = ?");
                values.push(part.title);
            } else { // noinspection JSValidateTypes
                if (part.title === null) {
                    updates.push("title = NULL");
                }
            }

            if (part.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(part.partialIndex);
            }

            if (part.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(part.totalIndex);
            }
        });
    }

    /**
     * Deletes a part from the storage.
     */
    public async deletePart(id: number): Promise<boolean> {
        // todo delete all episode in this part or just transfer them to the "all" part?
        return false;
    }

    /**
     * Adds a episode of a part to the storage.
     */
    public async addEpisode(partId: number, episode: Episode): Promise<Episode> {
        const result = await this._query(
            "INSERT INTO episode " +
            "(part_id, title, totalIndex, partialIndex, url, releaseDate) " +
            "VALUES (?,?,?,?,?,?);",
            [partId, episode.title, episode.totalIndex, episode.partialIndex, episode.url, episode.releaseDate]
        );
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID ${result.insertId}`);
        }

        return {
            id: result.insertId,
            partId,
            title: episode.title,
            partialIndex: episode.partialIndex,
            totalIndex: episode.totalIndex,
            url: episode.url,
            releaseDate: episode.releaseDate,
        };
    }

    /**
     * Gets an episode from the storage.
     */
    public async getEpisode(id: number): Promise<Episode> {
        const result = await this._query("SELECT * FROM episode WHERE id = ?;", id);
        return result[0];
    }

    /**
     * Updates an episode from the storage.
     */
    public async updateEpisode(episode: Episode): Promise<boolean> {
        return this._update("episode", "id", episode.id, (updates, values) => {
            if (episode.partId) {
                updates.push("part_id = ?");
                values.push(episode.partId);
            }

            if (episode.title) {
                updates.push("title = ?");
                values.push(episode.title);
            } else { // noinspection JSValidateTypes
                if (episode.title === null) {
                    updates.push("title = NULL");
                }
            }

            if (episode.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(episode.partialIndex);
            }

            if (episode.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(episode.totalIndex);
            }
        });
    }

    /**
     * Deletes an episode from the storage irreversibly.
     */
    public async deleteEpisode(id: number): Promise<boolean> {
        // remove episode from progress first
        await this._delete("user_episode", {column: "episode_id", value: id});
        // lastly remove episode itself
        return this._delete("episode", {column: "id", value: id});
    }

    /**
     * Adds a medium to the list.
     *
     * If no listId is available it selects the
     * 'Standard' List of the given user and adds it there.
     */
    public async addItemToList(external: boolean, medium: { id: number, listId?: number }, uuid?: string)
        : Promise<boolean> {
        const table = external ? "external_list_medium" : "list_medium";

        // if list_ident is not a number,
        // then take it as uuid from user and get the standard listId of 'Standard' list
        if (medium.listId == null || !Number.isInteger(medium.listId)) {
            const idResult = await this._query(
                "SELECT id FROM reading_list WHERE `name` = 'Standard' AND user_uuid = ?;",
                uuid,
            );
            medium.listId = idResult[0].id;
        }
        const result = await this._query(
            `INSERT INTO ${table} (list_id, medium_id) VALUES(?,?);`,
            [medium.listId, medium.id],
        );
        return result.affectedRows > 0;
    }

    /**
     * Moves a medium from an old list to a new list.
     *
     * @return {Promise<boolean>}
     */
    public async moveMedium(oldListId: number, newListId: number, mediumId: number): Promise<boolean> {
        // first remove medium from old list
        await this.removeMedium(oldListId, mediumId);
        // add item to new list
        return this.addItemToList(false, {listId: newListId, id: mediumId});
    }

    /**
     * Removes an item from a list.
     */
    public removeMedium(listId: number, mediumId: number, external = false): Promise<boolean> {
        const table = external ? "external_list_medium" : "list_medium";
        return this._delete(
            table,
            {
                column: "list_id",
                value: listId,
            },
            {
                column: "medium_id",
                value: mediumId,
            });
    }

    /**
     * Adds an external user of an user to the storage.
     */
    public async addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser> {
        let result = await this._query("SELECT * FROM external_user " +
            "WHERE name = ? " +
            "AND local_uuid = ? " +
            "AND service = ?",
            [externalUser.identifier, localUuid, externalUser.type],
        );
        if (result.length) {
            // @ts-ignore
            throw Error(Errors.USER_EXISTS_ALREADY);
        }
        const uuid = uuidGenerator();

        result = await this._query("INSERT INTO external_user " +
            "(name, uuid, local_uuid, service, cookies) " +
            "VALUES (?,?,?,?,?);",
            [externalUser.identifier, uuid, localUuid, externalUser.type, externalUser.cookies],
        );

        if (!result.affectedRows) {
            return Promise.reject(Errors.UNKNOWN);
        }
        return externalUser;
    }

    /**
     * Deletes an external user from the storage.
     */
    public async deleteExternalUser(externalUuid: string): Promise<boolean> {
        // We need a bottom-up approach to delete,
        // because deleting top-down
        // would violate the foreign keys restraints

        // first delete list - medium links
        await this._query(
            "DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid =?);"
            , externalUuid,
        );
        // proceed to delete lists of external user
        await this._delete("external_reading_list", {column: "user_uuid", value: externalUuid});
        // finish by deleting external user itself
        return this._delete("external_user", {column: "uuid", value: externalUuid});
    }

    /**
     * Gets an external user.
     */
    public async getExternalUser(uuid: string): Promise<ExternalUser> {
        const value = await this._query("SELECT * FROM external_user WHERE uuid = ?;", uuid);
        return this.createShallowExternalUser(value[0]);
    }

    /**
     * Gets an external user with cookies, without items.
     */
    public async getExternalUserWithCookies(uuid: string)
        : Promise<{ userUuid: string, type: number, uuid: string, cookies: string }> {

        const value = await this._query(
            "SELECT uuid, local_uuid, service, cookies FROM external_user WHERE uuid = ?;",
            uuid);
        return {
            uuid: value[0].uuid,
            userUuid: value[0].local_uuid,
            type: value[0].service,
            cookies: value[0].cookies,
        };
    }

    /**
     *
     */
    public async getScrapeExternalUser():
        Promise<Array<{ userUuid: string, type: number, uuid: string, cookies: string }>> {

        const result = await this._query(
            "SELECT uuid, local_uuid, service, cookies FROM external_user " +
            "WHERE last_scrape IS NULL OR last_scrape > NOW() - 7",
        );

        return [...result].map((value) => {
            return {
                uuid: value.uuid,
                userUuid: value.local_uuid,
                type: value.service,
                cookies: value.cookies,
            };
        });
    }

    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     */
    public async createShallowExternalUser(storageUser: { name: string, uuid: string, service: number }):
        Promise<ExternalUser> {

        const externalUser: ExternalUser = {
            identifier: storageUser.name,
            uuid: storageUser.uuid,
            type: storageUser.service,
            lists: [],
        };
        externalUser.lists = await this.getExternalUserLists(externalUser.uuid);
        return externalUser;
    }

    /**
     * Updates an external user.
     */
    public updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
        return this._update("external_user", "uuid", externalUser.uuid, (updates, values) => {
            if (externalUser.identifier) {
                updates.push("name = ?");
                values.push(externalUser.identifier);
            }

            if (externalUser.lastScrape) {
                updates.push("last_scrape = ?");
                values.push(externalUser.lastScrape);
            }

            if (externalUser.cookies) {
                updates.push("cookies = ?");
                values.push(externalUser.cookies);
            } else if (externalUser.cookies == null) {
                updates.push("cookies = NULL");
            }
        });
    }

    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    public async addExternalList(userUuid: string, externalList: ExternalList): Promise<ExternalList> {
        const result = await this._query(
            "INSERT INTO external_reading_list " +
            "(name, user_uuid, medium, url) " +
            "VALUES(?,?,?,?);",
            [externalList.name, userUuid, externalList.medium, externalList.url],
        );

        const insertId = result.insertId;

        if (!Number.isInteger(insertId)) {
            throw Error(`invalid ID ${insertId}`);
        }

        return {
            id: insertId,
            name: externalList.name,
            medium: externalList.medium,
            url: externalList.url,
            items: [],
        };
    }

    /**
     * Updates an external list.
     */
    public updateExternalList(externalList: ExternalList): Promise<boolean> {
        return this._update("external_reading_list", "user_uuid", externalList.id, (updates, values) => {
            if (externalList.medium) {
                updates.push("medium = ?");
                values.push(externalList.medium);
            }

            if (externalList.name) {
                updates.push("name = ?");
                values.push(externalList.name);
            }
        });
    }

    /**
     * Removes one or multiple externalLists from the given user.
     */
    public async removeExternalList(uuid: string, externalListId: number | number[]): Promise<boolean> {
        // @ts-ignore
        return promiseMultiSingle(externalListId, async (item) => {
            // first delete any references of externalList: list-media links
            await this._delete("external_list_medium", {column: "list_id", value: item});
            // then delete list itself
            return this._delete("external_reading_list",
                {
                    column: "user_uuid",
                    value: uuid,
                },
                {
                    column: "id",
                    value: item,
                });
        });
    }


    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    public async getExternalList(id: number): Promise<ExternalList> {
        const result = await this._query("SELECT * FROM external_reading_list WHERE id = ?", id);
        return this.createShallowExternalList(result[0]);
    }

    /**
     * Creates a shallow external List with only the id´s of their items
     * as list.
     *
     * @param {ExternalList} storageList
     * @return {Promise<ExternalList>}
     */
    public async createShallowExternalList(storageList: ExternalList): Promise<ExternalList> {
        const result = await this._query("SELECT * FROM external_list_medium WHERE list_id = ?;", storageList.id);
        storageList.items = result.map((value: any) => value.medium_id);
        // todo return input or copy object?
        return storageList;
    }

    /**
     * Gets an array of all lists of an user.
     */
    public async getExternalUserLists(uuid: string): Promise<ExternalList[]> {
        const result = await this._query("SELECT * FROM external_reading_list WHERE user_uuid = ?;", uuid);
        // @ts-ignore
        return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
    }

    /**
     * Adds a medium to an external list in the storage.
     */
    public async addItemToExternalList(listId: number, mediumId: number): Promise<boolean> {
        const result = await this._query(
            "INSERT INTO external_list_medium " +
            "(list_id, medium_id) " +
            "VALUES (?,?)",
            [listId, mediumId],
        );
        return result.affectedRows > 0;
    }

    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    public async addProgress(uuid: string, episodeId: number, progress: number): Promise<boolean> {
        if (!Number.isInteger(progress + episodeId)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        await this.removeProgress(uuid, episodeId);
        const result = await this._query(
            "INSERT INTO user_episode " +
            "(user_uuid, episode_id, progress) " +
            "VALUES (?,?,?);",
            [uuid, episodeId, progress],
        );
        return result.affectedRows > 0;
    }

    /**
     * Removes progress of an user in regard to an episode.
     */
    public removeProgress(uuid: string, episodeId: number): Promise<boolean> {
        return this._delete(
            "user_episode",
            {
                column: "user_uuid",
                value: uuid,
            },
            {
                column: "episode_id",
                value: episodeId,
            },
        );
    }

    /**
     * Get the progress of an user in regard to an episode.
     */
    public async getProgress(uuid: string, episodeId: number): Promise<number> {
        const result = await this
            ._query(
                "SELECT * FROM user_episode " +
                "WHERE user_uuid = ? " +
                "AND episode_id = ?",
                [uuid, episodeId],
            );

        return result[0].progress;
    }

    /**
     * Updates the progress of an user in regard to an episode.
     */
    public updateProgress(uuid: string, episodeId: number, progress: number): Promise<boolean> {
        // todo for now its the same as calling addProgress, but somehow do it better maybe?
        return this.addProgress(uuid, episodeId, progress);
    }

    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     *
     * @param {News|Array<News>} news
     * @return {Promise<News|undefined|Array<News|undefined>>}
     */
    public async addNews(news: News | News[]): Promise<News | undefined | Array<News | undefined>> {
        return promiseMultiSingle(news, async (value) => {
            if (!value.link || !value.title || !value.date) {
                return Promise.reject(Errors.INVALID_INPUT);
            }
            let result = await this._query(
                "INSERT IGNORE INTO news_board (title, link, date) VALUES (?,?,?);",
                [value.title, value.link, value.date],
            );
            if (!Number.isInteger(result.insertId)) {
                throw Error(`invalid ID ${result.insertId}`);
            }
            if (!result.affectedRows) {
                return;
            }
            result = {...value, id: result.insertId};
            return result;
        });

    }

    /**
     *
     */
    public async getNews(since: Date | undefined, till = new Date(), uuid: string): Promise<News[]> {
        // todo query looks horrible, replace it with something better?
        const query = "SELECT * FROM news_board " +
            // where date between since and till
            `WHERE ${since ? "? < date AND " : ""} ? > date AND id IN ` +
            "(SELECT news_id FROM news_medium WHERE medium_id IN" +
            // and news id from either an medium in user list or external list
            "(SELECT medium_id FROM list_medium WHERE list_id IN " +
            "(SELECT id FROM reading_list WHERE user_uuid = ?) " +
            "UNION SELECT medium_id FROM external_list_medium WHERE list_id IN " +
            "(SELECT id from external_reading_list WHERE user_uuid IN " +
            "(SELECT uuid FROM external_user WHERE local_uuid = ?))))" +
            "ORDER BY date DESC LIMIT 100";

        const parameter = [till, uuid, uuid];
        if (since) {
            parameter.unshift(since);
        }
        return this._query(query, parameter);
    }

    /**
     *
     */
    public async deleteOldNews(): Promise<boolean> {
        await this._query("DELETE FROM news_medium WHERE medium_id IN " +
            "(SELECT FROM news_board WHERE date < NOW() - 30);");
        const result = await this._query("DELETE FROM news_board WHERE date < NOW() - 30;");
        return result.affectedRows > 0;
    }

    /**
     *
     */
    public async addScrape(scrape: ScrapeItem | ScrapeItem[]): Promise<boolean> {
        await promiseMultiSingle(scrape, (item) => {
            return this._query("INSERT INTO scrape_board " +
                "(link, type, last_date, uuid, medium_id) VALUES (?,?,?,?,?);",
                [
                    item.link,
                    item.type,
                    item.lastDate,
                    item.userId,
                    item.mediumId,
                ]);
        });
        return true;
    }

    /**
     *
     */
    public async getScrapes(): Promise<ScrapeItem[]> {
        let value = await this._query("SELECT * FROM scrape_board;");
        value = [...value];
        return value.map((item: any) => {
            return {
                link: item.link,
                lastDate: item.last_date,
                type: item.type,
                listId: item.list_id,
                mediumId: item.medium_id,
            };
        });
    }

    /**
     *
     */
    public async removeScrape(link: string): Promise<boolean> {
        return this._delete("scrape_board", {column: "link", value: link});
    }

    /**
     *
     */
    public async linkNewsToMedium(): Promise<boolean> {
        // todo maybe implement this with a trigger
        const result = await this._query(
            "INSERT INTO enterprise.news_medium (medium_id, news_id)" +
            "SELECT medium.id, news_board.id FROM medium,news_board " +
            "WHERE locate(medium.title, news_board.title) > 0",
        );
        return result.affectedRows > 0;
    }

    public linkNewsToEpisode(news: News[]): Promise<boolean> {
        return Promise.all(news.map((value) => {
            this._query("");
        })).then(() => true);
    }

    /**
     *
     */
    public async removeLinkNewsToMedium(newsId: number, mediumId: number): Promise<boolean> {
        const columns = [];
        if (newsId != null) {
            columns.push({
                column: "news_id",
                value: newsId,
            });
        }
        if (mediumId != null) {
            columns.push({
                column: "medium_id",
                value: mediumId,
            });
        }
        return this._delete("news_medium", ...columns);
    }

    /**
     * Marks these news as read for the given user.
     */
    public async markRead(uuid: string, news: number[]): Promise<boolean> {
        await promiseMultiSingle(news, (newsId) =>
            this._query(
                "INSERT IGNORE INTO news_user (user_id,news_id) VALUES (?,?);",
                [uuid, newsId],
            ));
        return true;
    }

    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    public async markEpisodeRead(uuid: string, result: Result): Promise<void> {
        if (!result.accept) {
            return;
        }
        const teaserMatcher = /\(?teaser\)?$|(\s+$)/i;

        // @ts-ignore
        return promiseMultiSingle(result.result, async (value) => {
            // todo what if it is not a serial medium but only an article? should it even save such things?
            if (!value.novel
                || (!value.chapIndex && !value.chapter)
                // do not mark episode if they are a teaser only
                || (value.chapter && value.chapter.match(teaserMatcher))) {
                return;
            }
            const escapedNovel = escapeLike(value.novel, {singleQuotes: true, noBoundaries: true});
            const media: Array<{ title: string, id: number, synonym?: string }> = await this._query(
                "SELECT title, id,synonym FROM medium " +
                "LEFT JOIN medium_synonyms ON medium.id=medium_synonyms.medium_id " +
                "WHERE medium.title LIKE ? OR medium_synonyms.synonym LIKE ?;",
                [escapedNovel, escapedNovel]
            );
            // todo for now only get the first medium?, later test it against each other
            let bestMedium = media[0];

            if (!bestMedium) {
                const addedMedium = await this.addMedium({title: value.novel, medium: MediaType.TEXT}, uuid);
                bestMedium = {id: addedMedium.insertId, title: value.novel};
                // todo add medium if it is not known?
            }

            let volumeId;

            // if there is either an volume or volIndex in result
            // search or add the given volume to link the episode to the part/volume
            let volumeTitle = value.volume;
            if (value.volIndex || volumeTitle) {
                // todo: do i need to convert volIndex from a string to a number for the query?
                const volumeArray: Array<{ id: number; }> = await this._query(
                    "SELECT id FROM part WHERE medium_id=? AND title LIKE ? OR totalIndex=?)",
                    [bestMedium.id, volumeTitle && escapeLike(volumeTitle, {
                        singleQuotes: true,
                        noBoundaries: true
                    }), value.volIndex]);

                const volume = volumeArray[0];

                if (volume) {
                    volumeId = volume.id;
                } else {
                    // if there is no volume yet, with the given volumeTitle or index, add one
                    let volIndex = Number(value.volIndex);

                    if (Number.isNaN(volIndex)) {
                        const lowestIndexArray: Array<{ totalIndex: number }> = await this._query(
                            "SELECT MIN(totalIndex) as totalIndex FROM part WHERE medium_id=?",
                            bestMedium.id
                        );
                        const lowestIndexObj = lowestIndexArray[0];
                        // if the lowest available totalIndex not indexed, decrement, else take -2
                        // -1 is reserved for all episodes, which do not have any volume/part assigned
                        volIndex = lowestIndexObj && lowestIndexObj.totalIndex < 0 ? --lowestIndexObj.totalIndex : -2;
                    }
                    if (!volumeTitle) {
                        volumeTitle = "Volume " + volIndex;
                    }
                    const addedVolume = await this.addPart(
                        bestMedium.id,
                        // @ts-ignore
                        {title: volumeTitle, totalIndex: volIndex}
                    );
                    volumeId = addedVolume.id;
                }
            } else {
                // check if there is a part/volume, with index -1, reserved for all episodes, which are not indexed
                const volumeArray: Array<{ id: number }> = await this._query(
                    "SELECT id FROM part WHERE medium_id=? AND totalIndex=?",
                    [bestMedium.id, -1]
                );
                const volume = volumeArray[0];

                if (!volume) {
                    const insertedPart = await this._query(
                        "INSERT INTO part (medium_id,title, totalIndex) VALUES (?,?,?);",
                        [bestMedium.id, "Non Indexed Volume", -1]
                    );
                    volumeId = insertedPart.insertId;
                } else {
                    volumeId = volume.id;
                }
            }

            const episodeSelectArray: Array<{ id: number, part_id: number, link: string }> = await this._query(
                "SELECT id, part_id, url FROM episode WHERE title LIKE ? OR totalIndex=?",
                [value.chapter && escapeLike(value.chapter, {
                    noBoundaries: true,
                    singleQuotes: true
                }), value.chapIndex]);

            const episodeSelect = episodeSelectArray[0];

            let episodeId = episodeSelect && episodeSelect.id;

            if (episodeId == null) {
                let episodeIndex = Number(value.chapIndex);

                // if there is no index, decrement the minimum index available for this medium
                if (Number.isNaN(episodeIndex)) {
                    const latestEpisodeArray: Array<{ totalIndex: number; }> = await this._query(
                        "SELECT MIN(totalIndex) as totalIndex FROM episode " +
                        "WHERE part_id EXISTS (SELECT id from part WHERE medium_id=?);",
                        bestMedium.id
                    );
                    const latestEpisode = latestEpisodeArray[0];

                    // if the lowest available totalIndex not indexed, decrement, else take -1
                    episodeIndex = latestEpisode && latestEpisode.totalIndex < 0 ? --latestEpisode.totalIndex : -1;
                }

                let chapter = value.chapter;
                if (!chapter) {
                    chapter = "Chapter " + episodeIndex;
                }

                // @ts-ignore
                const episode = await this.addEpisode(volumeId, {
                    title: chapter,
                    totalIndex: episodeIndex,
                    url: result.url,
                    releaseDate: new Date(),
                });
                episodeId = episode.id;
            }

            // now after setting the storage up, so that all data is 'consistent' with this result,
            // mark the episode as read
            // fixme: for now the progress is set to 1, because the tracker is malfunctioning,
            // normally the progress should be updated by messages of the tracker
            // it should be inserted only, if there does not exist any progress
            await this._query(
                "INSERT IGNORE INTO user_episode (user_uuid, episode_id,progress) VALUES (?,?,1);",
                [uuid, episodeId]
            );
        });
    }

    /**
     *
     */
    public async checkUnread(uuid: string): Promise<number> {
        const result = await this._query("SELECT COUNT(*) AS count FROM news_board WHERE id NOT IN " +
            "(SELECT news_id FROM news_user WHERE user_id = ?);", uuid);
        return result[0].count;
    }

    public getSynonyms(mediumId: number | number[]): Promise<Array<{ mediumId: number, synonym: string[] }>> {
        // todo implement
        throw new Error("Method not implemented.");
    }

    public removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        // todo implement
        throw new Error("Method not implemented.");
    }

    public addSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
        // todo implement
        throw new Error("Method not implemented.");
    }

    /**
     * Returns all user stored in storage.
     */
    public showUser(): Promise<User[]> {
        return this._query("SELECT * FROM user;");
    }

    /**
     * Deletes the whole storage.
     */
    public async clearAll(): Promise<boolean> {
        const exists = await this.databaseExists();
        return exists && this._query(`DROP DATABASE ${database};`);
    }

    public processResult(result: Result): Promise<MetaResult | MetaResult[]> {
        if (!result.preliminary) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        // @ts-ignore
        return promiseMultiSingle(result.result, async (value) => {
            // todo implement
            return value;
        });
    }


    public saveResult(result: Result): Promise<boolean> {
        if (!result.preliminary) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        // @ts-ignore
        return promiseMultiSingle(result.result, async (value) => {
            if (!result.accept) {
                return false;
            }
            // if there is a title, search a medium which matches

            // todo implement
            return value;
        });
    }

    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    private async getUser(uuid: string, session: string): Promise<User> {
        if (!uuid) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        const user: User = {
            externalUser: [],
            lists: [],
            name: "",
            uuid: "",
            session,
        };
        // query for user
        let result = await this._query("SELECT * FROM user WHERE uuid = ?;", uuid);
        // add user metadata
        result = result[0];
        user.name = result.name;
        user.uuid = uuid;

        if (!user.name) {
            return Promise.reject(Errors.CORRUPT_DATA);
        }
        // query for user reading lists
        const lists = await this.getUserLists(uuid);
        // add local user reading lists
        user.lists.push(...lists);

        // select external user of user
        const allExternalUser = await this._query("SELECT * FROM external_user WHERE local_uuid = ?;", uuid);

        // add external_user and add their respective external reading lists
        await Promise.all(allExternalUser.map((value: any) => this
            .createShallowExternalUser(value)
            .then((externalUser) => user.externalUser.push(externalUser))));

        // return user result
        return user;
    }


    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    private async _delete(table: string, ...condition: Array<{ column: string, value: any }>): Promise<boolean> {
        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        let query = `DELETE FROM ${mySql.escapeId(table)} WHERE `;
        const values: any[] = [];
        multiSingle(condition, (value, _, next) => {
            query += `${mySql.escapeId(value.column)} = ?`;
            if (next) {
                query += " AND ";
            } else {
                query += ";";
            }
            values.push(value.value);
        });

        const result = await this._query(query, values);

        return result.affectedRows >= 0;
    }

    /**
     * Updates data from the storage.
     */
    private async _update(table: string, column: string, idValue: any, cb: (updates: string[], values: any[]) => void)
        : Promise<boolean> {

        const updates: string[] = [];
        const values: any[] = [];

        cb(updates, values);

        if (!updates.length) {
            return Promise.resolve(false);
        }
        values.push(idValue);
        const result = await this._query(
            `UPDATE ${mySql.escapeId(table)}
                SET ${updates.join(", ")}
                WHERE ${mySql.escapeId(column)} = ?;`,
            values,
        );
        return result.affectedRows > 0;
    }

    /**
     *
     * @param query
     * @param parameter
     * @private
     */
    private async _query(query: string, parameter?: any | any[]) {
        return this.con.query(query, parameter);
    }
}

/**
 *
 */
export const startStorage = () => start();

export const isError = (error: any) => {
    for (const key of Object.keys(Errors)) {
        if (Errors[key] === error) {
            return true;
        }
    }
    return false;
};
