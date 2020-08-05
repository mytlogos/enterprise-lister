import { TableSchema } from "./tableSchema";
import { MediaType } from "../tools";
import { Trigger } from "./trigger";
import { DatabaseContext } from "./contexts/databaseContext";
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
    migrate(context: DatabaseContext): Promise<void>;
}
export declare enum SqlFunction {
    NOW = "NOW()",
    CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP"
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
    TIMESTAMP = "TIMESTAMP",
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
