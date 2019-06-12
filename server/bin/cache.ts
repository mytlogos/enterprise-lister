import NodeCache, {Callback} from "node-cache";
import {max} from "./tools";
import logger from "./logger";

export interface CacheOptions extends NodeCache.Options {
    size?: number;
}

export class Cache extends NodeCache {
    private timeOutId?: NodeJS.Timeout;
    private readonly size: number;

    constructor(options: CacheOptions = {}) {
        super(options);
        this.size = options.size || 100;
        this._checkPeriodicSize();
    }

    // @ts-ignore
    public set<T>(key: string | number, value: T, cb?: Callback<boolean>): boolean;

    // @ts-ignore
    public set<T>(key: string | number, value: T, ttl: number | string, cb?: Callback<boolean>): boolean {
        const b = super.set(key, value, ttl, cb);
        this._checkSize();
        return b;
    }

    public flushAll(): void {
        super.flushAll();

        if (this.timeOutId) {
            clearTimeout(this.timeOutId);
        }
    }

    public close(): void {
        super.close();

        if (this.timeOutId) {
            clearTimeout(this.timeOutId);
        }
    }

    private _checkPeriodicSize() {
        this._checkSize();
        this.timeOutId = setTimeout(() => this._checkSize(), (this.options.stdTTL || 10) * 1000);
    }

    private _checkSize() {
        const keys = this.keys();

        const overLimit = keys.length - this.size;

        if (overLimit === 1) {
            const maxValue = max(
                keys,
                (previous, current) => (this.getTtl(previous) || 0) - (this.getTtl(current) || 0)
            );

            if (!maxValue) {
                logger.warn(`could not find max value: '${keys}'`);
            } else {
                this.del(maxValue);
            }
        } else if (overLimit > 0) {
            keys.sort((a, b) => (this.getTtl(a) || 0) - (this.getTtl(b) || 0));
            this.del(keys.slice(0, overLimit));
        }
    }
}
