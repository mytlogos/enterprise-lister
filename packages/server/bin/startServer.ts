#!/usr/bin/env node
import { app } from "./app";
import debug from "debug";
import env from "enterprise-core/dist/env";
// start storage (connect to database)
import { startStorage } from "enterprise-core/dist/database/storages/storage";
import "./deviceVerificator";
// start crawler (setup and start running)
import os from "os";
import logger from "enterprise-core/dist/logger";
import { startTunneling } from "./tunnel";

const port = env.port;
// first start storage
startStorage();
const debugMessenger = debug("enterprise-lister:server");

/**
 * Get port from environment and store in Express.
 */
app.set("port", port);

/**
 * Listen on provided port, on all network interfaces.
 */
app.listen(port);
app.on("error", onError);
app.on("listening", onListening);

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

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  startTunneling();
  const bind = "port " + port;

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
