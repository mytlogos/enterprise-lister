"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const env_1 = tslib_1.__importDefault(require("./env"));
let tunneled;
const port = Number(env_1.default.port || process.env.port);
if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw Error("invalid port number: " + port);
}
/*localtunnel(port, (err, tunnel) => {
    if (err) {
        logger.error(err);
    }
    if (tunnel) {
        tunneled = tunnel;
    }
});*/
function getTunnelUrl() {
    return tunneled && tunneled.url;
}
exports.getTunnelUrl = getTunnelUrl;
function closeTunnel() {
    if (tunneled) {
        tunneled.close();
    }
}
exports.closeTunnel = closeTunnel;
//# sourceMappingURL=tunnel.js.map