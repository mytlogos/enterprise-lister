import winston, {format} from "winston";

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: format.combine(
        format.timestamp({format: "DD.MM.YYYY HH:mm:ss"}),
        format.json()
    ),
    // defaultMeta: {service: "user-service"},
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({filename: "error.log", level: "error"}),
        new winston.transports.File({filename: "combined.log"})
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: format.combine(
            format.timestamp({format: "DD.MM.YYYY HH:mm:ss"}),
            format.printf((info) => {
                if (!info.message) {
                    return `${info.timestamp} ${info.level}: ${JSON.stringify(info)}`;
                } else {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                }
            })
        ),
    }));
}

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    console.log(reason, promise);
});
let exitHandled = false;
process.on("beforeExit", (code) => (exitHandled = !exitHandled) && logger.info(`Exit Program with Code: ${code}.`));

export function logError(reason: any) {
    console.log(reason);
    logger.error(reason);
}

export default logger;
