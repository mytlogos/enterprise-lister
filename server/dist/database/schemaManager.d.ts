import { DatabaseSchema } from "./databaseTypes";
import { DatabaseContext } from "./contexts/databaseContext";
export declare class SchemaManager {
    private databaseName;
    private dataBaseVersion;
    private tables;
    private mainTable;
    private trigger;
    private migrations;
    initTableSchema(database: DatabaseSchema): void;
    checkTableSchema(context: DatabaseContext): Promise<void>;
    private getShortest;
}
