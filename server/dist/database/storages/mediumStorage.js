"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storageTools_1 = require("./storageTools");
const storage_1 = require("./storage");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).mediumContext);
}
class MediumStorage {
    removeToc(tocLink) {
        return inContext((context) => context.removeToc(tocLink));
    }
    /**
     * Adds a medium to the storage.
     *
     * @return {Promise<SimpleMedium>}
     */
    addMedium(medium, uuid) {
        return inContext((context) => context.addMedium(medium, uuid));
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getMedium(id, uuid) {
        // @ts-ignore
        return inContext((context) => context.getMedium(id, uuid));
    }
    getAllFull() {
        return inContext((context) => context.getAllMediaFull());
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getAllMedia() {
        return inContext((context) => context.getAllMedia());
    }
    /**
     * Gets one or multiple media from the storage, which are like the input.
     */
    getLikeMedium(likeMedia) {
        // @ts-ignore
        return inContext((context) => context.getLikeMedium(likeMedia));
    }
    /**
     * Updates a medium from the storage.
     */
    updateMedium(medium) {
        return inContext((context) => context.updateMedium(medium));
    }
    /**
     * Updates a mediumToc from the storage.
     */
    updateMediumToc(medium) {
        return inContext((context) => context.updateMediumToc(medium));
    }
    /**
     */
    addSynonyms(synonyms) {
        return inContext((context) => context.addSynonyms(synonyms));
    }
    /**
     */
    addToc(mediumId, link) {
        return inContext((context) => context.addToc(mediumId, link));
    }
    /**
     */
    getTocs(mediumId) {
        return inContext((context) => context.getToc(mediumId));
    }
    /**
     */
    getMediumTocs(mediumId) {
        return inContext((context) => context.getMediumTocs(mediumId));
    }
    /**
     */
    removeMediumToc(mediumId, link) {
        return inContext((context) => context.removeMediumToc(mediumId, link));
    }
    /**
     */
    getAllMediaTocs() {
        return inContext((context) => context.getAllMediaTocs());
    }
    /**
     */
    getAllTocs() {
        return inContext((context) => context.getAllTocs());
    }
    getTocSearchMedia() {
        return inContext((context) => context.getTocSearchMedia());
    }
    getTocSearchMedium(id) {
        return inContext((context) => context.getTocSearchMedium(id));
    }
    /**
     *
     */
    removeSynonyms(synonyms) {
        return inContext((context) => context.removeSynonyms(synonyms));
    }
    /**
     *
     */
    getSynonyms(mediumId) {
        return inContext((context) => context.getSynonyms(mediumId));
    }
    getSimpleMedium(id) {
        return inContext((context) => context.getSimpleMedium(id));
    }
    async mergeMedia(sourceMediumId, destMedium) {
        return inContext((context) => context.mergeMedia(sourceMediumId, destMedium));
    }
    async splitMedium(sourceMediumId, destMedium, toc) {
        return inContext((context) => context.splitMedium(sourceMediumId, destMedium, toc));
    }
    async transferToc(sourceMediumId, destMediumId, toc) {
        return inContext((context) => context.transferToc(sourceMediumId, destMediumId, toc));
    }
}
exports.MediumStorage = MediumStorage;
//# sourceMappingURL=mediumStorage.js.map