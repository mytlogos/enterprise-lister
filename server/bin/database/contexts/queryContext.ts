import mySql, {Connection} from "promise-mysql";
import {Invalidation, MetaResult, Result} from "../../types";
import {Errors, ignore, multiSingle, promiseMultiSingle} from "../../tools";
import logger from "../../logger";
import * as validate from "validate.js";
import {Query} from "mysql";
import {DatabaseContext} from "./databaseContext";
import {UserContext} from "./userContext";
import {ExternalUserContext} from "./externalUserContext";
import {InternalListContext} from "./internalListContext";
import {ExternalListContext} from "./externalListContext";
import {NewsContext} from "./newsContext";
import {EpisodeContext} from "./episodeContext";
import {MediumContext} from "./mediumContext";
import {PartContext} from "./partContext";
import {JobContext} from "./jobContext";
import {MediumInWaitContext} from "./mediumInWaitContext";
import {ConnectionContext} from "../databaseTypes";

const database = "enterprise";

type ParamCallback<T> = (value: T) => (any[] | any);
type UpdateCallback = (updates: string[], values: any[]) => void;

export interface DbTrigger {
    Trigger: string;
    Event: string;
    Timing: string;
    Table: string;
}

/**
 * A Class for consecutive queries on the same connection.
 */
export class QueryContext implements ConnectionContext {
    private con: Connection;
    // tslint:disable-next-line:variable-name
    private _databaseContext?: DatabaseContext;
    // tslint:disable-next-line:variable-name
    private _userContext?: UserContext;
    // tslint:disable-next-line:variable-name
    private _externalUserContext?: ExternalUserContext;
    // tslint:disable-next-line:variable-name
    private _episodeContext?: EpisodeContext;
    // tslint:disable-next-line:variable-name
    private _externalListContext?: ExternalListContext;
    // tslint:disable-next-line:variable-name
    private _internalListContext?: InternalListContext;
    // tslint:disable-next-line:variable-name
    private _jobContext?: JobContext;
    // tslint:disable-next-line:variable-name
    private _mediumContext?: MediumContext;
    // tslint:disable-next-line:variable-name
    private _mediumInWaitContext?: MediumInWaitContext;
    // tslint:disable-next-line:variable-name
    private _newsContext?: NewsContext;
    // tslint:disable-next-line:variable-name
    private _partContext?: PartContext;

    public get databaseContext(): DatabaseContext {
        return this._databaseContext ? this._databaseContext : (this._databaseContext = new DatabaseContext(this));
    }

    public get userContext(): UserContext {
        return this._userContext ? this._userContext : (this._userContext = new UserContext(this));
    }

    public get partContext(): PartContext {
        return this._partContext ? this._partContext : (this._partContext = new PartContext(this));
    }

    public get mediumContext(): MediumContext {
        return this._mediumContext ? this._mediumContext : (this._mediumContext = new MediumContext(this));
    }

    public get episodeContext(): EpisodeContext {
        return this._episodeContext ? this._episodeContext : (this._episodeContext = new EpisodeContext(this));
    }

    public get newsContext(): NewsContext {
        return this._newsContext ? this._newsContext : (this._newsContext = new NewsContext(this));
    }

    public get externalListContext(): ExternalListContext {
        return this._externalListContext
            ? this._externalListContext
            : (this._externalListContext = new ExternalListContext(this));
    }

    public get externalUserContext(): ExternalUserContext {
        return this._externalUserContext
            ? this._externalUserContext
            : (this._externalUserContext = new ExternalUserContext(this));
    }

    public get internalListContext(): InternalListContext {
        return this._internalListContext
            ? this._internalListContext
            : (this._internalListContext = new InternalListContext(this));
    }

    public get jobContext(): JobContext {
        return this._jobContext ? this._jobContext : (this._jobContext = new JobContext(this));
    }

    public get mediumInWaitContext(): MediumInWaitContext {
        return this._mediumInWaitContext
            ? this._mediumInWaitContext
            : (this._mediumInWaitContext = new MediumInWaitContext(this));
    }

    constructor(con: Connection) {
        this.con = con;
    }

    /**
     *
     */
    public startTransaction(): Promise<void> {
        return this.query("START TRANSACTION;").then(ignore);
    }

    /**
     *
     */
    public commit(): Promise<void> {
        return this.query("COMMIT;").then(ignore);
    }


    /**
     *
     */
    public rollback(): Promise<void> {
        return this.query("ROLLBACK;").then(ignore);
    }


    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    public async start(): Promise<void> {
        const exists = await this.databaseExists();
        if (!exists) {
            await this.query(`CREATE DATABASE ${database};`);
        }
    }

    /**
     * Checks whether the main database exists currently.
     */
    public async databaseExists(): Promise<boolean> {
        const databases = await this.query("SHOW DATABASES;");
        return databases.find((data: { Database: string }) => data.Database === database) != null;
    }

    public processResult(result: Result): Promise<MetaResult | MetaResult[]> {
        if (!result.preliminary) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        // @ts-ignore
        return promiseMultiSingle(result.result, async (value: MetaResult) => {
            const resultArray: any[] = await this.query(
                "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)",
                [value.novel, value.chapter, value.chapIndex]
            );
            if (resultArray[0] && resultArray[0].episode_id != null) {
                return null;
            }
            // todo implement
            return value;
        });
    }

    public saveResult(result: Result): Promise<boolean> {
        if (!result.preliminary) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
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

    public async getPageInfo(link: string, key: string): Promise<{ link: string, key: string, values: string[] }> {
        if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        const query: any[] = await this.query(
            "SELECT value FROM page_info WHERE link=? AND keyString=?",
            [link, key]
        );
        return {
            link,
            key,
            values: query.map((value) => value.value).filter((value) => value)
        };
    }

    public async updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void> {
        if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        await this.removePageInfo(link, key, toDeleteValues);

        await Promise.all(values.map((value) => {
            if (!value || !validate.isString(value)) {
                throw Errors.INVALID_INPUT;
            }
            return this.query("INSERT INTO page_info (link, keyString, value) VALUES(?,?,?)", [link, key, value]);
        }));
    }

    public async removePageInfo(link: string, key?: string, toDeleteValues?: string[]): Promise<void> {
        if (!validate.isString(link) || !link || (key && !validate.isString(key))) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        if (key) {
            if (toDeleteValues) {
                await Promise.all(toDeleteValues.map((value) => {
                    if (!value || !validate.isString(value)) {
                        throw Errors.INVALID_INPUT;
                    }
                    // TODO: 29.06.2019 use 'value IN (list)'
                    return this.query(
                        "DELETE FROM page_info WHERE link=? AND keyString=? AND value=?",
                        [link, key, value]
                    );
                }));
            } else {
                await this.query("DELETE FROM page_info WHERE link=? AND keyString=?", [link, key]);
            }
        } else {
            await this.query("DELETE FROM page_info WHERE link=?", link);
        }
    }

    public async queueNewTocs(): Promise<void> {
        throw Error("not supported");
    }

    public async getInvalidated(uuid: string): Promise<Invalidation[]> {
        const result: any[] = await this.query("SELECT * FROM user_data_invalidation WHERE uuid=?", uuid);
        await this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => {
            console.log(reason);
            logger.error(reason);
        });
        return result.map((value: any): Invalidation => {
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

    public async getInvalidatedStream(uuid: string): Promise<Query> {
        return this.queryStream(
            "SELECT " +
            "external_list_id as externalListId, external_uuid as externalUuid, medium_id as mediumId, " +
            "part_id as partId, episode_id as episodeId, user_uuid as userUuid," +
            "list_id as listId, news_id as newsId, uuid " +
            "FROM user_data_invalidation WHERE uuid=?",
            uuid
        ).on("end", () => {
            this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => {
                console.log(reason);
                logger.error(reason);
            });
        });
    }

    public clearInvalidationTable() {
        return this.query("TRUNCATE user_data_invalidation");
    }

    /**
     *
     * @param query
     * @param parameter
     */
    public query(query: string, parameter?: any | any[]): Promise<any> {
        if (query.length > 20) {
            // console.log(query.replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 80));
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
    public async delete(table: string, ...condition: Array<{ column: string, value: any }>): Promise<boolean> {
        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        let query = `DELETE FROM ${mySql.escapeId(table)} WHERE `;
        const values: any[] = [];

        multiSingle(condition, (value: any, _, last) => {
            query += `${mySql.escapeId(value.column)} = ?`;
            if (last) {
                query += ";";
            } else {
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
    public async update(table: string, cb: UpdateCallback, ...condition: Array<{ column: string, value: any }>)
        : Promise<boolean> {

        if (!condition || (Array.isArray(condition) && !condition.length)) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const updates: string[] = [];
        const values: any[] = [];

        cb(updates, values);

        if (!updates.length) {
            return Promise.resolve(false);
        }
        let query = `UPDATE ${mySql.escapeId(table)}
                SET ${updates.join(", ")}
                WHERE `;
        multiSingle(condition, (value: any, _, last) => {
            query += `${mySql.escapeId(value.column)} = ?`;
            if (last) {
                query += ";";
            } else {
                query += " AND ";
            }
            values.push(value.value);
        });
        const result = await this.query(query, values);
        return result.affectedRows > 0;
    }

    public multiInsert<T>(query: string, value: T | T[], paramCallback: ParamCallback<T>): Promise<any> {
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
        const param: any[] = [];

        // @ts-ignore
        multiSingle(value, (item: T, index, lastItem) => {
            const items = paramCallback(item);
            if (Array.isArray(items)) {
                param.push(...items);
            } else {
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

    public async queryInList<T>(query: string, value: T | T[], afterQuery?: string, paramCallback?: ParamCallback<T>)
        : Promise<any[] | undefined> {

        if (Array.isArray(value)) {
            if (!value.length) {
                return [];
            }
        } else if (!value) {
            return;
        }
        if (Array.isArray(value) && value.length > 100) {
            return this._batchFunction(
                value,
                query,
                paramCallback,
                // @ts-ignore
                (q, v, p) => this.queryInList(q, v, afterQuery, p)
            );
        }
        const placeholders: string[] = [];
        const param: any[] = [];
        // @ts-ignore
        multiSingle(value, (item: T) => {
            if (paramCallback) {
                const items = paramCallback(item);

                if (Array.isArray(items)) {
                    param.push(...items);
                } else {
                    param.push(items);
                }
            } else {
                param.push(item);
            }
            placeholders.push("?");
        });
        if (!param.length) {
            throw Error(`no params for '${query}'`);
        }
        return this.query(`${query} IN (${placeholders.join(",")}) ${afterQuery ? afterQuery : ""};`, param);
    }

    public queryStream(query: string, parameter?: any | any[]): Query {
        if (query.length > 20) {
            // console.log(query, (parameter + "").replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 30));
        }
        return this.con.queryStream(query, parameter);
    }

    // noinspection JSMethodCanBeStatic
    private async _batchFunction<T>(value: T[], query: string, paramCallback: ParamCallback<T> | undefined,
                                    func:
                                        (query: string, values: T[], paramCallback?: ParamCallback<T>) => Promise<any[]>
    ): Promise<any[]> {

        const length = value.length;
        const resultsPromises = [];

        const batchLimit = 100;

        for (let i = 0; i < length; i += batchLimit) {
            let subList: T[];
            if (length < batchLimit) {
                subList = value.slice(i, length);
            } else {
                subList = value.slice(i, i + batchLimit);
            }
            resultsPromises.push(func(query, subList, paramCallback));
        }
        const results = await Promise.all(resultsPromises);
        return results.flat();
    }
}
