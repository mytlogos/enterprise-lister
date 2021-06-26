import dotenv from "dotenv";
import { findProjectDirPath } from "./tools";

const envPath = findProjectDirPath("env.env");

const config = dotenv.config({ path: envPath });

if (config.error) {
  throw config.error;
}

if (!config.parsed) {
  throw Error("env variables missing");
}

interface Config {
  dbConLimit: number;
  dbHost: string;
  dbPassword: string;
  dbUser: string;
  dbPort: number;
  port: string;
  measure: boolean;
  development: boolean;
  stopScrapeEvents: boolean;
}

/**
 * All Options should be overridable by Environment variables.
 */
const appConfig: Config = {
  dbConLimit: Number(process.env.dbConLimit || config.parsed.dbConLimit),
  dbHost: process.env.dbHost || config.parsed.dbHost,
  dbPassword: process.env.dbPassword || config.parsed.dbPassword,
  dbUser: process.env.dbUser || config.parsed.dbUser,
  dbPort: Number(process.env.dbPort || config.parsed.dbPort),
  port: process.env.port || config.parsed.port,
  measure: !!Number(process.env.measure || config.parsed.measure),
  development: (process.env.NODE_ENV || config.parsed.NODE_ENV) !== "production",
  stopScrapeEvents: !!Number(process.env.stopScrapeEvents || config.parsed.stopScrapeEvents),
};

export default appConfig;
