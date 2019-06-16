"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const v1_1 = tslib_1.__importDefault(require("uuid/v1"));
const v4_1 = tslib_1.__importDefault(require("uuid/v4"));
const tools_1 = require("../tools");
const logger_1 = tslib_1.__importDefault(require("../logger"));
const databaseValidator_1 = require("./databaseValidator");
const databaseSchema_1 = require("./databaseSchema");
const validate = tslib_1.__importStar(require("validate.js"));
/**
 * Escapes the Characters for an Like with the '|' char.
 */
function escapeLike(s, { singleQuotes = false, noBoundaries = false, noRightBoundary = false, noLeftBoundary = false } = {}) {
    if (!s) {
        return "";
    }
    s = s.replace(/([%_])/g, "|$1");
    if (singleQuotes) {
        s = s.replace(/[`´'‘]/g, "_");
    }
    if (noBoundaries) {
        s = "%" + s + "%";
    }
    else if (noLeftBoundary) {
        s = "%" + s;
    }
    else if (noRightBoundary) {
        s = s + "%";
    }
    return s;
}
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
const verifyPassword = (password, hash, alg, salt) => {
    const hashAlgorithm = tools_1.Hashes.find((value) => value.tag === alg);
    if (!hashAlgorithm) {
        throw Error("no such algorithm " + alg);
    }
    return hashAlgorithm.equals(password, hash, salt);
};
const StandardHash = tools_1.BcryptHash;
const database = "enterprise";
const standardListName = "Standard";
/**
 * A Class for consecutive queries on the same connection.
 */
class QueryContext {
    constructor(con) {
        this.con = con;
    }
    setUuid(uuid) {
        this.uuid = uuid;
        return this;
    }
    /**
     *
     */
    useDatabase() {
        return this._query(`USE ${database};`);
    }
    /**
     *
     */
    startTransaction() {
        return this._query("START TRANSACTION;");
    }
    /**
     *
     */
    commit() {
        return this._query("COMMIT;");
    }
    /**
     *
     */
    rollback() {
        return this._query("ROLLBACK;");
    }
    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    async start() {
        const exists = await this.databaseExists();
        if (!exists) {
            await this._query(`CREATE DATABASE ${database};`);
        }
        // set database as current database
        await this.useDatabase();
        // display all current tables
        const tables = await this._query("SHOW TABLES;");
        // create tables which do not exist
        await Promise.all(Object.keys(databaseSchema_1.Tables)
            .filter((table) => !tables.find((value) => value[`Tables_in_${database}`] === table))
            .map((table) => this._query(`CREATE TABLE ${table}(${databaseSchema_1.Tables[table]});`)));
    }
    /**
     * Checks whether the main database exists currently.
     */
    async databaseExists() {
        const databases = await this._query("SHOW DATABASES;");
        return databases.find((data) => data.Database === database) != null;
    }
    createDatabase() {
        return this._query(`CREATE DATABASE ${database};`);
    }
    getTables() {
        return this._query("SHOW TABLES;");
    }
    createTable(table, columns) {
        return this._query(`CREATE TABLE ${promise_mysql_1.default.escapeId(table)} (${columns.join(", ")});`);
    }
    dropTable() {
        return this._query("SHOW TABLES;");
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
    async register(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const user = await this._query(`SELECT * FROM user WHERE name = ?;`, userName);
        // if there is a result in array, userName is not new, so abort
        if (user.length) {
            return Promise.reject(new Error(tools_1.Errors.USER_EXISTS_ALREADY));
        }
        // if userName is new, proceed to register
        const id = v1_1.default();
        const { salt, hash } = StandardHash.hash(password);
        // insert the full user and loginUser right after
        await this._query("INSERT INTO user (name, uuid, salt, alg, password) VALUES (?,?,?,?,?);", [userName, id, salt, StandardHash.tag, hash]);
        // every user gets a standard list for everything that got no list assigned
        // this standard list name 'Standard' is reserved for this purpose
        await this.addList(id, { name: standardListName, medium: tools_1.allTypes() });
        return this.loginUser(userName, password, ip);
    }
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    async loginUser(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const result = await this._query("SELECT * FROM user WHERE name = ?;", userName);
        if (!result.length) {
            return Promise.reject(new Error(tools_1.Errors.USER_DOES_NOT_EXIST));
        }
        else if (result.length !== 1) {
            return Promise.reject(new Error(tools_1.Errors.CORRUPT_DATA));
        }
        const user = result[0];
        const uuid = user.uuid;
        if (!verifyPassword(password, user.password, user.alg, user.salt)) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        // if there exists a session already for that device, remove it
        await this._delete("user_log", { column: "ip", value: ip });
        // generate session key
        const session = v4_1.default();
        const date = new Date().toISOString();
        await this._query("INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (?,?,?,?);", [uuid, ip, session, date]);
        return this._getUser(uuid, session);
    }
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    async userLoginStatus(ip) {
        const result = await this._query("SELECT * FROM user_log WHERE ip = ?;", ip);
        const sessionRecord = result[0];
        if (!sessionRecord) {
            return null;
        }
        const session = sessionRecord.session_key;
        if (session) {
            return this._getUser(sessionRecord.user_uuid, session);
        }
        return null;
    }
    /**
     * Logs a user out.
     */
    logoutUser(uuid, ip) {
        return this._delete("user_log", { column: "ip", value: ip });
    }
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    async deleteUser(uuid) {
        // todo delete all associated data
        // remove in sequence:
        // user_log => list_medium => reading_list
        // => external_list_medium => external_reading_list
        // => external_user => user_episode
        // delete sessions
        await this._delete("user_log", { column: "user_uuid", value: uuid });
        // delete reading lists contents
        await this._query("DELETE FROM list_medium " +
            "WHERE list_id in " +
            "(SELECT id FROM reading_list " +
            "WHERE user_uuid = ?);", uuid);
        // delete lists
        await this._delete("reading_list", { column: "user_uuid", value: uuid });
        // delete external reading lists contents
        await this._query("DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user " +
            "WHERE local_uuid = ?));", uuid);
        // delete external lists
        await this._query("DELETE FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user WHERE local_uuid = ?);", uuid);
        // delete external user
        await this._delete("external_user", { column: "local_uuid", value: uuid });
        // delete progress track?
        await this._delete("user_episode", { column: "user_uuid", value: uuid });
        // delete user itself
        // todo check if delete was successful, what if not?
        //  in case the deletion was unsuccessful, just 'ban' any further access to that account
        //  and delete it manually?
        return this._delete("user", { column: "uuid", value: uuid });
    }
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    async updateUser(uuid, user) {
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
                    return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
                }
                const { salt, hash } = StandardHash.hash(user.newPassword);
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
    async verifyPassword(uuid, password) {
        const result = await this._query("SELECT password, alg, salt FROM user WHERE uuid = ?", uuid);
        const user = result[0];
        return verifyPassword(password, user.password, user.alg, user.salt);
    }
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    async addList(uuid, { name, medium }) {
        const result = await this._query("INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)", [uuid, name, medium]);
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        return {
            id: result.insertId,
            items: [],
            name,
            medium,
            userUuid: uuid,
        };
    }
    /**
     * Returns all mediums of a list with
     * the list_id.
     */
    async getList(listId, media, uuid) {
        const toLoadMedia = new Set();
        // @ts-ignore
        const lists = await tools_1.promiseMultiSingle(listId, async (id) => {
            const result = await this._query("SELECT * FROM reading_list WHERE id = ?;", id);
            const list = await this.createShallowList(result[0]);
            for (const itemId of list.items) {
                if (!media.includes(itemId)) {
                    toLoadMedia.add(itemId);
                }
            }
            return list;
        });
        const loadedMedia = await this.getMedium([...toLoadMedia], uuid);
        return { list: lists, media: loadedMedia };
    }
    /**
     * Recreates a list from storage.
     */
    async createShallowList(storageList) {
        if (!storageList.name) {
            // @ts-ignore
            throw Error(tools_1.Errors.INVALID_INPUT);
        }
        const list = {
            items: [],
            name: storageList.name,
            medium: storageList.medium,
            id: storageList.id,
            userUuid: storageList.user_uuid,
        };
        const result = await this._query("SELECT medium_id FROM list_medium WHERE list_id = ?", storageList.id);
        await list.items.push(...result.map((value) => value.medium_id));
        return list;
    }
    /**
     * Updates the properties of a list.
     */
    async updateList(list) {
        if (!list.userUuid) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
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
    async deleteList(listId, uuid) {
        const result = await this._query("SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?", [listId, uuid]);
        // first check if such a list does exist for the given user
        if (!result.length) {
            return Promise.reject(new Error(tools_1.Errors.DOES_NOT_EXIST));
        }
        // first remove all links between a list and their media
        await this._delete("list_medium", { column: "list_id", value: listId });
        // lastly delete the list itself
        return this._delete("reading_list", { column: "id", value: listId });
    }
    /**
     * Returns all available lists for the given user.
     */
    async getUserLists(uuid) {
        // query all available lists for user
        const result = await this._query("SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;", [uuid, uuid]);
        // query a shallow list, so that only the id´s of their media is contained
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowList(value)));
    }
    /**
     * Adds a medium to the storage.
     */
    async addMedium(medium, uuid) {
        if (!medium || !medium.medium || !medium.title) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const result = await this._query("INSERT INTO medium(medium, title) VALUES (?,?);", [medium.medium, medium.title]);
        if (!Number.isInteger(result.insertId)) {
            throw Error(`invalid ID: ${result.insertId}`);
        }
        await this.addPart(result.insertId, {
            totalIndex: -1,
            episodes: [],
            id: 0,
            mediumId: result.insertId
        });
        const newMedium = {
            ...medium,
            id: result.insertId,
        };
        // if it should be added to an list, do it right away
        if (uuid) {
            // add item to listId of medium or the standard list
            await this.addItemToList(false, newMedium, uuid);
        }
        return newMedium;
    }
    /**
     *
     */
    async getLatestReleases(mediumId) {
        const resultArray = await this._query("SELECT episode.* FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id  " +
            "WHERE medium_id=? " +
            "GROUP BY episode_id " +
            "ORDER BY episode.totalIndex DESC, episode.partialIndex DESC " +
            "LIMIT 5;", mediumId);
        // @ts-ignore
        return Promise.all(Array.prototype.map.call(resultArray, async (rawEpisode) => {
            const releases = await this.getReleases(rawEpisode.id);
            return {
                id: rawEpisode.id,
                partialIndex: rawEpisode.partialIndex,
                partId: rawEpisode.part_id,
                totalIndex: rawEpisode.totalIndex,
                releases
            };
        }));
    }
    async getReleases(episodeId) {
        const resultArray = await this._query("SELECT * FROM episode_release WHERE episode_id=?", episodeId);
        // @ts-ignore
        return Array.prototype.map.call(resultArray, (value) => {
            return {
                episodeId: value.episode_id,
                sourceType: value.source_type,
                releaseDate: value.releaseDate,
                url: value.url,
                title: value.title
            };
        });
    }
    getSimpleMedium(id) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(id, async (mediumId) => {
            const resultArray = await this._query(`SELECT * FROM medium WHERE medium.id =?;`, mediumId);
            const result = resultArray[0];
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
            };
        });
    }
    async getTocSearchMedium(id) {
        const resultArray = await this._query(`SELECT * FROM medium WHERE medium.id =?;`, id);
        const result = resultArray[0];
        const synonyms = await this.getSynonyms(id);
        return {
            mediumId: result.id,
            title: result.title,
            synonyms: (synonyms[0] && synonyms[0].synonym) || []
        };
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id, uuid) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(id, async (mediumId) => {
            let result = await this._query(`SELECT * FROM medium WHERE medium.id =?;`, mediumId);
            result = result[0];
            const latestReleasesResult = await this.getLatestReleases(mediumId);
            const currentReadResult = await this._query("SELECT * FROM " +
                "(SELECT * FROM user_episode " +
                "WHERE episode_id IN (SELECT id from episode " +
                "WHERE part_id IN (SELECT id FROM part " +
                "WHERE medium_id=?))) as user_episode " +
                "INNER JOIN episode ON user_episode.episode_id=episode.id " +
                "WHERE user_uuid=? " +
                "ORDER BY totalIndex DESC, partialIndex DESC LIMIT 1", [mediumId, uuid]);
            const unReadResult = await this._query("SELECT * FROM episode WHERE part_id IN (SELECT id FROM part WHERE medium_id=?) " +
                "AND id NOT IN (SELECT episode_id FROM user_episode WHERE user_uuid=?) " +
                "ORDER BY totalIndex DESC, partialIndex DESC;", [mediumId, uuid]);
            const partsResult = await this._query("SELECT id FROM part WHERE medium_id=?;", mediumId);
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
                parts: Array.from(partsResult).map((packet) => packet.id),
                currentRead: currentReadResult[0] ? currentReadResult[0].episode_id : undefined,
                latestReleases: latestReleasesResult.map((packet) => packet.id),
                unreadEpisodes: unReadResult.map((packet) => packet.id),
            };
        });
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getLikeMedium(likeMedia) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(likeMedia, async (value) => {
            const escapedLinkQuery = escapeLike(value.link, { noRightBoundary: true });
            const escapedTitle = escapeLike(value.title, { singleQuotes: true });
            let result = await this._query("SELECT id,medium FROM medium WHERE title LIKE ? OR id IN " +
                "(SELECT medium_id FROM scrape_board WHERE medium_id IS NOT NULL AND link LIKE ?);", [escapedTitle, escapedLinkQuery]);
            if (value.type != null) {
                result = Array.prototype.filter.call(result, (medium) => medium.medium === value.type);
            }
            return {
                medium: result[0],
                title: value.title,
                link: value.link,
            };
        });
    }
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium) {
        return this._update("medium", "id", medium.id, (updates, values) => {
            for (const key of Object.keys(medium)) {
                if (key === "synonyms" || key === "id") {
                    continue;
                }
                const value = medium[key];
                if (value === null) {
                    updates.push(`${key} = NULL`);
                }
                else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        });
    }
    /**
     * Returns all parts of an medium.
     */
    async getMediumParts(mediumId, uuid) {
        const parts = await this._query("SELECT * FROM part WHERE medium_id = ?", mediumId);
        // recreate shallow parts
        // @ts-ignore
        return Promise.all(parts.map(async (value) => {
            // query episodes of part and return part
            const episodes = await this._query("SELECT id FROM episode WHERE part_id = ?", value.id);
            if (uuid) {
                value.episodes = await Promise.all(episodes.map((episode) => this.getEpisode(episode.id, uuid)));
            }
            else {
                value.episodes = episodes;
            }
            return {
                id: value.id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                title: value.title,
                episodes: value.episodes,
                mediumId: value.medium_id,
            };
        }));
    }
    /**
     * Returns all parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId, index, uuid) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(index, async (totalIndex) => {
            const parts = await this._query("SELECT * FROM part WHERE medium_id = ? AND totalIndex=?", [mediumId, totalIndex]);
            const value = parts[0];
            if (!value || !value.id) {
                return { totalIndex };
            }
            // query episodes of part and return part
            const episodes = await this._query("SELECT id, totalIndex FROM episode WHERE part_id = ?", value.id);
            if (uuid) {
                value.episodes = await Promise.all(episodes.map((episode) => this.getEpisode(episode.id, uuid)));
            }
            else {
                await Promise.all(Array.prototype.map.call(episodes, (episode) => {
                    return this.getReleases(episode.id).then((releases) => episode.releases = releases);
                }));
                value.episodes = episodes;
            }
            return {
                id: value.id,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                title: value.title,
                episodes: value.episodes,
                mediumId: value.medium_id,
            };
        });
    }
    /**
     * Returns all parts of an medium.
     */
    getParts(partId, uuid) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(partId, async (value) => {
            const partArray = await this._query("SELECT * FROM part WHERE id = ?", value);
            const part = partArray[0];
            // query episodes of part and return part
            const episodes = await this._query("SELECT id FROM episode WHERE part_id = ?", part.id);
            part.episodes = await Promise.all(episodes.map((episode) => this.getEpisode(episode.id, uuid)));
            return {
                id: part.id,
                totalIndex: part.totalIndex,
                partialIndex: part.partialIndex,
                title: part.title,
                episodes: part.episodes,
                mediumId: part.medium_id,
            };
        });
    }
    /**
     * Adds a part of an medium to the storage.
     */
    async addPart(mediumId, part) {
        const result = await this._query("INSERT INTO part (medium_id, title, totalIndex, partialIndex) VALUES (?,?,?,?);", [mediumId, part.title, part.totalIndex, part.partialIndex]);
        const partId = result.insertId;
        if (!Number.isInteger(partId)) {
            throw Error(`invalid ID ${partId}`);
        }
        let episodes;
        if (part.episodes && part.episodes.length) {
            // @ts-ignore
            episodes = await Promise.all(part.episodes.map((value) => this.addEpisode(partId, value)));
        }
        else {
            episodes = [];
        }
        return {
            mediumId,
            id: partId,
            title: part.title,
            partialIndex: part.partialIndex,
            totalIndex: part.totalIndex,
            episodes,
        };
    }
    /**
     * Updates a part.
     */
    updatePart(part) {
        return this._update("part", "id", part.id, (updates, values) => {
            if (part.title) {
                updates.push("title = ?");
                values.push(part.title);
            }
            else { // noinspection JSValidateTypes
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
    async deletePart(id) {
        // todo delete all episode in this part or just transfer them to the "all" part?
        return false;
    }
    async addRelease(episodeId, releases) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(releases, (release) => {
            release.episodeId = episodeId;
            return this._query("INSERT IGNORE INTO episode_release " +
                "(episode_id, title, url, source_type, releaseDate) " +
                "VALUES (?,?,?,?,?);", [
                episodeId,
                release.title,
                release.url,
                release.sourceType,
                release.releaseDate
            ]).then(() => release);
        });
    }
    getSourcedReleases(sourceType, mediumId) {
        return this._query("SELECT url, episode_release.title FROM episode_release " +
            "INNER JOIN episode ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON part.id=episode.part_id " +
            "WHERE source_type=? AND medium_id=?;", [sourceType, mediumId]).then((resultArray) => resultArray.map((value) => {
            value.sourceType = sourceType;
            value.mediumId = mediumId;
            return value;
        }));
    }
    updateRelease(episodeId, releases) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(releases, async (value) => {
            if (value.episodeId) {
                await this._update("episode_release", "episode_id", episodeId, (updates, values) => {
                    if (value.title) {
                        updates.push("title=?");
                        values.push(value.title);
                    }
                    if (value.url) {
                        updates.push("url=?");
                        values.push(value.url);
                    }
                    if (value.releaseDate) {
                        updates.push("releaseDate=?");
                        values.push(value.releaseDate);
                    }
                    if (value.sourceType) {
                        updates.push("source_type=?");
                        values.push(value.sourceType);
                    }
                });
            }
            else if (value.sourceType) {
                await this._query("UPDATE episode_release SET url=? WHERE source_type=? AND url != ? AND title=?", [value.url, value.sourceType, value.url, value.title]);
            }
        });
    }
    /**
     * Adds a episode of a part to the storage.
     */
    addEpisode(partId, episodes) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(episodes, async (episode) => {
            const result = await this._query("INSERT INTO episode " +
                "(part_id, totalIndex, partialIndex) " +
                "VALUES (?,?,?);", [partId, episode.totalIndex, episode.partialIndex]);
            const insertId = result.insertId;
            if (!Number.isInteger(insertId)) {
                throw Error(`invalid ID ${insertId}`);
            }
            const releases = episode.releases && episode.releases.length
                ? await this.addRelease(insertId, episode.releases)
                : [];
            return {
                id: insertId,
                partId,
                partialIndex: episode.partialIndex,
                totalIndex: episode.totalIndex,
                releases,
                progress: 0,
                readDate: null,
            };
        });
    }
    /**
     * Gets an episode from the storage.
     */
    getEpisode(id, uuid) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(id, async (episodeId) => {
            const episodePromise = this._query("SELECT * FROM episode WHERE id = ?;", episodeId);
            const userEpisodePromise = this._query("SELECT * FROM user_episode WHERE episode_id=? AND user_uuid=?", [episodeId, uuid]);
            const releases = await this.getReleases(episodeId);
            const [episode] = await episodePromise;
            const [userEpisode] = await userEpisodePromise;
            if (!episode) {
                return null;
            }
            return {
                progress: userEpisode ? userEpisode.progress : 0,
                readDate: userEpisode ? userEpisode.read_date : null,
                id: episodeId,
                partialIndex: episode.partialIndex,
                partId: episode.part_id,
                totalIndex: episode.totalIndex,
                releases,
            };
        });
    }
    getPartEpisodePerIndex(partId, index) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(index, async (totalIndex) => {
            if (Number.isNaN(totalIndex)) {
                throw Error(tools_1.Errors.INVALID_INPUT);
            }
            const episodes = await this._query("SELECT * FROM episode WHERE part_id = ? AND totalIndex=?", [partId, totalIndex]);
            const value = episodes[0];
            if (!value || !value.id) {
                return { totalIndex };
            }
            const releases = await this.getReleases(value.id);
            return {
                id: value.id,
                partId,
                totalIndex: value.totalIndex,
                partialIndex: value.partialIndex,
                releases
            };
        });
    }
    /**
     * Updates an episode from the storage.
     */
    async updateEpisode(episode) {
        return this._update("episode", "id", episode.id, (updates, values) => {
            if (episode.partId) {
                updates.push("part_id = ?");
                values.push(episode.partId);
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
    async deleteEpisode(id) {
        // remove episode from progress first
        await this._delete("user_episode", { column: "episode_id", value: id });
        await this._delete("episode_release", { column: "episode_id", value: id });
        // lastly remove episode itself
        return this._delete("episode", { column: "id", value: id });
    }
    /**
     * Adds a medium to the list.
     *
     * If no listId is available it selects the
     * 'Standard' List of the given user and adds it there.
     */
    async addItemToList(external, medium, uuid) {
        const table = external ? "external_list_medium" : "list_medium";
        // if list_ident is not a number,
        // then take it as uuid from user and get the standard listId of 'Standard' list
        if (medium.listId == null || !Number.isInteger(medium.listId)) {
            const idResult = await this._query("SELECT id FROM reading_list WHERE `name` = 'Standard' AND user_uuid = ?;", uuid);
            medium.listId = idResult[0].id;
        }
        const result = await this._query(`INSERT INTO ${table} (list_id, medium_id) VALUES(?,?);`, [medium.listId, medium.id]);
        return result.affectedRows > 0;
    }
    /**
     * Moves a medium from an old list to a new list.
     *
     * @return {Promise<boolean>}
     */
    async moveMedium(oldListId, newListId, mediumId) {
        // first remove medium from old list
        await this.removeMedium(oldListId, mediumId);
        // add item to new list
        return this.addItemToList(false, { listId: newListId, id: mediumId });
    }
    /**
     * Removes an item from a list.
     */
    removeMedium(listId, mediumId, external = false) {
        const table = external ? "external_list_medium" : "list_medium";
        return this._delete(table, {
            column: "list_id",
            value: listId,
        }, {
            column: "medium_id",
            value: mediumId,
        });
    }
    /**
     * Adds an external user of an user to the storage.
     */
    async addExternalUser(localUuid, externalUser) {
        let result = await this._query("SELECT * FROM external_user " +
            "WHERE name = ? " +
            "AND local_uuid = ? " +
            "AND service = ?", [externalUser.identifier, localUuid, externalUser.type]);
        if (result.length) {
            // @ts-ignore
            throw Error(tools_1.Errors.USER_EXISTS_ALREADY);
        }
        const uuid = v1_1.default();
        result = await this._query("INSERT INTO external_user " +
            "(name, uuid, local_uuid, service, cookies) " +
            "VALUES (?,?,?,?,?);", [externalUser.identifier, uuid, localUuid, externalUser.type, externalUser.cookies]);
        if (!result.affectedRows) {
            return Promise.reject(new Error(tools_1.Errors.UNKNOWN));
        }
        externalUser.localUuid = localUuid;
        return externalUser;
    }
    /**
     * Deletes an external user from the storage.
     */
    async deleteExternalUser(externalUuid) {
        // We need a bottom-up approach to delete,
        // because deleting top-down
        // would violate the foreign keys restraints
        // first delete list - medium links
        await this._query("DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid =?);", externalUuid);
        // proceed to delete lists of external user
        await this._delete("external_reading_list", { column: "user_uuid", value: externalUuid });
        // finish by deleting external user itself
        return this._delete("external_user", { column: "uuid", value: externalUuid });
    }
    /**
     * Gets an external user.
     */
    async getExternalUser(externalUuid) {
        const resultArray = await this._query("SELECT * FROM external_user WHERE uuid = ?;", externalUuid);
        return this.createShallowExternalUser(resultArray[0]);
    }
    /**
     * Gets an external user with cookies, without items.
     */
    async getExternalUserWithCookies(uuid) {
        const value = await this._query("SELECT uuid, local_uuid, service, cookies FROM external_user WHERE uuid = ?;", uuid);
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
    async getScrapeExternalUser() {
        const result = await this._query("SELECT uuid, local_uuid, service, cookies FROM external_user " +
            "WHERE last_scrape IS NULL OR last_scrape > NOW() - 7");
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
    async createShallowExternalUser(storageUser) {
        const externalUser = {
            identifier: storageUser.name,
            uuid: storageUser.uuid,
            type: storageUser.service,
            lists: [],
            localUuid: storageUser.local_uuid,
        };
        externalUser.lists = await this.getExternalUserLists(externalUser.uuid);
        return externalUser;
    }
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser) {
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
            }
            else if (externalUser.cookies == null) {
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
    async addExternalList(userUuid, externalList) {
        const result = await this._query("INSERT INTO external_reading_list " +
            "(name, user_uuid, medium, url) " +
            "VALUES(?,?,?,?);", [externalList.name, userUuid, externalList.medium, externalList.url]);
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
    updateExternalList(externalList) {
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
    async removeExternalList(uuid, externalListId) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(externalListId, async (item) => {
            // first delete any references of externalList: list-media links
            await this._delete("external_list_medium", { column: "list_id", value: item });
            // then delete list itself
            return this._delete("external_reading_list", {
                column: "user_uuid",
                value: uuid,
            }, {
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
    async getExternalList(id) {
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
    async createShallowExternalList(storageList) {
        const result = await this._query("SELECT * FROM external_list_medium WHERE list_id = ?;", storageList.id);
        storageList.items = result.map((value) => value.medium_id);
        // todo return input or copy object?
        return storageList;
    }
    /**
     * Gets an array of all lists of an user.
     */
    async getExternalUserLists(uuid) {
        const result = await this._query("SELECT * FROM external_reading_list WHERE user_uuid = ?;", uuid);
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowExternalList(value)));
    }
    /**
     * Adds a medium to an external list in the storage.
     */
    async addItemToExternalList(listId, mediumId) {
        const result = await this._query("INSERT INTO external_list_medium " +
            "(list_id, medium_id) " +
            "VALUES (?,?)", [listId, mediumId]);
        return result.affectedRows > 0;
    }
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    async addProgress(uuid, episodeId, progress, readDate) {
        // noinspection SuspiciousTypeOfGuard
        if (typeof episodeId !== "number" || typeof progress !== "number") {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const progressArray = await this._query("SELECT progress FROM user_episode WHERE user_uuid=? AND episode_id=?", [uuid, episodeId]);
        if (progressArray[0] && progressArray[0].progress === 1) {
            return true;
        }
        await this.removeProgress(uuid, episodeId);
        const result = await this._query("INSERT INTO user_episode " +
            "(user_uuid, episode_id, progress, read_date) " +
            "VALUES (?,?,?,?);", [uuid, episodeId, progress, readDate]);
        return result.affectedRows > 0;
    }
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid, episodeId) {
        return this._delete("user_episode", {
            column: "user_uuid",
            value: uuid,
        }, {
            column: "episode_id",
            value: episodeId,
        });
    }
    /**
     * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
     */
    setProgress(uuid, progressResult) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(progressResult, async (value) => {
            const resultArray = await this._query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)", [value.novel, value.chapter, value.chapIndex]);
            const episodeId = resultArray[0] && resultArray[0].episode_id;
            if (episodeId == null) {
                const msg = `could not find an episode for '${value.novel}', '${value.chapter}', '${value.chapIndex}'`;
                logger_1.default.info(msg);
                return;
            }
            await this.addProgress(uuid, episodeId, value.progress, value.readDate);
        });
    }
    /**
     * Get the progress of an user in regard to an episode.
     */
    async getProgress(uuid, episodeId) {
        const result = await this
            ._query("SELECT * FROM user_episode " +
            "WHERE user_uuid = ? " +
            "AND episode_id = ?", [uuid, episodeId]);
        return result[0].progress;
    }
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid, episodeId, progress, readDate) {
        // todo for now its the same as calling addProgress, but somehow do it better maybe?
        return this.addProgress(uuid, episodeId, progress, readDate);
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
    async addNews(news) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(news, async (value) => {
            // an empty link may be the result of a faulty link (e.g. a link which leads to 404 error)
            if (!value.link) {
                return;
            }
            if (!value.title || !value.date) {
                return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
            }
            let result = await this._query("INSERT IGNORE INTO news_board (title, link, date) VALUES (?,?,?);", [value.title, value.link, value.date]);
            if (!Number.isInteger(result.insertId)) {
                throw Error(`invalid ID ${result.insertId}`);
            }
            if (!result.affectedRows) {
                return;
            }
            result = { ...value, id: result.insertId };
            return result;
        });
    }
    getLatestNews(domain) {
        return this._query("SELECT * FROM news_board WHERE locate(?, link) < 9 ORDER BY date DESC LIMIT 10", domain);
    }
    /**
     *
     */
    async getNews(uuid, since, till, newsIds) {
        let parameter;
        let query;
        if (newsIds) {
            query = "SELECT * FROM news_board " +
                "LEFT JOIN (SELECT news_id,1 AS read_news FROM news_user WHERE user_id=?) " +
                "as news_user ON news_user.news_id=news_board.id " +
                "WHERE id IN (";
            if (!newsIds.length) {
                return [];
            }
            if (newsIds.some((newsId) => !Number.isInteger(newsId))) {
                return [];
            }
            query = query + newsIds.join(", ") + ");";
            parameter = uuid;
        }
        else {
            // todo query looks horrible, replace it with something better?
            // a time based query
            query = "SELECT * FROM news_board " +
                "LEFT JOIN (SELECT news_id,1 AS read_news FROM news_user WHERE user_id=?) " +
                "as news_user ON news_user.news_id=news_board.id " +
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
            if (!till) {
                till = new Date();
            }
            parameter = [till, uuid, uuid];
            if (since) {
                parameter.unshift(since);
            }
            parameter.unshift(uuid);
        }
        const newsResult = await this._query(query, parameter);
        return Array.from(newsResult).map((value) => {
            return {
                title: value.title,
                date: value.date,
                link: value.link,
                id: value.id,
                read: Boolean(value.read_news),
            };
        });
    }
    /**
     *
     */
    async deleteOldNews() {
        await this._query("DELETE FROM news_medium WHERE news_id IN " +
            "(SELECT news_id FROM news_board WHERE date < NOW() - INTERVAL 30 DAY);");
        const result = await this._query("DELETE FROM news_board WHERE date < NOW() - INTERVAL 30 DAY;");
        return result.affectedRows > 0;
    }
    /**
     *
     */
    async addScrape(scrape) {
        // @ts-ignore
        await tools_1.promiseMultiSingle(scrape, (item) => {
            return this._query("INSERT INTO scrape_board " +
                "(link, type, last_date, uuid, medium_id) VALUES (?,?,?,?,?);", [
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
    async getScrapes() {
        let value = await this._query("SELECT * FROM scrape_board;");
        value = [...value];
        return value.map((item) => {
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
    removeScrape(link) {
        return this._delete("scrape_board", { column: "link", value: link });
    }
    /**
     *
     */
    async linkNewsToMedium() {
        // todo maybe implement this with a trigger
        const result = await this._query("INSERT IGNORE INTO news_medium (medium_id, news_id)" +
            "SELECT medium.id, news_board.id FROM medium,news_board " +
            "WHERE locate(medium.title, news_board.title) > 0");
        return result.affectedRows > 0;
    }
    linkNewsToEpisode(news) {
        return Promise.all(news.map((value) => {
            // todo implement this if needed
            // this._query("");
        })).then(() => true);
    }
    /**
     *
     */
    async removeLinkNewsToMedium(newsId, mediumId) {
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
    async markRead(uuid, news) {
        await tools_1.promiseMultiSingle(news, (newsId) => this._query("INSERT IGNORE INTO news_user (user_id,news_id) VALUES (?,?);", [uuid, newsId]));
        return true;
    }
    /**
     * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
     */
    async markEpisodeRead(uuid, result) {
        if (!result.accept) {
            return;
        }
        const teaserMatcher = /\(?teaser\)?$|(\s+$)/i;
        // @ts-ignore
        return tools_1.promiseMultiSingle(result.result, async (value) => {
            // todo what if it is not a serial medium but only an article? should it even save such things?
            if (!value.novel
                || (!value.chapIndex && !value.chapter)
                // do not mark episode if they are a teaser only
                || (value.chapter && value.chapter.match(teaserMatcher))) {
                return;
            }
            const resultArray = await this._query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?);", [value.novel, value.chapter, value.chapIndex]);
            // if a similar/same result was mapped to an episode before, get episode_id and update read
            if (resultArray[0] && resultArray[0].episode_id != null) {
                return this._query("INSERT IGNORE INTO user_episode (user_uuid, episode_id,progress) VALUES (?,?,0);", [uuid, resultArray[0].episode_id]);
            }
            const escapedNovel = escapeLike(value.novel, { singleQuotes: true, noBoundaries: true });
            const media = await this._query("SELECT title, id,synonym FROM medium " +
                "LEFT JOIN medium_synonyms ON medium.id=medium_synonyms.medium_id " +
                "WHERE medium.title LIKE ? OR medium_synonyms.synonym LIKE ?;", [escapedNovel, escapedNovel]);
            // todo for now only get the first medium?, later test it against each other
            let bestMedium = media[0];
            if (!bestMedium) {
                const addedMedium = await this.addMedium({ title: value.novel, medium: tools_1.MediaType.TEXT }, uuid);
                bestMedium = { id: addedMedium.insertId, title: value.novel };
                // todo add medium if it is not known?
            }
            let volumeId;
            // if there is either an volume or volIndex in result
            // search or add the given volume to link the episode to the part/volume
            let volumeTitle = value.volume;
            // if there is no volume yet, with the given volumeTitle or index, add one
            let volIndex = Number(value.volIndex);
            if (volIndex || volumeTitle) {
                // todo: do i need to convert volIndex from a string to a number for the query?
                const volumeArray = await this._query("SELECT id FROM part WHERE medium_id=? AND title LIKE ? OR totalIndex=?)", [bestMedium.id, volumeTitle && escapeLike(volumeTitle, {
                        singleQuotes: true,
                        noBoundaries: true
                    }), volIndex]);
                const volume = volumeArray[0];
                if (volume) {
                    volumeId = volume.id;
                }
                else {
                    if (Number.isNaN(volIndex)) {
                        const lowestIndexArray = await this._query("SELECT MIN(totalIndex) as totalIndex FROM part WHERE medium_id=?", bestMedium.id);
                        const lowestIndexObj = lowestIndexArray[0];
                        // if the lowest available totalIndex not indexed, decrement, else take -2
                        // -1 is reserved for all episodes, which do not have any volume/part assigned
                        volIndex = lowestIndexObj && lowestIndexObj.totalIndex < 0 ? --lowestIndexObj.totalIndex : -2;
                    }
                    if (!volumeTitle) {
                        volumeTitle = "Volume " + volIndex;
                    }
                    const addedVolume = await this.addPart(bestMedium.id, 
                    // @ts-ignore
                    { title: volumeTitle, totalIndex: volIndex });
                    volumeId = addedVolume.id;
                }
            }
            else {
                // check if there is a part/volume, with index -1, reserved for all episodes, which are not indexed
                const volumeArray = await this._query("SELECT id FROM part WHERE medium_id=? AND totalIndex=?", [bestMedium.id, -1]);
                const volume = volumeArray[0];
                if (!volume) {
                    volumeId = (await this.createStandardPart(bestMedium.id)).id;
                }
                else {
                    volumeId = volume.id;
                }
            }
            const episodeSelectArray = await this._query("SELECT id, part_id, url FROM episode " +
                "LEFT JOIN episode_release " +
                "ON episode.id=episode_release.episode_id " +
                "WHERE title LIKE ? OR totalIndex=?", [value.chapter && escapeLike(value.chapter, {
                    noBoundaries: true,
                    singleQuotes: true
                }), value.chapIndex]);
            const episodeSelect = episodeSelectArray[0];
            let episodeId = episodeSelect && episodeSelect.id;
            if (episodeId == null) {
                let episodeIndex = Number(value.chapIndex);
                // if there is no index, decrement the minimum index available for this medium
                if (Number.isNaN(episodeIndex)) {
                    const latestEpisodeArray = await this._query("SELECT MIN(totalIndex) as totalIndex FROM episode " +
                        "WHERE part_id EXISTS (SELECT id from part WHERE medium_id=?);", bestMedium.id);
                    const latestEpisode = latestEpisodeArray[0];
                    // if the lowest available totalIndex not indexed, decrement, else take -1
                    episodeIndex = latestEpisode && latestEpisode.totalIndex < 0 ? --latestEpisode.totalIndex : -1;
                }
                let chapter = value.chapter;
                if (!chapter) {
                    chapter = "Chapter " + episodeIndex;
                }
                const episode = await this.addEpisode(volumeId, {
                    id: 0,
                    partId: volumeId,
                    totalIndex: episodeIndex,
                    releases: [{
                            title: chapter,
                            url: result.url,
                            releaseDate: new Date(),
                            // todo get source type
                            sourceType: "",
                            episodeId: 0
                        }],
                });
                // @ts-ignore
                episodeId = episode.id;
            }
            // now after setting the storage up, so that all data is 'consistent' with this result,
            // mark the episode as read
            // normally the progress should be updated by messages of the tracker
            // it should be inserted only, if there does not exist any progress
            await this
                ._query("INSERT IGNORE INTO user_episode (user_uuid, episode_id, progress) VALUES (?,?,0);", [uuid, episodeId]);
            await this._query("INSERT INTO result_episode (novel, chapter, chapIndex, volume, volIndex, episode_id) " +
                "VALUES (?,?,?,?,?,?);", [value.novel, value.chapter, value.chapIndex, value.volume, value.volIndex, episodeId]);
        });
    }
    createStandardPart(mediumId) {
        const partName = "Non Indexed Volume";
        return this._query("INSERT IGNORE INTO part (medium_id,title, totalIndex) VALUES (?,?,?);", [mediumId, partName, -1]).then((value) => {
            return {
                totalIndex: -1,
                title: partName,
                id: value.insertId,
                mediumId,
                episodes: []
            };
        });
    }
    /**
     *
     */
    async checkUnreadNewsCount(uuid) {
        const result = await this._query("SELECT COUNT(*) AS count FROM news_board WHERE id NOT IN " +
            "(SELECT news_id FROM news_user WHERE user_id = ?);", uuid);
        return result[0].count;
    }
    /**
     *
     */
    checkUnreadNews(uuid) {
        return this._query("SELECT * FROM news_board WHERE id NOT IN (SELECT news_id FROM news_user WHERE user_id = ?);", uuid);
    }
    getSynonyms(mediumId) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(mediumId, async (value) => {
            const synonymResult = await this._query("SELECT synonym FROM medium_synonyms WHERE medium_id=?;", value);
            return {
                mediumId: value,
                synonym: synonymResult.map((result) => result.synonym)
            };
        });
    }
    removeSynonyms(synonyms) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(synonyms, (value) => {
            return tools_1.promiseMultiSingle(value.synonym, (item) => {
                return this._delete("medium_synonyms", {
                    column: "synonym",
                    value: item
                }, {
                    column: "medium_id",
                    value: value.mediumId
                });
            });
        }).then(() => true);
    }
    addSynonyms(synonyms) {
        // @ts-ignore
        return tools_1.promiseMultiSingle(synonyms, (value) => {
            return tools_1.promiseMultiSingle(value.synonym, (item) => {
                return this._query("INSERT IGNORE INTO medium_synonyms (medium_id, synonym) VALUES (?,?)", [value.mediumId, item]);
            });
        }).then(() => true);
    }
    addToc(mediumId, link) {
        return this._query("INSERT IGNORE INTO medium_toc (medium_id, link) VAlUES (?,?)", [mediumId, link]);
    }
    async getToc(mediumId) {
        const resultArray = await this._query("SELECT link FROM medium_toc WHERE medium_id=?", mediumId);
        return resultArray.map((value) => value.link).filter((value) => value);
    }
    getAllTocs() {
        return this._query("SELECT id, link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id");
    }
    async getChapterIndices(mediumId) {
        const result = await this._query("SELECT (episode.totalIndex + COALESCE(episode.partialIndex,0)) as combinedIndex FROM episode " +
            "INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?", mediumId);
        return result
            .map((value) => Number(value.combinedIndex))
            .filter((value) => value);
    }
    async getAllChapterLinks(mediumId) {
        const result = await this._query("SELECT url FROM episode " +
            "INNER JOIN episode_release ON episode.id=episode_release.episode_id " +
            "INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?", mediumId);
        return result
            .map((value) => value.url)
            .filter((value) => value);
    }
    /**
     * Returns all user stored in storage.
     */
    showUser() {
        return this._query("SELECT * FROM user;");
    }
    /**
     * Deletes the whole storage.
     */
    async clearAll() {
        const exists = await this.databaseExists();
        return exists && this._query(`DROP DATABASE ${database};`);
    }
    processResult(result) {
        if (!result.preliminary) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        // @ts-ignore
        return tools_1.promiseMultiSingle(result.result, async (value) => {
            const resultArray = await this._query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)", [value.novel, value.chapter, value.chapIndex]);
            if (resultArray[0] && resultArray[0].episode_id != null) {
                return null;
            }
            // todo implement
            return value;
        });
    }
    saveResult(result) {
        if (!result.preliminary) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        // @ts-ignore
        return tools_1.promiseMultiSingle(result.result, async (value) => {
            if (!result.accept) {
                return false;
            }
            // if there is a title, search a medium which matches
            // todo implement
            return value;
        });
    }
    async getUnreadChapter(uuid) {
        const resultArray = await this._query("SELECT id FROM episode WHERE id NOT IN " +
            "(SELECT episode_id FROM user_episode WHERE progress < 1 AND user_uuid=?);", uuid);
        return Array.from(resultArray).map((value) => value.id);
    }
    async getReadToday(uuid) {
        const resultArray = await this._query("SELECT * FROM user_episode WHERE read_date > (NOW() - INTERVAL 1 DAY) AND user_uuid=?;", uuid);
        return Array.from(resultArray).map((value) => {
            return {
                episodeId: value.episode_id,
                readDate: value.read_date,
                progress: value.progress,
            };
        });
    }
    async getPageInfo(link, key) {
        if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
            return Promise.reject(tools_1.Errors.INVALID_INPUT);
        }
        const query = await this._query("SELECT value FROM page_info WHERE link=? AND keyString=?", [link, key]);
        return {
            link,
            key,
            values: query.map((value) => value.value).filter((value) => value)
        };
    }
    async updatePageInfo(link, key, values, toDeleteValues) {
        if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
            return Promise.reject(tools_1.Errors.INVALID_INPUT);
        }
        await this.removePageInfo(link, key, toDeleteValues);
        await Promise.all(values.map((value) => {
            if (!value || !validate.isString(value)) {
                throw tools_1.Errors.INVALID_INPUT;
            }
            return this._query("INSERT INTO page_info (link, key, value) VALUES(?,?,?)", [link, key, value]);
        }));
    }
    async removePageInfo(link, key, toDeleteValues) {
        if (!validate.isString(link) || !link || (key && !validate.isString(key))) {
            return Promise.reject(tools_1.Errors.INVALID_INPUT);
        }
        if (key) {
            if (toDeleteValues) {
                await Promise.all(toDeleteValues.map((value) => {
                    if (!value || !validate.isString(value)) {
                        throw tools_1.Errors.INVALID_INPUT;
                    }
                    return this._query("DELETE FROM page_info WHERE link=? AND keyString=? AND value=?", [link, key, value]);
                }));
            }
            else {
                await this._query("DELETE FROM page_info WHERE link=? AND keyString=?", [link, key]);
            }
        }
        else {
            await this._query("DELETE FROM page_info WHERE link=?", link);
        }
    }
    async addInvalidation(value) {
        // fixme: this could be a potential security issue, due to executing unvalidated queries
        await Promise.all(value.map((query) => this._query(query)));
    }
    async getInvalidated(uuid) {
        // fixme throws an error at this line for 'syntax error'
        const result = await this._query("SELECT * FROM user_data_invalidation WHERE uuid=?", uuid);
        await this._query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => {
            console.log(reason);
            logger_1.default.error(reason);
        });
        return Array.from(result).map((value) => {
            return {
                externalListId: value.external_list_id,
                externalUuid: value.external_uuid,
                mediumId: value.medium_id,
                partId: value.part_id,
                episodeId: value.episode_id,
                userUuid: value.user_uuid,
                listId: value.list_id,
                newsId: value.news_id,
                uuid,
            };
        });
    }
    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    _getUser(uuid, session) {
        if (!uuid) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const user = {
            externalUser: [],
            lists: [],
            name: "",
            uuid: "",
            readToday: [],
            unreadChapter: [],
            unreadNews: [],
            session,
        };
        // query for user
        const userPromise = this._query("SELECT * FROM user WHERE uuid = ?;", uuid)
            .then((value) => {
            // add user metadata
            user.name = value[0].name;
            user.uuid = uuid;
        });
        // query for user reading lists
        const listsPromise = this
            .getUserLists(uuid)
            .then((value) => {
            // add local user reading lists
            user.lists.push(...value);
        });
        // select external user of user
        const allExternalUserPromise = this
            ._query("SELECT * FROM external_user WHERE local_uuid = ?;", uuid)
            .then((allExternalUser) => {
            // add external_user and add their respective external reading lists
            return Promise.all(allExternalUser.map((value) => this
                .createShallowExternalUser(value)
                .then((externalUser) => user.externalUser.push(externalUser))));
        });
        const unReadNewsPromise = this
            .checkUnreadNews(uuid)
            .then((value) => user.unreadNews.push(...value));
        const unReadChapterPromise = this
            .getUnreadChapter(uuid)
            .then((value) => user.unreadChapter.push(...value));
        const readTodayPromise = this
            .getReadToday(uuid)
            .then((value) => user.readToday.push(...value));
        // return user result
        return Promise
            .all([
            userPromise, listsPromise, allExternalUserPromise,
            unReadNewsPromise, unReadChapterPromise, readTodayPromise
        ])
            .then(() => user);
    }
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    async _delete(table, ...condition) {
        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        let query = `DELETE FROM ${promise_mysql_1.default.escapeId(table)} WHERE `;
        const values = [];
        tools_1.multiSingle(condition, (value, _, next) => {
            query += `${promise_mysql_1.default.escapeId(value.column)} = ?`;
            if (next) {
                query += " AND ";
            }
            else {
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
    async _update(table, column, idValue, cb) {
        const updates = [];
        const values = [];
        cb(updates, values);
        if (!updates.length) {
            return Promise.resolve(false);
        }
        values.push(idValue);
        const result = await this._query(`UPDATE ${promise_mysql_1.default.escapeId(table)}
                SET ${updates.join(", ")}
                WHERE ${promise_mysql_1.default.escapeId(column)} = ?;`, values);
        return result.affectedRows > 0;
    }
    /**
     *
     * @param query
     * @param parameter
     * @private
     */
    _query(query, parameter) {
        // return Promise.resolve()
        return databaseValidator_1.StateProcessor
            .validateQuery(query, parameter)
            .then(() => this.con.query(query, parameter))
            .then((value) => databaseValidator_1.StateProcessor.addSql(query, parameter, value, this.uuid));
    }
}
exports.QueryContext = QueryContext;
//# sourceMappingURL=queryContext.js.map