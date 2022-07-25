import dotenv from "dotenv";
import { ConfigurationError } from "./error";
import { findProjectDirPath } from "./tools";

let config;

// try to find env.env but do not require
const envPath = findProjectDirPath("env.env");

if (envPath) {
  config = dotenv.config({ path: envPath });
} else {
  console.error("Could not find 'env.env' File.");
  config = { parsed: {} };
}

if (config.error) {
  throw config.error;
}

if (!config.parsed) {
  throw new ConfigurationError("env variables missing");
}

interface Config {
  dbConLimit: number;
  dbHost: string;
  dbPassword: string;
  dbUser: string;
  dbPort: number;
  crawlerHost: string;
  crawlerPort: number;
  crawlerWSPort: number;
  port: number;
  measure: boolean;
  development: boolean;
  stopScrapeEvents: boolean;
  lokiUrl?: string;
}

/**
 * All Options should be overridable by Environment variables.
 */
const appConfig: Config = {
  dbConLimit: Number(process.env.dbConLimit || config.parsed.dbConLimit) || 50,
  dbHost: process.env.dbHost || config.parsed.dbHost,
  dbPassword: process.env.dbPassword || config.parsed.dbPassword,
  dbUser: process.env.dbUser || config.parsed.dbUser,
  dbPort: Number(process.env.dbPort || config.parsed.dbPort),
  crawlerHost: process.env.crawlerHost || config.parsed.crawlerHost || "localhost",
  crawlerPort: Number(process.env.crawlerPort || config.parsed.crawlerPort) || 3000,
  crawlerWSPort: Number(process.env.crawlerWSPort || config.parsed.crawlerWSPort) || 3001,
  port: Number(process.env.port || config.parsed.port) || 3000,
  measure: !!Number(process.env.measure || config.parsed.measure),
  development: (process.env.NODE_ENV || config.parsed.NODE_ENV) !== "production",
  stopScrapeEvents: !!Number(process.env.stopScrapeEvents || config.parsed.stopScrapeEvents),
  lokiUrl: process.env.LOKI_URL || config.parsed.lokiUrl,
};

// this should not output sensitive information
for (const [key, value] of Object.entries(appConfig)) {
  if (value == null || Number.isNaN(value)) {
    throw new ConfigurationError(`Config Error: ${key} has invalid Value: ${value + ""}`);
  }
}

export default appConfig;
