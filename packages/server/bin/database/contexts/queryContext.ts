import mySql, { Connection } from "promise-mysql";
import {
  Invalidation,
  MetaResult,
  Result,
  Uuid,
  EmptyPromise,
  MultiSingleValue,
  Nullable,
  UnpackArray,
  PromiseMultiSingle,
  Optional,
  PageInfo,
  Primitive,
  DataStats,
  NewData,
} from "../../types";
import { Errors, getElseSet, getElseSetObj, ignore, multiSingle, promiseMultiSingle, batch } from "../../tools";
import logger from "../../logger";
import * as validate from "validate.js";
import { Query, OkPacket } from "mysql";
import { DatabaseContext } from "./databaseContext";
import { UserContext } from "./userContext";
import { ExternalUserContext } from "./externalUserContext";
import { InternalListContext } from "./internalListContext";
import { ExternalListContext } from "./externalListContext";
import { NewsContext } from "./newsContext";
import { EpisodeContext } from "./episodeContext";
import { MediumContext } from "./mediumContext";
import { PartContext } from "./partContext";
import { JobContext } from "./jobContext";
import { MediumInWaitContext } from "./mediumInWaitContext";
import { ConnectionContext } from "../databaseTypes";
import env from "../../env";
import { setContext, removeContext } from "../../asyncStorage";
import { storeCount } from "../sqlTools";
import { ScraperHookContext } from "./scraperHookContext";
import { AppEventContext } from "./appEventContext";

const database = "enterprise";

type ParamCallback<T> = (value: UnpackArray<T>) => any[] | any;
type UpdateCallback = (updates: string[], values: any[]) => void | EmptyPromise;
export type SqlPrimitive = Primitive | Date;
export type QueryValue = SqlPrimitive | SqlPrimitive[];
export type QueryInValue = SqlPrimitive | Array<SqlPrimitive | SqlPrimitive[]>;

export interface DbTrigger {
  Trigger: string;
  Event: string;
  Timing: string;
  Table: string;
}

export interface Condition {
  column: string;
  value: any;
}

function emptyPacket() {
  return {
    affectedRows: 0,
    changedRows: 0,
    fieldCount: 0,
    insertId: 0,
    message: "Not queried",
    protocol41: false,
  };
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
  // tslint:disable-next-line:variable-name
  private _scraperHookContext?: ScraperHookContext;
  // tslint:disable-next-line:variable-name
  private _appEventContext?: AppEventContext;

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

  public get scraperHookContext(): ScraperHookContext {
    return this._scraperHookContext
      ? this._scraperHookContext
      : (this._scraperHookContext = new ScraperHookContext(this));
  }

  public get appEventContext(): AppEventContext {
    return this._appEventContext ? this._appEventContext : (this._appEventContext = new AppEventContext(this));
  }

  public constructor(con: Connection) {
    this.con = con;
  }

  /**
   *
   */
  public startTransaction(): EmptyPromise {
    return this.query("START TRANSACTION;").then(ignore);
  }

  /**
   *
   */
  public commit(): EmptyPromise {
    return this.query("COMMIT;").then(ignore);
  }

  /**
   *
   */
  public rollback(): EmptyPromise {
    return this.query("ROLLBACK;").then(ignore);
  }

  /**
   * Checks the database for incorrect structure
   * and tries to correct these.
   */
  public async start(): EmptyPromise {
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

  public processResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    if (!result.preliminary) {
      return Promise.reject(new Error(Errors.INVALID_INPUT));
    }
    return promiseMultiSingle(result.result, async (value: MetaResult) => {
      const resultArray: any[] = await this.query(
        "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)",
        [value.novel, value.chapter, value.chapIndex],
      );
      if (resultArray[0] && resultArray[0].episode_id != null) {
        return null;
      }
      // TODO implement
      return value;
    });
  }

  public saveResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    if (!result.preliminary) {
      return Promise.reject(new Error(Errors.INVALID_INPUT));
    }
    return promiseMultiSingle(result.result, async (value) => {
      if (!result.accept) {
        return null;
      }
      // if there is a title, search a medium which matches

      // TODO implement
      return value;
    });
  }

  public async getPageInfo(link: string, key: string): Promise<PageInfo> {
    if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    const query: any[] = await this.query("SELECT value FROM page_info WHERE link=? AND keyString=?", [link, key]);
    return {
      link,
      key,
      values: query.map((value) => value.value).filter((value) => value),
    };
  }

  public async updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    await this.removePageInfo(link, key, toDeleteValues);

    await Promise.all(
      values.map((value) => {
        if (!value || !validate.isString(value)) {
          throw Errors.INVALID_INPUT;
        }
        return this.query("INSERT INTO page_info (link, keyString, value) VALUES(?,?,?)", [link, key, value]);
      }),
    );
  }

  public async removePageInfo(link: string, key?: string, toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || (key && !validate.isString(key))) {
      return Promise.reject(Errors.INVALID_INPUT);
    }
    if (key) {
      if (toDeleteValues) {
        await Promise.all(
          toDeleteValues.map((value) => {
            if (!value || !validate.isString(value)) {
              throw Errors.INVALID_INPUT;
            }
            // TODO: 29.06.2019 use 'value IN (list)'
            return this.query("DELETE FROM page_info WHERE link=? AND keyString=? AND value=?", [link, key, value]);
          }),
        );
      } else {
        await this.query("DELETE FROM page_info WHERE link=? AND keyString=?", [link, key]);
      }
    } else {
      await this.query("DELETE FROM page_info WHERE link=?", link);
    }
  }

  public async queueNewTocs(): EmptyPromise {
    throw Error("not supported");
  }

  public async getInvalidated(uuid: Uuid): Promise<Invalidation[]> {
    const result: any[] = await this.query("SELECT * FROM user_data_invalidation WHERE uuid=?", uuid);
    await this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => logger.error(reason));
    return result.map(
      (value: any): Invalidation => {
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
      },
    );
  }

  public async getInvalidatedStream(uuid: Uuid): Promise<Query> {
    return this.queryStream(
      "SELECT " +
        "external_list_id as externalListId, external_uuid as externalUuid, medium_id as mediumId, " +
        "part_id as partId, episode_id as episodeId, user_uuid as userUuid," +
        "list_id as listId, news_id as newsId, uuid " +
        "FROM user_data_invalidation WHERE uuid=?",
      uuid,
    ).on("end", () => {
      this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => logger.error(reason));
    });
  }

  public clearInvalidationTable(): EmptyPromise {
    return this.query("TRUNCATE user_data_invalidation");
  }

  /**
   *
   * @param query
   * @param parameter
   */
  public async query(query: string, parameter?: any | any[]): Promise<any> {
    if (query.length > 20 && env.development) {
      logger.debug(query.replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 80));
    }
    let result;
    try {
      setContext("sql-query");
      result = await this.con.query(query, parameter);
      storeCount("queryCount");
    } finally {
      removeContext("sql-query");
    }

    if (Array.isArray(result) && result.length > 1000) {
      logger.debug(`${result.length} Results for ${query}`);
    }
    return result;
  }

  /**
   * Convenience function for correct return type.
   * Should only be used for data manipulation queries like INSERT, UPDATE, DELETE.
   *
   * @param query sql query
   * @param parameter parameter for the sql query
   */
  public async dmlQuery(query: string, parameter?: any | any[]): Promise<OkPacket> {
    return this.query(query, parameter);
  }

  /**
   * Deletes one or multiple entries from one specific table,
   * with only one conditional.
   */
  public async delete(table: string, ...condition: Condition[]): Promise<OkPacket> {
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

    return this.query(query, values);
  }

  /**
   * Updates data from the storage.
   * May return a empty OkPacket if no values are to be updated.
   */
  public async update(table: string, cb: UpdateCallback, ...condition: Condition[]): Promise<OkPacket> {
    if (!condition || (Array.isArray(condition) && !condition.length)) {
      return Promise.reject(new Error(Errors.INVALID_INPUT));
    }
    const updates: string[] = [];
    const values: any[] = [];

    const updatePromise = cb(updates, values);
    if (updatePromise && updatePromise.then) {
      await updatePromise;
    }

    if (!updates.length) {
      return Promise.resolve(emptyPacket());
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
    return this.query(query, values);
  }

  public multiInsert<T extends MultiSingleValue<any>>(
    query: string,
    value: T,
    paramCallback: ParamCallback<T>,
  ): PromiseMultiSingle<T, OkPacket> {
    if (!value || (Array.isArray(value) && !value.length)) {
      return Promise.resolve(Array.isArray(value) ? [] : emptyPacket()) as any;
    }
    if (Array.isArray(value) && value.length > 100) {
      return this._batchFunction(
        value,
        query,
        paramCallback,
        // @ts-expect-error
        (q, v, p) => this.multiInsert(q, v, p) as Promise<OkPacket[]>,
      ) as any;
    }
    let valuesQuery = "";
    let valuesQueries = "";
    let paramCount = -1;
    const param: any[] = [];

    multiSingle(value, (item, index, lastItem) => {
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

  /**
   * Expects either a primitive value or a list of primitive values and at most one list of primitive values.
   * Currently it does a simple String Search for the List Placeholder '??' (instead the normal sql one '?'),
   * so one needs to take care of not using a '??' string in the sql query itself, use parameter.
   *
   * Example:
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? AND setting IN ?? ORDER BY date;",
   *     [1, [1,2,3,4,5,6,7]]
   * ) // normal query
   *
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? ORDER BY date;",
   *     [1] // or only 1
   * ) // normal query
   *
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? AND setting IN ?? ORDER BY date;",
   *     [1, []]
   * ) // no nested list values, return an empty list by default
   *
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? AND setting IN ?? ORDER BY date;",
   *     undefined
   * ) // no value given returns an empty list by default
   *
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? AND setting IN ?? ORDER BY date;",
   *     [1, 1,2,3,4,5,6,7]
   * ) // list placeholder '??' is present but no nested list results in a thrown error
   *
   * queryInList(
   *     "SELECT * FROM example_table WHERE id = ? AND setting IN ?? AND value IN ?? ORDER BY date;",
   *     [1, [1,2,3,4,5],[6,7]]
   * ) // multiple list placeholder '??' are present but currently not allowd and results in a thrown error
   *
   * @param query the sql query string
   * @param value placeholder values
   */
  public async queryInList(query: string, value: QueryInValue): Promise<any[]> {
    if (!value || (Array.isArray(value) && !value.length)) {
      return [];
    }

    if (!Array.isArray(value)) {
      value = [value];
    }
    const placeHolderValues = value;

    const listPlaceholderIndex = query.indexOf("??");

    if (listPlaceholderIndex !== query.lastIndexOf("??")) {
      throw Error("Invalid Query: multiple Listplaceholder are currently not allowed");
    }
    const params: Array<[string, any[]]> = [];
    const listParams = placeHolderValues
      .map((param, index) => (Array.isArray(param) ? [param, index] : undefined))
      .filter((v) => v) as Array<[any[], number]>;

    if (listParams.length > 1) {
      throw Error("Using multiple ListParams is not supported");
    }
    if (listParams.length) {
      const [listParam, index] = listParams[0];

      if (!listParam.length) {
        return [];
      }
      batch(listParam, 100).forEach((param: any[]) => {
        const values = [
          // placeholder values before the listParam
          ...placeHolderValues.slice(0, index),
          ...param,
          // placeholder values after the listParam, is empty if index + 1 is greater than the array
          ...placeHolderValues.slice(index + 1),
        ];
        const placeholder = "?,".repeat(param.length).slice(0, -1);
        params.push([placeholder, values]);
      });
    } else {
      // if no listParam was found, it is used with a primitive value if that index exists
      const placeholder = listPlaceholderIndex < 0 ? "" : "?";
      params.push([placeholder, placeHolderValues]);
    }
    if (!params.length) {
      throw Error(`no params for '${query}'`);
    }
    const result: any[][] = await Promise.all(
      params.map((param) => {
        const [placeholder, values] = param;
        const newQuery = query.replace("??", placeholder);
        return this.query(newQuery, values);
      }),
    );
    return result.flat(1);
  }

  public queryStream(query: string, parameter?: any | any[]): Query {
    if (query.length > 20 && env.development) {
      logger.debug(`${query} - ${(parameter + "").replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 30)}`);
    }
    return this.con.queryStream(query, parameter);
  }

  public async getNew(uuid: Uuid, date = new Date(0)): Promise<NewData> {
    const episodeReleasePromise = this.query(
      "SELECT episode_id as episodeId, title, url, releaseDate, locked " + "FROM episode_release WHERE updated_at > ?",
      date,
    );
    const episodePromise = this.query(
      "SELECT id, part_id as partId, totalIndex, partialIndex, " +
        "user_episode.progress, user_episode.read_date as readDate " +
        "FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id " +
        "WHERE (user_episode.user_uuid IS NULL OR user_episode.user_uuid = ?) " +
        "AND (updated_at > ? OR read_date > ?)",
      [uuid, date, date],
    );
    const partPromise = this.query(
      "SELECT id, title, medium_id as mediumId, totalIndex, partialIndex FROM part WHERE updated_at > ?",
      date,
    );
    const mediumPromise = this.query(
      "SELECT id, countryOfOrigin, languageOfOrigin, author, artist, title, " +
        "medium, lang, stateOrigin, stateTL, series, universe " +
        "FROM medium WHERE updated_at > ?",
      date,
    );
    const listPromise = this.query("SELECT id, name, medium FROM reading_list WHERE user_uuid=? AND updated_at > ?", [
      uuid,
      date,
    ]);
    const exListPromise = this.query(
      "SELECT list.id, list.name, list.user_uuid as uuid, list.medium, list.url " +
        "FROM external_user INNER JOIN external_reading_list as list ON uuid=user_uuid " +
        "WHERE local_uuid=? AND list.updated_at > ?",
      [uuid, date],
    );
    const exUserPromise = this.query(
      "SELECT name as identifier, uuid, service as type, local_uuid as localUuid " +
        "FROM external_user WHERE local_uuid = ? AND updated_at > ?",
      [uuid, date],
    );
    const mediumInWaitPromise = this.query("SELECT title, medium, link FROM medium_in_wait WHERE updated_at > ?", date);
    const newsPromise = this.query(
      "SELECT id, title, link, date, CASE WHEN user_id IS NULL THEN 0 ELSE 1 END as `read` " +
        "FROM news_board LEFT JOIN news_user ON id=news_id " +
        "WHERE (user_id IS NULL OR user_id = ?) AND updated_at > ?",
      [uuid, date],
    );
    const tocPromise = this.query(
      "SELECT id, medium_id as mediumId, link, " +
        "countryOfOrigin, languageOfOrigin, author, title," +
        "medium, artist, lang, stateOrigin, stateTL, series, universe " +
        "FROM medium_toc WHERE updated_at > ?",
      date,
    );
    return {
      tocs: await tocPromise,
      media: await mediumPromise,
      releases: await episodeReleasePromise,
      episodes: await episodePromise,
      parts: await partPromise,
      lists: await listPromise,
      extLists: await exListPromise,
      extUser: await exUserPromise,
      mediaInWait: await mediumInWaitPromise,
      news: await newsPromise.then((values: any[]) => {
        values.forEach((value) => (value.read = value.read === 1));
        return values;
      }),
    };
  }

  public async getStat(uuid: Uuid): Promise<DataStats> {
    const episodePromise = this.query(
      "SELECT part_id, count(distinct episode.id) as episodeCount, sum(distinct episode.id) as episodeSum, count(url) as releaseCount " +
        "FROM episode LEFT JOIN episode_release ON episode.id=episode_release.episode_id " +
        "GROUP BY part_id",
    );
    const partPromise = this.query("SELECT part.id, medium_id FROM part ");
    const listPromise = this.query(
      "SELECT id, medium_id FROM reading_list LEFT JOIN list_medium ON reading_list.id=list_id WHERE user_uuid=?",
      uuid,
    );
    const exListPromise = this.query(
      "SELECT id, medium_id FROM external_user INNER JOIN external_reading_list ON uuid=user_uuid LEFT JOIN external_list_medium ON external_reading_list.id=list_id WHERE local_uuid=?",
      uuid,
    );
    const extUserPromise = this.query(
      "SELECT uuid, id FROM external_user LEFT JOIN external_reading_list ON uuid=user_uuid WHERE local_uuid=?",
      uuid,
    );
    const tocPromise: Promise<Array<{ medium_id: number; count: number }>> = this.query(
      "SELECT medium_id, count(link) as count FROM medium_toc GROUP BY medium_id;",
    );

    const tocs = await tocPromise;
    const parts = await partPromise;
    const episodes = await episodePromise;
    const emptyPart = { episodeCount: 0, episodeSum: 0, releaseCount: 0 };
    const partMap = new Map();

    for (const episode of episodes) {
      partMap.set(episode.part_id, episode);
      delete episode.part_id;
    }
    const media = {};
    const mediaStats = {};
    const lists = {};
    const extLists = {};
    const extUser = {};

    for (const toc of tocs) {
      const medium = getElseSetObj(mediaStats, toc.medium_id, () => {
        return {
          tocs: 0,
        };
      });
      medium.tocs = toc.count;
    }

    for (const part of parts) {
      const mediumParts: any = getElseSetObj(media, part.medium_id, () => new Object());
      mediumParts[part.id] = getElseSet(partMap, part.id, () => emptyPart);
    }

    for (const list of await listPromise) {
      const listMedia: number[] = getElseSetObj(lists, list.id, () => []);
      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const list of await exListPromise) {
      const listMedia: number[] = getElseSetObj(extLists, list.id, () => []);

      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const user of await extUserPromise) {
      const userLists: number[] = getElseSetObj(extUser, user.uuid, () => []);
      userLists.push(user.id);
    }
    return {
      media,
      mediaStats,
      lists,
      extLists,
      extUser,
    };
  }

  private async _batchFunction<T>(
    value: T[],
    query: string,
    paramCallback: Optional<ParamCallback<T>>,
    func: (query: string, values: T[], paramCallback?: ParamCallback<T>) => Promise<any[]>,
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
