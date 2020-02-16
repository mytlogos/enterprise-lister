"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const env_1 = tslib_1.__importDefault(require("../../env"));
const logger_1 = tslib_1.__importDefault(require("../../logger"));
const databaseSchema_1 = require("../databaseSchema");
const tools_1 = require("../../tools");
const schemaManager_1 = require("../schemaManager");
const storageTools_1 = require("./storageTools");
const mediumStorage_1 = require("./mediumStorage");
const externalListStorage_1 = require("./externalListStorage");
const externalUserStorage_1 = require("./externalUserStorage");
const internalListStorage_1 = require("./internalListStorage");
const jobStorage_1 = require("./jobStorage");
const userStorage_1 = require("./userStorage");
const mediumInWaitStorage_1 = require("./mediumInWaitStorage");
const newsStorage_1 = require("./newsStorage");
const episodeStorage_1 = require("./episodeStorage");
const partStorage_1 = require("./partStorage");
function inContext(callback, transaction = true) {
    return storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con));
}
/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 */
async function storageInContext(callback, transaction = true, provider) {
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
    }
    finally {
        if (tools_1.isQuery(result)) {
            const query = result;
            query.on("end", () => {
                pool.releaseConnection(con);
            });
        }
        else {
            // release connection into the pool
            await pool.releaseConnection(con);
        }
    }
    return result;
}
exports.storageInContext = storageInContext;
async function catchTransactionError(transaction, context, e, attempts, callback) {
    // if it could not be commit due to error, roll back and rethrow error
    if (transaction) {
        // if there is a transaction first rollback and then throw error
        await context.rollback();
    }
    // if it is an deadlock or lock wait timeout error, restart transaction after a delay at max five times
    if ((e.errno === 1213 || e.errno === 1205) && attempts < 5) {
        await tools_1.delay(500);
        return doTransaction(callback, context, transaction, ++attempts);
    }
    else {
        // if it isn't an deadlock error, or still an deadlock after five attempts, rethrow error
        throw e;
    }
}
async function doTransaction(callback, context, transaction, attempts = 0) {
    let result;
    try {
        // if transaction, start it
        if (transaction) {
            await context.startTransaction();
        }
        // let callback run with context
        result = await callback(context);
        if (tools_1.isQuery(result)) {
            const query = result;
            let error = false;
            // TODO: 31.08.2019 returning query object does not allow normal error handling,
            //  maybe return own stream where the control is completely in my own hands
            query
                .on("error", (err) => {
                error = true;
                if (transaction) {
                    context.rollback();
                }
                console.error(err);
            })
                .on("end", () => {
                if (!error && transaction) {
                    context.commit();
                }
            });
            // if transaction and no error till now, commit it and return result
        }
        else if (transaction) {
            await context.commit();
        }
    }
    catch (e) {
        return await catchTransactionError(transaction, context, e, attempts, callback);
    }
    return result;
}
const poolPromise = promise_mysql_1.default.createPool({
    connectionLimit: env_1.default.dbConLimit,
    host: env_1.default.dbHost,
    user: env_1.default.dbUser,
    password: env_1.default.dbPassword,
    // charset/collation of the current database and tables
    charset: "utf8mb4",
    // we assume that the database exists already
    database: "enterprise",
    typeCast(field, next) {
        if (field.type === "TINY" && field.length === 1) {
            return (field.string() === "1"); // 1 = true, 0 = false
        }
        else {
            return next();
        }
    }
});
let errorAtStart = false;
let running = false;
/**
 * @type {Promise<Storage>|void}
 */
let startPromise;
/**
 * Checks the database for incorrect structure
 * and tries to correct these.
 */
function start() {
    if (!running) {
        running = true;
        try {
            const manager = new schemaManager_1.SchemaManager();
            manager.initTableSchema(databaseSchema_1.databaseSchema);
            startPromise = inContext((context) => manager.checkTableSchema(context.databaseContext), true).catch((error) => {
                logger_1.default.error(error);
                console.log(error);
                errorAtStart = true;
                return Promise.reject("Database error occurred while starting");
            });
        }
        catch (e) {
            errorAtStart = true;
            startPromise = Promise.reject("Error in database schema");
            logger_1.default.error(e);
            console.log(e);
        }
    }
}
class Storage {
    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop() {
        running = false;
        startPromise = null;
        return Promise.resolve(poolPromise.then((value) => value.end()));
    }
    getPageInfo(link, key) {
        return inContext((context) => context.getPageInfo(link, key));
    }
    updatePageInfo(link, key, values, toDeleteValues) {
        return inContext((context) => context.updatePageInfo(link, key, values, toDeleteValues));
    }
    removePageInfo(link, key) {
        return inContext((context) => context.removePageInfo(link, key));
    }
    queueNewTocs() {
        return inContext((context) => context.queueNewTocs());
    }
    getStats(uuid) {
        return inContext((context) => context.getStat(uuid));
    }
    getNew(uuid, date) {
        return inContext((context) => context.getNew(uuid, date));
    }
    /**
     *
     * @param result
     */
    processResult(result) {
        return inContext((context) => context.processResult(result));
    }
    /**
     *
     * @param result
     */
    saveResult(result) {
        return inContext((context) => context.saveResult(result));
    }
    /**
     *
     */
    addScrape(scrape) {
        throw Error("not supported");
    }
    /**
     *
     */
    getScrapes() {
        throw Error("not supported");
    }
    /**
     *
     */
    removeScrape(link, type) {
        throw Error("not supported");
    }
    updateScrape(link, type, nextScrape) {
        throw Error("not supported");
    }
    /**
     *
     */
    showUser() {
        throw Error("not supported");
    }
    /**
     *
     */
    getInvalidated(uuid) {
        return inContext((context) => context.getInvalidated(uuid));
    }
    /**
     *
     */
    getInvalidatedStream(uuid) {
        return inContext((context) => context.getInvalidatedStream(uuid));
    }
}
exports.Storage = Storage;
exports.storage = new Storage();
exports.mediumStorage = new mediumStorage_1.MediumStorage();
exports.partStorage = new partStorage_1.PartStorage();
exports.episodeStorage = new episodeStorage_1.EpisodeStorage();
exports.newsStorage = new newsStorage_1.NewsStorage();
exports.mediumInWaitStorage = new mediumInWaitStorage_1.MediumInWaitStorage();
exports.userStorage = new userStorage_1.UserStorage();
exports.jobStorage = new jobStorage_1.JobStorage();
exports.internalListStorage = new internalListStorage_1.InternalListStorage();
exports.externalUserStorage = new externalUserStorage_1.ExternalUserStorage();
exports.externalListStorage = new externalListStorage_1.ExternalListStorage();
/**
 *
 */
exports.startStorage = () => start();
// TODO: 01.09.2019 check whether it should 'start' implicitly or explicitly
start();
//# sourceMappingURL=storage.js.map