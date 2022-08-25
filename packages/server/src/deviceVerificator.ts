import diagram from "dgram";
import { isString } from "enterprise-core/dist/tools";
import env from "enterprise-core/dist/env";
import logger from "enterprise-core/dist/logger";
import { registerOnExitHandler } from "enterprise-core/dist/exit";

const PORT = env.port;

const server = diagram.createSocket("udp4");

server.on("listening", () => {
  registerOnExitHandler(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  server.setBroadcast(true);
  if (isString(address)) {
    logger.info("UDP Server listening on " + address);
  } else {
    logger.info("UDP Server listening on " + address.address + ":" + address.port);
  }
});

server.on("message", (message, remote) => {
  if (!message) {
    return;
  }
  try {
    const decoded = message.toString();
    logger.info("UDP Message received", {
      remote_address: remote.address,
      remote_port: remote.port,
      received: decoded,
    });

    if (decoded === "DISCOVER_SERVER_REQUEST_ENTERPRISE") {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      logger.info(`server was discovered in ${env.development} and ${process.env.NODE_ENV}`);

      const response = "ENTERPRISE_" + (env.development ? "DEV" : "PROD");
      const buffer = Buffer.from(response);
      const client = diagram.createSocket("udp4");

      client.send(buffer, 0, message.length, remote.port, remote.address, (err) => {
        if (err) {
          throw err;
        }
        logger.info("UDP message sent", {
          remote_address: remote.address,
          remote_port: remote.port,
          sent: response,
        });
        client.close();
      });
    }
  } catch (error) {
    logger.error(error);
  }
});

server.bind(PORT);
