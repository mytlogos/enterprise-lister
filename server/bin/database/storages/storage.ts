import mySql from "promise-mysql";
import env from "../../env";
import {Invalidation, MetaResult, Result, ScrapeItem, User} from "../../types";
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

function inContext<T>(callback: ContextCallback<T, QueryContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con));
}

/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
export async function storageInContext<T, C extends ConnectionContext>(
    callback: ContextCallback<T, C>,
    transaction = true,
    provider: ContextProvider<C>
): Promise<T> {
    if (!running) {
        // if inContext is called without Storage being active
        return Promise.reject("Not started");
    }
    if (errorAtStart) {
        return Promise.reject("Error occurred while starting Database. Database may not be accessible");
    }
    if (startPromise) {
        await startPromise;
    }
    const pool = await poolPromise;
    const con = await pool.getConnection();
    const context = provider(con);

    let result;
    try {
        result = await doTransaction(callback, context, transaction);
    } finally {
        if (isQuery(result)) {
            const query: Query = result;
            query.on("end", () => {
                pool.releaseConnection(con);
            });
        } else {
            // release connection into the pool
            await pool.releaseConnection(con);
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
    if ((e.errno === 1213 || e.errno === 1205) && attempts < 5) {
        await delay(500);
        return doTransaction(callback, context, transaction, ++attempts);
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

const poolPromise = mySql.createPool({
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
});

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
        try {
            const manager = new SchemaManager();
            manager.initTableSchema(databaseSchema);
            startPromise = inContext(
                (context) => manager.checkTableSchema(context.databaseContext),
                true,
            ).catch((error) => {
                logger.error(error);
                errorAtStart = true;
                return Promise.reject("Database error occurred while starting");
            });
        } catch (e) {
            errorAtStart = true;
            startPromise = Promise.reject("Error in database schema");
            logger.error(e);
        }
    }
}

export class Storage {

    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    public stop(): Promise<void> {
        running = false;
        startPromise = null;
        return Promise.resolve(poolPromise.then((value) => value.end()));
    }

    public getPageInfo(link: string, key: string): Promise<{ link: string, key: string, values: string[] }> {
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

    public getStats(uuid: string): Promise<any> {
        return inContext((context) => context.getStat(uuid));
    }

    public getNew(uuid: string, date?: Date): Promise<any> {
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
    public getInvalidated(uuid: string): Promise<Invalidation[]> {
        return inContext((context) => context.getInvalidated(uuid));
    }

    /**
     *
     */
    public getInvalidatedStream(uuid: string): Promise<Query> {
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
export const startStorage = () => start();
// TODO: 01.09.2019 check whether it should 'start' implicitly or explicitly
start();
