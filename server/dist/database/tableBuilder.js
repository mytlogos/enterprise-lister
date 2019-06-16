"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const columnBuilder_1 = require("./columnBuilder");
const tableSchema_1 = require("./tableSchema");
const tableParser_1 = require("./tableParser");
class TableBuilder {
    constructor(databaseBuilder) {
        this.columns = [];
        this.stubTable = new tableSchema_1.TableSchema([], "");
        this.invalidations = [];
        this.databaseBuilder = databaseBuilder;
    }
    setInvalidationTable() {
        this.invalidationTable = true;
        return this;
    }
    parseColumn(column) {
        const dataColumn = tableParser_1.TableParser.parseDataColumn(this.stubTable, this.databaseBuilder.tables, column);
        if (!dataColumn) {
            throw Error("could not parse column");
        }
        this.stubTable.columns.push(dataColumn);
        return this;
    }
    setMain() {
        this.main = true;
        return this;
    }
    parseMeta(data) {
        if (data.startsWith("PRIMARY KEY")) {
            tableParser_1.TableParser.parsePrimaryKey(this.stubTable, this.databaseBuilder.tables, data);
        }
        else if (data.startsWith("FOREIGN KEY")) {
            tableParser_1.TableParser.parseForeignKey(this.stubTable, this.databaseBuilder.tables, data);
        }
        else {
            throw Error(`unknown meta: ${data}`);
        }
        return this;
    }
    getColumnBuilder() {
        return new columnBuilder_1.ColumnBuilder(this);
    }
    addColumn(column) {
        this.columns.push(column);
        return this;
    }
    setName(name) {
        this.name = name;
        return this;
    }
    addInvalidation(type, tableName) {
        this.invalidations.push({ type, table: tableName });
        return this;
    }
    build() {
        if (!this.name) {
            throw Error("table has no name");
        }
        const table = new tableSchema_1.TableSchema([...this.columns, ...this.stubTable.columns], this.name, this.main, this.invalidationColumn, this.invalidationTable);
        this.columns.forEach((value) => value.table = table);
        this.databaseBuilder.addTable(table, this.invalidations);
        return table;
    }
}
exports.TableBuilder = TableBuilder;
//# sourceMappingURL=tableBuilder.js.map