"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const storageTools_1 = require("./storageTools");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).jobContext);
}
class JobStorage {
    removeJobLike(column, value) {
        return inContext((context) => context.removeJobLike(column, value));
    }
    stopJobs() {
        return inContext((context) => context.stopJobs());
    }
    getJobs(limit) {
        return inContext((context) => context.getJobs(limit));
    }
    getJobsById(jobIds) {
        return inContext((context) => context.getJobsById(jobIds));
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
    async getJobsInState(state) {
        return inContext((context) => context.getJobsInState(state));
    }
}
exports.JobStorage = JobStorage;
//# sourceMappingURL=jobStorage.js.map