"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const config = dotenv_1.default.config({ path: "env.env" });
if (config.error) {
    throw config.error;
}
if (!config.parsed) {
    throw Error("env variables missing");
}
exports.default = {
    dbConLimit: Number(config.parsed.dbConLimit),
    dbHost: config.parsed.dbHost,
    dbPassword: config.parsed.dbPassword,
    dbUser: config.parsed.dbUser,
    port: config.parsed.port,
    measure: !!Number(config.parsed.measure),
    stopScrapeEvents: !!Number(config.parsed.stopScrapeEvents)
};
//# sourceMappingURL=env.js.map