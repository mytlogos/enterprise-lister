#!/usr/bin/env node
import {app} from "./app";
import debug from "debug";
import {createServer, Server} from "http";
import env from "./env";
// start storage (connect to database)
import {startStorage} from "./database/database";
// start crawler (setup and start running)
import os from "os";

const port = env.port || process.env.port;
// first start storage
startStorage();
const debugMessenger = debug("enterprise-lister:server");

/**
 * Get port from environment and store in Express.
 */
app.set("port", port);

/**
 * Create HTTP server.
 */
const server: Server = createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: any) {
    if (error.syscall !== "listen") {
        throw error;
    }

    const bind = typeof port === "string"
        ? "Pipe " + port
        : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
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
    const address = server.address();
    if (address != null) {
        const bind = typeof address === "string"
            ? "pipe " + address
            : "port " + address.port;

        const networkInterfaces = os.networkInterfaces();
        const foundIpInterface = networkInterfaces.Ethernet.find((value) => value.family === "IPv4");
        debugMessenger(`Listening on ${bind} with Ip: '${foundIpInterface && foundIpInterface.address}'`);
    }
}
