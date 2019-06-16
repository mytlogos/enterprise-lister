import { TableBuilder } from "./tableBuilder";
import { DatabaseSchema, InvalidationType } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
export declare class DataBaseBuilder {
    readonly tables: TableSchema[];
    private readonly invalidations;
    private name?;
    build(): DatabaseSchema;
    addTable(table: TableSchema, invalidations: Array<{
        type: InvalidationType;
        table?: string;
    }>): this;
    getTableBuilder(): TableBuilder;
    setName(name: string): this;
}
