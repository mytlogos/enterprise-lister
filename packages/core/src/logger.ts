import winston, { format } from "winston";
import { isString, jsonReplacer, stringify } from "./tools";
import { join as joinPath } from "path";
import env from "./env";
import { getStore, StoreKey } from "./asyncStorage";
import DailyRotateFile from "winston-daily-rotate-file";
import LokiTransport from "winston-loki";
import { MESSAGE } from "triple-beam";

let filePrefix: string;
const appName = process.env.NODE_APP_NAME || process.env.name;

if (appName) {
  filePrefix = appName.replace(/[^\w-]/g, "") + "-";
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

const formatLogFmt = winston.format((info, overwriteMessage) => {
  const { label, timestamp, level, message, ...rest } = info;

  // return stringified objects as-is
  if (isString(message) && (message.startsWith("{") || message.startsWith("["))) {
    return info;
  }

  rest.msg = message;
  const line = stringifyLogFmt(rest);

  const newInfo = {
    label,
    timestamp,
    level,
    message: line,
  };
  if (overwriteMessage) {
    // @ts-expect-error
    newInfo[MESSAGE] = line;
  }
  return newInfo;
});

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
        formatLogFmt(),
        // use logfmt here too
        format.printf((info) => {
          return `${info.timestamp + ""} ${info.level}: ${info.message}`;
        }),
      ),
    }),
  ],
});

if (env.lokiUrl) {
  logger.add(
    new LokiTransport({
      host: env.lokiUrl,
      json: true,
      replaceTimestamp: true, // or use format.timestamp
      labels: {
        job: "enterpriselogs",
        program: appName || "unknown",
      },
      level: "info", // never allow debug logs or less
      format: formatLogFmt(true),
      // else one cannot implement custom made gracefulShutdown
      // it will exit immediately via async-hook-exit lib on process.on events
      gracefulShutdown: false,
    }),
  );
}

process.on("unhandledRejection", (reason: any) => {
  logger.error("unhandled rejection", {
    reason: stringify(reason),
  });
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info("Exit Program", { code }));

function log(level: string, value: any, meta: LogMeta = {}) {
  const store = getStore();

  if (store) {
    const label = store.get(StoreKey.LABEL);

    if (typeof label === "object" && label) {
      Object.assign(meta, label);
    }
  }
  if (!isString(value)) {
    value = stringify(value);
  }
  // do not log on closed logger, fallback to console.log
  if (logger.closed) {
    console.log(`Logger closed, falling back to console.log: [${level}] ${value + ""} ${JSON.stringify(meta)}`);
    return;
  }
  logger.log(level, value, meta);
}

function sanitizeError(value: any) {
  if (typeof value !== "object" || !value) {
    return;
  }
  // for custom hook error, ignore the html body
  if (value instanceof Error && value.name === "CustomHookError") {
    delete (value as any).data.body; // body is too big
    delete (value as any).data.element; // element may be too big
  }
  // do not log response body
  if ("response" in value && value.response && "body" in value.response) {
    delete value.response.body;
  }
}

/**
 * Modified from https://github.com/csquared/node-logfmt/blob/master/lib/stringify.js
 *
 * @param data data to stringify
 * @returns a string
 */
export function stringifyLogFmt(data: Record<any, any>): string {
  let line = "";

  // sort alphabetically asc, except that msg is always first
  const keys = Object.keys(data).sort((a, b) => {
    if (a === "msg" || a < b) {
      return -1;
    }
    if (b === "msg" || b < a) {
      return 1;
    }
    return 0;
  });

  for (const key of keys) {
    let value = data[key];
    let isNull = false;

    if (value == null) {
      isNull = true;
      value = "";
    } else {
      if (typeof value.toString === "function") {
        value = value.toString();
      } else {
        console.log("value=", value, "has no toString");
        value = value + "";
      }
    }

    const needsQuoting = value.indexOf(" ") > -1 || value.indexOf("=") > -1;
    const needsEscaping = value.indexOf('"') > -1 || value.indexOf("\\") > -1;

    if (needsEscaping) value = value.replace(/["\\]/g, "\\$&");
    if (needsQuoting) value = `"${value + ""}"`;
    if (value === "" && !isNull) value = '""';

    line += key + "=" + value + " ";
  }

  // trim trailing space
  return line.substring(0, line.length - 1);
}

export interface LogMeta {
  [key: string]: string | number | boolean | undefined;
}

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export default {
  log(level: LogLevel, value: any, meta?: LogMeta) {
    if (level === "error") {
      sanitizeError(value);
    }
    log(level, value, meta);
  },
  error(value: any, meta?: LogMeta): void {
    sanitizeError(value);
    log("error", value, meta);
  },

  warn(value: any, meta?: LogMeta): void {
    log("warn", value, meta);
  },

  info(value: any, meta?: LogMeta): void {
    log("info", value, meta);
  },

  http(value: any, meta?: LogMeta): void {
    log("http", value, meta);
  },

  verbose(value: any, meta?: LogMeta): void {
    log("verbose", value, meta);
  },

  debug(value: any, meta?: LogMeta): void {
    log("debug", value, meta);
  },

  silly(value: any, meta?: LogMeta): void {
    log("silly", value, meta);
  },
  close() {
    const promise = new Promise((resolve) => {
      logger.addListener("close", resolve);
    });
    logger.close();
    return promise;
  },
};
