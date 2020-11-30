import { ignore } from "../../tools";
import { Trigger } from "../trigger";
import mySql from "promise-mysql";
import { DbTrigger, QueryContext } from "./queryContext";
import { SubContext } from "./subContext";
import { EmptyPromise } from "../../types";

const database = "enterprise";

export class DatabaseContext extends SubContext {
    public constructor(parentContext: QueryContext) {
        super(parentContext);
    }

    public getDatabaseVersion(): Promise<Array<{ version: number }>> {
        return this.query("SELECT version FROM enterprise_database_info LIMIT 1;");
    }

    public async startMigration(): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=1;")
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            .then((value) => value && (value.changedRows === 1));
    }

    public async stopMigration(): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=0;")
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            .then((value) => value && (value.changedRows === 1));
    }

    public async updateDatabaseVersion(version: number): EmptyPromise {
        return this.query("UPDATE enterprise_database_info SET version=?;", version).then(ignore);
    }

    public createDatabase(): EmptyPromise {
        return this.query(`CREATE DATABASE ${database};`).then(ignore);
    }

    public getTables(): Promise<any[]> {
        return this.query("SHOW TABLES;") as Promise<any[]>;
    }

    public getTriggers(): Promise<DbTrigger[]> {
        return this.query("SHOW TRIGGERS;") as Promise<DbTrigger[]>;
    }

    public createTrigger(trigger: Trigger): Promise<any> {
        const schema = trigger.createSchema();
        return this.query(schema);
    }

    public dropTrigger(trigger: string): EmptyPromise {
        return this.query(`DROP TRIGGER IF EXISTS ${mySql.escapeId(trigger)};`).then(ignore);
    }

    public createTable(table: string, columns: string[]): EmptyPromise {
        return this.query(`CREATE TABLE ${mySql.escapeId(table)} (${columns.join(", ")});`).then(ignore);
    }

    public addColumn(tableName: string, columnDefinition: string): EmptyPromise {
        return this.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`).then(ignore);
    }

    public alterColumn(tableName: string, columnDefinition: string): EmptyPromise {
        return this.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnDefinition};`).then(ignore);
    }

    public changeColumn(tableName: string, oldName: string, newName: string, columnDefinition: string): EmptyPromise {
        return this.query(`ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${columnDefinition};`).then(ignore);
    }

    public addUnique(tableName: string, indexName: string, ...columns: string[]): EmptyPromise {
        columns = columns.map((value) => mySql.escapeId(value));
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`CREATE UNIQUE INDEX ${index} ON ${table} (${columns.join(", ")});`).then(ignore);
    }

    public dropIndex(tableName: string, indexName: string): EmptyPromise {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`DROP INDEX IF EXISTS ${index} ON ${table};`).then(ignore);
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
    public addIndex(tableName: string, indexName: string, columnNames: string[]): EmptyPromise {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        const columns = columnNames.map(name => mySql.escapeId(name)).join(",")
        return this.query(`CREATE INDEX IF NOT EXISTS ${index} ON ${table} (${columns});`).then(ignore);
    }

    public addForeignKey(tableName: string, constraintName: string, column: string, referencedTable: string,
        referencedColumn: string, onDelete?: string, onUpdate?: string): EmptyPromise {
        const index = mySql.escapeId(column);
        const table = mySql.escapeId(tableName);
        const refTable = mySql.escapeId(referencedTable);
        const refColumn = mySql.escapeId(referencedColumn);
        const name = mySql.escapeId(constraintName);
        let query = `ALTER TABLE ${table} ADD FOREIGN KEY ${name} (${index}) REFERENCES ${refTable} (${refColumn})`;

        if (onDelete) {
            query += " ON DELETE " + onDelete;
        }
        if (onUpdate) {
            query += " ON UPDATE " + onUpdate;
        }
        return this.query(query + ";").then(ignore);
    }

    public dropForeignKey(tableName: string, indexName: string): EmptyPromise {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`).then(ignore);
    }

    public addPrimaryKey(tableName: string, ...columns: string[]): EmptyPromise {
        columns = columns.map((value) => mySql.escapeId(value));

        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(", ")})`).then(ignore);
    }

    public dropPrimaryKey(tableName: string): EmptyPromise {
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP PRIMARY KEY`).then(ignore);
    }
}
