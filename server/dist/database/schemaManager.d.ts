import { DatabaseSchema } from "./databaseTypes";
import { QueryContext } from "./queryContext";
export declare class SchemaManager {
    private databaseName;
    private dataBaseVersion;
    private tables;
    private mainTable;
    private trigger;
    private migrations;
    initTableSchema(database: DatabaseSchema): void;
    checkTableSchema(context: QueryContext): Promise<void>;
    private getShortest;
}
