import {
  Invalidation,
  MetaResult,
  Result,
  Uuid,
  EmptyPromise,
  MultiSingleValue,
  Nullable,
  UnpackArray,
  Optional,
  PageInfo,
  Primitive,
  DataStats,
  NewData,
  QueryItems,
  QueryItemsResult,
} from "../../types";
import { getElseSet, getElseSetObj, multiSingle, promiseMultiSingle, batch, jsonReplacer } from "../../tools";
import logger from "../../logger";
import * as validate from "validate.js";
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
import { setContext, removeContext, StoreKey } from "../../asyncStorage";
import { storeCount } from "../sqlTools";
import { ScraperHookContext } from "./scraperHookContext";
import { AppEventContext } from "./appEventContext";
import { CustomHookContext } from "./customHookContext";
import { DatabaseError, NotImplementedError, UnsupportedError, ValidationError } from "../../error";
import { NotificationContext } from "./notificationContext";
import { ClientBase, QueryResult } from "pg";
import QueryStream from "pg-query-stream";
import winston, { format } from "winston";

const database = "enterprise";

type ParamCallback<T> = (value: UnpackArray<T>) => any[] | any;
type UpdateCallback = (updates: string[], values: any[]) => undefined | EmptyPromise;
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

function emptyPacket(): QueryResult<any> {
  return {
    command: "",
    fields: [],
    oid: 0,
    rowCount: 0,
    rows: [],
  };
}

function validateQuery(query: string, parameter: any | any[]): [string, any[]] {
  // replace the generic `?` placeholder with the correct indexed `$1` placeholder for pg package
  let index = 1;
  query = query.replaceAll("?", () => `$${index++}`);

  if (parameter != null && !Array.isArray(parameter)) {
    parameter = [parameter];
  }

  if (parameter ? parameter.length !== index - 1 : index !== 1) {
    throw new DatabaseError(
      `placeholder - parameter mismatch: ${index - 1} Placeholders but ${
        (parameter?.length ?? 0) + ""
      } Parameter: ${query}`,
    );
  }
  return [query, parameter];
}

const queryLogger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: "info",
  format: format.combine(format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), format.json({ replacer: jsonReplacer })),
  transports: [
    new winston.transports.File({
      filename: "logs/postgres.log",
    }),
  ],
});

/**
 * A Class for consecutive queries on the same connection.
 */
export class QueryContext implements ConnectionContext {
  private readonly con: ClientBase;
  private readonly subClassMap: Map<new (parentContext: QueryContext) => any, any> = new Map();

  private getSubInstanceLazy<T>(constructor: new (parentContext: QueryContext) => T): T {
    return getElseSet(this.subClassMap, constructor, () => new constructor(this));
  }

  public get databaseContext(): DatabaseContext {
    return this.getSubInstanceLazy(DatabaseContext);
  }

  public get userContext(): UserContext {
    return this.getSubInstanceLazy(UserContext);
  }

  public get partContext(): PartContext {
    return this.getSubInstanceLazy(PartContext);
  }

  public get mediumContext(): MediumContext {
    return this.getSubInstanceLazy(MediumContext);
  }

  public get episodeContext(): EpisodeContext {
    return this.getSubInstanceLazy(EpisodeContext);
  }

  public get newsContext(): NewsContext {
    return this.getSubInstanceLazy(NewsContext);
  }

  public get externalListContext(): ExternalListContext {
    return this.getSubInstanceLazy(ExternalListContext);
  }

  public get externalUserContext(): ExternalUserContext {
    return this.getSubInstanceLazy(ExternalUserContext);
  }

  public get internalListContext(): InternalListContext {
    return this.getSubInstanceLazy(InternalListContext);
  }

  public get jobContext(): JobContext {
    return this.getSubInstanceLazy(JobContext);
  }

  public get mediumInWaitContext(): MediumInWaitContext {
    return this.getSubInstanceLazy(MediumInWaitContext);
  }

  public get scraperHookContext(): ScraperHookContext {
    return this.getSubInstanceLazy(ScraperHookContext);
  }

  public get appEventContext(): AppEventContext {
    return this.getSubInstanceLazy(AppEventContext);
  }

  public get customHookContext(): CustomHookContext {
    return this.getSubInstanceLazy(CustomHookContext);
  }

  public get notificationContext(): NotificationContext {
    return this.getSubInstanceLazy(NotificationContext);
  }

  public constructor(con: ClientBase) {
    this.con = con;
  }

  public escapeIdentifier(str: string) {
    return this.con.escapeIdentifier(str);
  }

  private isAborted = false;

  public markAborted() {
    this.isAborted = true;
  }

  public aborted() {
    return this.isAborted;
  }

  /**
   *
   */
  public async startTransaction(): EmptyPromise {
    await this.query("START TRANSACTION;");
  }

  /**
   *
   */
  public async commit(): EmptyPromise {
    await this.query("COMMIT;");
  }

  /**
   *
   */
  public async rollback(): EmptyPromise {
    await this.query("ROLLBACK;");
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
    return databases.rows.find((data: { Database: string }) => data.Database === database) != null;
  }

  public processResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    if (!result.preliminary) {
      return Promise.reject(new ValidationError("Invalid Result: missing preliminary value"));
    }
    return promiseMultiSingle(result.result, async (value: MetaResult) => {
      const resultArray = await this.query(
        "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)",
        [value.novel, value.chapter, value.chapIndex],
      );
      if (resultArray.rows[0]?.episode_id != null) {
        return null;
      }
      // TODO implement
      return value;
    });
  }

  public saveResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    if (!result.preliminary) {
      return Promise.reject(new ValidationError("Invalid Result: missing preliminary value"));
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
      throw new ValidationError("invalid link or key");
    }
    const query = await this.query("SELECT value FROM page_info WHERE link=? AND keyString=?", [link, key]);
    return {
      link,
      key,
      values: query.rows.map((value) => value.value).filter((value) => value),
    };
  }

  public async updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
      throw new ValidationError("invalid link or key");
    }
    await this.removePageInfo(link, key, toDeleteValues);

    await Promise.all(
      values.map((value) => {
        if (!value || !validate.isString(value)) {
          throw new TypeError("value is not a string: " + typeof value);
        }
        return this.query("INSERT INTO page_info (link, keyString, value) VALUES(?,?,?)", [link, key, value]);
      }),
    );
  }

  public async removePageInfo(link: string, key?: string, toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || (key && !validate.isString(key))) {
      throw new ValidationError("invalid link or key");
    }
    if (key) {
      if (toDeleteValues) {
        await Promise.all(
          toDeleteValues.map((value) => {
            if (!value || !validate.isString(value)) {
              throw new ValidationError("value not a string: " + typeof value);
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
    throw new NotImplementedError("queueNewTocs not supported");
  }

  public async getInvalidated(uuid: Uuid): Promise<Invalidation[]> {
    const result = await this.query("SELECT * FROM user_data_invalidation WHERE uuid=?", uuid);
    await this.query("DELETE FROM user_data_invalidation WHERE uuid=?;", uuid).catch((reason) => logger.error(reason));
    return result.rows.map((value: any): Invalidation => {
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

  public async getInvalidatedStream(uuid: Uuid): Promise<QueryStream> {
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

  public async clearInvalidationTable(): EmptyPromise {
    await this.query("TRUNCATE user_data_invalidation");
  }

  /**
   *
   * @param query
   * @param parameter
   */
  public async query(query: string, parameter?: any | any[]): Promise<QueryResult<any>> {
    [query, parameter] = validateQuery(query, parameter);

    if (env.development) {
      logger.debug(query.replace(/\n+/g, "").replace(/\s+/g, " "));
    }
    const start = Date.now();
    let result;
    try {
      setContext("sql-query");
      result = await this.con.query(query, parameter);
      storeCount(StoreKey.QUERY_COUNT);
    } catch (e) {
      console.log(e);
      throw e;
    } finally {
      removeContext("sql-query");
      queryLogger.info({
        message: query,
        duration: Date.now() - start,
      });
    }

    if (Array.isArray(result) && result.length > 10) {
      logger.debug(`[${Date.now() - start}ms] ${result.length} Results for ${query} - Parameter: '${parameter + ""}'`);
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
  public async dmlQuery(query: string, parameter?: any | any[]): Promise<QueryResult<any>> {
    return this.query(query, parameter);
  }

  /**
   * Deletes one or multiple entries from one specific table,
   * with only one conditional.
   */
  public async delete(table: string, ...condition: Condition[]): Promise<QueryResult<any>> {
    if (!condition || (Array.isArray(condition) && !condition.length)) {
      return Promise.reject(new ValidationError("Invalid delete condition"));
    }
    let query = `DELETE FROM ${this.escapeIdentifier(table)} WHERE `;
    const values: any[] = [];

    multiSingle(condition, (value: any, _, last) => {
      query += `${this.escapeIdentifier(value.column)} = ?`;
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
  public async update(table: string, cb: UpdateCallback, ...condition: Condition[]): Promise<QueryResult<any>> {
    if (!condition || (Array.isArray(condition) && !condition.length)) {
      return Promise.reject(new ValidationError("Invalid update condition"));
    }
    const updates: string[] = [];
    const values: any[] = [];

    const updatePromise = cb(updates, values);
    if (updatePromise) {
      await updatePromise;
    }

    if (!updates.length) {
      return Promise.resolve(emptyPacket());
    }
    let query = `UPDATE ${this.escapeIdentifier(table)}
                SET ${updates.join(", ")}
                WHERE `;
    multiSingle(condition, (value: any, _, last) => {
      query += `${this.escapeIdentifier(value.column)} = ?`;
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
    ignore = false,
  ): Promise<QueryResult<any>> {
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

    multiSingle(value, (item, _index, lastItem) => {
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
    return this.query(`${query} ${valuesQueries}${ignore ? " ON CONFLICT DO NOTHING" : ""};`, param);
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
      throw new UnsupportedError("Invalid Query: multiple Listplaceholder are currently not allowed");
    }
    const params: Array<[string, any[]]> = [];
    const listParams = placeHolderValues
      .map((param, index) => (Array.isArray(param) ? [param, index] : undefined))
      .filter((v) => v) as Array<[any[], number]>;

    if (listParams.length > 1) {
      throw new UnsupportedError("Using multiple ListParams is not supported");
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
      throw new DatabaseError(`no params for '${query}'`);
    }
    const result: Array<QueryResult<any>> = await Promise.all(
      params.map((param) => {
        const [placeholder, values] = param;
        const newQuery = query.replace("??", placeholder);
        return this.query(newQuery, values);
      }),
    );
    return result.reduce<any[]>((previous: any[], current) => {
      previous.push(...current.rows);
      return previous;
    }, []);
  }

  public queryStream(query: string, parameter?: any | any[]): QueryStream {
    [query, parameter] = validateQuery(query, parameter);

    if (env.development) {
      logger.debug(`${query} - ${(parameter + "").replace(/\n+/g, "").replace(/\s+/g, " ").substring(0, 30)}`);
    }

    const start = Date.now();
    const stream = new QueryStream(query, parameter);
    stream.on("end", () => {
      queryLogger.info({
        message: query,
        duration: Date.now() - start,
      });
    });
    return this.con.query(stream);
  }

  public async getNew(uuid: Uuid, date = new Date(0)): Promise<NewData> {
    const episodeReleasePromise = this.query(
      "SELECT episode_id as episodeId, title, url, releaseDate, locked, toc_id as tocId " +
        "FROM episode_release WHERE updated_at > ?",
      date,
    );
    const episodePromise = this.query(
      "SELECT episode.id, part_id as partId, totalIndex, partialIndex, " +
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
      "SELECT id, title, link, date, CASE WHEN user_id IS NULL THEN 0 ELSE 1 END as read " +
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
      tocs: (await tocPromise).rows,
      media: (await mediumPromise).rows,
      releases: (await episodeReleasePromise).rows,
      episodes: (await episodePromise).rows,
      parts: (await partPromise).rows,
      lists: (await listPromise).rows,
      extLists: (await exListPromise).rows,
      extUser: (await exUserPromise).rows,
      mediaInWait: (await mediumInWaitPromise).rows,
      news: await newsPromise.then((result) => {
        result.rows.forEach((value) => (value.read = value.read === 1));
        return result.rows;
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
    const tocPromise: Promise<QueryResult<{ medium_id: number; count: number }>> = this.query(
      "SELECT medium_id, count(link) as count FROM medium_toc GROUP BY medium_id;",
    );

    const tocs = await tocPromise;
    const parts = await partPromise;
    const episodes = await episodePromise;
    const emptyPart = { episodeCount: 0, episodeSum: 0, releaseCount: 0 };
    const partMap = new Map();

    for (const episode of episodes.rows) {
      partMap.set(episode.part_id, episode);
      delete episode.part_id;
    }
    const media = {};
    const mediaStats = {};
    const lists = {};
    const extLists = {};
    const extUser = {};

    for (const toc of tocs.rows) {
      const medium = getElseSetObj(mediaStats, toc.medium_id, () => {
        return {
          tocs: 0,
        };
      });
      medium.tocs = toc.count;
    }

    for (const part of parts.rows) {
      const mediumParts: any = getElseSetObj(media, part.medium_id, () => ({}));
      mediumParts[part.id] = getElseSet(partMap, part.id, () => emptyPart);
    }

    for (const list of (await listPromise).rows) {
      const listMedia: number[] = getElseSetObj(lists, list.id, () => []);
      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const list of (await exListPromise).rows) {
      const listMedia: number[] = getElseSetObj(extLists, list.id, () => []);

      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const user of (await extUserPromise).rows) {
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

  public async queryItems(uuid: Uuid, query: QueryItems): Promise<QueryItemsResult> {
    const [
      externalUser,
      externalMediaLists,
      mediaLists,
      mediaTocs,
      tocs,
      media,
      parts,
      partReleases,
      partEpisodes,
      episodes,
      episodeReleases,
    ] = await Promise.all([
      this.externalUserContext.getExternalUser(query.externalUser),
      Promise.all(query.externalMediaLists.map((id) => this.externalListContext.getExternalList(id))),
      this.internalListContext.getShallowList(query.mediaLists, uuid),
      this.mediumContext.getMediumTocs(query.mediaTocs),
      this.mediumContext.getTocs(query.tocs),
      this.mediumContext.getSimpleMedium(query.media),
      this.partContext.getParts(query.parts, uuid, false),
      this.partContext.getPartReleases(query.partReleases),
      this.partContext.getPartItems(query.partEpisodes),
      this.episodeContext.getEpisode(query.episodes, uuid),
      this.episodeContext.getReleases(query.episodeReleases),
    ]);

    return {
      episodeReleases, // by episode id
      episodes,
      partEpisodes, // by part id
      partReleases, // by part id
      parts,
      media,
      tocs, // by toc id
      mediaTocs, // by medium id
      mediaLists,
      externalMediaLists,
      externalUser,
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
