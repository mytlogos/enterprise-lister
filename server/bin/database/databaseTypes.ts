import {TableSchema} from "./tableSchema";
import {MediaType} from "../tools";
import {Trigger} from "./trigger";
import {QueryContext} from "./queryContext";

export interface DatabaseSchema {
    readonly version: number;
    readonly triggers: ReadonlyArray<Trigger>;
    readonly name: string;
    readonly tables: ReadonlyArray<TableSchema>;
    readonly mainTable: TableSchema;
    readonly invalidationTable: TableSchema;
    readonly migrations: ReadonlyArray<Migration>;
}

// for operations which alter things, like tables and cannot be done by simple insert or delete operations
export interface Migration {
    readonly fromVersion: number;
    readonly toVersion: number;

    migrate(context: QueryContext): Promise<void>;
}

export enum SqlFunction {
    NOW = "NOW()"
}

export enum Modifier {
    PRIMARY_KEY = "PRIMARY_KEY",
    UNIQUE = "UNIQUE",
    NOT_NULL = "NOT NULL",
    NOT = "NOT",
    NULL = "NULL",
    UNSIGNED = "UNSIGNED",
    AUTO_INCREMENT = "AUTO_INCREMENT",
}

export enum ColumnType {
    DOUBLE = "DOUBLE",
    BOOLEAN = "BOOLEAN",
    TEXT = "TEXT",
    CHAR = "CHAR",
    VARCHAR = "VARCHAR",
    DATETIME = "DATETIME",
    FLOAT = "FLOAT",
    INT = "INT"
}

export enum InvalidationType {
    INSERT = 0x1,
    UPDATE = 0x2,
    DELETE = 0x4,
    INSERT_OR_UPDATE = INSERT | UPDATE,
    INSERT_OR_DELETE = INSERT | DELETE,
    ANY = INSERT | UPDATE | DELETE
}

export interface MediumInWait {
    title: string;
    medium: MediaType;
    link: string;
}
