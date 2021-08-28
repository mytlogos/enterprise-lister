import { startCrawler } from "./jobHandler";
import { startStorage } from "enterprise-core/dist/database/storages/storage";
import logger from "enterprise-core/dist/logger";
import { createServer, Server } from "http";
import { stringify } from "enterprise-core/dist/tools";
import { AppStatus } from "enterprise-core/dist/status";
import { getStores } from "enterprise-core/dist/asyncStorage";
import os from "os";
import debug from "debug";
import env from "enterprise-core/dist/env";
import { register, collectDefaultMetrics } from "prom-client";
collectDefaultMetrics({
  labels: {
    NODE_APP_INSTANCE: "enterprise-crawler",
  },
});

// start websocket server
import "./websocket";
const debugMessenger = debug("enterprise-lister:crawler");
logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();

const status = new AppStatus("crawler");
status.start();

/**
 * Create HTTP server.
 */
const server: Server = createServer((req, res) => {
  if (req.url === "/metrics") {
    res.setHeader("Content-Type", register.contentType);
    register
      .metrics()
      .then((metrics) => res.end(metrics))
      .catch((reason) => {
        res.statusCode = 500;
        res.end();
        logger.error(reason);
      });
    return;
  }
  const stores = getStores();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.write(stringify(stores));
  res.end();
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
  const address = server.address();
  console.log("Listening: ", address);

  if (address != null) {
    const bind = typeof address === "string" ? "pipe " + address : "port " + address.port;

    const networkInterfaces = os.networkInterfaces();
    for (const arrays of Object.values(networkInterfaces)) {
      if (!Array.isArray(arrays)) {
        continue;
      }
      const foundIpInterface = arrays.find((value) => value.family === "IPv4");

      if (!foundIpInterface || !foundIpInterface.address || !foundIpInterface.address.startsWith("192.168.")) {
        continue;
      }
      debugMessenger(`Listening on ${bind} with Ip: '${foundIpInterface && foundIpInterface.address}'`);
      logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
      break;
    }
  }
}
