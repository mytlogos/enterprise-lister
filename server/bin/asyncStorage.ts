import {AsyncLocalStorage, createHook} from "async_hooks";

const localStorage = new AsyncLocalStorage();

createHook({
    before() {
        const store: Map<any, any> | any = localStorage.getStore();

        if (!store || !store.has) {
            return;
        }
        const running = store.get("running");

        if (running == null) {
            store.set("running", 0);
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
            waiting += now - waitStart;
            store.set("waiting", waiting);
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
        const waiting = store.get("waiting");

        if (waiting == null) {
            store.set("waiting", 0);
        }
        store.set("waitStart", Date.now());
        const runStart = store.get("runStart");

        if (runStart) {
            const now = Date.now();
            running += now - runStart;
            store.set("running", running);
        }
    }
}).enable();

export function getStore(): Map<any, any> {
    return localStorage.getStore() as Map<any, any>;
}

export function runAsync(store: Map<any, any>, callback: (...args: any[]) => void, ...args: any[]): void {
    localStorage.run(store, callback, args);
}

export function runSync<T>(store: Map<any, any>, callback: (...args: any[]) => T, ...args: any[]): T {
    return localStorage.runSyncAndReturn(store, callback, args);
}
