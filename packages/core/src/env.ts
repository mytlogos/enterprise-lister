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
  disableFileLogging: boolean;
  enableRecovered: boolean;
  enableRecoveredHook: boolean;
  enableRecoveredJob: boolean;
  enableRecoveredJobType: boolean;
  jobFailed: number | undefined;
  jobTypeFailedAbsolute: number | undefined;
  jobTypeFailedPerc: number | undefined;
  scraperHookJobTypeFailed: number | undefined;
  jobNotifyFailure: number | undefined;
}

function toBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return value.toLocaleLowerCase() === "true";
}

function toNumber(value: unknown): number | undefined {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return undefined;
  }
  return number;
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
  lokiUrl: process.env.lokiUrl || config.parsed.lokiUrl,
  disableFileLogging: toBoolean(process.env.disableFileLogging || config.parsed.disableFileLogging),
  enableRecovered: toBoolean(process.env.enableRecovered || config.parsed.enableRecovered),
  enableRecoveredHook: toBoolean(process.env.enableRecoveredHook || config.parsed.enableRecoveredHook),
  enableRecoveredJob: toBoolean(process.env.enableRecoveredJob || config.parsed.enableRecoveredJob),
  enableRecoveredJobType: toBoolean(process.env.enableRecoveredJobType || config.parsed.enableRecoveredJobType),
  jobFailed: toNumber(process.env.jobFailed || config.parsed.jobFailed),
  jobTypeFailedAbsolute: toNumber(process.env.jobTypeFailedAbsolute || config.parsed.jobTypeFailedAbsolute),
  jobTypeFailedPerc: toNumber(process.env.jobTypeFailedPerc || config.parsed.jobTypeFailedPerc),
  scraperHookJobTypeFailed: toNumber(process.env.scraperHookJobTypeFailed || config.parsed.scraperHookJobTypeFailed),
  jobNotifyFailure: toNumber(process.env.jobNotifyFailure || config.parsed.jobNotifyFailure),
};

const optionalVars = new Set<keyof Config>([
  "lokiUrl",
  "jobFailed",
  "jobTypeFailedAbsolute",
  "jobTypeFailedPerc",
  "scraperHookJobTypeFailed",
  "jobNotifyFailure",
]);

// this should not output sensitive information
for (const [key, value] of Object.entries(appConfig)) {
  if (value == null || Number.isNaN(value)) {
    if (optionalVars.has(key as keyof Config)) {
      continue;
    }
    throw new ConfigurationError(`Config Error: ${key} has invalid Value: ${value + ""}`);
  }
}

export default appConfig;
