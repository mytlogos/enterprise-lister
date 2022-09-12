import { Trigger } from "../trigger";
import { DbTrigger, QueryContext } from "./queryContext";
import { SubContext } from "./subContext";
import { EmptyPromise } from "../../types";

const database = "enterprise";

export class DatabaseContext extends SubContext {
  public constructor(parentContext: QueryContext) {
    super(parentContext);
  }

  public async getDatabaseVersion(): Promise<Array<{ version: number }>> {
    const result = await this.query("SELECT version FROM enterprise_database_info LIMIT 1;");
    return result.rows[0];
  }

  public async getServerVersion(): Promise<[{ version: string }]> {
    const result = await this.query("SELECT version() as version");
    return result.rows[0];
  }

  public async startMigration(): Promise<boolean> {
    return this.query("UPDATE enterprise_database_info SET migrating=1;").then((value) => value.rowCount === 1);
  }

  public async stopMigration(): Promise<boolean> {
    return this.query("UPDATE enterprise_database_info SET migrating=0;").then((value) => value.rowCount === 1);
  }

  public async updateDatabaseVersion(version: number): EmptyPromise {
    await this.query("UPDATE enterprise_database_info SET version=?;", version);
  }

  public async createDatabase(): EmptyPromise {
    await this.query(`CREATE DATABASE ${database};`);
  }

  public getTables(): Promise<any[]> {
    return this.select("SHOW TABLES;");
  }

  public getTablesPg(): Promise<Array<{ schemaname: string; tablename: string }>> {
    return this.select("select * from pg_catalog.pg_tables;");
  }

  public getTriggers(): Promise<DbTrigger[]> {
    return this.query("SHOW TRIGGERS;").then((value) => value.rows);
  }

  public getTriggersPg(): Promise<DbTrigger[]> {
    return this.select(`SELECT
      action_timing as Timing,
      trigger_schema as Table,
      trigger_name as Trigger,
      event_manipulation as Event
    FROM 
      information_schema.triggers`);
  }

  public createTrigger(trigger: Trigger): Promise<any> {
    const schema = trigger.createSchema();
    return this.query(schema);
  }

  public async dropTrigger(trigger: string): EmptyPromise {
    await this.query(`DROP TRIGGER IF EXISTS ${this.escapeIdentifier(trigger)};`);
  }

  public async createTable(table: string, columns: string[]): EmptyPromise {
    await this.query(`CREATE TABLE ${this.escapeIdentifier(table)} (${columns.join(", ")});`);
  }

  public async addColumn(tableName: string, columnDefinition: string): EmptyPromise {
    await this.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
  }

  public async alterColumn(tableName: string, columnDefinition: string): EmptyPromise {
    await this.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnDefinition};`);
  }

  public async changeColumn(
    tableName: string,
    oldName: string,
    newName: string,
    columnDefinition: string,
  ): EmptyPromise {
    await this.query(`ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${columnDefinition};`);
  }

  public async addUnique(tableName: string, indexName: string, ...columns: string[]): EmptyPromise {
    columns = columns.map((value) => this.escapeIdentifier(value));
    const index = this.escapeIdentifier(indexName);
    const table = this.escapeIdentifier(tableName);
    await this.query(`CREATE UNIQUE INDEX ${index} ON ${table} (${columns.join(", ")});`);
  }

  public async dropIndex(tableName: string, indexName: string): EmptyPromise {
    const index = this.escapeIdentifier(indexName);
    const table = this.escapeIdentifier(tableName);
    await this.query(`DROP INDEX IF EXISTS ${index} ON ${table};`);
  }

  /**
   * Create a new normal index on a table on one or multiple columns.
   * It does not enforce any restraints like a unique index.
   * If an index with the given name exists already, nothing will be done.
   *
   * @param tableName the table to create the index on
   * @param indexName the name for the index
   * @param columnNames the columns the index should be build for
   */
  public async addIndex(tableName: string, indexName: string, columnNames: string[]): EmptyPromise {
    const index = this.escapeIdentifier(indexName);
    const table = this.escapeIdentifier(tableName);
    const columns = columnNames.map((name) => this.escapeIdentifier(name)).join(",");

    await this.query(`CREATE INDEX IF NOT EXISTS ${index} ON ${table} (${columns});`);
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
    let query = `ALTER TABLE ${table} ADD FOREIGN KEY ${name} (${index}) REFERENCES ${refTable} (${refColumn})`;

    if (onDelete) {
      query += " ON DELETE " + onDelete;
    }
    if (onUpdate) {
      query += " ON UPDATE " + onUpdate;
    }
    await this.query(query + ";");
  }

  public async dropForeignKey(tableName: string, indexName: string): EmptyPromise {
    const index = this.escapeIdentifier(indexName);
    const table = this.escapeIdentifier(tableName);
    await this.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`);
  }

  public async addPrimaryKey(tableName: string, ...columns: string[]): EmptyPromise {
    columns = columns.map((value) => this.escapeIdentifier(value));

    const table = this.escapeIdentifier(tableName);
    await this.query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(", ")})`);
  }

  public async dropPrimaryKey(tableName: string): EmptyPromise {
    const table = this.escapeIdentifier(tableName);
    await this.query(`ALTER TABLE ${table} DROP PRIMARY KEY`);
  }
}
