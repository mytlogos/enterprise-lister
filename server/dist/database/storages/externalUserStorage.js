"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storageTools_1 = require("./storageTools");
const storage_1 = require("./storage");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).externalUserContext);
}
class ExternalUserStorage {
    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid, externalUser) {
        return inContext((context) => context.addExternalUser(localUuid, externalUser));
    }
    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid, uuid) {
        // TODO: 27.02.2020 use uuid to check if uuid owns externalUser
        return inContext((context) => context.deleteExternalUser(externalUuid));
    }
    /**
     * Gets an external user.
     */
    getExternalUser(uuid) {
        return inContext((context) => context.getExternalUser(uuid));
    }
    /**
     * Gets an external user with cookies, without items.
     */
    getExternalUserWithCookies(uuid) {
        return inContext((context) => context.getExternalUserWithCookies(uuid));
    }
    /**
     *
     */
    getScrapeExternalUser() {
        return inContext((context) => context.getScrapeExternalUser());
    }
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser) {
        return inContext((context) => context.updateExternalUser(externalUser));
    }
}
exports.ExternalUserStorage = ExternalUserStorage;
//# sourceMappingURL=externalUserStorage.js.map