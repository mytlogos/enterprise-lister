import {AsyncLocalStorage, createHook} from "async_hooks";

const localStorage = new AsyncLocalStorage();

interface HistoryItem {
    duration: number;
    type: string;
    context: string;
}

createHook({
    before() {
        const store: Map<any, any> | any = localStorage.getStore();

        if (!store || !store.has) {
            return;
        }
        const running = store.get("running");
        let history: HistoryItem[] = store.get("history");

        if (running == null) {
            store.set("running", 0);
        }
        if (!history) {
            history = [];
            store.set("history", history);
        }
        let waiting = store.get("waiting");

        if (waiting == null) {
            store.set("waiting", 0);
            waiting = 0;
        }
        store.set("runStart", Date.now());
        const waitStart = store.get("waitStart");

        if (waitStart) {
            const now = Date.now();
            const waitingDuration = now - waitStart;
            
            if (waitingDuration > 0) {
                waiting += waitingDuration;
                const lastEntry = history[history.length - 1];

                if (lastEntry && lastEntry.type === "waiting") {
                    lastEntry.duration += waitingDuration;
                } else {
                    let context = store.get("context");

                    if (!context) {
                        context = [defaultContext];
                        store.set("context", context);
                    }
                    history.push({duration: waitingDuration, type: "waiting", context: context.join("--")});
                }
                store.set("waiting", waiting);
            }
        }
    },
    after() {
        const store: Map<any, any> | any = localStorage.getStore();

        if (!store || !store.has) {
            return;
        }
        let running = store.get("running");

        if (running == null) {
            store.set("running", 0);
            running = 0;
        }
        let history: HistoryItem[] = store.get("history");
        if (!history) {
            history = [];
            store.set("history", history);
        }
        const waiting = store.get("waiting");

        if (waiting == null) {
            store.set("waiting", 0);
        }
        store.set("waitStart", Date.now());
        const runStart = store.get("runStart");

        if (runStart) {
            const now = Date.now();
            const runningDuration = now - runStart;

            if (runningDuration > 0) {
                running += runningDuration;
                const lastEntry = history[history.length - 1];

                if (lastEntry && lastEntry.type === "running") {
                    lastEntry.duration += runningDuration;
                } else {
                    let context = store.get("context") as string[];

                    if (!context) {
                        context = [defaultContext];
                        store.set("context", context);
                    }

                    history.push({duration: runningDuration, type: "running", context: context.join("--")});
                }
                store.set("running", running);
            }
        }
    }
}).enable();

const stores = new Map<number, Map<string, any>>();
const defaultContext = "base";

export function getStore(): Map<string, any> {
    return localStorage.getStore() as Map<string, any>;
}

/**
 * Returns a quite shallow copy of all available stores.
 */
export function getStores(): Map<number, Map<string, any>> {
    const map = new Map()
    for (const [key, store] of stores.entries()) {
        map.set(key, new Map(store));
    }
    return map;
}

export function setContext(name: string): void {
    const store = localStorage.getStore() as Map<string, any> | undefined;
    if (!store) {
        return;
    }
    let context = store.get("context");

    if (!context) {
        context = [defaultContext];
        store.set("context", context);
    }
    context.push(name);
}

export function removeContext(name: string): void {
    const store = localStorage.getStore() as Map<string, any> | undefined;
    if (!store) {
        return;
    }
    let context = store.get("context");

    if (!context) {
        context = [defaultContext];
        store.set("context", context);
    }
    // remove the last element only if it has the same name as the context to remove
    if (context[context.length - 1] === name) {
        context.pop();
    }
}

export function runAsync(id: number, store: Map<string, any>, callback: (...args: any[]) => void, ...args: any[]): void {
    localStorage.run(
        store,
        async () => {
            stores.set(id, store);
            try {
                const result = callback(...args);

                // @ts-expect-error
                if (result && result.then) {
                    await result;
                }
            } finally {
                stores.delete(id);
            }
        },
        args
    );
}
