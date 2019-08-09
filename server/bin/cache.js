import NodeCache from "node-cache";
import { max } from "./tools";
import logger from "./logger";
export class Cache extends NodeCache {
    constructor(options = {}) {
        super(options);
        this.maxSize = options.size || 100;
        this._checkPeriodicSize();
    }
    isFull() {
        return this.keys().length >= this.maxSize;
    }
    // @ts-ignore
    set(key, value, ttl, cb) {
        const b = super.set(key, value, ttl, cb);
        this._trimSize();
        return b;
    }
    flushAll() {
        super.flushAll();
        if (this.timeOutId) {
            clearTimeout(this.timeOutId);
        }
    }
    close() {
        super.close();
        if (this.timeOutId) {
            clearTimeout(this.timeOutId);
        }
    }
    _checkPeriodicSize() {
        this._trimSize();
        this.timeOutId = setTimeout(() => this._trimSize(), (this.options.stdTTL || 10) * 1000);
    }
    _trimSize() {
        const keys = this.keys();
        const overLimit = keys.length - this.maxSize;
        if (overLimit === 1) {
            const maxValue = max(keys, (previous, current) => (this.getTtl(previous) || 0) - (this.getTtl(current) || 0));
            if (!maxValue) {
                logger.warn(`could not find max value: '${keys}'`);
            }
            else {
                this.del(maxValue);
            }
        }
        else if (overLimit > 0) {
            keys.sort((a, b) => (this.getTtl(a) || 0) - (this.getTtl(b) || 0));
            this.del(keys.slice(0, overLimit));
        }
    }
}
//# sourceMappingURL=cache.js.map