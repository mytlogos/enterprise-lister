"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).jobContext);
}
class JobStorage {
    stopJobs() {
        return inContext((context) => context.stopJobs());
    }
    getJobs(limit) {
        return inContext((context) => context.getJobs(limit));
    }
    getAfterJobs(id) {
        return inContext((context) => context.getAfterJobs(id));
    }
    addJobs(jobs) {
        return inContext((context) => context.addJobs(jobs));
    }
    removeJobs(jobs) {
        return inContext((context) => context.removeJobs(jobs));
    }
    removeJob(key) {
        return inContext((context) => context.removeJob(key));
    }
    updateJobs(jobs) {
        return inContext((context) => context.updateJobs(jobs));
    }
}
exports.JobStorage = JobStorage;
//# sourceMappingURL=jobStorage.js.map