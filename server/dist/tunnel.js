"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const localtunnel_1 = tslib_1.__importDefault(require("localtunnel"));
const env_1 = tslib_1.__importDefault(require("./env"));
const tools_1 = require("./tools");
const logger_1 = tslib_1.__importDefault(require("./logger"));
const tunnels = [];
const port = Number(env_1.default.port || process.env.port);
if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw Error("invalid port number: " + port);
}
function requestTunnel(host) {
    localtunnel_1.default({ port: 3000, host })
        .then((tunnel) => {
        tunnels.push(tunnel);
        logger_1.default.info(`opening tunnel to ${tunnel.url}`);
        tunnel.on("close", () => {
            tools_1.remove(tunnels, tunnel);
            logger_1.default.info(`tunnel to ${tunnel.url} is closed`);
        });
        tunnel.on("error", (args) => logger_1.default.error(`error for tunnel to ${tunnel.url}: ${tools_1.stringify(args)}`));
    })
        .catch((reason) => logger_1.default.error("failed opening a tunnel: " + tools_1.stringify(reason)));
}
tools_1.internetTester.on("online", () => {
    requestTunnel();
    requestTunnel("http://serverless.social");
});
tools_1.internetTester.on("offline", closeTunnel);
process.on("beforeExit", closeTunnel);
function getTunnelUrls() {
    return tunnels.map((tunnel) => tunnel.url);
}
exports.getTunnelUrls = getTunnelUrls;
function closeTunnel() {
    tunnels.forEach((tunnel) => tunnel.close());
}
exports.closeTunnel = closeTunnel;
//# sourceMappingURL=tunnel.js.map