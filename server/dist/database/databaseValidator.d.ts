import { DatabaseSchema } from "./databaseTypes";
import { MultiSingle } from "../types";
import { DatabaseContext } from "./contexts/databaseContext";
interface StateProcessor {
    addSql<T>(query: string, parameter: MultiSingle<any>, value: T, uuid?: string): T;
    startRound(): Promise<string[]>;
    checkTables(tables: any, track: string[], ignore: string[]): void;
    initTableSchema(database: DatabaseSchema): void;
    checkTableSchema(context: DatabaseContext): Promise<void>;
    validateQuery(query: string, parameter: any): Promise<void>;
}
export declare const StateProcessor: StateProcessor;
export {};
