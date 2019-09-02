export interface DatabaseSchema {
    name: string;
    tables: TableSchema[];
}
export declare enum SqlFunction {
    NOW = "NOW()"
}
export declare class DataBaseBuilder {
    setName(name: string): this;
    getTableBuilder(): TableBuilder;
    build(): DatabaseSchema;
}
export interface TableBuilder {
    getColumnBuilder(): ColumnBuilder;
    setTrack(): this;
    setIgnore(): this;
    build(): TableSchema;
}
export interface TableSchema {
    columns: ColumnSchema[];
    name: string;
    track: boolean;
    ignore: boolean;
    primaryKeys: ColumnSchema[];
    foreignKeys: ColumnSchema[];
    getSchema(): string;
}
export declare enum Modifier {
    PRIMARY_KEY = "PRIMARY_KEY",
    UNIQUE = "UNIQUE",
    NOT_NULL = "NOT_NULL",
    UNSIGNED = "UNSIGNED",
    AUTO_INCREMENT = "AUTO_INCREMENT"
}
export declare enum ColumnType {
    BOOLEAN = "BOOLEAN",
    TEXT = "TEXT",
    VARCHAR = "VARCHAR",
    DATETIME = "DATETIME",
    FLOAT = "FLOAT",
    INT = "INT"
}
export interface ColumnBuilder {
    setName(name: string): this;
    setUnique(): this;
    setNonNull(): this;
    setAutoIncrement(): this;
    setPrimaryKey(): this;
    setInt(): this;
    setFloat(): this;
    setText(): this;
    setDateTime(): this;
    setVarchar(size: number): this;
    setDefault(value: any | SqlFunction): this;
    setForeignKey(referencedColumn: ColumnSchema): this;
    build(): ColumnSchema;
}
export declare const DatabaseBuilder: DataBaseBuilder;
export interface ColumnSchema {
    name: string;
    table: TableSchema;
    type: ColumnType;
    modifiers: Modifier[];
}
