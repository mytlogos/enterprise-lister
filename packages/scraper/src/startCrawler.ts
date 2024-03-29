import { startCrawler } from "./scheduler/jobHandler";
import { DefaultJobScraper } from "./scheduler/jobScheduler";
import { startStorage } from "enterprise-core/dist/database/storages/storage";
import logger from "enterprise-core/dist/logger";
import { createServer, Server, ServerResponse } from "http";
import { stringify, getMainInterface } from "enterprise-core/dist/tools";
import { AppStatus } from "enterprise-core/dist/status";
import { getStores } from "enterprise-core/dist/asyncStorage";
import os from "os";
import debug from "debug";
import env from "enterprise-core/dist/env";
import { register, collectDefaultMetrics } from "prom-client";
import {
  episodeDownloaderEntries,
  getAllSearcher,
  getHooks,
  getNewsAdapter,
  tocDiscoveryEntries,
  tocScraperEntries,
} from "./externals/hookManager";
import path from "path";
import { readFileSync } from "fs";
import "./metrics";

// start websocket server
// eslint-disable-next-line import/first
import "./websocket";
import { registerOnExitHandler } from "enterprise-core/dist/exit";

collectDefaultMetrics({
  labels: {
    NODE_APP_INSTANCE: "enterprise-crawler",
  },
});

const debugMessenger = debug("enterprise-lister:crawler");
logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV || ""}'`);
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();

const status = new AppStatus("crawler");
status.start();

function scraperEntry<T extends { hookName?: string }>(entry: [RegExp, T]): { pattern: string; name?: string } {
  return {
    pattern: entry[0] + "",
    name: entry[1].hookName,
  };
}

function metricsHandler(res: ServerResponse) {
  res.setHeader("Content-Type", register.contentType);
  register
    .metrics()
    .then((metrics) => res.end(metrics))
    .catch((reason) => {
      res.statusCode = 500;
      res.end();
      logger.error(reason);
    });
}

function statusHandler(res: ServerResponse) {
  const packageJsonPath = path.join(path.dirname(__dirname), "package.json");

  let packageJson: any;

  try {
    const packageString = readFileSync(packageJsonPath, { encoding: "utf8" });
    packageJson = JSON.parse(packageString);
  } catch (error) {
    packageJson = { project_version: "Error" };
  }
  res.setHeader("Content-Type", "	application/json; charset=utf-8");
  res.write(
    stringify({
      cpu_average: os.loadavg(),
      memory: process.memoryUsage(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      uptime: os.uptime(),
      project_version: packageJson.version,
      node_version: process.version,
      config: {
        dbConLimit: env.dbConLimit,
        dbHost: env.dbHost,
        dbUser: env.dbUser,
        dbPort: env.dbPort,
        crawlerHost: env.crawlerHost,
        crawlerPort: env.crawlerPort,
        crawlerWSPort: env.crawlerWSPort,
        port: env.port,
        measure: env.measure,
        development: env.development,
        stopScrapeEvents: env.stopScrapeEvents,
      },
      hooks: {
        all: getHooks().map((hook) => {
          return {
            name: hook.name,
            medium: hook.medium,
            domain: hook.domainReg + "",
          };
        }),
        toc: tocScraperEntries().map(scraperEntry),
        download: episodeDownloaderEntries().map(scraperEntry),
        search: getAllSearcher().map((entry) => {
          return {
            name: entry.hookName,
          };
        }),
        tocSearch: tocDiscoveryEntries().map(scraperEntry),
        news: getNewsAdapter().map((entry) => {
          return {
            link: entry.link,
            name: entry.hookName,
          };
        }),
      },
    }),
  );
  res.end();
}

function storesHandler(res: ServerResponse) {
  const stores = getStores();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.write(stringify(stores));
  res.end();
}

function jobsHandler(res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.write(stringify(DefaultJobScraper.getJobs()));
  res.end();
}

/**
 * Create HTTP server.
 */
const server: Server = createServer((req, res) => {
  if (req.url === "/metrics") {
    metricsHandler(res);
    return;
  }
  if (req.url === "/status") {
    statusHandler(res);
    return;
  }
  if (req.url === "/" || req.url === "") {
    storesHandler(res);
    return;
  }
  if (req.url === "/jobs") {
    jobsHandler(res);
  }
});
server.listen(env.crawlerPort);
server.on("error", onError);
server.on("listening", onListening);

function onError(error: any) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = "Port " + env.crawlerPort;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      logger.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      logger.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  registerOnExitHandler(() => {
    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  const address = server.address();
  console.log("Listening: ", address);

  if (address != null) {
    const bind = typeof address === "string" ? "pipe " + address : "port " + address.port;

    const interfaceIp = getMainInterface() || "";
    debugMessenger(`Listening on ${bind} with Ip: '${interfaceIp}'`);
    logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV || ""}'`);
  }
}
