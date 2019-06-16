#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const app_1 = require("./app");
const debug_1 = tslib_1.__importDefault(require("debug"));
const http_1 = require("http");
const env_1 = tslib_1.__importDefault(require("./env"));
// start storage (connect to database)
const database_1 = require("./database/database");
// start crawler (setup and start running)
const os_1 = tslib_1.__importDefault(require("os"));
const port = env_1.default.port || process.env.port;
// first start storage
database_1.startStorage();
const debugMessenger = debug_1.default("enterprise-lister:server");
/**
 * Get port from environment and store in Express.
 */
app_1.app.set("port", port);
/**
 * Create HTTP server.
 */
const server = http_1.createServer(app_1.app);
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);
/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
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
        const networkInterfaces = os_1.default.networkInterfaces();
        const foundIpInterface = networkInterfaces.Ethernet.find((value) => value.family === "IPv4");
        debugMessenger(`Listening on ${bind} with Ip: '${foundIpInterface && foundIpInterface.address}'`);
    }
}
//# sourceMappingURL=startServer.js.map