"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Counter {
    constructor() {
        this.map = new Map();
        this.ignoreKeys = [];
    }
    count(key) {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 1 : previous + 1;
        this.map.set(key, current);
        return current;
    }
    countDown(key) {
        const previous = this.map.get(key);
        if (this.ignoreKeys.includes(key)) {
            return previous || 0;
        }
        const current = !previous ? 0 : previous - 1;
        this.map.set(key, current);
        return current;
    }
    isIgnored(key) {
        return this.ignoreKeys.includes(key);
    }
    ignore(key) {
        this.ignoreKeys.push(key);
    }
    unIgnore(key) {
        const index = this.ignoreKeys.findIndex((value) => value === key);
        if (index >= 0) {
            this.ignoreKeys.splice(index, 1);
        }
    }
    getCount(key) {
        const previous = this.map.get(key);
        return previous ? previous : 0;
    }
}
exports.Counter = Counter;
//# sourceMappingURL=counter.js.map