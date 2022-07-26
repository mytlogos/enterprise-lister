#!/usr/bin/env node
import { app } from "./app";
import debug from "debug";
import env from "enterprise-core/dist/env";
import { startStorage } from "enterprise-core/dist/database/storages/storage";
import "./deviceVerificator";
import logger from "enterprise-core/dist/logger";
import { getMainInterface } from "enterprise-core/dist/tools";
import { AppStatus } from "enterprise-core/dist/status";
import process from "node:process";

const port = env.port;
// start storage (connect to database)
// first start storage
startStorage();
const debugMessenger = debug("enterprise-lister:server");

/**
 * Get port from environment and store in Express.
 */
app.set("port", port);

/**
 * Listen on provided port, on all network interfaces.
 * Add event listener on server.
 */
app.listen(port).on("error", onError).on("listening", onListening);

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: any) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = "Port " + port;

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

const status = new AppStatus("server");

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const bind = "port " + port;

  const interfaceIp = getMainInterface() || "";
  debugMessenger(`Listening on ${bind} with Ip: '${interfaceIp}'`);
  logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV || ""}'`);
  status.start();
}
