import { TableSchema } from "./tableSchema";
import { ColumnSchema } from "./columnSchema";
export declare class TableParser {
    static parseForeignKey(table: TableSchema, tables: TableSchema[], scheme: string): void;
    static parsePrimaryKey(table: TableSchema, tables: TableSchema[], schema: string): void;
    static parseUnique(table: TableSchema, tables: TableSchema[], data: string): void;
    static parseDataColumn(table: TableSchema, tables: TableSchema[], value: string): ColumnSchema | null;
    private static _getDefaultValue;
}
