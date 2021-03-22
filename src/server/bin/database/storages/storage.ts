import mySql from "promise-mysql";
import env from "../../env";
import {
  Invalidation,
  MetaResult,
  Result,
  Uuid,
  PropertyNames,
  StringKeys,
  PromiseFunctions,
  EmptyPromise,
  MultiSingleValue,
  Nullable,
  DataStats,
  NewData,
} from "../../types";
import logger from "../../logger";
import { databaseSchema } from "../databaseSchema";
import { delay, isQuery, isString } from "../../tools";
import { SchemaManager } from "../schemaManager";
import { Query } from "mysql";
import { ContextCallback, ContextProvider, queryContextProvider } from "./storageTools";
import { QueryContext } from "../contexts/queryContext";
import { ConnectionContext } from "../databaseTypes";
import { MysqlServerError } from "../mysqlError";
import { MediumContext } from "../contexts/mediumContext";
import { PartContext } from "../contexts/partContext";
import { EpisodeContext } from "../contexts/episodeContext";
import { NewsContext } from "../contexts/newsContext";
import { MediumInWaitContext } from "../contexts/mediumInWaitContext";
import { UserContext } from "../contexts/userContext";
import { JobContext } from "../contexts/jobContext";
import { InternalListContext } from "../contexts/internalListContext";
import { ExternalUserContext } from "../contexts/externalUserContext";
import { ExternalListContext } from "../contexts/externalListContext";
import { SubContext } from "../contexts/subContext";

function inContext<T>(callback: ContextCallback<T, QueryContext>, transaction = true) {
  return storageInContext(callback, (con) => queryContextProvider(con), transaction);
}

/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export async function storageInContext<T, C extends ConnectionContext>(
  callback: ContextCallback<T, C>,
  provider: ContextProvider<C>,
  transaction = true,
): Promise<T> {
  if (!poolProvider.running) {
    // if inContext is called without Storage being active
    return Promise.reject(new Error("Not started"));
  }
  if (poolProvider.errorAtStart) {
    return Promise.reject(new Error("Error occurred while starting Database. Database may not be accessible"));
  }
  if (poolProvider.startPromise) {
    await poolProvider.startPromise;
  }
  const pool = await poolProvider.provide();
  const con = await pool.getConnection();
  const context = provider(con);

  let result;
  try {
    result = await doTransaction(callback, context, transaction);
  } catch (e) {
    console.log(e);
    throw e;
  } finally {
    if (isQuery(result)) {
      result.on("end", () => con.release());
    } else {
      // release connection into the pool
      con.release();
    }
  }
  return result;
}

async function catchTransactionError<T, C extends ConnectionContext>(
  transaction: boolean,
  context: C,
  e: any,
  attempts: number,
  callback: ContextCallback<T, C>,
) {
  // if it could not be commit due to error, roll back and rethrow error
  if (transaction) {
    // if there is a transaction first rollback and then throw error
    await context.rollback();
  }
  // if it is an deadlock or lock wait timeout error, restart transaction after a delay at max five times
  if (
    (e.errno === MysqlServerError.ER_LOCK_DEADLOCK || e.errno === MysqlServerError.ER_LOCK_WAIT_TIMEOUT) &&
    attempts < 5
  ) {
    await delay(500);
    return doTransaction(callback, context, transaction, attempts + 1);
  } else {
    // if it isn't an deadlock error, or still an deadlock after five attempts, rethrow error
    throw e;
  }
}

async function doTransaction<T, C extends ConnectionContext>(
  callback: ContextCallback<T, C>,
  context: C,
  transaction: boolean,
  attempts = 0,
): Promise<T> {
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

class SqlPoolProvider {
  private remake = true;
  private pool?: Promise<mySql.Pool>;
  private config?: mySql.PoolConfig;
  public running = false;
  public errorAtStart = false;
  public startPromise = Promise.resolve();

  public provide(): Promise<mySql.Pool> {
    if (!this.pool || this.remake) {
      this.remake = false;
      this.pool = this.createPool();
    }
    return this.pool;
  }

  public recreate() {
    this.remake = true;
  }

  public useConfig(config: mySql.PoolConfig) {
    this.config = { ...this.defaultConfig(), ...config };
    this.remake = true;
  }

  public useDefault() {
    // remake only if previously non default config was used
    this.remake = !!this.config;
    this.config = undefined;
  }

  /**
   * Checks the database for incorrect structure
   * and tries to correct these.
   */
  public start(): void {
    if (!this.running) {
      this.running = true;
      try {
        const manager = new SchemaManager();
        const database = this.getConfig().database;

        if (!database) {
          this.startPromise = Promise.reject("No database name defined");
          return;
        }
        manager.initTableSchema(databaseSchema, database);
        this.startPromise = inContext((context) => manager.checkTableSchema(context.databaseContext), true).catch(
          (error) => {
            logger.error(error);
            this.errorAtStart = true;
            return Promise.reject("Database error occurred while starting");
          },
        );
      } catch (e) {
        this.errorAtStart = true;
        logger.error(e);
        this.startPromise = Promise.reject("Error in database schema");
      }
    }
  }

  public async stop(): EmptyPromise {
    if (this.pool) {
      logger.info("Stopping Database");
      this.running = false;
      const pool = await this.pool;
      await pool.end();
      logger.info("Database stopped now");
    } else {
      logger.info("Stopping Database... None running.");
    }
  }

  private getConfig() {
    return this.config || this.defaultConfig();
  }

  private async createPool(): Promise<mySql.Pool> {
    // stop previous pool if available
    if (this.pool) {
      await this.stop();
    }
    const config = this.getConfig();
    return mySql.createPool(config);
  }

  private defaultConfig(): mySql.PoolConfig {
    return {
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
          return field.string() === "1"; // 1 = true, 0 = false
        } else {
          return next();
        }
      },
    };
  }
}

const poolProvider = new SqlPoolProvider();
// poolProvider.provide().catch(console.error);

class SqlPoolConfigUpdater {
  /**
   * Creates new Mysql Connection Pool with the given Config.
   */
  public update(config: Partial<mySql.PoolConfig>): void {
    poolProvider.useConfig(config);
  }

  public async recreate(immediate = false): EmptyPromise {
    poolProvider.recreate();
    if (immediate) {
      await poolProvider.provide();
    }
  }

  public useDefault() {
    poolProvider.useDefault();
  }
}

export const poolConfig = new SqlPoolConfigUpdater();

export class Storage {
  public getPageInfo(link: string, key: string): Promise<{ link: string; key: string; values: string[] }> {
    return inContext((context) => context.getPageInfo(link, key));
  }

  public updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): EmptyPromise {
    return inContext((context) => context.updatePageInfo(link, key, values, toDeleteValues));
  }

  public removePageInfo(link: string, key?: string): EmptyPromise {
    return inContext((context) => context.removePageInfo(link, key));
  }

  public queueNewTocs(): EmptyPromise {
    return inContext((context) => context.queueNewTocs());
  }

  public getStats(uuid: Uuid): Promise<DataStats> {
    return inContext((context) => context.getStat(uuid));
  }

  public getNew(uuid: Uuid, date?: Date): Promise<NewData> {
    return inContext((context) => context.getNew(uuid, date));
  }

  /**
   *
   * @param result
   */
  public processResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    return inContext((context) => context.processResult(result));
  }

  /**
   *
   * @param result
   */
  public saveResult(result: Result): Promise<MultiSingleValue<Nullable<MetaResult>>> {
    return inContext((context) => context.saveResult(result));
  }

  /**
   *
   */
  public getInvalidated(uuid: Uuid): Promise<Invalidation[]> {
    return inContext((context) => context.getInvalidated(uuid));
  }

  /**
   *
   */
  public getInvalidatedStream(uuid: Uuid): Promise<Query> {
    return inContext((context) => context.getInvalidatedStream(uuid));
  }
}

/**
 * Property names of QueryContext whose type extends from SubContext.
 */
type ContextName = PropertyNames<QueryContext, SubContext>;
type ContextProxy<T extends SubContext, K extends StringKeys<T>> = new () => PromiseFunctions<T, K>;

function inContextGeneric<T, C extends SubContext>(callback: ContextCallback<T, C>, context: ContextName) {
  return storageInContext(callback, (con) => (queryContextProvider(con)[context] as unknown) as C, true);
}

export function ContextProxyFactory<T extends SubContext, K extends StringKeys<T>>(
  contextName: ContextName,
  omitted: K[],
): ContextProxy<T, K> {
  const hiddenProps: K[] = [...omitted];
  return (function ContextProxy() {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          // @ts-expect-error
          if (isString(prop) && hiddenProps.includes(prop)) {
            return () => {
              throw TypeError(`Property '${prop}' is not accessible`);
            };
          }
          // @ts-expect-error
          return (...args: any[]) => inContextGeneric<any, T>((context) => context[prop](...args), contextName);
        },
      },
    );
  } as unknown) as ContextProxy<T, K>;
}

export function SubContextProxyFactory<T extends SubContext, K extends StringKeys<T> = keyof SubContext>(
  context: ContextName,
  omitted?: K[],
): ContextProxy<T, K> {
  return ContextProxyFactory<T, K | keyof SubContext>(context, [
    "commit",
    "dmlQuery",
    "parentContext",
    "query",
    "rollback",
    "startTransaction",
    ...(omitted || []),
  ]) as ContextProxy<T, K>;
}

/**
 * Creates a Factory which allows get access only.
 * Always returns a functions creates a valid SubContext instance on every call,
 * executing the requested function on the SubContext Instance.
 *
 * Example:
 * const mediumStorage = createStorage<MediumContext>("mediumContext");
 * mediumStorage.addMedium(...args) // creates a valid MediumContext Instance
 *                                  // and execute 'addMedium(...args)' on it
 *                                  // returning the result
 *
 * This should be treated as a standin for the respective Context Instance
 * which allows restricted access.
 *
 * One should provide the correct SubContext type for the property Name:
 * Instead of:
 *    createStorage<PartContext>("mediumContext") // thinks it is returning PartContext while returning MediumContext
 * use correct type:
 *    createStorage<MediumContext>("mediumContext") // thinks it is returning MediumContext while returning MediumContext
 *
 *
 * @param context the property name on QueryContext
 */
export function createStorage<T extends SubContext, K extends StringKeys<T> = keyof SubContext>(
  context: ContextName,
): PromiseFunctions<T, K> {
  return new (SubContextProxyFactory<T, K>(context))();
}

export const storage = new Storage();
export const mediumStorage = createStorage<MediumContext>("mediumContext");
export const partStorage = createStorage<PartContext>("partContext");
export const episodeStorage = createStorage<EpisodeContext>("episodeContext");
export const newsStorage = createStorage<NewsContext>("newsContext");
export const mediumInWaitStorage = createStorage<MediumInWaitContext>("mediumInWaitContext");
export const userStorage = createStorage<UserContext>("userContext");
export const jobStorage = createStorage<JobContext>("jobContext");
export const internalListStorage = createStorage<InternalListContext>("internalListContext");
export const externalUserStorage = createStorage<ExternalUserContext>("externalUserContext");
export const externalListStorage = createStorage<ExternalListContext>("externalListContext");

/**
 *
 */
export const startStorage = (): void => poolProvider.start();

export const stopStorage = (): EmptyPromise => poolProvider.stop();
