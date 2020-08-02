"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).newsContext);
}
class NewsStorage {
    /**
     * Inserts a News item into the Storage.
     * Returns a News item with id if insert was successful.
     * Returns undefined (or an Array with undefined)
     * if insert was not successful (meaning it was an duplicate).
     */
    addNews(news) {
        return inContext((context) => context.addNews(news));
    }
    getAll(uuid) {
        return inContext((context) => context.getAll(uuid));
    }
    /**
     *
     */
    getNews({ uuid, since, till, newsIds }) {
        return inContext((context) => context.getNews(uuid, since, till, newsIds));
    }
    /**
     *
     */
    deleteOldNews() {
        return inContext((context) => context.deleteOldNews());
    }
    /**
     * Marks these news as read for the given user.
     */
    markNewsRead(uuid, news) {
        return inContext((context) => context.markRead(uuid, news));
    }
    /**
     * Marks these news as read for the given user.
     */
    checkUnreadNews(uuid) {
        return inContext((context) => context.checkUnreadNewsCount(uuid));
    }
    getLatestNews(domain) {
        return inContext((context) => context.getLatestNews(domain));
    }
    /**
     *
     */
    removeLinkNewsToMedium(newsId, mediumId) {
        return inContext((context) => context.removeLinkNewsToMedium(newsId, mediumId));
    }
    /**
     *
     */
    linkNewsToMedium() {
        return inContext((context) => context.linkNewsToMedium());
    }
}
exports.NewsStorage = NewsStorage;
//# sourceMappingURL=newsStorage.js.map