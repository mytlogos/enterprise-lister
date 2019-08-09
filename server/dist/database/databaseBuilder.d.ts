import { TableBuilder } from "./tableBuilder";
import { DatabaseSchema, InvalidationType, Migration } from "./databaseTypes";
import { TableSchema } from "./tableSchema";
import { Trigger } from "./trigger";
import { TriggerBuilder } from "./triggerBuilder";
export declare class DataBaseBuilder {
    readonly tables: TableSchema[];
    private readonly triggers;
    private readonly invalidations;
    private readonly migrations;
    private readonly name;
    private readonly version;
    constructor(name: string, version: number);
    build(): DatabaseSchema;
    addMigrations(...migrations: Migration[]): void;
    addTrigger(trigger: Trigger): void;
    addTable(table: TableSchema, invalidations: Array<{
        type: InvalidationType;
        table?: string;
    }>): this;
    getTableBuilder(): TableBuilder;
    getTriggerBuilder(): TriggerBuilder;
}
