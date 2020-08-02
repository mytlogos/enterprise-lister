"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dgram_1 = tslib_1.__importDefault(require("dgram"));
const tools_1 = require("./tools");
const env_1 = tslib_1.__importDefault(require("./env"));
const logger_1 = tslib_1.__importDefault(require("./logger"));
const PORT = 3001;
const server = dgram_1.default.createSocket("udp4");
server.on("listening", () => {
    const address = server.address();
    server.setBroadcast(true);
    if (tools_1.isString(address)) {
        logger_1.default.info("UDP Server listening on " + address);
    }
    else {
        logger_1.default.info("UDP Server listening on " + address.address + ":" + address.port);
    }
});
server.on("message", (message, remote) => {
    if (!message) {
        return;
    }
    const decoded = message.toString();
    logger_1.default.info(`UDP Message received: ${remote.address}:${remote.port} - ${decoded}`);
    if ("DISCOVER_SERVER_REQUEST_ENTERPRISE" === decoded) {
        logger_1.default.info(`server was discovered in ${env_1.default.development} and ${process.env.NODE_ENV}`);
        const response = "ENTERPRISE_" + (env_1.default.development ? "DEV" : "PROD");
        const buffer = Buffer.from(response);
        const client = dgram_1.default.createSocket("udp4");
        client.send(buffer, 0, message.length, remote.port, remote.address, (err, bytes) => {
            if (err) {
                throw err;
            }
            logger_1.default.info(`UDP message '${buffer.toString()}' sent to ${remote.address}:${remote.port}`);
            client.close();
        });
    }
});
server.bind(PORT);
//# sourceMappingURL=deviceVerificator.js.map