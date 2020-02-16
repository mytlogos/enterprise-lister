"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../../tools");
const promise_mysql_1 = tslib_1.__importDefault(require("promise-mysql"));
const subContext_1 = require("./subContext");
const database = "enterprise";
class DatabaseContext extends subContext_1.SubContext {
    constructor(parentContext) {
        super(parentContext);
    }
    getDatabaseVersion() {
        return this.query("SELECT version FROM enterprise_database_info LIMIT 1;");
    }
    async updateDatabaseVersion(version) {
        await this.query("TRUNCATE enterprise_database_info;");
        return this.query("INSERT INTO enterprise_database_info (version) VALUES (?);", version);
    }
    createDatabase() {
        return this.query(`CREATE DATABASE ${database};`).then(tools_1.ignore);
    }
    getTables() {
        return this.query("SHOW TABLES;");
    }
    getTriggers() {
        return this.query("SHOW TRIGGERS;");
    }
    createTrigger(trigger) {
        const schema = trigger.createSchema();
        return this.query(schema);
    }
    dropTrigger(trigger) {
        return this.query(`DROP TRIGGER ${promise_mysql_1.default.escapeId(trigger)};`);
    }
    createTable(table, columns) {
        return this.query(`CREATE TABLE ${promise_mysql_1.default.escapeId(table)} (${columns.join(", ")});`);
    }
    addColumn(tableName, columnDefinition) {
        return this.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
    }
    alterColumn(tableName, columnDefinition) {
        return this.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnDefinition};`);
    }
    changeColumn(tableName, oldName, newName, columnDefinition) {
        return this.query(`ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${columnDefinition};`);
    }
    addUnique(tableName, indexName, ...columns) {
        columns = columns.map((value) => promise_mysql_1.default.escapeId(value));
        const index = promise_mysql_1.default.escapeId(indexName);
        const table = promise_mysql_1.default.escapeId(tableName);
        return this.query(`CREATE UNIQUE INDEX ${index} ON ${table} (${columns.join(", ")});`);
    }
    dropIndex(tableName, indexName) {
        const index = promise_mysql_1.default.escapeId(indexName);
        const table = promise_mysql_1.default.escapeId(tableName);
        return this.query(`DROP INDEX ${index} ON ${table};`);
    }
    addForeignKey(tableName, constraintName, column, referencedTable, referencedColumn, onDelete, onUpdate) {
        const index = promise_mysql_1.default.escapeId(column);
        const table = promise_mysql_1.default.escapeId(tableName);
        const refTable = promise_mysql_1.default.escapeId(referencedTable);
        const refColumn = promise_mysql_1.default.escapeId(referencedColumn);
        const name = promise_mysql_1.default.escapeId(constraintName);
        let query = `ALTER TABLE ${table} ADD FOREIGN KEY IF ${name} (${index}) REFERENCES ${refTable} (${refColumn})`;
        if (onDelete) {
            query += " ON DELETE " + onDelete;
        }
        if (onUpdate) {
            query += " ON UPDATE " + onUpdate;
        }
        return this.query(query + ";");
    }
    dropForeignKey(tableName, indexName) {
        const index = promise_mysql_1.default.escapeId(indexName);
        const table = promise_mysql_1.default.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${index}`);
    }
    addPrimaryKey(tableName, ...columns) {
        columns = columns.map((value) => promise_mysql_1.default.escapeId(value));
        const table = promise_mysql_1.default.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(", ")})`);
    }
    dropPrimaryKey(tableName) {
        const table = promise_mysql_1.default.escapeId(tableName);
        return this.query(`ALTER TABLE ${table} DROP PRIMARY KEY`);
    }
}
exports.DatabaseContext = DatabaseContext;
//# sourceMappingURL=databaseContext.js.map