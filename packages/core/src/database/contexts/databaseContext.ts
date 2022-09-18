import { Trigger } from "../trigger";
import { QueryContext } from "./queryContext";
import { EmptyPromise } from "../../types";
import { dbTrigger, DbTrigger } from "../databaseTypes";
import { sql } from "slonik";

const database = "enterprise";

export class DatabaseContext extends QueryContext {
  public async getDatabaseVersion(): Promise<number> {
    return this.con.oneFirst<{ version: number }>(
      sql`SELECT version FROM enterprise_database_info ORDER BY version DESC LIMIT 1;`,
    );
  }

  public async getServerVersion(): Promise<string> {
    return this.con.oneFirst<{ version: string }>(sql`SELECT version()`);
  }

  public async startMigration(): Promise<boolean> {
    return this.con.query(sql`UPDATE enterprise_database_info SET migrating=1;`).then((value) => value.rowCount === 1);
  }

  public async stopMigration(): Promise<boolean> {
    return this.con.query(sql`UPDATE enterprise_database_info SET migrating=0;`).then((value) => value.rowCount === 1);
  }

  public async updateDatabaseVersion(version: number): EmptyPromise {
    await this.con.query(sql`UPDATE enterprise_database_info SET version=${version};`);
  }

  public async createDatabase(): EmptyPromise {
    await this.con.query(sql`CREATE DATABASE ${sql.identifier([database])};`);
  }

  public getTables(): Promise<readonly any[]> {
    return this.con.many(sql`SHOW TABLES;`);
  }

  public getTablesPg(): Promise<ReadonlyArray<{ schemaname: string; tablename: string }>> {
    return this.con.many<{ schemaname: string; tablename: string }>(
      sql`select schemaname, tablename from pg_catalog.pg_tables;`,
    );
  }

  public async getTriggers(): Promise<readonly DbTrigger[]> {
    return this.con.many(sql.type(dbTrigger)`SHOW TRIGGERS;`);
  }

  public async getTriggersPg(): Promise<readonly DbTrigger[]> {
    return this.con.many<DbTrigger>(sql`
    SELECT
      action_timing as timing,
      trigger_schema as table,
      trigger_name as trigger,
      event_manipulation as event
    FROM 
      information_schema.triggers
    `);
  }

  public createTrigger(trigger: Trigger): Promise<any> {
    const schema = trigger.createSchema();
    return this.con.query(sql.literalValue(schema));
  }

  public async dropTrigger(trigger: string): EmptyPromise {
    await this.con.query(sql`DROP TRIGGER IF EXISTS ${sql.identifier([trigger])};`);
  }

  public async createTable(table: string, columns: string[]): EmptyPromise {
    // FIXME: this will probably not work
    await this.con.query(sql`CREATE TABLE ${sql.identifier([table])} (${sql.literalValue(columns.join(", "))});`);
  }

  public async addColumn(tableName: string, columnDefinition: string): EmptyPromise {
    // FIXME: this will probably not work
    await this.con.query(
      sql`ALTER TABLE ${sql.identifier([tableName])} ADD COLUMN ${sql.literalValue(columnDefinition)};`,
    );
  }

  public async alterColumn(tableName: string, columnDefinition: string): EmptyPromise {
    await this.con.query(
      sql`ALTER TABLE ${sql.identifier([tableName])} MODIFY COLUMN ${sql.literalValue(columnDefinition)};`,
    );
  }

  public async changeColumn(
    tableName: string,
    oldName: string,
    newName: string,
    columnDefinition: string,
  ): EmptyPromise {
    await this.con.query(
      sql`
      ALTER TABLE ${sql.identifier([tableName])}
      CHANGE COLUMN ${sql.identifier([oldName])} ${sql.identifier([newName])} ${sql.literalValue(columnDefinition)};`,
    );
  }

  public async addUnique(tableName: string, indexName: string, ...columns: string[]): EmptyPromise {
    const index = sql.identifier([indexName]);
    const table = sql.identifier([tableName]);

    await this.con.query(sql`CREATE UNIQUE INDEX IF NOT EXISTS ${index} ON ${table} (${sql.identifier(columns)});`);
  }

  public async dropIndex(tableName: string, indexName: string): EmptyPromise {
    const index = sql.identifier([indexName]);
    const table = sql.identifier([tableName]);

    await this.con.query(sql`DROP INDEX IF EXISTS ${index} ON ${table};`);
  }

  /**
   * Create a new normal index on a table on one or multiple columns.
   * It does not enforce any restraints like a unique index.
   * If an index with the given name exists already, nothing will be done.
   *
   * @param tableName the table to create the index on
   * @param indexName the name for the index
   * @param columns the columns the index should be build for
   */
  public async addIndex(tableName: string, indexName: string, columns: string[]): EmptyPromise {
    const index = sql.identifier([indexName]);
    const table = sql.identifier([tableName]);

    await this.con.query(sql`CREATE INDEX IF NOT EXISTS ${index} ON ${table} (${sql.identifier(columns)});`);
  }

  public async addForeignKey(
    tableName: string,
    constraintName: string,
    column: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete?: string,
    onUpdate?: string,
  ): EmptyPromise {
    const index = this.escapeIdentifier(column);
    const table = this.escapeIdentifier(tableName);
    const refTable = this.escapeIdentifier(referencedTable);
    const refColumn = this.escapeIdentifier(referencedColumn);
    const name = this.escapeIdentifier(constraintName);

    const onUpdateAction = onUpdate ? sql` ON UPDATE ${sql.literalValue(onUpdate)}` : sql``;
    const onDeleteAction = onDelete ? sql` ON DELETE ${sql.literalValue(onDelete)}` : sql``;

    await this.con.query(sql`
      ALTER TABLE ${table} 
      ADD FOREIGN KEY ${name} (${index}) REFERENCES ${refTable} (${refColumn})${onUpdateAction}${onDeleteAction};`);
  }

  public async dropForeignKey(tableName: string, indexName: string): EmptyPromise {
    const index = this.escapeIdentifier(indexName);
    const table = this.escapeIdentifier(tableName);

    await this.con.query(sql`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`);
  }

  public async addPrimaryKey(tableName: string, ...columns: string[]): EmptyPromise {
    const table = this.escapeIdentifier(tableName);
    const primaryColumns = sql.identifier(columns);

    await this.con.query(sql`ALTER TABLE ${table} ADD PRIMARY KEY (${primaryColumns})`);
  }

  public async dropPrimaryKey(tableName: string): EmptyPromise {
    const table = this.escapeIdentifier(tableName);

    await this.con.query(sql`ALTER TABLE ${table} DROP PRIMARY KEY`);
  }
}
