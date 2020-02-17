"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const tools_1 = require("../../tools");
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const validate = tslib_1.__importStar(require("validate.js"));
const databaseContext_1 = require("./databaseContext");
const userContext_1 = require("./userContext");
const externalUserContext_1 = require("./externalUserContext");
const internalListContext_1 = require("./internalListContext");
const externalListContext_1 = require("./externalListContext");
const newsContext_1 = require("./newsContext");
const episodeContext_1 = require("./episodeContext");
const mediumContext_1 = require("./mediumContext");
const partContext_1 = require("./partContext");
const jobContext_1 = require("./jobContext");
const mediumInWaitContext_1 = require("./mediumInWaitContext");
const env_1 = tslib_1.__importDefault(require("../../env"));
const database = "enterprise";
/**
 * A Class for consecutive queries on the same connection.
 */
class QueryContext {
    constructor(con) {
        this.con = con;
    }
    get databaseContext() {
        return this._databaseContext ? this._databaseContext : (this._databaseContext = new databaseContext_1.DatabaseContext(this));
    }
    get userContext() {
        return this._userContext ? this._userContext : (this._userContext = new userContext_1.UserContext(this));
    }
    get partContext() {
        return this._partContext ? this._partContext : (this._partContext = new partContext_1.PartContext(this));
    }
    get mediumContext() {
        return this._mediumContext ? this._mediumContext : (this._mediumContext = new mediumContext_1.MediumContext(this));
    }
    get episodeContext() {
        return this._episodeContext ? this._episodeContext : (this._episodeContext = new episodeContext_1.EpisodeContext(this));
    }
    get newsContext() {
        return this._newsContext ? this._newsContext : (this._newsContext = new newsContext_1.NewsContext(this));
    }
    get externalListContext() {
        return this._externalListContext
            ? this._externalListContext
            : (this._externalListContext = new externalListContext_1.ExternalListContext(this));
    }
    get externalUserContext() {
        return this._externalUserContext
            ? this._externalUserContext
            : (this._externalUserContext = new externalUserContext_1.ExternalUserContext(this));
    }
    get internalListContext() {
        return this._internalListContext
            ? this._internalListContext
            : (this._internalListContext = new internalListContext_1.InternalListContext(this));
    }
    get jobContext() {
        return this._jobContext ? this._jobContext : (this._jobContext = new jobContext_1.JobContext(this));
    }
    get mediumInWaitContext() {
        return this._mediumInWaitContext
            ? this._mediumInWaitContext
            : (this._mediumInWaitContext = new mediumInWaitContext_1.MediumInWaitContext(this));
    }
    /**
     *
     */
    startTransaction() {
        return this.query("START TRANSACTION;").then(tools_1.ignore);
    }
    /**
     *
     */
    commit() {
        return this.query("COMMIT;").then(tools_1.ignore);
    }
    /**
     *
     */
    rollback() {
        return this.query("ROLLBACK;").then(tools_1.ignore);
    }
    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    async start() {
        const exists = await this.databaseExists();
        if (!exists) {
            await this.query(`CREATE DATABASE ${database};`);
        }
    }
    /**
     * Checks whether the main database exists currently.
     */
    async databaseExists() {
        const databases = await this.query("SHOW DATABASES;");
        return databases.find((data) => data.Database === database) != null;
    }
    processResult(result) {
        if (!result.preliminary) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        // @ts-ignore
        return tools_1.promiseMultiSingle(result.result, async (value) => {
            const resultArray = await this.query("SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)", [value.novel, value.chapter, value.chapIndex]);
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
    async getPageInfo(link, key) {
        if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
            return Promise.reject(tools_1.Errors.INVALID_INPUT);
        }
        const query = await this.query("SELECT value FROM page_info WHERE link=? AND keyString=?", [link, key]);
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
            return this.query("INSERT INTO page_info (link, keyString, value) VALUES(?,?,?)", [link, key, value]);
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
                    // TODO: 29.06.2019 use 'value IN (list)'
                    return this.query("DELETE FROM page_info WHERE link=? AND keyString=? AND value=?", [link, key, value]);
                }));
            }
            else {
                await this.query("DELETE FROM page_info WHERE link=? AND keyString=?", [link, key]);
            }
        }
        else {
            await this.query("DELETE FROM page_info WHERE link=?", link);
        }
    }
    async queueNewTocs() {
        throw Error("not supported");
    }
    async getInvalidated(uuid) {
        const result = await this.query("SELECT * FROM user_data_invalidation WHERE uuid=?", uuid);
        await this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => {
            console.log(reason);
            logger_1.default.error(reason);
        });
        return result.map((value) => {
            return {
                externalListId: value.external_list_id,
                externalUuid: value.external_uuid,
                mediumId: value.medium_id,
                partId: value.part_id,
                episodeId: value.episode_id,
                userUuid: !!value.user_uuid,
                listId: value.list_id,
                newsId: value.news_id,
                uuid,
            };
        });
    }
    async getInvalidatedStream(uuid) {
        return this.queryStream("SELECT " +
            "external_list_id as externalListId, external_uuid as externalUuid, medium_id as mediumId, " +
            "part_id as partId, episode_id as episodeId, user_uuid as userUuid," +
            "list_id as listId, news_id as newsId, uuid " +
            "FROM user_data_invalidation WHERE uuid=?", uuid).on("end", () => {
            this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => {
                console.log(reason);
                logger_1.default.error(reason);
            });
        });
    }
    clearInvalidationTable() {
        return this.query("TRUNCATE user_data_invalidation");
    }
    /**
     *
     * @param query
     * @param parameter
     */
    query(query, parameter) {
        if (query.length > 20 && env_1.default.development) {
            console.log(query.replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 80));
        }
        return Promise.resolve()
            .then(() => this.con.query(query, parameter))
            .then((value) => {
            if (Array.isArray(value) && value.length > 1000) {
                console.log(`${value.length} Results for ${query}`);
            }
            return value;
        });
    }
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    async delete(table, ...condition) {
        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        let query = `DELETE FROM ${promise_mysql_1.default.escapeId(table)} WHERE `;
        const values = [];
        tools_1.multiSingle(condition, (value, _, last) => {
            query += `${promise_mysql_1.default.escapeId(value.column)} = ?`;
            if (last) {
                query += ";";
            }
            else {
                query += " AND ";
            }
            values.push(value.value);
        });
        const result = await this.query(query, values);
        return result.affectedRows >= 0;
    }
    /**
     * Updates data from the storage.
     */
    async update(table, cb, ...condition) {
        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const updates = [];
        const values = [];
        cb(updates, values);
        if (!updates.length) {
            return Promise.resolve(false);
        }
        let query = `UPDATE ${promise_mysql_1.default.escapeId(table)}
                SET ${updates.join(", ")}
                WHERE `;
        tools_1.multiSingle(condition, (value, _, last) => {
            query += `${promise_mysql_1.default.escapeId(value.column)} = ?`;
            if (last) {
                query += ";";
            }
            else {
                query += " AND ";
            }
            values.push(value.value);
        });
        const result = await this.query(query, values);
        return result.affectedRows > 0;
    }
    multiInsert(query, value, paramCallback) {
        if (!value || (Array.isArray(value) && !value.length)) {
            return Promise.resolve();
        }
        if (Array.isArray(value) && value.length > 100) {
            // @ts-ignore
            return this._batchFunction(value, query, paramCallback, (q, v, p) => this.multiInsert(q, v, p));
        }
        let valuesQuery = "";
        let valuesQueries = "";
        let paramCount = -1;
        const param = [];
        // @ts-ignore
        tools_1.multiSingle(value, (item, index, lastItem) => {
            const items = paramCallback(item);
            if (Array.isArray(items)) {
                param.push(...items);
            }
            else {
                param.push(items);
            }
            if (paramCount !== items.length) {
                paramCount = items.length;
                valuesQuery = "(";
                if (items.length > 1) {
                    valuesQuery += "?,".repeat(items.length - 1);
                }
                valuesQuery += "?)";
            }
            valuesQueries += valuesQuery;
            if (!lastItem) {
                valuesQueries += ",";
            }
        });
        return this.query(`${query} ${valuesQueries};`, param);
    }
    async queryInList(query, value, afterQuery, paramCallback) {
        if (Array.isArray(value)) {
            if (!value.length) {
                return [];
            }
        }
        else if (!value) {
            return;
        }
        if (Array.isArray(value) && value.length > 100) {
            return this._batchFunction(value, query, paramCallback, 
            // @ts-ignore
            (q, v, p) => this.queryInList(q, v, afterQuery, p));
        }
        const placeholders = [];
        const param = [];
        // @ts-ignore
        tools_1.multiSingle(value, (item) => {
            if (paramCallback) {
                const items = paramCallback(item);
                if (Array.isArray(items)) {
                    param.push(...items);
                }
                else {
                    param.push(items);
                }
            }
            else {
                param.push(item);
            }
            placeholders.push("?");
        });
        if (!param.length) {
            throw Error(`no params for '${query}'`);
        }
        return this.query(`${query} IN (${placeholders.join(",")}) ${afterQuery ? afterQuery : ""};`, param);
    }
    queryStream(query, parameter) {
        if (query.length > 20 && env_1.default.development) {
            console.log(query, (parameter + "").replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 30));
        }
        return this.con.queryStream(query, parameter);
    }
    async getNew(uuid, date = new Date(0)) {
        const episodeReleasePromise = this.query("SELECT episode_id as episodeId, title, url, releaseDate, locked " +
            "FROM episode_release WHERE updated_at > ?", date);
        const episodePromise = this.query("SELECT id, part_id as partId, totalIndex, partialIndex, " +
            "user_episode.progress, user_episode.read_date as readDate " +
            "FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id " +
            "WHERE (user_episode.user_uuid IS NULL OR user_episode.user_uuid = ?) " +
            "AND (updated_at > ? OR read_date > ?)", [uuid, date, date]);
        const partPromise = this.query("SELECT id, title, medium_id as mediumId, totalIndex, partialIndex FROM part WHERE updated_at > ?", date);
        const mediumPromise = this.query("SELECT id, countryOfOrigin, languageOfOrigin, author, artist, title, " +
            "medium, lang, stateOrigin, stateTL, series, universe " +
            "FROM medium WHERE updated_at > ?", date);
        const listPromise = this.query("SELECT id, name, medium FROM reading_list WHERE user_uuid=? AND updated_at > ?", [uuid, date]);
        const exListPromise = this.query("SELECT list.id, list.name, list.user_uuid as uuid, list.medium, list.url " +
            "FROM external_user INNER JOIN external_reading_list as list ON uuid=user_uuid " +
            "WHERE local_uuid=? AND list.updated_at > ?", [uuid, date]);
        const exUserPromise = this.query("SELECT name as identifier, uuid, service as type, local_uuid as localUuid " +
            "FROM external_user WHERE local_uuid = ? AND updated_at > ?", [uuid, date]);
        const mediumInWaitPromise = this.query("SELECT title, medium, link FROM medium_in_wait WHERE updated_at > ?", date);
        const newsPromise = this.query("SELECT id, title, link, date, CASE WHEN user_id IS NULL THEN 0 ELSE 1 END as `read` " +
            "FROM news_board LEFT JOIN news_user ON id=news_id " +
            "WHERE (user_id IS NULL OR user_id = ?) AND updated_at > ?", [uuid, date]);
        return {
            media: await mediumPromise,
            releases: await episodeReleasePromise,
            episodes: await episodePromise,
            parts: await partPromise,
            lists: await listPromise,
            extLists: await exListPromise,
            extUser: await exUserPromise,
            mediaInWait: await mediumInWaitPromise,
            news: await newsPromise.then((values) => {
                values.forEach((value) => value.read = value.read === 1);
                return values;
            })
        };
    }
    async getStat(uuid) {
        const episodePromise = this.query("SELECT part_id, count(distinct episode.id) as episodeCount, sum(distinct episode.id) as episodeSum, count(url) as releaseCount " +
            "FROM episode LEFT JOIN episode_release ON episode.id=episode_release.episode_id " +
            "GROUP BY part_id");
        const partPromise = this.query("SELECT part.id, medium_id FROM part ");
        const listPromise = this.query("SELECT id, medium_id FROM reading_list LEFT JOIN list_medium ON reading_list.id=list_id WHERE user_uuid=?", uuid);
        const exListPromise = this.query("SELECT id, medium_id FROM external_user INNER JOIN external_reading_list ON uuid=user_uuid LEFT JOIN external_list_medium ON external_reading_list.id=list_id WHERE local_uuid=?", uuid);
        const extUserPromise = this.query("SELECT uuid, id FROM external_user LEFT JOIN external_reading_list ON uuid=user_uuid WHERE local_uuid=?", uuid);
        const parts = await partPromise;
        const episodes = await episodePromise;
        const emptyPart = { episodeCount: 0, episodeSum: 0, releaseCount: 0 };
        const partMap = new Map();
        for (const episode of episodes) {
            partMap.set(episode.part_id, episode);
            delete episode.part_id;
        }
        const media = {};
        const lists = {};
        const extLists = {};
        const extUser = {};
        for (const part of parts) {
            const mediumParts = tools_1.getElseSetObj(media, part.medium_id, () => new Object());
            mediumParts[part.id] = tools_1.getElseSet(partMap, part.id, () => emptyPart);
        }
        for (const list of await listPromise) {
            const listMedia = tools_1.getElseSetObj(lists, list.id, () => []);
            if (list.medium_id != null) {
                listMedia.push(list.medium_id);
            }
        }
        for (const list of await exListPromise) {
            const listMedia = tools_1.getElseSetObj(extLists, list.id, () => []);
            if (list.medium_id != null) {
                listMedia.push(list.medium_id);
            }
        }
        for (const user of await extUserPromise) {
            const userLists = tools_1.getElseSetObj(extUser, user.uuid, () => []);
            userLists.push(user.id);
        }
        return {
            media,
            lists,
            extLists,
            extUser,
        };
    }
    // noinspection JSMethodCanBeStatic
    async _batchFunction(value, query, paramCallback, func) {
        const length = value.length;
        const resultsPromises = [];
        const batchLimit = 100;
        for (let i = 0; i < length; i += batchLimit) {
            let subList;
            if (length < batchLimit) {
                subList = value.slice(i, length);
            }
            else {
                subList = value.slice(i, i + batchLimit);
            }
            resultsPromises.push(func(query, subList, paramCallback));
        }
        const results = await Promise.all(resultsPromises);
        return results.flat();
    }
}
exports.QueryContext = QueryContext;
//# sourceMappingURL=queryContext.js.map