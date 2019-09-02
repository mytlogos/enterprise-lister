"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cheerio_1 = tslib_1.__importDefault(require("cheerio"));
const queueManager_1 = require("./queueManager");
async function loadBody(link) {
    return queueManager_1.queueRequest(link);
}
exports.analyze = async ({ link, body }) => {
    if (link) {
        body = await loadBody(link);
    }
    if (!body) {
        return;
    }
    const $ = cheerio_1.default.load(body);
};
//# sourceMappingURL=newsAnalyzer.js.map