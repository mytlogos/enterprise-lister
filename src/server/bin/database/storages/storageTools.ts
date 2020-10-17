import {Connection} from "promise-mysql";
import {QueryContext} from "../contexts/queryContext";
import {ConnectionContext} from "../databaseTypes";

export type ContextCallback<T, C extends ConnectionContext> = (context: C) => Promise<T>;
export type ContextProvider<C extends ConnectionContext> = (con: Connection) => C;
export const queryContextProvider: ContextProvider<QueryContext> = (con) => new QueryContext(con);

/**
 * Escapes the Characters for an Like with the '|' char.
 */
export function escapeLike(
    s: string,
    {
        singleQuotes = false,
        noBoundaries = false,
        noRightBoundary = false,
        noLeftBoundary = false
    }: {
        singleQuotes?: boolean;
        noBoundaries?: boolean;
        noRightBoundary?: boolean;
        noLeftBoundary?: boolean;
    } = {}
): string {

    if (!s) {
        return "";
    }
    s = s.replace(/([%_])/g, "|$1");

    if (singleQuotes) {
        s = s.replace(/[`´'‘]/g, "_");
    }
    if (noBoundaries) {
        s = "%" + s + "%";
    } else if (noLeftBoundary) {
        s = "%" + s;
    } else if (noRightBoundary) {
        s = s + "%";
    }
    return s;
}
