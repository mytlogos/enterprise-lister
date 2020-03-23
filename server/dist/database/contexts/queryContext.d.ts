import { Connection } from "promise-mysql";
import { Invalidation, MetaResult, Result } from "../../types";
import { Query } from "mysql";
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
declare type ParamCallback<T> = (value: T) => (any[] | any);
declare type UpdateCallback = (updates: string[], values: any[]) => void;
export interface DbTrigger {
    Trigger: string;
    Event: string;
    Timing: string;
    Table: string;
}
/**
 * A Class for consecutive queries on the same connection.
 */
export declare class QueryContext implements ConnectionContext {
    private con;
    private _databaseContext?;
    private _userContext?;
    private _externalUserContext?;
    private _episodeContext?;
    private _externalListContext?;
    private _internalListContext?;
    private _jobContext?;
    private _mediumContext?;
    private _mediumInWaitContext?;
    private _newsContext?;
    private _partContext?;
    get databaseContext(): DatabaseContext;
    get userContext(): UserContext;
    get partContext(): PartContext;
    get mediumContext(): MediumContext;
    get episodeContext(): EpisodeContext;
    get newsContext(): NewsContext;
    get externalListContext(): ExternalListContext;
    get externalUserContext(): ExternalUserContext;
    get internalListContext(): InternalListContext;
    get jobContext(): JobContext;
    get mediumInWaitContext(): MediumInWaitContext;
    constructor(con: Connection);
    /**
     *
     */
    startTransaction(): Promise<void>;
    /**
     *
     */
    commit(): Promise<void>;
    /**
     *
     */
    rollback(): Promise<void>;
    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     */
    start(): Promise<void>;
    /**
     * Checks whether the main database exists currently.
     */
    databaseExists(): Promise<boolean>;
    processResult(result: Result): Promise<MetaResult | MetaResult[]>;
    saveResult(result: Result): Promise<boolean>;
    getPageInfo(link: string, key: string): Promise<{
        link: string;
        key: string;
        values: string[];
    }>;
    updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): Promise<void>;
    removePageInfo(link: string, key?: string, toDeleteValues?: string[]): Promise<void>;
    queueNewTocs(): Promise<void>;
    getInvalidated(uuid: string): Promise<Invalidation[]>;
    getInvalidatedStream(uuid: string): Promise<Query>;
    clearInvalidationTable(): Promise<any>;
    /**
     *
     * @param query
     * @param parameter
     */
    query(query: string, parameter?: any | any[]): Promise<any>;
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    delete(table: string, ...condition: Array<{
        column: string;
        value: any;
    }>): Promise<boolean>;
    /**
     * Updates data from the storage.
     */
    update(table: string, cb: UpdateCallback, ...condition: Array<{
        column: string;
        value: any;
    }>): Promise<boolean>;
    multiInsert<T>(query: string, value: T | T[], paramCallback: ParamCallback<T>): Promise<any>;
    queryInList<T>(query: string, value: T | T[], afterQuery?: string, paramCallback?: ParamCallback<T>): Promise<any[] | undefined>;
    queryStream(query: string, parameter?: any | any[]): Query;
    getNew(uuid: string, date?: Date): Promise<any>;
    getStat(uuid: string): Promise<any>;
    private _batchFunction;
}
export {};
