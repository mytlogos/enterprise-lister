import mySql from "promise-mysql";
import env from "../../env";
import {Invalidation, MetaResult, Result, ScrapeItem, User, Uuid} from "../../types";
import logger from "../../logger";
import {databaseSchema} from "../databaseSchema";
import {delay, isQuery} from "../../tools";
import {SchemaManager} from "../schemaManager";
import {Query} from "mysql";
import {ScrapeType} from "../../externals/types";
import {ContextCallback, ContextProvider, queryContextProvider} from "./storageTools";
import {QueryContext} from "../contexts/queryContext";
import {ConnectionContext} from "../databaseTypes";
import {MediumStorage} from "./mediumStorage";
import {ExternalListStorage} from "./externalListStorage";
import {ExternalUserStorage} from "./externalUserStorage";
import {InternalListStorage} from "./internalListStorage";
import {JobStorage} from "./jobStorage";
import {UserStorage} from "./userStorage";
import {MediumInWaitStorage} from "./mediumInWaitStorage";
import {NewsStorage} from "./newsStorage";
import {EpisodeStorage} from "./episodeStorage";
import {PartStorage} from "./partStorage";
import { MysqlServerError } from "../mysqlError";

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
    transaction = true
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
    }
    finally {
        if (isQuery(result)) {
            const query: Query = result;
            query.on("end", () => {
                pool.releaseConnection(con);
            });
        } else {
            // release connection into the pool
            pool.releaseConnection(con);
        }
    }
    return result;
}

async function catchTransactionError<T, C extends ConnectionContext>(
    transaction: boolean,
    context: C,
    e: any,
    attempts: number,
    callback: ContextCallback<T, C>
) {
// if it could not be commit due to error, roll back and rethrow error
    if (transaction) {
        // if there is a transaction first rollback and then throw error
        await context.rollback();
    }
    // if it is an deadlock or lock wait timeout error, restart transaction after a delay at max five times
    if ((e.errno === MysqlServerError.ER_LOCK_DEADLOCK || e.errno === MysqlServerError.ER_LOCK_WAIT_TIMEOUT) && attempts < 5) {
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
    attempts = 0
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
        this.config = {...this.defaultConfig(), ...config};
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
                this.startPromise = inContext(
                    (context) => manager.checkTableSchema(context.databaseContext),
                    true,
                ).catch((error) => {
                    logger.error(error);
                    this.errorAtStart = true;
                    return Promise.reject("Database error occurred while starting");
                });
            } catch (e) {
                this.errorAtStart = true;
                logger.error(e);
                this.startPromise = Promise.reject("Error in database schema");
            }
        }
    }

    public async stop(): Promise<void> {
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
                    return (field.string() === "1"); // 1 = true, 0 = false
                } else {
                    return next();
                }
            }
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

    public async recreate(immediate = false): Promise<void> {
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

    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    public stop(): Promise<void> {
        return poolProvider.stop();
    }

    public getPageInfo(link: string, key: string): Promise<{ link: string; key: string; values: string[] }> {
        return inContext((context) => context.getPageInfo(link, key));
    }

    public updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void> {
        return inContext((context) => context.updatePageInfo(link, key, values, toDeleteValues));
    }

    public removePageInfo(link: string, key?: string): Promise<void> {
        return inContext((context) => context.removePageInfo(link, key));
    }

    public queueNewTocs(): Promise<void> {
        return inContext((context) => context.queueNewTocs());
    }

    public getStats(uuid: Uuid): Promise<any> {
        return inContext((context) => context.getStat(uuid));
    }

    public getNew(uuid: Uuid, date?: Date): Promise<any> {
        return inContext((context) => context.getNew(uuid, date));
    }

    /**
     *
     * @param result
     */
    public processResult(result: Result): Promise<MetaResult | MetaResult[]> {
        return inContext((context) => context.processResult(result));
    }

    /**
     *
     * @param result
     */
    public saveResult(result: Result): Promise<boolean> {
        return inContext((context) => context.saveResult(result));
    }

    /**
     *
     */
    public addScrape(scrape: ScrapeItem | ScrapeItem[]): Promise<boolean> {
        throw Error("not supported");
    }

    /**
     *
     */
    public getScrapes(): Promise<ScrapeItem[]> {
        throw Error("not supported");
    }

    /**
     *
     */
    public removeScrape(link: string, type: ScrapeType): Promise<boolean> {
        throw Error("not supported");
    }

    public updateScrape(link: string, type: ScrapeType, nextScrape: number): Promise<boolean> {
        throw Error("not supported");
    }

    /**
     *
     */
    public showUser(): Promise<User[]> {
        throw Error("not supported");
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


export const storage = new Storage();
export const mediumStorage = new MediumStorage();
export const partStorage = new PartStorage();
export const episodeStorage = new EpisodeStorage();
export const newsStorage = new NewsStorage();
export const mediumInWaitStorage = new MediumInWaitStorage();
export const userStorage = new UserStorage();
export const jobStorage = new JobStorage();
export const internalListStorage = new InternalListStorage();
export const externalUserStorage = new ExternalUserStorage();
export const externalListStorage = new ExternalListStorage();

/**
 *
 */
export const startStorage = (): void => poolProvider.start();
