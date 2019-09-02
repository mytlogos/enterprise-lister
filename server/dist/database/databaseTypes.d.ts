import { TableSchema } from "./tableSchema";
import { MediaType } from "../tools";
import { Trigger } from "./trigger";
import { QueryContext } from "./queryContext";
export interface DatabaseSchema {
    readonly version: number;
    readonly triggers: ReadonlyArray<Trigger>;
    readonly name: string;
    readonly tables: ReadonlyArray<TableSchema>;
    readonly mainTable: TableSchema;
    readonly invalidationTable: TableSchema;
    readonly migrations: ReadonlyArray<Migration>;
}
export interface Migration {
    readonly fromVersion: number;
    readonly toVersion: number;
    migrate(context: QueryContext): Promise<void>;
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
    DOUBLE = "DOUBLE",
    BOOLEAN = "BOOLEAN",
    TEXT = "TEXT",
    CHAR = "CHAR",
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
export interface MediumInWait {
    title: string;
    medium: MediaType;
    link: string;
}
export declare enum MySqlErrorNo {
    ER_BAD_FIELD_ERROR = 1054,
    ER_DUP_FIELDNAME = 1060,
    ER_DUP_ENTRY = 1062,
    ER_CANT_DROP_FIELD_OR_KEY = 1091
}
