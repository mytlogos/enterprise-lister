import {ColumnType, InvalidationType} from "./databaseTypes";
import {ColumnSchema} from "./columnSchema";

export class TableSchema {
    public readonly columns: ColumnSchema[];
    public readonly foreignKeys: ColumnSchema[];
    public readonly primaryKeys: ColumnSchema[];
    public readonly name: string;
    public readonly invalidations: Array<{ type: InvalidationType, table: TableSchema }> = [];
    public readonly main: boolean;
    public readonly invalidationColumn?: string;
    public readonly invalidationTable: boolean;
    public mainDependent?: boolean;

    constructor(columns: ColumnSchema[], name: string, main = false, invalidationCol?: string, invalidTable = false) {
        this.columns = columns;
        this.primaryKeys = this.columns.filter((value) => value.primaryKey);
        this.foreignKeys = this.columns.filter((value) => value.foreignKey);
        this.name = name;
        this.main = main;
        this.invalidationColumn = invalidationCol;
        this.invalidationTable = invalidTable;
    }

    public getTableSchema(): { name: string, columns: string[] } {
        const columns: string[] = [];
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
                            if (value.type === ColumnType.TEXT) {
                                return value.name + "(" + value.primaryKeyTypeSize + ")";
                            } else {
                                return value.name;
                            }
                        })
                        .join(", ")
                    + ")");
            }
        }
        return {name: this.name, columns};
    }

    public getSchema(): string {
        const tableSchema = this.getTableSchema();
        return `CREATE TABLE ${this.name} (${tableSchema.columns.join(", ")});`;
    }
}
