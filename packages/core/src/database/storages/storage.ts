import env from "../../env";
import { StringKeys, PromiseFunctions, EmptyPromise } from "../../types";
import logger from "../../logger";
import { databaseSchema } from "../databaseSchema";
import { delay, isString } from "../../tools";
import { SchemaManager } from "../schemaManager";
import { ContextCallback, ContextProvider, queryContextProvider } from "./storageTools";
import { ContextConstructor, QueryContext } from "../contexts/queryContext";
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
import { ScraperHookContext } from "../contexts/scraperHookContext";
import { AppEventContext } from "../contexts/appEventContext";
import { CustomHookContext } from "../contexts/customHookContext";
import { DatabaseContext } from "../contexts/databaseContext";
import { DatabaseConnectionError } from "../../error";
import { NotificationContext } from "../contexts/notificationContext";
import { types } from "pg";
import { ClientConfigurationInput, ConnectionOptions, createPool, DatabasePool, stringifyDsn } from "slonik";
import { Readable } from "stream";
import { GenericContext } from "../contexts/genericContext";
import { createFieldNameTransformationInterceptor } from "slonik-interceptor-field-name-transformation";
import { MediumTocContext } from "../contexts/mediumTocContext";
import { EpisodeReleaseContext } from "../contexts/episodeReleaseContext";

// parse float by default
types.setTypeParser(1700, parseFloat);
// parse int8 as normal number instead of bigint
types.setTypeParser(20, parseInt);

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
    return Promise.reject(new DatabaseConnectionError("Not started"));
  }
  if (poolProvider.errorAtStart) {
    return Promise.reject(
      new DatabaseConnectionError("Error occurred while starting Database. Database may not be accessible"),
    );
  }
  if (poolProvider.startPromise) {
    await poolProvider.startPromise;
  }
  const pool = await poolProvider.provide();

  let result;
  try {
    result = await pool.transaction((con) => callback(provider(con)));
  } catch (e) {
    console.log(e);
    throw e;
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

    if (result instanceof Readable) {
      let error = false;
      // TODO: 31.08.2019 returning query object does not allow normal error handling,
      //  maybe return own stream where the control is completely in my own hands
      result
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
    if (transaction) {
      context.markAborted();
    }
    return catchTransactionError(transaction, context, e, attempts, callback);
  }
  return result;
}

type ProviderConfig = ClientConfigurationInput & ConnectionOptions;
type ProviderPool = DatabasePool;

class SqlPoolProvider {
  private remake = true;
  private pool?: Promise<ProviderPool>;
  private config?: ProviderConfig;
  public running = false;
  public errorAtStart = false;
  public startPromise = Promise.resolve();

  public provide(): Promise<ProviderPool> {
    if (!this.pool || this.remake) {
      this.remake = false;
      this.pool = this.createPool();
    }
    return this.pool;
  }

  public recreate() {
    this.remake = true;
    this.errorAtStart = false;
  }

  public useConfig(config: ProviderConfig) {
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
        const database = this.getConfig().databaseName;

        if (!database) {
          this.startPromise = Promise.reject(new Error("No database name defined"));
          return;
        }
        manager.initTableSchema(databaseSchema, database);
        this.startPromise = inContext(
          (context) => manager.checkTableSchema(context.getContext(DatabaseContext)),
          true,
        ).catch((error) => {
          logger.error(error);
          this.errorAtStart = true;
          return Promise.reject(new Error("Database error occurred while starting"));
        });
      } catch (e) {
        this.errorAtStart = true;
        logger.error(e);
        this.startPromise = Promise.reject(new Error("Error in database schema"));
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

  private async createPool(): Promise<ProviderPool> {
    // stop previous pool if available
    if (this.pool) {
      await this.stop();
    }
    const config = this.getConfig();

    return createPool(
      stringifyDsn({
        applicationName: "enterprise",
        databaseName: config.databaseName,
        host: config.host,
        password: config.password,
        port: config.port,
        username: config.username,
      }),
      {
        maximumPoolSize: config.maximumPoolSize,
        interceptors: [
          // transform snake_case columns to camelCase in QueryResult
          createFieldNameTransformationInterceptor({
            format: "CAMEL_CASE",
          }),
          {
            queryExecutionError(_queryContext, query, error, notices) {
              console.log(query, error, notices);
              return null;
            },
            afterQueryExecution(queryContext, query, result) {
              // console.log(queryContext, query, result);
              return null;
            },
          },
        ],
      },
    );
  }

  private defaultConfig(): ProviderConfig {
    return {
      maximumPoolSize: env.dbConLimit,
      host: env.dbHost,
      username: env.dbUser,
      password: env.dbPassword,
      // we assume that the database exists already
      databaseName: "enterprise",
      port: env.dbPort,
    };
  }
}

const poolProvider = new SqlPoolProvider();

class SqlPoolConfigUpdater {
  /**
   * Creates new Mysql Connection ProviderPool with the given Config.
   */
  public update(config: Partial<ProviderConfig>): void {
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

type ContextProxy<T extends QueryContext, K extends StringKeys<T>> = new () => PromiseFunctions<T, K>;

function inContextGeneric<T, C extends QueryContext>(callback: ContextCallback<T, C>, context: ContextConstructor<C>) {
  return storageInContext(callback, (con) => queryContextProvider(con).getContext(context), true);
}

export function ContextProxyFactory<T extends QueryContext, K extends StringKeys<T>>(
  contextConstructor: ContextConstructor<T>,
  omitted: K[],
): ContextProxy<T, K> {
  const hiddenProps: K[] = [...omitted];
  return function ContextProxy() {
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
          return (...args: any[]) => inContextGeneric<any, T>((context) => context[prop](...args), contextConstructor);
        },
      },
    );
  } as unknown as ContextProxy<T, K>;
}

export function SubContextProxyFactory<T extends QueryContext, K extends StringKeys<T> = keyof QueryContext>(
  context: ContextConstructor<T>,
  omitted?: K[],
): ContextProxy<T, K> {
  return ContextProxyFactory<T, K | keyof QueryContext>(context, [
    "commit",
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
export function createStorage<T extends QueryContext, K extends StringKeys<T> = keyof QueryContext>(
  context: ContextConstructor<T>,
): PromiseFunctions<T, K> {
  return new (SubContextProxyFactory<T, K>(context))();
}

export const databaseStorage = createStorage(DatabaseContext);
export const mediumStorage = createStorage(MediumContext);
export const partStorage = createStorage(PartContext);
export const episodeStorage = createStorage(EpisodeContext);
export const newsStorage = createStorage(NewsContext);
export const mediumInWaitStorage = createStorage(MediumInWaitContext);
export const userStorage = createStorage(UserContext);
export const jobStorage = createStorage(JobContext);
export const internalListStorage = createStorage(InternalListContext);
export const externalUserStorage = createStorage(ExternalUserContext);
export const externalListStorage = createStorage(ExternalListContext);
export const hookStorage = createStorage(ScraperHookContext);
export const appEventStorage = createStorage(AppEventContext);
export const customHookStorage = createStorage(CustomHookContext);
export const notificationStorage = createStorage(NotificationContext);
export const episodeReleaseStorage = createStorage(EpisodeReleaseContext);
export const mediumTocStorage = createStorage(MediumTocContext);
export const storage = createStorage(GenericContext);

/**
 *
 */
export const startStorage = (): void => poolProvider.start();

// gets called by gracefulShutdown in exit.ts, after every handler was called, so do not register a handler
export const stopStorage = (): EmptyPromise => poolProvider.stop();

export const waitStorage = (): EmptyPromise => poolProvider.startPromise;
