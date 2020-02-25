"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importStar(require("winston"));
const tools_1 = require("./tools");
let filePrefix;
if (process.env.NODE_APP_NAME) {
    filePrefix = process.env.NODE_APP_NAME.replace(/[^\w-_]/g, "") + "-";
}
else {
    filePrefix = "";
}
const logger = winston_1.default.createLogger({
    levels: winston_1.default.config.npm.levels,
    format: winston_1.format.combine(winston_1.format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), winston_1.format.json({ replacer: tools_1.jsonReplacer })),
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: filePrefix + "exception.log",
            zippedArchive: true,
            maxsize: 10000000
        })
    ],
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston_1.default.transports.File({
            filename: filePrefix + "error.log",
            level: "error",
            zippedArchive: true,
            maxsize: 10000000
        }),
        new winston_1.default.transports.File({
            filename: filePrefix + "combined.log",
            zippedArchive: true,
            maxsize: 20000000
        }),
        new winston_1.default.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), winston_1.format.printf((info) => {
                if (!info.message) {
                    const timestamp = info.timestamp;
                    const label = info.label;
                    const level = info.level;
                    delete info.level;
                    delete info.label;
                    delete info.timestamp;
                    return `${timestamp} [${label || ""}] ${level}: ${tools_1.stringify(info)}`;
                }
                else {
                    if (!tools_1.isString(info.message)) {
                        info.message = tools_1.stringify(info.message);
                    }
                    // truncate for console output
                    info.message = info.message.substring(0, 2000);
                    return `${info.timestamp} [${info.label || ""}] ${info.level}: ${info.message}`;
                }
            })),
        })
    ]
});
process.on("unhandledRejection", (reason, promise) => {
    console.log(reason, promise);
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info(`Exit Program with Code: ${code}.`));
function log(level, value, meta) {
    if (Object.prototype.toString.call(meta) !== "[object Object]") {
        meta = { label: meta };
    }
    logger.log(level, tools_1.stringify(value), meta);
}
exports.default = {
    error(value, ...meta) {
        log("error", value, meta);
    },
    warn(value, ...meta) {
        log("warn", value, meta);
    },
    info(value, ...meta) {
        log("info", value, meta);
    },
    http(value, ...meta) {
        log("http", value, meta);
    },
    verbose(value, ...meta) {
        log("verbose", value, meta);
    },
    debug(value, ...meta) {
        log("debug", value, meta);
    },
    silly(value, ...meta) {
        log("silly", value, meta);
    }
};
//# sourceMappingURL=logger.js.map