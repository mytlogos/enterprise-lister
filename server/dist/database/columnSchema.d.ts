import { ColumnType, Modifier, SqlFunction } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
export declare class ColumnSchema {
    readonly name: string;
    table: TableSchema | null;
    readonly type: ColumnType;
    readonly typeSize?: number;
    readonly modifiers: Modifier[];
    readonly primaryKey?: boolean;
    readonly foreignKey?: ColumnSchema;
    readonly default?: any | SqlFunction;
    readonly primaryKeyTypeSize?: number;
    constructor(name: string, type: ColumnType, modifiers: Modifier[], typeSize?: number, primaryKey?: boolean, foreignKey?: ColumnSchema, defaultV?: any | SqlFunction, primaryKeyTypeSize?: number);
    getSchema(): string;
}
