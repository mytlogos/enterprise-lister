import winston, { format } from "winston";
import { isString, jsonReplacer, stringify } from "./tools";
import { join as joinPath } from "path";
import env from "./env";
import { getStore } from "./asyncStorage";
import DailyRotateFile from "winston-daily-rotate-file";

let filePrefix: string;
const appName = process.env.NODE_APP_NAME || process.env.name;
if (appName) {
  filePrefix = appName.replace(/[^\w-_]/g, "") + "-";
} else {
  filePrefix = "logs";
}

// put logs into the logs directory
filePrefix = joinPath("logs", filePrefix);

let logLevel = process.env.NODE_LOG_LEVEL || process.env.LOG_LEVEL;
if (logLevel) {
  const logLevelNumber = Number(logLevel);

  if (isNaN(logLevelNumber)) {
    logLevel = logLevel.toLowerCase();
    logLevel = logLevel in winston.config.npm.levels ? logLevel : "info";
  } else {
    const foundLevel = Object.entries(winston.config.npm.levels).find((value) => value[1] === logLevelNumber);
    logLevel = foundLevel ? foundLevel[0] : "info";
  }
} else {
  logLevel = env.development ? "debug" : "info";
}

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: logLevel,
  format: format.combine(format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }), format.json({ replacer: jsonReplacer })),
  exceptionHandlers: [
    new winston.transports.File({
      filename: filePrefix + "exception.log",
      maxsize: 10_000_000,
    }),
    new winston.transports.Console(),
  ],
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new DailyRotateFile({
      filename: `${filePrefix}combined.log-%DATE%`,
    }),
    new DailyRotateFile({
      filename: `${filePrefix}error.log-%DATE%`,
      level: "error",
    }),
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "DD.MM.YYYY HH:mm:ss" }),
        format.printf((info) => {
          if (!info.message) {
            const timestamp = info.timestamp;
            const label = info.label;
            const level = info.level;
            // @ts-expect-error
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
            const label = info.label || [];
            return `${info.timestamp} ${info.level}: ${info.message} [${label.join(",") || ""}]`;
          }
        }),
      ),
    }),
  ],
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error(`Unhandled Rejection - Reason: ${stringify(reason)} - Promise: ${stringify(promise)}`);
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info(`Exit Program with Code: ${code}.`));

function log(level: string, value: any, meta?: any) {
  if (Object.prototype.toString.call(meta) !== "[object Object]") {
    let label;
    if (Array.isArray(meta)) {
      label = meta;
    } else {
      label = [stringify(meta)];
    }
    meta = { label };
  } else if (!meta.label) {
    meta.label = [];
  }
  const store = getStore();

  if (store && store.get("label")) {
    meta.label.push(...store.get("label"));
  }
  logger.log(level, stringify(value), meta);
}

function sanitizeError(value: any) {
  if (!("response" in value)) {
    return;
  }
  // do not log response body
  if ("body" in value.response) {
    delete value.response.body;
  }
}

export default {
  error(value: any, ...meta: any): void {
    sanitizeError(value);
    log("error", value, meta);
  },

  warn(value: any, ...meta: any): void {
    log("warn", value, meta);
  },

  info(value: any, ...meta: any): void {
    log("info", value, meta);
  },

  http(value: any, ...meta: any): void {
    log("http", value, meta);
  },

  verbose(value: any, ...meta: any): void {
    log("verbose", value, meta);
  },

  debug(value: any, ...meta: any): void {
    log("debug", value, meta);
  },

  silly(value: any, ...meta: any): void {
    log("silly", value, meta);
  },
};
