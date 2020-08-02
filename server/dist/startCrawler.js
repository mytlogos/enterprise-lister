"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const jobHandler_1 = require("./jobHandler");
const storage_1 = require("./database/storages/storage");
const logger_1 = tslib_1.__importDefault(require("./logger"));
logger_1.default.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
// first start storage, then crawler, as crawler depends on storage
storage_1.startStorage();
jobHandler_1.startCrawler();
//# sourceMappingURL=startCrawler.js.map