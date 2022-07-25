import { AsyncLocalStorage, createHook, AsyncResource } from "async_hooks";
import { Optional } from "./types";

const localStorage = new AsyncLocalStorage();

interface HistoryItem {
  duration: number;
  type: string;
  context: string;
}

createHook({
  before() {
    const store: Store | any = localStorage.getStore();

    if (!store || !store.has) {
      return;
    }
    const running = store.get(StoreKey.RUNNING);
    let history: HistoryItem[] = store.get(StoreKey.HISTORY);

    if (running == null) {
      store.set(StoreKey.RUNNING, 0);
    }
    if (!history) {
      history = [];
      store.set(StoreKey.HISTORY, history);
    }
    let waiting = store.get(StoreKey.WAITING);

    if (waiting == null) {
      store.set(StoreKey.WAITING, 0);
      waiting = 0;
    }
    store.set(StoreKey.RUN_START, Date.now());
    const waitStart = store.get(StoreKey.WAIT_START);

    if (waitStart) {
      const now = Date.now();
      const waitingDuration = now - waitStart;

      if (waitingDuration > 0) {
        waiting += waitingDuration;
        const lastEntry = history[history.length - 1];

        if (lastEntry && lastEntry.type === "waiting") {
          lastEntry.duration += waitingDuration;
        } else {
          let context = store.get(StoreKey.CONTEXT);

          if (!context) {
            context = [defaultContext];
            store.set(StoreKey.CONTEXT, context);
          }
          history.push({ duration: waitingDuration, type: "waiting", context: context.join("--") });
        }
        store.set(StoreKey.WAITING, waiting);
      }
    }
  },
  after() {
    const store: Store | unknown = localStorage.getStore();

    if (!store || !(store instanceof Map)) {
      return;
    }
    let running = store.get(StoreKey.RUNNING);

    if (running == null) {
      store.set(StoreKey.RUNNING, 0);
      running = 0;
    }
    let history: HistoryItem[] = store.get(StoreKey.HISTORY);
    if (!history) {
      history = [];
      store.set(StoreKey.HISTORY, history);
    }
    const waiting = store.get(StoreKey.WAITING);

    if (waiting == null) {
      store.set(StoreKey.WAITING, 0);
    }
    store.set(StoreKey.WAIT_START, Date.now());
    const runStart = store.get(StoreKey.RUN_START);

    if (runStart) {
      const now = Date.now();
      const runningDuration = now - runStart;

      if (runningDuration > 0) {
        running += runningDuration;
        const lastEntry = history[history.length - 1];

        if (lastEntry && lastEntry.type === "running") {
          lastEntry.duration += runningDuration;
        } else {
          let context = store.get(StoreKey.CONTEXT) as string[];

          if (!context) {
            context = [defaultContext];
            store.set(StoreKey.CONTEXT, context);
          }

          history.push({ duration: runningDuration, type: "running", context: context.join("--") });
        }
        store.set(StoreKey.RUNNING, running);
      }
    }
  },
}).enable();

export type Store = Map<StoreKey, any>;
const stores = new Map<number, Store>();
const defaultContext = "base";

export function getStore(): Optional<Store> {
  return localStorage.getStore() as Optional<Store>;
}

/**
 * Returns a quite shallow copy of all available stores.
 */
export function getStores(): Map<number, Store> {
  const map = new Map();
  for (const [key, store] of stores.entries()) {
    map.set(key, new Map(store));
  }
  return map;
}

export function setContext(name: string): void {
  const store = localStorage.getStore() as Optional<Store>;
  if (!store) {
    return;
  }
  let context = store.get(StoreKey.CONTEXT);

  if (!context) {
    context = [defaultContext];
    store.set(StoreKey.CONTEXT, context);
  }
  context.push(name);
}

export function removeContext(name: string): void {
  const store = localStorage.getStore() as Optional<Store>;
  if (!store) {
    return;
  }
  let context = store.get(StoreKey.CONTEXT);

  if (!context) {
    context = [defaultContext];
    store.set(StoreKey.CONTEXT, context);
  }
  // remove the last element only if it has the same name as the context to remove
  if (context[context.length - 1] === name) {
    context.pop();
  }
}

type TakeManyFunction<T = any> = (...args: any[]) => T;

/**
 * Run a Function with access to an independent store.
 *
 * Saves the store with access outside of the Store Context,
 * if any id except 0 is given (see getStores).
 *
 * @param id id key to save the store
 * @param store store for the localStorage
 * @param callback function to execute
 * @param args parameter for function
 */
export function runAsync<T extends (...fArgs: any[]) => any>(
  id: number,
  store: Store,
  callback: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> {
  return localStorage.run(store, async () => {
    if (!id) {
      stores.set(id, store);
    }
    try {
      // eslint-disable-next-line n/no-callback-literal
      const result = callback(...args);

      if (result?.then) {
        return await result;
      }
      return result;
    } finally {
      if (!id) {
        stores.delete(id);
      }
    }
  });
}

/**
 * Workaround to wrong documentation/functionality of AsyncResource.bind.
 *
 * 15.06.2021: Works correctly in Node.js 16.3.0. Workaround was removed.
 *
 * @see https://github.com/nodejs/node/issues/36051
 *
 * @param func function to bind to current async execution context
 */
export function bindContext<Func extends TakeManyFunction>(func: Func): Func & { asyncResource: AsyncResource } {
  return AsyncResource.bind(func) as Func & { asyncResource: AsyncResource };
}

/**
 * Possible keys for the Store.
 */
export enum StoreKey {
  RUNNING = "running",
  HISTORY = "history",
  WAITING = "waiting",
  RUN_START = "runStart",
  WAIT_START = "waitStart",
  CONTEXT = "context",
  LABEL = "label",
  QUERY_COUNT = "queryCount",
  MODIFICATIONS = "modifications",
  RESULT = "result",
  MESSAGE = "message",
  NETWORK = "network",
  LAST_RUN = "lastRun",
  ERROR = "error",
}
