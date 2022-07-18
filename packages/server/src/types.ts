import { HookConfig } from "enterprise-scraper/dist/externals/custom/types";
import { HookConfig as HookConfigV2 } from "enterprise-scraper/dist/externals/customv2/types";
import env from "enterprise-core/dist/env";
import { memoryUsage } from "process";

export interface HookTest {
  config: HookConfig;
  key: keyof HookConfig;
  param: string;
}

export interface HookTestV2 {
  config: HookConfigV2;
  key: keyof HookConfigV2;
  param: string;
}

export interface Status {
  server: ServerStatus;
  crawler: CrawlerStatus;
  database: DatabaseStatus;
}

export interface HookStatus {
  all: Array<{ name: string; domain: string; medium: number }>;
  toc: Array<{ name: string; pattern: string }>;
  download: Array<{ name: string; pattern: string }>;
  search: Array<{ name: string }>;
  tocSearch: Array<{ name: string; pattern: string }>;
  news: Array<{ name: string; link: string }>;
}

export type CrawlerStatus =
  | ({
      status: "available";
      hooks: HookStatus;
    } & ServerStatus)
  | { status: "timout" | "unavailable" | "invalid" };

export type DatabaseStatus =
  | {
      status: "available";
      type: string;
      version: string;
      host: string;
    }
  | {
      status: "timout" | "unavailable";
      type: string;
      host: string;
    };

export interface ServerStatus {
  cpu_average: [number, number, number] | number[];
  memory: ReturnType<typeof memoryUsage>;
  uptime: number;
  freemem: number;
  totalmem: number;
  project_version: string;
  node_version: string;
  config: Omit<typeof env, "dbPassword">;
}
