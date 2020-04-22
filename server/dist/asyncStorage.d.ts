export declare function getStore(): Map<any, any>;
export declare function runAsync(store: Map<any, any>, callback: (...args: any[]) => void, ...args: any[]): void;
export declare function runSync<T>(store: Map<any, any>, callback: (...args: any[]) => T, ...args: any[]): T;
