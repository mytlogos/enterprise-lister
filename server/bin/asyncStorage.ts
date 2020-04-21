import {AsyncLocalStorage} from "async_hooks";

const localStorage = new AsyncLocalStorage();

export function getStore(): Map<any, any> {
    return localStorage.getStore() as Map<any, any>;
}

export function run(callback: (...args: any[]) => void, ...args: any[]): void {
    localStorage.run(new Map(), callback, args);
}

export function runSync<T>(callback: (...args: any[]) => T, ...args: any[]): T {
    return localStorage.runSyncAndReturn(new Map(), callback, args);
}
