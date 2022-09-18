import { EmptyPromise, Primitive, DBEntity, TypedQuery } from "../../types";
import { getElseSet, ignore } from "../../tools";
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
import { ScraperHookContext } from "./scraperHookContext";
import { AppEventContext } from "./appEventContext";
import { CustomHookContext } from "./customHookContext";
import { ValidationError } from "../../error";
import { NotificationContext } from "./notificationContext";
import { GenericContext } from "./genericContext";
import {
  DatabaseConnection,
  QueryResult,
  QueryResultRow,
  sql,
  TaggedTemplateLiteralInvocation,
  ValueExpression,
} from "slonik";
import { EpisodeReleaseContext } from "./episodeReleaseContext";
import { Duplex, pipeline } from "stream";
import { MediumTocContext } from "./mediumTocContext";

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

interface ContextConfig {
  connection: DatabaseConnection;
  subClass: Map<new (parentContext: ContextConfig) => any, any>;
}

/**
 * A Class for consecutive queries on the same connection.
 */
export class QueryContext implements ConnectionContext {
  private readonly contextConfig: ContextConfig;

  private getSubInstanceLazy<T>(constructor: new (context: ContextConfig) => T): T {
    return getElseSet(this.contextConfig.subClass, constructor, () => new constructor(this.contextConfig));
  }

  public get databaseContext(): DatabaseContext {
    return this.getSubInstanceLazy(DatabaseContext);
  }

  public get userContext(): UserContext {
    return this.getSubInstanceLazy(UserContext);
  }

  public get partContext(): PartContext {
    return this.getSubInstanceLazy(PartContext);
  }

  public get mediumContext(): MediumContext {
    return this.getSubInstanceLazy(MediumContext);
  }

  public get episodeContext(): EpisodeContext {
    return this.getSubInstanceLazy(EpisodeContext);
  }

  public get newsContext(): NewsContext {
    return this.getSubInstanceLazy(NewsContext);
  }

  public get externalListContext(): ExternalListContext {
    return this.getSubInstanceLazy(ExternalListContext);
  }

  public get externalUserContext(): ExternalUserContext {
    return this.getSubInstanceLazy(ExternalUserContext);
  }

  public get internalListContext(): InternalListContext {
    return this.getSubInstanceLazy(InternalListContext);
  }

  public get jobContext(): JobContext {
    return this.getSubInstanceLazy(JobContext);
  }

  public get mediumInWaitContext(): MediumInWaitContext {
    return this.getSubInstanceLazy(MediumInWaitContext);
  }

  public get scraperHookContext(): ScraperHookContext {
    return this.getSubInstanceLazy(ScraperHookContext);
  }

  public get appEventContext(): AppEventContext {
    return this.getSubInstanceLazy(AppEventContext);
  }

  public get customHookContext(): CustomHookContext {
    return this.getSubInstanceLazy(CustomHookContext);
  }

  public get notificationContext(): NotificationContext {
    return this.getSubInstanceLazy(NotificationContext);
  }

  public get genericContext(): GenericContext {
    return this.getSubInstanceLazy(GenericContext);
  }

  public get episodeReleaseContext(): EpisodeReleaseContext {
    return this.getSubInstanceLazy(EpisodeReleaseContext);
  }

  public get mediumTocContext(): MediumTocContext {
    return this.getSubInstanceLazy(MediumTocContext);
  }

  public constructor(context: ContextConfig) {
    this.contextConfig = context;
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

  public get con(): DatabaseConnection {
    return this.contextConfig.connection;
  }

  public async stream<T>(query: TaggedTemplateLiteralInvocation): Promise<TypedQuery<T>> {
    const resultStream = new Duplex({ objectMode: true });
    this.con.stream(query, (stream) => pipeline(stream, resultStream, ignore));
    return resultStream;
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
    const query = sql`DELETE FROM ${this.escapeIdentifier(table)} WHERE ${sql.join(
      condition.map((value) => {
        return sql`${sql.identifier([value.column])} = ${value.value}`;
      }),
      sql` AND `,
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

    const query = sql`UPDATE ${sql.identifier([table])} SET ${sql.join(valueExpressions, sql`, `)} WHERE ${sql.join(
      condition.map((value) => sql`${sql.identifier([value.column])} = ${value.value}`),
      sql` AND `,
    )};`;

    return this.con.query(query) as Promise<QueryResult<DBEntity<T>>>;
  }
}
