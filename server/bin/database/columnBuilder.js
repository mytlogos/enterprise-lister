import { ColumnType, Modifier } from "./databaseTypes";
import { ColumnSchema } from "./columnSchema";
export class ColumnBuilder {
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
        this.modifier.add(Modifier.UNIQUE);
        return this;
    }
    setUnsigned() {
        this.modifier.add(Modifier.UNSIGNED);
        return this;
    }
    setNonNull() {
        this.modifier.add(Modifier.NOT_NULL);
        return this;
    }
    setAutoIncrement() {
        this.modifier.add(Modifier.AUTO_INCREMENT);
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
        this.type = ColumnType.INT;
        return this;
    }
    setFloat() {
        this.type = ColumnType.FLOAT;
        return this;
    }
    setText() {
        this.type = ColumnType.TEXT;
        return this;
    }
    setDateTime() {
        this.type = ColumnType.DATETIME;
        return this;
    }
    setVarchar(size) {
        this.type = ColumnType.VARCHAR;
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
        if (this.type === ColumnType.TEXT && this.primaryKey && !this.primaryKeyTypeSize) {
            throw Error("column is type 'TEXT' and primary key but has no key length");
        }
        const column = new ColumnSchema(this.name, this.type, [...this.modifier], this.typeSize, this.primaryKey, this.foreignKey, this.default, this.primaryKeyTypeSize);
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
//# sourceMappingURL=columnBuilder.js.map