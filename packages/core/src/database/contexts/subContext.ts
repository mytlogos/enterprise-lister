import { QueryContext, Condition, QueryInValue } from "./queryContext";
import { ConnectionContext } from "../databaseTypes";
import { MultiSingleValue, EmptyPromise, UnpackArray, DBEntity, TypedQuery } from "../../types";
import { QueryResult } from "pg";

type ParamCallback<T> = (value: UnpackArray<T>) => any[] | any;
type UpdateCallback = (updates: string[], values: any[]) => void;

export class SubContext implements ConnectionContext {
  private isAborted = false;
  public constructor(public readonly parentContext: QueryContext) {}

  public commit(): EmptyPromise {
    return this.parentContext.commit();
  }

  public rollback(): EmptyPromise {
    return this.parentContext.rollback();
  }

  public startTransaction(): EmptyPromise {
    return this.parentContext.startTransaction();
  }

  public markAborted() {
    this.isAborted = true;
  }

  public aborted() {
    return this.isAborted;
  }

  public query<T>(query: string, parameter?: any | any[]): Promise<QueryResult<DBEntity<T>>> {
    return this.parentContext.query(query, parameter);
  }

  public escapeIdentifier(str: string) {
    return this.parentContext.escapeIdentifier(str);
  }

  public async select<T>(query: string, parameter?: any | any[]): Promise<Array<DBEntity<T>>> {
    const value = await this.parentContext.query<T>(query, parameter);
    return value.rows;
  }

  public async selectFirst<T>(query: string, parameter?: any | any[]): Promise<DBEntity<T>> {
    const value = await this.parentContext.query<T>(query, parameter);
    return value.rows[0];
  }

  public dmlQuery<T>(query: string, parameter?: any | any[]): Promise<QueryResult<DBEntity<T>>> {
    return this.parentContext.dmlQuery(query, parameter);
  }

  /**
   * Deletes one or multiple entries from one specific table,
   * with only one conditional.
   */
  protected async delete<T>(table: string, ...condition: Condition[]): Promise<QueryResult<DBEntity<T>>> {
    return this.parentContext.delete(table, ...condition);
  }

  /**
   * Updates data from the storage.
   */
  protected async update<T>(
    table: string,
    cb: UpdateCallback,
    ...condition: Condition[]
  ): Promise<QueryResult<DBEntity<T>>> {
    return this.parentContext.update(table, cb as any, ...condition);
  }

  protected multiInsert<T extends MultiSingleValue<any>>(
    query: string,
    value: T,
    paramCallback: ParamCallback<T>,
    ignore = false,
  ): Promise<QueryResult<any>> {
    return this.parentContext.multiInsert(query, value, paramCallback, ignore);
  }

  protected async queryInList<T>(query: string, value: QueryInValue): Promise<QueryResult<DBEntity<T>>> {
    return this.parentContext.queryInList(query, value);
  }

  protected queryStream<T>(query: string, parameter?: any | any[]): TypedQuery<DBEntity<T>> {
    return this.parentContext.queryStream(query, parameter);
  }
}
