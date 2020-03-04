"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storageTools_1 = require("./storageTools");
const storage_1 = require("./storage");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).episodeContext);
}
class EpisodeStorage {
    getAll(uuid) {
        return inContext((context) => context.getAll(uuid));
    }
    getAllReleases() {
        return inContext((context) => context.getAllReleases());
    }
    /**
     * Gets one or multiple media from the storage.
     */
    getLatestReleases(mediumId) {
        return inContext((context) => context.getLatestReleases(mediumId));
    }
    getAssociatedEpisode(url) {
        return inContext((context) => context.getAssociatedEpisode(url));
    }
    /**
     */
    getChapterIndices(mediumId) {
        return inContext((context) => context.getChapterIndices(mediumId));
    }
    getAllChapterLinks(mediumId) {
        return inContext((context) => context.getAllChapterLinks(mediumId));
    }
    getPartsEpisodeIndices(partId) {
        return inContext((context) => context.getPartsEpisodeIndices(partId));
    }
    /**
     * Adds a episode of a part to the storage.
     */
    // @ts-ignore
    addEpisode(episode) {
        // @ts-ignore
        return inContext((context) => context.addEpisode(episode));
    }
    /**
     * Updates an episode from the storage.
     */
    updateEpisode(episode) {
        return inContext((context) => context.updateEpisode(episode));
    }
    moveEpisodeToPart(oldPartId, newPartId) {
        return inContext((context) => context.moveEpisodeToPart(oldPartId, newPartId));
    }
    /**
     * Gets an episode from the storage.
     */
    getEpisode(id, uuid) {
        // @ts-ignore
        return inContext((context) => context.getEpisode(id, uuid));
    }
    getReleases(episodeId) {
        return inContext((context) => context.getReleases(episodeId));
    }
    getReleasesByHost(episodeId, host) {
        return inContext((context) => context.getReleasesByHost(episodeId, host));
    }
    getPartEpisodePerIndex(partId, index) {
        // @ts-ignore
        return inContext((context) => context.getPartEpisodePerIndex(partId, index));
    }
    getMediumEpisodePerIndex(mediumId, index, ignoreRelease = false) {
        return inContext((context) => context.getMediumEpisodePerIndex(mediumId, index, ignoreRelease));
    }
    /**
     * Deletes an episode from the storage irreversibly.
     */
    deleteEpisode(id) {
        return inContext((context) => context.deleteEpisode(id));
    }
    addRelease(releases) {
        // @ts-ignore
        return inContext((context) => context.addRelease(releases));
    }
    updateRelease(releases) {
        return inContext((context) => context.updateRelease(releases));
    }
    getSourcedReleases(sourceType, mediumId) {
        return inContext((context) => context.getSourcedReleases(sourceType, mediumId));
    }
    deleteRelease(release) {
        return inContext((context) => context.deleteRelease(release));
    }
    getEpisodeLinks(episodeIds) {
        return inContext((context) => context.getEpisodeLinks(episodeIds));
    }
    getEpisodeContent(chapterLink) {
        return inContext((context) => context.getEpisodeContentData(chapterLink));
    }
    /**
     *
     */
    setProgress(uuid, progressResult) {
        return inContext((context) => context.setProgress(uuid, progressResult));
    }
    /**
     * Add progress of an user in regard to an episode to the storage.
     */
    addProgress(uuid, episodeId, progress, readDate) {
        return inContext((context) => context.addProgress(uuid, episodeId, progress, readDate));
    }
    /**
     * Removes progress of an user in regard to an episode.
     */
    removeProgress(uuid, episodeId) {
        return inContext((context) => context.removeProgress(uuid, episodeId));
    }
    /**
     * Get the progress of an user in regard to an episode.
     */
    getProgress(uuid, episodeId) {
        return inContext((context) => context.getProgress(uuid, episodeId));
    }
    /**
     * Updates the progress of an user in regard to an episode.
     */
    updateProgress(uuid, mediumId, progress, readDate) {
        return inContext((context) => context.updateProgress(uuid, mediumId, progress, readDate));
    }
    /**
     * Marks these news as read for the given user.
     */
    markEpisodeRead(uuid, result) {
        return inContext((context) => context.markEpisodeRead(uuid, result));
    }
}
exports.EpisodeStorage = EpisodeStorage;
//# sourceMappingURL=episodeStorage.js.map