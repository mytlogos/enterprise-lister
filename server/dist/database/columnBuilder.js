"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const databaseTypes_1 = require("./databaseTypes");
const columnSchema_1 = require("./columnSchema");
class ColumnBuilder {
    constructor(table) {
        this.name = "";
        this.modifier = new Set();
        this.primaryKey = false;
        this.tableBuilder = table;
    }
    setName(name) {
        this.name = name;
        return this;
    }
    setUnique() {
        this.modifier.add(databaseTypes_1.Modifier.UNIQUE);
        return this;
    }
    setUnsigned() {
        this.modifier.add(databaseTypes_1.Modifier.UNSIGNED);
        return this;
    }
    setNonNull() {
        this.modifier.add(databaseTypes_1.Modifier.NOT_NULL);
        return this;
    }
    setAutoIncrement() {
        this.modifier.add(databaseTypes_1.Modifier.AUTO_INCREMENT);
        return this;
    }
    setPrimaryKey(typeSize) {
        this.primaryKey = true;
        if (typeSize) {
            this.primaryKeyTypeSize = typeSize;
        }
        return this;
    }
    setInt() {
        this.type = databaseTypes_1.ColumnType.INT;
        return this;
    }
    setFloat() {
        this.type = databaseTypes_1.ColumnType.FLOAT;
        return this;
    }
    setText() {
        this.type = databaseTypes_1.ColumnType.TEXT;
        return this;
    }
    setDateTime() {
        this.type = databaseTypes_1.ColumnType.DATETIME;
        return this;
    }
    setVarchar(size) {
        this.type = databaseTypes_1.ColumnType.VARCHAR;
        this.typeSize = size;
        return this;
    }
    setDefault(value) {
        this.default = value;
        return this;
    }
    setForeignKey(referencedColumn) {
        this.foreignKey = referencedColumn;
        return this;
    }
    build() {
        if (!this.type) {
            throw Error("no column type set");
        }
        if (!this.tableBuilder) {
            throw Error("got not table for column");
        }
        if (!this.name) {
            throw Error("column has no name");
        }
        if (!this.type) {
            throw Error("column has no type");
        }
        if (this.type === databaseTypes_1.ColumnType.TEXT && this.primaryKey && !this.primaryKeyTypeSize) {
            throw Error("column is type 'TEXT' and primary key but has no key length");
        }
        const column = new columnSchema_1.ColumnSchema(this.name, this.type, [...this.modifier], this.typeSize, this.primaryKey, this.foreignKey, this.default, this.primaryKeyTypeSize);
        this.tableBuilder.addColumn(column);
        return column;
    }
    buildOneMoreColumn() {
        this.build();
        return this.tableBuilder.getColumnBuilder();
    }
    buildReturnTable() {
        this.build();
        return this.tableBuilder;
    }
}
exports.ColumnBuilder = ColumnBuilder;
//# sourceMappingURL=columnBuilder.js.map