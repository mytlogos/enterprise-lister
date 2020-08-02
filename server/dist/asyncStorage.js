"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async_hooks_1 = require("async_hooks");
const localStorage = new async_hooks_1.AsyncLocalStorage();
async_hooks_1.createHook({
    before() {
        const store = localStorage.getStore();
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
        const store = localStorage.getStore();
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
function getStore() {
    return localStorage.getStore();
}
exports.getStore = getStore;
function runAsync(store, callback, ...args) {
    localStorage.run(store, callback, args);
}
exports.runAsync = runAsync;
function runSync(store, callback, ...args) {
    return localStorage.runSyncAndReturn(store, callback, args);
}
exports.runSync = runSync;
//# sourceMappingURL=asyncStorage.js.map