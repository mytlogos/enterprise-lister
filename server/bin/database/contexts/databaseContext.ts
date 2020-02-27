import {ignore} from "../../tools";
import {Trigger} from "../trigger";
import mySql from "promise-mysql";
import {DbTrigger, QueryContext} from "./queryContext";
import {SubContext} from "./subContext";

const database = "enterprise";

export class DatabaseContext extends SubContext {
    constructor(parentContext: QueryContext) {
        super(parentContext);
    }

    public getDatabaseVersion(): Promise<Array<{ version: number }>> {
        return this.query("SELECT version FROM enterprise_database_info LIMIT 1;");
    }

    public async startMigration(): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=1;")
            .then((value) => value && (value.changedRows === 1));
    }

    public async stopMigration(): Promise<boolean> {
        return this
            .query("UPDATE enterprise_database_info SET migrating=0;")
            .then((value) => value && (value.changedRows === 1));
    }

    public async updateDatabaseVersion(version: number): Promise<number> {
        return this.query("UPDATE enterprise_database_info SET version=?;", version);
    }

    public createDatabase(): Promise<void> {
        return this.query(`CREATE DATABASE ${database};`).then(ignore);
    }

    public getTables(): Promise<any[]> {
        return this.query("SHOW TABLES;");
    }

    public getTriggers(): Promise<DbTrigger[]> {
        return this.query("SHOW TRIGGERS;");
    }

    public createTrigger(trigger: Trigger): Promise<any> {
        const schema = trigger.createSchema();
        return this.query(schema);
    }

    public dropTrigger(trigger: string) {
        return this.query(`DROP TRIGGER IF EXISTS ${mySql.escapeId(trigger)};`);
    }

    public createTable(table: string, columns: string[]) {
        return this.query(`CREATE TABLE ${mySql.escapeId(table)} (${columns.join(", ")});`);
    }

    public addColumn(tableName: string, columnDefinition: string) {
        return this.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
    }

    public alterColumn(tableName: string, columnDefinition: string) {
        return this.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnDefinition};`);
    }

    public changeColumn(tableName: string, oldName: string, newName: string, columnDefinition: string) {
        return this.query(`ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${columnDefinition};`);
    }

    public addUnique(tableName: string, indexName: string, ...columns: string[]) {
        columns = columns.map((value) => mySql.escapeId(value));
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`CREATE UNIQUE INDEX ${index} ON ${table} (${columns.join(", ")});`);
    }

    public dropIndex(tableName: string, indexName: string) {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`DROP INDEX IF EXISTS ${index} ON ${table};`);
    }

    public addForeignKey(tableName: string, constraintName: string, column: string, referencedTable: string,
                         referencedColumn: string, onDelete?: string, onUpdate?: string) {

        const index = mySql.escapeId(column);
        const table = mySql.escapeId(tableName);
        const refTable = mySql.escapeId(referencedTable);
        const refColumn = mySql.escapeId(referencedColumn);
        const name = mySql.escapeId(constraintName);
        let query = `ALTER TABLE ${table} ADD FOREIGN KEY IF ${name} (${index}) REFERENCES ${refTable} (${refColumn})`;

        if (onDelete) {
            query += " ON DELETE " + onDelete;
        }
        if (onUpdate) {
            query += " ON UPDATE " + onUpdate;
        }
        return this.query(query + ";");
    }

    public dropForeignKey(tableName: string, indexName: string) {
        const index = mySql.escapeId(indexName);
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`);
    }

    public addPrimaryKey(tableName: string, ...columns: string[]) {
        columns = columns.map((value) => mySql.escapeId(value));

        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(", ")})`);
    }

    public dropPrimaryKey(tableName: string) {
        const table = mySql.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP PRIMARY KEY`);
    }

}
