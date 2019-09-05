"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).internalListContext);
}
class InternalListStorage {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    addList(uuid, list) {
        return inContext((context) => context.addList(uuid, list));
    }
    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<SimpleMedium>}>}
     */
    getList(listId, media, uuid) {
        return inContext((context) => context.getList(listId, media, uuid));
    }
    /**
     * Updates the properties of a list.
     */
    updateList(list) {
        return inContext((context) => context.updateList(list));
    }
    /**
     * Deletes a list irreversibly.
     */
    deleteList(listId, uuid) {
        return inContext((context) => context.deleteList(listId, uuid));
    }
    /**
     * Returns all available lists for the given user.
     *
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid) {
        return inContext((context) => context.getUserLists(uuid));
    }
    /**
     * Adds a medium to a list.
     */
    addItemToList(listId, mediumId) {
        return inContext((context) => context.addItemToList({ listId, id: mediumId }));
    }
    /**
     * Moves a medium from an old list to a new list.
     */
    moveMedium(oldListId, newListId, mediumId) {
        return inContext((context) => context.moveMedium(oldListId, newListId, mediumId));
    }
    /**
     * Removes an item from a list.
     */
    removeMedium(listId, mediumId) {
        return inContext((context) => context.removeMedium(listId, mediumId));
    }
}
exports.InternalListStorage = InternalListStorage;
//# sourceMappingURL=internalListStorage.js.map