"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SubStorage {
    constructor(parentContext) {
        this.parentContext = parentContext;
    }
    query(query, parameter) {
        return this.parentContext.query(query, parameter);
    }
    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     */
    async delete(table, ...condition) {
        return this.parentContext.delete(table, ...condition);
    }
    /**
     * Updates data from the storage.
     */
    async update(table, cb, ...condition) {
        return this.parentContext.update(table, cb, ...condition);
    }
    multiInsert(query, value, paramCallback) {
        return this.parentContext.multiInsert(query, value, paramCallback);
    }
    async queryInList(query, value, afterQuery, paramCallback) {
        return this.parentContext.queryInList(query, value, afterQuery, paramCallback);
    }
    queryStream(query, parameter) {
        return this.parentContext.queryStream(query, parameter);
    }
}
exports.SubStorage = SubStorage;
//# sourceMappingURL=subStorage.js.map