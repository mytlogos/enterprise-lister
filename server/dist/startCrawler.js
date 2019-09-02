"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crawlerStart_1 = require("./crawlerStart");
const database_1 = require("./database/database");
console.log(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
// first start storage, then crawler, as crawler depends on storage
database_1.startStorage();
crawlerStart_1.startCrawler();
//# sourceMappingURL=startCrawler.js.map