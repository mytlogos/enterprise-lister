import localtunnel from "localtunnel";
import env from "enterprise-core/dist/env";
import { internetTester, remove, stringify } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { ValidationError } from "enterprise-core/dist/error";

const tunnels: localtunnel.Tunnel[] = [];
const port = env.port;

if (Number.isNaN(port) || port <= 0 || port > 65535) {
  throw new ValidationError("invalid port number: " + port);
}

function requestTunnel(host?: string) {
  localtunnel({ port, host })
    .then((tunnel) => {
      tunnels.push(tunnel);
      logger.info(`opening tunnel to ${tunnel.url}`);
      tunnel.on("close", () => {
        remove(tunnels, tunnel);
        logger.info(`tunnel to ${tunnel.url} is closed`);
      });
      tunnel.on("error", (args) => logger.error(`error for tunnel to ${tunnel.url}: ${args.message}`));
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
  internetTester.start();
  process.on("beforeExit", closeTunnel);
}

export function getTunnelUrls(): string[] {
  return tunnels.map((tunnel) => tunnel.url);
}

export function closeTunnel(): void {
  tunnels.forEach((tunnel) => tunnel.close());
}
