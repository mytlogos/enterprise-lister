import { OkPacket } from "mysql";
import { getStore } from "../asyncStorage";
import { getElseSet, getElseSetObj } from "../tools";

interface Modification {
    created: number;
    deleted: number;
    updated: number;
}

export type QueryType = "select" | "update" | "insert" | "delete";
export type ModificationKey = "progress" | "result_episode" | "medium" | "part" | "episode" | "release" | "list" | "external_list" | "external_user" | "user" | "list_item" | "external_list_item" | "job" | "synonym" | "toc" | "news";

/**
 * Store the type of modification in the Async Storage associated with this context.
 * 
 * @param key 
 */
export function storeModifications(key: ModificationKey, queryType: QueryType, result: OkPacket): void {
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