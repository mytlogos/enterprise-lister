import { OkPacket } from "mysql";
import { getStore } from "../asyncStorage";
import { getElseSet, getElseSetObj, isString } from "../tools";
import { ConnectionContext } from "./databaseTypes";
import { SubContext } from "./contexts/subContext";
import { storageInContext } from "./storages/storage"
import { ContextCallback, queryContextProvider } from "./storages/storageTools";
import { QueryContext } from "./contexts/queryContext";
import { EpisodeContext } from "./contexts/episodeContext";

interface Modification {
    created: number;
    deleted: number;
    updated: number;
}

export type QueryType = "select" | "update" | "insert" | "delete";
export type ModificationKey = "progress" | "result_episode" | "medium" | "part" | "episode" | "release" | "list" | "external_list" | "external_user" | "user" | "list_item" | "external_list_item" | "job" | "synonym" | "toc" | "news" | "medium_in_wait";

/**
 * Store the type of modification in the Async Storage associated with this context.
 * 
 * @param key 
 */
export function storeModifications(key: ModificationKey, queryType: QueryType, result: OkPacket): void {
    if (!result.affectedRows || (!result.changedRows && queryType === "update")) {
        return;
    }
    const store = getStore();

    if (!store) {
        return;
    }
    const modifications = getElseSet(store, "modifications", () => { return {}; });
    const modification: Modification = getElseSetObj(modifications, key, () => { return { created: 0, deleted: 0, updated: 0 }; });
    
    if (queryType === "delete") {
        modification.deleted += result.affectedRows;
    } else if (queryType === "insert") {
        modification.created += result.affectedRows;
    } else if (queryType === "update") {
        modification.updated += result.changedRows;
    }
}

type CountKey = "queryCount";

/**
 * Increases the counter for the given key.
 * 
 * @param key
 */
export function storeCount(key: CountKey): void {
    const store = getStore();

    if (!store) {
        return;
    }
    const count = store.get(key) || 0;
    store.set(key, count + 1);
}

type StringKeys<T> = keyof T & string;

type ContextGetter = "episodeContext" | "mediumContext" | "databaseContext" | "jobContext" | "userContext" | "partContext" | "newsContext" | "externalListContext" | "externalUserContext" | "internalListContext" | "mediumInWaitContext";
type ContextProp = keyof QueryContext & ContextGetter;

function inContext<T, C extends SubContext>(callback: ContextCallback<T, C>, context: ContextProp) {
    return storageInContext(callback, (con) => queryContextProvider(con)[context] as unknown as C, true);
}

export function ContextProxyFactory<T extends SubContext, K extends StringKeys<T>>(contextName: ContextProp, omitted: K[]): new() => Omit<T, K> {
    const hiddenProps: K[] = [...omitted];
    return function ContextProxy() {
        return new Proxy(
            {},
            {
                get(_target, prop) {
                    // @ts-expect-error
                    if (isString(prop) && hiddenProps.includes(prop)) {
                        return () => {
                            throw TypeError(`Property '${prop}' is not accessible`);
                        };
                    }
                    // @ts-expect-error
                    return (...args: any[]) => inContext<any, T>(context => context[prop](...args), contextName);
                }
            }
        ) as unknown as Omit<T, K>;
    } as unknown as new() => Omit<T, K>;
}

export function SubContextProxyFactory<T extends SubContext, K extends StringKeys<T> = keyof SubContext>(context: ContextProp, omitted?: K[]): new() => Omit<T, K>  {
    return ContextProxyFactory<T, K | keyof SubContext>(
        context,
        [
            "commit",
            "dmlQuery",
            "parentContext",
            "query",
            "rollback",
            "startTransaction",
            ...(omitted || [])
        ]
    ) as unknown as new() => Omit<T, K>;
}

export function createStorage<T extends SubContext, K extends StringKeys<T> = keyof SubContext>(context: ContextProp): Omit<T, K> {
    return new (SubContextProxyFactory<T, K>(context))();
}