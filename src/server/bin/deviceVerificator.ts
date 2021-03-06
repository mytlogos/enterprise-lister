import diagram from "dgram";
import { isString } from "./tools";
import env from "./env";
import logger from "./logger";

const PORT = 3001;

const server = diagram.createSocket("udp4");

server.on("listening", () => {
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
  const decoded = message.toString();
  logger.info(`UDP Message received: ${remote.address}:${remote.port} - ${decoded}`);
  if ("DISCOVER_SERVER_REQUEST_ENTERPRISE" === decoded) {
    logger.info(`server was discovered in ${env.development} and ${process.env.NODE_ENV}`);
    const response = "ENTERPRISE_" + (env.development ? "DEV" : "PROD");
    const buffer = Buffer.from(response);
    const client = diagram.createSocket("udp4");
    client.send(buffer, 0, message.length, remote.port, remote.address, (err) => {
      if (err) {
        throw err;
      }
      logger.info(`UDP message '${buffer.toString()}' sent to ${remote.address}:${remote.port}`);
      client.close();
    });
  }
});

server.bind(PORT);
