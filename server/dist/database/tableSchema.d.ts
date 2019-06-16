import { InvalidationType } from "./databaseTypes";
import { ColumnSchema } from "./columnSchema";
export declare class TableSchema {
    readonly columns: ColumnSchema[];
    readonly foreignKeys: ColumnSchema[];
    readonly primaryKeys: ColumnSchema[];
    readonly name: string;
    readonly invalidations: Array<{
        type: InvalidationType;
        table: TableSchema;
    }>;
    readonly main: boolean;
    readonly invalidationColumn?: string;
    readonly invalidationTable: boolean;
    mainDependent?: boolean;
    constructor(columns: ColumnSchema[], name: string, main?: boolean, invalidationCol?: string, invalidTable?: boolean);
    getTableSchema(): {
        name: string;
        columns: string[];
    };
    getSchema(): string;
}
