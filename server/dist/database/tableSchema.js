"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const databaseTypes_1 = require("./databaseTypes");
class TableSchema {
    constructor(columns, name, main = false, invalidationCol, invalidTable = false) {
        this.invalidations = [];
        this.columns = columns;
        this.primaryKeys = this.columns.filter((value) => value.primaryKey);
        this.foreignKeys = this.columns.filter((value) => value.foreignKey);
        this.name = name;
        this.main = main;
        this.invalidationColumn = invalidationCol;
        this.invalidationTable = invalidTable;
    }
    getTableSchema() {
        const columns = [];
        if (this.columns.length) {
            columns.push(...this.columns.map((value) => value.getSchema()));
            if (this.foreignKeys.length) {
                columns.push(...this.foreignKeys.map((value) => {
                    const foreignKey = value.foreignKey;
                    // @ts-ignore
                    return `FOREIGN KEY (${value.name}) REFERENCES ${foreignKey.table.name}(${foreignKey.name})`;
                }));
            }
            if (this.primaryKeys.length) {
                columns.push("PRIMARY KEY(" + this.primaryKeys
                    .map((value) => {
                    if (value.type === databaseTypes_1.ColumnType.TEXT) {
                        return value.name + "(" + value.primaryKeyTypeSize + ")";
                    }
                    else {
                        return value.name;
                    }
                })
                    .join(", ")
                    + ")");
            }
        }
        return { name: this.name, columns };
    }
    getSchema() {
        const tableSchema = this.getTableSchema();
        return `CREATE TABLE ${this.name} (${tableSchema.columns.join(", ")});`;
    }
}
exports.TableSchema = TableSchema;
//# sourceMappingURL=tableSchema.js.map