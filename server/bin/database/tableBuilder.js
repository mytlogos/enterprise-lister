import { ColumnBuilder } from "./columnBuilder";
import { TableSchema } from "./tableSchema";
import { TableParser } from "./tableParser";
export class TableBuilder {
    constructor(databaseBuilder) {
        this.columns = [];
        this.stubTable = new TableSchema([], "");
        this.invalidations = [];
        this.uniqueIndices = [];
        this.databaseBuilder = databaseBuilder;
    }
    setInvalidationTable() {
        this.invalidationTable = true;
        return this;
    }
    parseColumn(column) {
        const dataColumn = TableParser.parseDataColumn(this.stubTable, this.databaseBuilder.tables, column);
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
        const uppedData = data.toUpperCase();
        if (uppedData.startsWith("PRIMARY KEY")) {
            TableParser.parsePrimaryKey(this.stubTable, this.databaseBuilder.tables, data);
        }
        else if (uppedData.startsWith("FOREIGN KEY")) {
            TableParser.parseForeignKey(this.stubTable, this.databaseBuilder.tables, data);
        }
        else if (uppedData.startsWith("UNIQUE")) {
            TableParser.parseUnique(this.stubTable, this.databaseBuilder.tables, data);
        }
        else {
            throw Error(`unknown meta: ${data}`);
        }
        return this;
    }
    getColumnBuilder() {
        return new ColumnBuilder(this);
    }
    addColumn(column) {
        this.columns.push(column);
        return this;
    }
    addUniqueIndex(index) {
        this.uniqueIndices.push(index);
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
        const table = new TableSchema([...this.columns, ...this.stubTable.columns], this.name, this.main, this.invalidationColumn, this.invalidationTable, this.uniqueIndices);
        table.columns.forEach((value) => value.table = table);
        this.databaseBuilder.addTable(table, this.invalidations);
        return table;
    }
}
//# sourceMappingURL=tableBuilder.js.map