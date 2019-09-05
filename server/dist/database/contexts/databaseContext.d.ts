import { Trigger } from "../trigger";
import { DbTrigger, QueryContext } from "./queryContext";
import { SubContext } from "./subContext";
export declare class DatabaseContext extends SubContext {
    constructor(parentContext: QueryContext);
    getDatabaseVersion(): Promise<Array<{
        version: number;
    }>>;
    updateDatabaseVersion(version: number): Promise<number>;
    createDatabase(): Promise<void>;
    getTables(): Promise<any[]>;
    getTriggers(): Promise<DbTrigger[]>;
    createTrigger(trigger: Trigger): any;
    dropTrigger(trigger: string): Promise<any>;
    createTable(table: string, columns: string[]): Promise<any>;
    addColumn(tableName: string, columnDefinition: string): Promise<any>;
    alterColumn(tableName: string, columnDefinition: string): Promise<any>;
    changeColumn(tableName: string, oldName: string, newName: string, columnDefinition: string): Promise<any>;
    addUnique(tableName: string, indexName: string, ...columns: string[]): Promise<any>;
    dropIndex(tableName: string, indexName: string): Promise<any>;
    addForeignKey(tableName: string, constraintName: string, column: string, referencedTable: string, referencedColumn: string, onDelete?: string, onUpdate?: string): Promise<any>;
    dropForeignKey(tableName: string, indexName: string): Promise<any>;
    addPrimaryKey(tableName: string, ...columns: string[]): Promise<any>;
    dropPrimaryKey(tableName: string): Promise<any>;
}
