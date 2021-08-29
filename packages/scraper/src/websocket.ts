import Websocket from "ws";
import logger from "enterprise-core/dist/logger";
import { remove } from "enterprise-core/dist/tools";
import diagnostic_channel from "diagnostics_channel";
import { ScraperChannel, WSRequest } from "./externals/types";
import { DefaultJobScraper } from "./externals/jobScraperManager";
import { publishQueues } from "./externals/queueManager";

const ws = new Websocket.Server({
  port: 3001,
});

ws.on("connection", (socket) => {
  socket.on("message", (data) => {
    try {
      const msg = data.toString() as WSRequest;

      switch (msg) {
        case "START_JOBS":
          jobListener.addListener(socket);
          DefaultJobScraper.publishJobs();
          break;
        case "STOP_JOBS":
          jobListener.removeListener(socket);
          break;
        case "START_JOBQUEUE":
          jobQueueListener.addListener(socket);
          break;
        case "STOP_JOBQUEUE":
          jobQueueListener.removeListener(socket);
          break;
        case "START_REQUESTQUEUE":
          requestQueueListener.addListener(socket);
          publishQueues();
          break;
        case "STOP_REQUESTQUEUE":
          requestQueueListener.removeListener(socket);
          break;
        default:
          logger.info("Unknown Websocket request: " + msg);
          break;
      }
    } catch (error) {
      logger.error(error);
    }
  });

  socket.on("close", () => {
    jobListener.removeListener(socket);
    jobQueueListener.removeListener(socket);
    requestQueueListener.removeListener(socket);
  });
});

class SocketChannelListener {
  private listenerSockets = [] as Websocket[];
  private channel: ScraperChannel;

  public constructor(channel: ScraperChannel) {
    this.channel = channel;
  }

  /**
   * Forwards a message of type to all socket listeners.
   */
  private listener = null as null | ((msg: unknown) => void);

  private getListener() {
    if (this.listener) {
      return this.listener;
    }
    const sockets = this.listenerSockets;
    this.listener = function jobListener(msg: unknown) {
      for (const socket of sockets) {
        try {
          socket.send(JSON.stringify(msg));
        } catch (error) {
          logger.error(error);
        }
      }
    };
    return this.listener;
  }

  public addListener(socket: Websocket) {
    this.listenerSockets.push(socket);

    // subscribe to channel if it is the first socket
    if (this.listenerSockets.length === 1) {
      const channel = diagnostic_channel.channel(this.channel);
      channel.subscribe(this.getListener());
    }
  }

  public removeListener(socket: Websocket) {
    remove(this.listenerSockets, socket);

    // unsubscribe to channel if it has no sockets which listen
    if (!this.listenerSockets.length) {
      const channel = diagnostic_channel.channel(this.channel);

      if (channel.unsubscribe) {
        channel.unsubscribe(this.getListener());
      } else {
        logger.warn("Tried to unsubscribe from an inactive channel", channel);
      }
    }
  }
}

const jobListener = new SocketChannelListener("enterprise-jobs");
const jobQueueListener = new SocketChannelListener("enterprise-jobqueue");
const requestQueueListener = new SocketChannelListener("enterprise-requestqueue");
