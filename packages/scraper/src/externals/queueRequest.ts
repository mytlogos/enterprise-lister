import { setContext, removeContext, getStore, bindContext, StoreKey } from "enterprise-core/dist/asyncStorage";
import http from "http";
import https from "https";
import { Socket } from "net";
import { isString, getElseSet, stringify } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { AsyncResource } from "async_hooks";
import { channel } from "diagnostics_channel";

const queueChannel = channel("enterprise-requestqueue");

type RequestOptions = string | http.RequestOptions | https.RequestOptions;
type RequestCallback = (res: http.IncomingMessage) => void;

interface HttpModule {
  request: (opt: RequestOptions, callback?: RequestCallback) => http.ClientRequest;
}

function patchRequest(module: HttpModule, protocol: string) {
  const originalRequest = module.request;

  module.request = function (opt, callback) {
    const target = isString(opt) ? opt : protocol + "://" + opt.host + "" + opt.path;

    const clientRequest = originalRequest(opt);
    clientRequest.on(
      "response",
      bindContext((res) => {
        function listener() {
          let socket: Socket;

          if (clientRequest.socket) {
            socket = clientRequest.socket;
          } else {
            console.error("No sockets available on request" + stringify(res) + stringify(clientRequest));
            return;
          }
          const bytesSend = socket.bytesWritten;
          const bytesReceived = socket.bytesRead;

          const store = getStore();

          if (!store) {
            return;
          }

          const stats = getElseSet(store, StoreKey.NETWORK, () => {
            return { count: 0, sent: 0, received: 0, history: [] };
          });
          stats.count += 1;
          stats.sent += bytesSend;
          stats.received += bytesReceived;
          stats.history.push({
            url: target,
            method: clientRequest.method,
            statusCode: res.statusCode,
            send: bytesSend,
            received: bytesReceived,
          });

          const url = target.slice(0, 70).padEnd(70);
          const method = clientRequest.method.slice(0, 5).padEnd(5);
          const httpCode = (res.statusCode + "" || "?").slice(0, 5).padEnd(5);
          const send = ("" + bytesSend).slice(0, 10).padEnd(10);
          const received = ("" + bytesReceived).slice(0, 10).padEnd(10);

          logger.debug(`${url} ${method} ${httpCode} ${send} ${received}`);
        }
        res.once("close", bindContext(listener));

        if (callback) {
          bindContext(callback)(res);
        }
      }),
    );
    return clientRequest;
  };
}
patchRequest(http, "http");
patchRequest(https, "https");

export class Queue {
  public readonly queue: Callback[];
  public readonly name: string;
  public working: boolean;
  private readonly maxLimit: number;
  private readonly limitVariation: number;

  public constructor(name: string, maxLimit = 1000) {
    this.maxLimit = maxLimit > 10 ? maxLimit : 10;
    this.limitVariation = this.maxLimit / 2;
    this.queue = [];
    this.working = false;
    this.name = name;
  }

  public push(callback: Callback): Promise<any> {
    callback = AsyncResource.bind(callback);

    return new Promise((resolve, reject) => {
      const worker = () => {
        // eslint-disable-next-line promise/param-names
        return new Promise((subResolve, subReject) => {
          try {
            setContext("worker");
            const result = callback();
            subResolve(result);
          } catch (e) {
            subReject(e);
          }
        })
          .finally(() => removeContext("worker"))
          .then(resolve)
          .catch(reject);
      };

      this.queue.push(worker);

      if (!this.working) {
        this.doWork();
      }
    });
  }

  public doWork(): void {
    const worker = this.queue.shift();
    this.working = !!worker;

    this.publish();

    if (!worker) {
      return;
    }
    worker().finally(() => {
      // start next work ranging from maxLimit / 2 to maxLimit ms
      const randomDuration = this.maxLimit - Math.random() * this.limitVariation;
      setTimeout(() => this.doWork(), randomDuration);
    });
  }

  public publish(): void {
    if (queueChannel.hasSubscribers) {
      queueChannel.publish({
        messageType: "requestqueue",
        maxInterval: this.maxLimit,
        queueName: this.name,
        queued: this.queue.length,
        working: this.working,
      });
    }
  }
}

export function publishQueues(): void {
  for (const queue of queues.values()) {
    queue.publish();
  }
  for (const queue of fastQueues.values()) {
    queue.publish();
  }
}

const queues: Map<string, Queue> = new Map();
const fastQueues: Map<string, Queue> = new Map();

export type Callback = () => Promise<any>;

const httpsProtocol = "https://";
const httpProtocol = "http://";

export function getQueueKey(link: string): string | null {
  if (link.startsWith(httpsProtocol)) {
    link = link.substring(httpsProtocol.length);
  } else if (link.startsWith(httpProtocol)) {
    link = link.substring(httpProtocol.length);
  } else {
    return null;
  }
  const index = link.indexOf("/");

  if (index >= 0) {
    link = link.substring(0, index);
  }
  return link;
}

function queueWithLimit(key: string, callback: Callback, limit?: number, queueToUse?: Map<string, Queue>) {
  queueToUse = queueToUse || queues;

  const queue = getElseSet(queueToUse, key, () => new Queue(key, limit));
  return queue.push(callback);
}

export const queueWork = (key: string, callback: Callback): Promise<any> => {
  return queueWithLimit(key, callback);
};

export const queueFastWork = (key: string, callback: Callback): Promise<any> => {
  return queueWithLimit(key, callback, 50, fastQueues);
};
