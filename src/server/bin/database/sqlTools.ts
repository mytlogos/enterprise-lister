import { OkPacket } from "mysql";
import { getStore } from "../asyncStorage";
import { getElseSet, getElseSetObj } from "../tools";

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