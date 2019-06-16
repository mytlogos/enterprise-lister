import NodeCache, { Callback } from "node-cache";
export interface CacheOptions extends NodeCache.Options {
    size?: number;
}
export declare class Cache extends NodeCache {
    private timeOutId?;
    private readonly size;
    constructor(options?: CacheOptions);
    set<T>(key: string | number, value: T, cb?: Callback<boolean>): boolean;
    flushAll(): void;
    close(): void;
    private _checkPeriodicSize;
    private _checkSize;
}
