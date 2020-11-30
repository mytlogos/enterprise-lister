import { startCrawler } from "./jobHandler";
import { startStorage } from "./database/storages/storage";
import logger from "./logger";
import { createServer, Server } from "http";
import { stringify } from "./tools";
import { getStores } from "./asyncStorage";
import os from "os";
import debug from "debug";
const debugMessenger = debug("enterprise-lister:crawler");
logger.info(`Process PID: ${process.pid} in environment '${process.env.NODE_ENV}'`);
// first start storage, then crawler, as crawler depends on storage
startStorage();
startCrawler();

/**
 * Create HTTP server.
 */
const server: Server = createServer((_req, res) => {
    const stores = getStores();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.write(stringify(stores));
    res.end();
});
server.listen(3003, "localhost");
server.on("error", onError);
server.on("listening", onListening);

function onError(error: any) {
    if (error.syscall !== "listen") {
        throw error;
    }

    const bind = "Port " + 3003;

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
        const bind = typeof address === "string"
            ? "pipe " + address
            : "port " + address.port;

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
