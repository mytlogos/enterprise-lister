import { ignore } from "../../tools";
import { Trigger } from "../trigger";
import mySql from "promise-mysql";
import { DbTrigger, QueryContext } from "./queryContext";
import { SubContext } from "./subContext";

const database = "enterprise";

export class DatabaseContext extends SubContext {
    public constructor (parentContext: QueryContext) {
        super(parentContext);
    }

    public getDatabaseVersion (): Promise<Array<{ version: number }>> {
        return this.query("SELECT version FROM enterprise_database_info LIMIT 1;") as Promise<Array<{ version: number }>>;
    }

    public async startMigration (): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=1;")
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            .then((value) => value && (value.changedRows === 1));
    }

    public async stopMigration (): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=0;")
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            .then((value) => value && (value.changedRows === 1));
    }

    public async updateDatabaseVersion (version: number): Promise<void> {
        return this.query("UPDATE enterprise_database_info SET version=?;", version).then(ignore);
    }

    public createDatabase (): Promise<void> {
        return this.query(`CREATE DATABASE ${database};`).then(ignore);
    }

    public getTables (): Promise<any[]> {
        return this.query("SHOW TABLES;") as Promise<any[]>;
    }

    public getTriggers (): Promise<DbTrigger[]> {
        return this.query("SHOW TRIGGERS;") as Promise<DbTrigger[]>;
    }

    public createTrigger (trigger: Trigger): Promise<any> {
        const schema = trigger.createSchema();
        return this.query(schema);
    }

    public dropTrigger (trigger: string): Promise<void> {
        return this.query(`DROP TRIGGER IF EXISTS ${mySql.escapeId(trigger)};`).then(ignore);
    }

    public createTable (table: string, columns: string[]): Promise<void> {
        return this.query(`CREATE TABLE ${mySql.escapeId(table)} (${columns.join(", ")});`).then(ignore);
    }

    public addColumn (tableName: string, columnDefinition: string): Promise<void> {
        return this.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`).then(ignore);
    }

    public alterColumn (tableName: string, columnDefinition: string): Promise<void> {
        return this.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnDefinition};`).then(ignore);
    }

    public changeColumn (tableName: string, oldName: string, newName: string, columnDefinition: string): Promise<void> {
        return this.query(`ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${columnDefinition};`).then(ignore);
    }

    public addUnique (tableName: string, indexName: string, ...columns: string[]): Promise<void> {
        columns = columns.map((value) => mySql.escapeId(value));
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`CREATE UNIQUE INDEX ${index} ON ${table} (${columns.join(", ")});`).then(ignore);
    }

    public dropIndex (tableName: string, indexName: string): Promise<void> {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`DROP INDEX IF EXISTS ${index} ON ${table};`).then(ignore);
    }

    public addForeignKey (tableName: string, constraintName: string, column: string, referencedTable: string,
        referencedColumn: string, onDelete?: string, onUpdate?: string): Promise<void> {
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

    public dropForeignKey (tableName: string, indexName: string): Promise<void> {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`).then(ignore);
    }

    public addPrimaryKey (tableName: string, ...columns: string[]): Promise<void> {
        columns = columns.map((value) => mySql.escapeId(value));

        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(", ")})`).then(ignore);
    }

    public dropPrimaryKey (tableName: string): Promise<void> {
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP PRIMARY KEY`).then(ignore);
    }
}
