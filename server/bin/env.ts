import dotenv from "dotenv";

const config = dotenv.config({path: "env.env"});

if (config.error) {
    throw config.error;
}

if (!config.parsed) {
    throw Error("env variables missing");
}

export default {
    dbConLimit: Number(config.parsed.dbConLimit),
    dbHost: config.parsed.dbHost,
    dbPassword: config.parsed.dbPassword,
    dbUser: config.parsed.dbUser,
    port: config.parsed.port,
    measure: !!Number(config.parsed.measure),
    development: process.env.NODE_ENV !== "production",
    stopScrapeEvents: !!Number(config.parsed.stopScrapeEvents)
};
