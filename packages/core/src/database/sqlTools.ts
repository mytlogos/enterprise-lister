import { QueryResult } from "pg";
import { getStore, StoreKey } from "../asyncStorage";
import { getElseSet, getElseSetObj } from "../tools";

interface Modification {
  created: number;
  deleted: number;
  updated: number;
}

export type QueryType = "select" | "update" | "insert" | "delete";
export type ModificationKey =
  | "progress"
  | "medium"
  | "part"
  | "episode"
  | "release"
  | "list"
  | "external_list"
  | "external_user"
  | "user"
  | "list_item"
  | "external_list_item"
  | "job"
  | "synonym"
  | "toc"
  | "news"
  | "medium_in_wait"
  | "scraper_hook"
  | "custom_hook";

/**
 * Store the type of modification in the Async Storage associated with this context.
 *
 * @param key
 */
export function storeModifications(key: ModificationKey, queryType: QueryType, result: QueryResult<any>): void {
  if (!result.rowCount) {
    return;
  }
  const store = getStore();

  if (!store) {
    return;
  }
  const modifications = getElseSet(store, StoreKey.MODIFICATIONS, () => ({}));
  const modification: Modification = getElseSetObj(modifications, key, () => {
    return { created: 0, deleted: 0, updated: 0 };
  });

  if (queryType === "delete") {
    modification.deleted += result.rowCount;
  } else if (queryType === "insert") {
    modification.created += result.rowCount;
  } else if (queryType === "update") {
    modification.updated += result.rowCount;
  }
}

type CountKey = StoreKey.QUERY_COUNT;

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

/**
 * Returns a comma separated list of only integers.
 * @param numbers ids
 */
export function toSqlList(numbers: number[]): string {
  return numbers.filter(Number.isSafeInteger).join(",");
}
