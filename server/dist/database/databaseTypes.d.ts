import { TableSchema } from "./tableSchema";
export interface DatabaseSchema {
    readonly name: string;
    readonly tables: ReadonlyArray<TableSchema>;
    readonly mainTable: TableSchema;
    readonly invalidationTable: TableSchema;
}
export declare enum SqlFunction {
    NOW = "NOW()"
}
export declare enum Modifier {
    PRIMARY_KEY = "PRIMARY_KEY",
    UNIQUE = "UNIQUE",
    NOT_NULL = "NOT NULL",
    NOT = "NOT",
    NULL = "NULL",
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
export declare enum InvalidationType {
    INSERT = 1,
    UPDATE = 2,
    DELETE = 4,
    INSERT_OR_UPDATE = 3,
    INSERT_OR_DELETE = 5,
    ANY = 7
}
