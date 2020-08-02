"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storageTools_1 = require("./storageTools");
const storage_1 = require("./storage");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).externalListContext);
}
class ExternalListStorage {
    /**
     * Adds an external list of an user to the storage.
     */
    addExternalList(userUuid, externalList) {
        return inContext((context) => context.addExternalList(userUuid, externalList));
    }
    /**
     * Updates an external list.
     */
    updateExternalList(externalList) {
        return inContext((context) => context.updateExternalList(externalList));
    }
    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(externalUuid, externalListId) {
        return inContext((context) => context.removeExternalList(externalUuid, externalListId));
    }
    /**
     * Gets an external list from the storage.
     */
    getExternalList(id) {
        return inContext((context) => context.getExternalList(id));
    }
    /**
     * Gets all external lists from the externalUser from the storage.
     */
    getExternalLists(uuid) {
        return inContext((context) => context.getExternalUserLists(uuid));
    }
    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId, mediumId) {
        return inContext((context) => context.addItemToList({ listId, id: mediumId }));
    }
    /**
     * Removes a medium from an external list in the storage.
     */
    removeItemFromExternalList(listId, mediumId) {
        return inContext((context) => context.removeMedium(listId, mediumId));
    }
}
exports.ExternalListStorage = ExternalListStorage;
//# sourceMappingURL=externalListStorage.js.map