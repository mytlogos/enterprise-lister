import { QueryContext } from "./queryContext";
import { Query } from "mysql";
declare type ParamCallback<T> = (value: T) => (any[] | any);
declare type UpdateCallback = (updates: string[], values: any[]) => void;
export declare class SubStorage {
    private readonly parentContext;
    constructor(parentContext: QueryContext);
    protected query(query: string, parameter?: any | any[]): Promise<any>;
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    protected delete(table: string, ...condition: Array<{
        column: string;
        value: any;
    }>): Promise<boolean>;
    /**
     * Updates data from the storage.
     */
    protected update(table: string, cb: UpdateCallback, ...condition: Array<{
        column: string;
        value: any;
    }>): Promise<boolean>;
    protected multiInsert<T>(query: string, value: T | T[], paramCallback: ParamCallback<T>): Promise<any>;
    protected queryInList<T>(query: string, value: T | T[], afterQuery?: string, paramCallback?: ParamCallback<T>): Promise<any[] | undefined>;
    protected queryStream(query: string, parameter?: any | any[]): Query;
}
export {};
