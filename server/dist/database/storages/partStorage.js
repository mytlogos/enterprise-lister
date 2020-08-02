"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).partContext);
}
class PartStorage {
    getAll() {
        return inContext((context) => context.getAll());
    }
    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumParts(mediumId, uuid) {
        return inContext((context) => context.getMediumParts(mediumId, uuid));
    }
    /**
     * Returns all parts of an medium with their episodes.
     */
    getMediumPartIds(mediumId) {
        return inContext((context) => context.getMediumPartIds(mediumId));
    }
    getStandardPart(mediumId) {
        return inContext((context) => context.getStandardPart(mediumId));
    }
    getStandardPartId(mediumId) {
        return inContext((context) => context.getStandardPartId(mediumId));
    }
    /**
     * Returns parts of an medium with specific totalIndex.
     * If there is no such part, it returns an object with only the totalIndex as property.
     */
    getMediumPartsPerIndex(mediumId, index) {
        return inContext((context) => context.getMediumPartsPerIndex(mediumId, index));
    }
    /**
     * Returns one or multiple parts with their episode.
     */
    getParts(partsId, uuid) {
        // @ts-ignore
        return inContext((context) => context.getParts(partsId, uuid));
    }
    /**
     * Returns a Map of Parts with their corresponding episodeIds.
     */
    getPartItems(partsId) {
        // @ts-ignore
        return inContext((context) => context.getPartItems(partsId));
    }
    /**
     * Returns a Map of Parts with all of their Releases.
     */
    getPartReleases(partsId) {
        // @ts-ignore
        return inContext((context) => context.getPartReleases(partsId));
    }
    /**
     * Adds a part of an medium to the storage.
     */
    addPart(part) {
        return inContext((context) => context.addPart(part));
    }
    /**
     * Updates a part.
     */
    updatePart(part) {
        return inContext((context) => context.updatePart(part));
    }
    /**
     * Creates the Standard Part for all non part-indexed episodes for the given mediumId.
     */
    createStandardPart(mediumId) {
        return inContext((context) => context.createStandardPart(mediumId));
    }
    /**
     * Deletes a part from the storage.
     */
    deletePart(id) {
        return inContext((context) => context.deletePart(id));
    }
    getOverLappingParts(standardId, nonStandardPartIds) {
        return inContext((context) => context.getOverLappingParts(standardId, nonStandardPartIds));
    }
}
exports.PartStorage = PartStorage;
//# sourceMappingURL=partStorage.js.map