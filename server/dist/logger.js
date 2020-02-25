"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importStar(require("winston"));
const logger = winston_1.default.createLogger({
    levels: winston_1.default.config.npm.levels,
    format: winston_1.format.combine(winston_1.format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), winston_1.format.json()),
    // defaultMeta: {service: "user-service"},
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston_1.default.transports.File({ filename: "error.log", level: "error" }),
        new winston_1.default.transports.File({ filename: "combined.log" })
    ]
});
//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.format.combine(winston_1.format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), winston_1.format.printf((info) => {
            if (!info.message) {
                return `${info.timestamp} ${info.level}: ${JSON.stringify(info)}`;
            }
            else {
                return `${info.timestamp} ${info.level}: ${info.message}`;
            }
        })),
    }));
}
process.on("unhandledRejection", (reason, promise) => {
    console.log(reason, promise);
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info(`Exit Program with Code: ${code}.`));
function logError(reason) {
    console.log(reason);
    const seen = new WeakSet();
    logger.error(JSON.stringify(reason, (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[circular reference]";
            }
            seen.add(value);
        }
        if (value instanceof Error) {
            const error = {};
            Object.getOwnPropertyNames(value).forEach((errorKey) => {
                // @ts-ignore
                error[errorKey] = value[errorKey];
            });
            return error;
        }
        return value;
    }));
}
exports.logError = logError;
exports.default = logger;
//# sourceMappingURL=logger.js.map