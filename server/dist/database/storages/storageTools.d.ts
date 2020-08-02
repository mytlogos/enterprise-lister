import { Connection } from "promise-mysql";
import { QueryContext } from "../contexts/queryContext";
import { ConnectionContext } from "../databaseTypes";
export declare type ContextCallback<T, C extends ConnectionContext> = (context: C) => Promise<T>;
export declare type ContextProvider<C extends ConnectionContext> = (con: Connection) => C;
export declare const queryContextProvider: ContextProvider<QueryContext>;
/**
 * Escapes the Characters for an Like with the '|' char.
 */
export declare function escapeLike(s: string, { singleQuotes, noBoundaries, noRightBoundary, noLeftBoundary }?: {
    singleQuotes?: boolean;
    noBoundaries?: boolean;
    noRightBoundary?: boolean;
    noLeftBoundary?: boolean;
}): string;
