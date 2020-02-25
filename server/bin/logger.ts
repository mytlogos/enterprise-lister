import winston, {format} from "winston";
import {isString, jsonReplacer, stringify} from "./tools";
import {join as joinPath} from "path";

let filePrefix: string;
const appName = process.env.NODE_APP_NAME || process.env.name;
if (appName) {
    filePrefix = appName.replace(/[^\w-_]/g, "") + "-";
} else {
    filePrefix = "";
}

filePrefix = joinPath("logs", filePrefix);

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: format.combine(
        format.timestamp({format: "DD.MM.YYYY HH:mm:ss"}),
        format.json({replacer: jsonReplacer})
    ),
    exceptionHandlers: [
        new winston.transports.File({
            filename: filePrefix + "exception.log",
            zippedArchive: true,
            maxsize: 10_000_000
        })
    ],
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({
            filename: filePrefix + "error.log",
            level: "error",
            zippedArchive: true,
            maxsize: 10_000_000
        }),
        new winston.transports.File({
            filename: filePrefix + "combined.log",
            zippedArchive: true,
            maxsize: 20_000_000
        }),
        new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp({format: "DD.MM.YYYY HH:mm:ss"}),
                format.printf((info) => {
                    if (!info.message) {
                        const timestamp = info.timestamp;
                        const label = info.label;
                        const level = info.level;
                        delete info.level;
                        delete info.label;
                        delete info.timestamp;
                        return `${timestamp} [${label || ""}] ${level}: ${stringify(info)}`;
                    } else {
                        if (!isString(info.message)) {
                            info.message = stringify(info.message);
                        }
                        // truncate for console output
                        info.message = info.message.substring(0, 2000);
                        return `${info.timestamp} [${info.label || ""}] ${info.level}: ${info.message}`;
                    }
                })
            ),
        })
    ]
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    console.log(reason, promise);
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info(`Exit Program with Code: ${code}.`));

function log(level: string, value: any, meta?: any) {
    if (Object.prototype.toString.call(meta) !== "[object Object]") {
        meta = {label: meta};
    }
    logger.log(level, stringify(value), meta);
}

export default {
    error(value: any, ...meta: any) {
        log("error", value, meta);
    },

    warn(value: any, ...meta: any) {
        log("warn", value, meta);
    },

    info(value: any, ...meta: any) {
        log("info", value, meta);
    },

    http(value: any, ...meta: any) {
        log("http", value, meta);
    },

    verbose(value: any, ...meta: any) {
        log("verbose", value, meta);
    },

    debug(value: any, ...meta: any) {
        log("debug", value, meta);
    },

    silly(value: any, ...meta: any) {
        log("silly", value, meta);
    }
};
