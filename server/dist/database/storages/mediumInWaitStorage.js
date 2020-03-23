"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).mediumInWaitContext);
}
class MediumInWaitStorage {
    getMediaInWait() {
        return inContext((context) => context.getMediaInWait());
    }
    // tslint:disable-next-line
    createFromMediaInWait(createMedium, tocsMedia, listId) {
        return inContext((context) => context.createFromMediaInWait(createMedium, tocsMedia, listId));
    }
    consumeMediaInWait(mediumId, tocsMedia) {
        return inContext((context) => context.consumeMediaInWait(mediumId, tocsMedia));
    }
    deleteMediaInWait(mediaInWait) {
        return inContext((context) => context.deleteMediaInWait(mediaInWait));
    }
    addMediumInWait(mediaInWait) {
        return inContext((context) => context.addMediumInWait(mediaInWait));
    }
}
exports.MediumInWaitStorage = MediumInWaitStorage;
//# sourceMappingURL=mediumInWaitStorage.js.map