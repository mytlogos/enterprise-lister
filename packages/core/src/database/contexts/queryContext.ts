import { EmptyPromise, Primitive, DBEntity, TypedQuery } from "../../types";
import { getElseSet } from "../../tools";
import { ValidationError } from "../../error";
import {
  DatabaseConnection,
  DatabaseTransactionConnection,
  QueryResult,
  QueryResultRow,
  sql,
  TaggedTemplateLiteralInvocation,
  ValueExpression,
} from "slonik";
import { ConnectionContext } from "../databaseTypes";
import { joinAnd, joinComma } from "./helper";
import { Readable } from "stream";

const database = "enterprise";

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type UpdateCallback = () => ValueExpression[] | Promise<ValueExpression[]>;

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
    notices: [],
    fields: [],
    rowCount: 0,
    rows: [],
    // @ts-expect-error
    command: "",
  };
}

export interface ContextConfig {
  connection: DatabaseConnection | DatabaseTransactionConnection;
  subClass: Map<new (parentContext: ContextConfig) => any, any>;
}

export type ContextConstructor<T> = new (context: ContextConfig) => T;

/**
 * A Class for consecutive queries on the same connection.
 */
export class QueryContext implements ConnectionContext {
  private readonly contextConfig: ContextConfig;

  public constructor(context: ContextConfig) {
    this.contextConfig = context;
  }

  public getContext<T>(constructor: ContextConstructor<T>): T {
    return getElseSet(this.contextConfig.subClass, constructor, () => new constructor(this.contextConfig));
  }

  public escapeIdentifier(str: string) {
    return sql.identifier([str]);
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
    await this.con.query(sql`START TRANSACTION;`);
  }

  /**
   *
   */
  public async commit(): EmptyPromise {
    await this.con.query(sql`COMMIT;`);
  }

  /**
   *
   */
  public async rollback(): EmptyPromise {
    await this.con.query(sql`ROLLBACK;`);
  }

  /**
   * Checks the database for incorrect structure
   * and tries to correct these.
   */
  public async start(): EmptyPromise {
    const exists = await this.databaseExists();
    if (!exists) {
      await this.con.query(sql`CREATE DATABASE ${sql.identifier([database])};`);
    }
  }

  /**
   * Checks whether the main database exists currently.
   */
  public async databaseExists(): Promise<boolean> {
    const databases = await this.con.query<{ database: string }>(sql`SHOW DATABASES;`);
    return databases.rows.find((data) => data.database === database) != null;
  }

  public get con(): DatabaseConnection | DatabaseTransactionConnection {
    return this.contextConfig.connection;
  }

  public async stream<T>(query: TaggedTemplateLiteralInvocation): Promise<TypedQuery<T>> {
    // FIXME: it does not seem possible to return a stream from within:
    // pool.transaction((con) => new Promise(resolve => con.stream(query, resolve)))
    // this will never resolve because the library is shit for streaming
    // so fake it, and just get all data in memory
    const result = await this.con.any(query);
    return Readable.from(result);
  }

  /**
   * Deletes one or multiple entries from one specific table,
   * with only one conditional.
   */
  public async delete<T extends QueryResultRow>(
    table: string,
    ...condition: Condition[]
  ): Promise<QueryResult<DBEntity<T>>> {
    if (!condition || (Array.isArray(condition) && !condition.length)) {
      return Promise.reject(new ValidationError("Invalid delete condition"));
    }
    const query = sql`DELETE FROM ${this.escapeIdentifier(table)} WHERE ${joinAnd(
      condition.map((value) => {
        return sql`${sql.identifier([value.column])} = ${value.value}`;
      }),
    )};`;

    // @ts-expect-error
    return this.con().query(query);
  }

  /**
   * Updates data from the storage.
   * May return a empty OkPacket if no values are to be updated.
   */
  public async update<T>(
    table: string,
    cb: UpdateCallback,
    ...condition: Condition[]
  ): Promise<QueryResult<DBEntity<T>>> {
    if (!condition || (Array.isArray(condition) && !condition.length)) {
      return Promise.reject(new ValidationError("Invalid update condition"));
    }

    const valueExpressions = await cb();

    if (!valueExpressions.length) {
      return Promise.resolve(emptyPacket());
    }

    const query = sql`UPDATE ${sql.identifier([table])} SET ${joinComma(valueExpressions)} WHERE ${joinAnd(
      condition.map((value) => sql`${sql.identifier([value.column])} = ${value.value}`),
    )};`;

    return this.con.query(query) as Promise<QueryResult<DBEntity<T>>>;
  }
}
