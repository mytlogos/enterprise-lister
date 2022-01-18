import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { setContext, removeContext, getStore, bindContext } from "enterprise-core/dist/asyncStorage";
import http from "http";
import https from "https";
import { Socket } from "net";
import { isString, getElseSet, stringify, delay, hasProps } from "enterprise-core/dist/tools";
import logger from "enterprise-core/dist/logger";
import { AsyncResource } from "async_hooks";
import { Optional } from "enterprise-core/dist/types";
import { channel } from "diagnostics_channel";
import { RequestQueueChannelMessage } from "./types";
import { CookieJar } from "tough-cookie";

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

          const stats = getElseSet(store, "network", () => {
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

type CheerioStatic = cheerio.CheerioAPI;

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
      // @ts-expect-error
      queueChannel.publish({
        messageType: "requestqueue",
        maxInterval: this.maxLimit,
        queueName: this.name,
        queued: this.queue.length,
        working: this.working,
      } as RequestQueueChannelMessage);
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

function methodToRequest(url: string, options: Optional<RequestConfig>, toUseRequest: Request) {
  const method = options && options.method ? options.method : "";

  switch (method.toLowerCase()) {
    case "get":
      return toUseRequest.get(url, options);
    case "head":
      return toUseRequest.head(url, options);
    case "put":
      return toUseRequest.put(url, options);
    case "post":
      return toUseRequest.post(url, options);
    case "patch":
      return toUseRequest.patch(url, options);
    case "delete":
      return toUseRequest.delete(url, options);
    default:
      return toUseRequest.get(url, options);
  }
}

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

function processRequest(uri: string, otherRequest?: Request, queueToUse = queues, limit?: number) {
  // get the host of the uri
  const host = getQueueKey(uri);

  if (!host) {
    throw Error("not a valid url: " + uri);
  }

  let queue: Queue | undefined = queueToUse.get(host);

  if (!queue) {
    queue = new Queue(host, limit);
    queueToUse.set(host, queue);
  }

  const toUseRequest: Request = otherRequest || axios;
  return { toUseRequest, queue };
}

export const queueRequest: QueueRequest<string> = (uri, options, otherRequest): Promise<string> => {
  const { toUseRequest, queue } = processRequest(uri, otherRequest);
  if (!options) {
    options = { url: uri };
  } else {
    options.url = uri;
  }
  return queue
    .push(() => methodToRequest(uri, options, toUseRequest))
    .then((response: AxiosResponse<string>) => response.data);
};

export const queueCheerioRequestBuffered: QueueRequest<CheerioStatic> = (
  uri,
  options,
  otherRequest,
): Promise<CheerioStatic> => {
  const { toUseRequest, queue } = processRequest(uri, otherRequest);

  if (!options) {
    options = { url: uri };
  }
  options.transformResponse = transformCheerio;

  return queue.push(async () => {
    for (let tryAgain = 0; tryAgain < 4; tryAgain++) {
      try {
        return await queue
          .push(() => methodToRequest(uri, options, toUseRequest))
          .then((response: AxiosResponse<CheerioStatic>) => {
            return response.data;
          });
      } catch (error) {
        // retry at most 3 times for 429 - Too many Requests error
        if (hasProps(error, "statusCode", "response") && error.statusCode === 429 && tryAgain < 3) {
          const retryAfterValue = (error.response as any)?.headers["retry-after"];
          const retryAfterSeconds = Number.parseInt(retryAfterValue);

          if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) {
            if (retryAfterSeconds > 3600) {
              logger.info("Encountered a retry-after Header with value greater than an hour");
            }
            await delay(retryAfterSeconds * 1000);
          } else {
            const retryAfterDate = new Date(retryAfterValue);
            const diffMillis = retryAfterDate.getTime() - Date.now();

            if (Number.isNaN(diffMillis) || diffMillis < 0) {
              logger.error(`Retry-After is invalid: ${retryAfterValue}`);
            } else {
              await delay(diffMillis);
            }
          }
          continue;
        } else {
          throw error;
        }
      }
    }
    throw Error("Should never reach here, expected to return a valid response or throw an error");
  });
};

export type RequestConfig = AxiosRequestConfig & { jar?: CookieJar };

export type QueueRequest<T> = (uri: string, options?: RequestConfig, otherRequest?: Request) => Promise<T>;

export const queueCheerioRequest = queueCheerioRequestBuffered;

const transformCheerio = (body: string): CheerioStatic => cheerio.load(body, { decodeEntities: false });

const queueFullResponseWithLimit = (
  uri: string,
  options?: RequestConfig,
  otherRequest?: Request,
  queueToUse = queues,
  limit?: number,
): Promise<AxiosResponse> => {
  const { toUseRequest, queue } = processRequest(uri, otherRequest, queueToUse, limit);

  const requestOptions: RequestConfig = options || {};
  requestOptions.url = uri;

  return queue
    .push(() => (requestOptions.method ? toUseRequest(requestOptions) : toUseRequest.get(uri, requestOptions)))
    .then((value: AxiosResponse) => {
      return value;
    });
};

// TODO: 21.06.2019 use stream to load with parse5 streamer with request into cheerio

export const queueRequestFullResponse: QueueRequest<AxiosResponse> = (
  uri,
  options,
  otherRequest,
): Promise<AxiosResponse> => {
  return queueFullResponseWithLimit(uri, options, otherRequest);
};

export type Request = AxiosInstance;

export const queueFastRequestFullResponse: QueueRequest<AxiosResponse> = (
  uri,
  options,
  otherRequest,
): Promise<AxiosResponse> => {
  return queueFullResponseWithLimit(uri, options, otherRequest, fastQueues, 100);
};

function queueWithLimit(key: string, callback: Callback, limit?: number, queueToUse?: Map<string, Queue>) {
  queueToUse = queueToUse || queues;

  let queue: any = queueToUse.get(key);

  if (!queue) {
    queueToUse.set(key, (queue = new Queue(key, limit)));
  }
  return queue.push(callback);
}

export const queueWork = (key: string, callback: Callback): Promise<any> => {
  return queueWithLimit(key, callback);
};

export const queueFastWork = (key: string, callback: Callback): Promise<any> => {
  return queueWithLimit(key, callback, 50, fastQueues);
};
