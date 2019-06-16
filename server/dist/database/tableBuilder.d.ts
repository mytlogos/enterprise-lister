import { DataBaseBuilder } from "./databaseBuilder";
import { ColumnBuilder } from "./columnBuilder";
import { TableSchema } from "./tableSchema";
import { ColumnSchema } from "./columnSchema";
import { InvalidationType } from "./databaseTypes";
export declare class TableBuilder {
    private columns;
    private name?;
    private main?;
    private invalidationTable?;
    private invalidationColumn?;
    private readonly databaseBuilder;
    private readonly stubTable;
    private readonly invalidations;
    constructor(databaseBuilder: DataBaseBuilder);
    setInvalidationTable(): this;
    parseColumn(column: string): this;
    setMain(): this;
    parseMeta(data: string): this;
    getColumnBuilder(): ColumnBuilder;
    addColumn(column: ColumnSchema): this;
    setName(name: string): this;
    addInvalidation(type: InvalidationType, tableName?: string): this;
    build(): TableSchema;
}
