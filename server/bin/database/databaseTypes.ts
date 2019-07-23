import {TableSchema} from "./tableSchema";
import {MediaType} from "../tools";

export interface DatabaseSchema {
    readonly name: string;
    readonly tables: ReadonlyArray<TableSchema>;
    readonly mainTable: TableSchema;
    readonly invalidationTable: TableSchema;
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
