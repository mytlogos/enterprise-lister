import localtunnel from "localtunnel";
import env from "./env";
import {internetTester, remove, stringify} from "./tools";
import logger from "./logger";

const tunnels: localtunnel.Tunnel[] = [];
const port = Number(env.port || process.env.port);

if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw Error("invalid port number: " + port);
}

function requestTunnel(host?: string) {
    localtunnel({port: 3000, host})
        .then((tunnel) => {
            tunnels.push(tunnel);
            logger.info(`opening tunnel to ${tunnel.url}`);
            tunnel.on("close", () => {
                remove(tunnels, tunnel);
                logger.info(`tunnel to ${tunnel.url} is closed`);
            });
            tunnel.on("error", (args) => logger.error(`error for tunnel to ${tunnel.url}: ${stringify(args)}`));
        })
        .catch((reason) => logger.error("failed opening a tunnel: " + stringify(reason)));
}

let started = false;

export function startTunneling(): void {
    if (started) {
        return;
    }
    started = true;
    internetTester.on("online", () => {
        requestTunnel();
        requestTunnel("http://serverless.social");
    });
    internetTester.on("offline", closeTunnel);
    process.on("beforeExit", closeTunnel);
}

export function getTunnelUrls(): string[] {
    return tunnels.map((tunnel) => tunnel.url);
}

export function closeTunnel(): void {
    tunnels.forEach((tunnel) => tunnel.close());
}
