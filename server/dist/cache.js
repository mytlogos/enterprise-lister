"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cache_1 = tslib_1.__importDefault(require("node-cache"));
const tools_1 = require("./tools");
const logger_1 = tslib_1.__importDefault(require("./logger"));
class Cache extends node_cache_1.default {
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
        // @ts-ignore
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
            const maxValue = tools_1.max(keys, (previous, current) => (this.getTtl(previous) || 0) - (this.getTtl(current) || 0));
            if (!maxValue) {
                logger_1.default.warn(`could not find max value: '${keys}'`);
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
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map