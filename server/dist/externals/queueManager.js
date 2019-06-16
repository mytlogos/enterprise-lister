"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cloudscraper_1 = tslib_1.__importDefault(require("cloudscraper"));
class Queue {
    constructor() {
        this.queue = [];
        this.working = false;
    }
    push(callback) {
        return new Promise((resolve, reject) => {
            const worker = () => {
                return new Promise((subResolve, subReject) => {
                    try {
                        const result = callback();
                        subResolve(result);
                    }
                    catch (e) {
                        subReject(e);
                    }
                }).then(resolve).catch(reject);
            };
            this.queue.push(worker);
            if (!this.working) {
                this.doWork();
            }
        });
    }
    doWork() {
        const worker = this.queue.shift();
        this.working = !!worker;
        if (!worker) {
            return;
        }
        worker().finally(() => {
            // start next work ranging from 500 to 1000 ms
            const randomDuration = 1000 - Math.random() * 500;
            setTimeout(() => this.doWork(), randomDuration);
        });
    }
}
const queues = new Map();
const domainReg = /https?:\/\/(.+?)\//;
function processRequest(uri, otherRequest) {
    const exec = domainReg.exec(uri);
    if (!exec) {
        throw Error("not a valid url");
    }
    // get the host of the uri
    const host = exec[1];
    let queue = queues.get(host);
    if (!queue) {
        queues.set(host, queue = new Queue());
    }
    const toUseRequest = otherRequest || cloudscraper_1.default;
    return { toUseRequest, queue };
}
exports.queueRequest = (uri, options, otherRequest) => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest);
    return queue.push(() => toUseRequest.get(uri, options));
};
exports.queueRequestFullResponse = (uri, options, otherRequest) => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest);
    if (!options) {
        options = { resolveWithFullResponse: true, uri };
    }
    return queue.push(() => toUseRequest.get(options));
};
exports.queueWork = (key, callback) => {
    let queue = queues.get(key);
    if (!queue) {
        queues.set(key, queue = new Queue());
    }
    return queue.push(callback);
};
//# sourceMappingURL=queueManager.js.map