import localtunnel from "localtunnel";
import {logError} from "./logger";
import env from "./env";

let tunneled: localtunnel.Tunnel;
const port = Number(env.port || process.env.port);

if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw Error("invalid port number: " + port);
}

localtunnel(port, (err, tunnel) => {
    if (err) {
        logError(err);
    }
    if (tunnel) {
        tunneled = tunnel;
    }
});

export function getTunnelUrl() {
    return tunneled && tunneled.url;
}

export function closeTunnel() {
    if (tunneled) {
        tunneled.close();
    }
}
