import Websocket from "ws";
import logger from "enterprise-core/dist/logger";
import { remove } from "enterprise-core/dist/tools";
import { ChannelNames, subscribe, unsubscribe } from "diagnostics_channel";
import { WSRequest } from "./externals/types";
import { DefaultJobScraper } from "./scheduler/jobScheduler";
import { publishQueues } from "./externals/queueRequest";
import { registerOnExitHandler } from "enterprise-core/dist/exit";

const ws = new Websocket.Server({
  port: 3001,
});

ws.on("connection", (socket) => {
  registerOnExitHandler(() => new Promise((resolve, reject) => ws.close((err) => (err ? reject(err) : resolve()))));
  socket.on("message", (data) => {
    try {
      let msg: WSRequest;

      if (Buffer.isBuffer(data)) {
        msg = data.toString() as WSRequest;
      } else if (data instanceof ArrayBuffer) {
        msg = new TextDecoder().decode(data) as WSRequest;
      } else {
        msg = data.map((value) => value.toString()).join() as WSRequest;
      }

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
  private readonly listenerSockets: Websocket[] = [];
  private readonly channel: ChannelNames;

  public constructor(channel: ChannelNames) {
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
    this.listener = function channelListener(msg: unknown) {
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
      subscribe(this.channel, this.getListener());
    }
  }

  public removeListener(socket: Websocket) {
    remove(this.listenerSockets, socket);

    // unsubscribe to channel if it has no sockets which listen
    if (!this.listenerSockets.length) {
      unsubscribe(this.channel, this.getListener());
    }
  }
}

const jobListener = new SocketChannelListener("enterprise-jobs");
const jobQueueListener = new SocketChannelListener("enterprise-jobqueue");
const requestQueueListener = new SocketChannelListener("enterprise-requestqueue");
