import {TableSchema} from "./tableSchema";
import {MediaType} from "../tools";
import {Trigger} from "./trigger";
import {DatabaseContext} from "./contexts/databaseContext";

export interface DatabaseSchema {
    readonly version: number;
    readonly triggers: readonly Trigger[];
    readonly name: string;
    readonly tables: readonly TableSchema[];
    readonly mainTable: TableSchema;
    readonly invalidationTable: TableSchema;
    readonly migrations: readonly Migration[];
}

// for operations which alter things, like tables and cannot be done by simple insert or delete operations
export interface Migration {
    readonly fromVersion: number;
    readonly toVersion: number;

    migrate(context: DatabaseContext): Promise<void>;
}

export enum SqlFunction {
    NOW = "NOW()",
    CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP"
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
    TIMESTAMP = "TIMESTAMP",
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

export interface ConnectionContext {
    startTransaction(): Promise<void>;

    commit(): Promise<void>;

    rollback(): Promise<void>;
}

export interface ChangeUser {
    name?: string;
    newPassword?: string;
    password?: string;
}

export interface NewsItemRequest {
    uuid: string;
    since?: Date;
    till?: Date;
    newsIds?: number[];
}
