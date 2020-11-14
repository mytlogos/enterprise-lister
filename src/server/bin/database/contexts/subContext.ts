import {QueryContext, Condition} from "./queryContext";
import {Query, OkPacket} from "mysql";
import {ConnectionContext} from "../databaseTypes";


type ParamCallback<T> = (value: T) => (any[] | any);
type UpdateCallback = (updates: string[], values: any[]) => void;

export class SubContext implements ConnectionContext {
    public constructor(public readonly parentContext: QueryContext) {
    }

    public commit(): Promise<void> {
        return this.parentContext.commit();
    }

    public rollback(): Promise<void> {
        return this.parentContext.rollback();
    }

    public startTransaction(): Promise<void> {
        return this.parentContext.startTransaction();
    }

    public query(query: string, parameter?: any | any[]): Promise<any> {
        return this.parentContext.query(query, parameter);
    }

    public dmlQuery(query: string, parameter?: any | any[]): Promise<OkPacket> {
        return this.parentContext.dmlQuery(query, parameter);
    }

    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    protected async delete(table: string, ...condition: Condition[]): Promise<OkPacket> {
        return this.parentContext.delete(table, ...condition);
    }

    /**
     * Updates data from the storage.
     */
    protected async update(table: string, cb: UpdateCallback, ...condition: Condition[]): Promise<OkPacket> {
        return this.parentContext.update(table, cb, ...condition);
    }

    protected multiInsert<T>(query: string, value: T | T[], paramCallback: ParamCallback<T>): Promise<OkPacket | OkPacket[]> {
        return this.parentContext.multiInsert(query, value, paramCallback);
    }

    protected async queryInList<T>(query: string, value: T | T[], afterQuery?: string, paramCallback?: ParamCallback<T>)
        : Promise<any[] | undefined> {
        return this.parentContext.queryInList(query, value, afterQuery, paramCallback);
    }

    protected queryStream(query: string, parameter?: any | any[]): Query {
        return this.parentContext.queryStream(query, parameter);
    }
}
