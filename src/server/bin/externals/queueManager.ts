import request, { FullResponse, Options } from "cloudscraper";
import requestNative, { RequestAPI } from "request";
import cheerio from "cheerio";
import ParserStream from "parse5-parser-stream";
import * as htmlparser2 from "htmlparser2";
import { WritableStream as WritableParseStream } from "htmlparser2/lib/WritableStream";
import { BufferToStringStream } from "../transform";
import { StatusCodeError } from "request-promise-native/errors";
import requestPromise from "request-promise-native";
import { MissingResourceError } from "./errors";
import { setContext, removeContext, getStore, bindContext } from "../asyncStorage";
import http from "http";
import https from "https";
import { Socket } from "net";
import { isString, getElseSet, stringify } from "../tools";
import logger from "../logger";
import { AsyncResource } from "async_hooks";
import { Optional } from "../types";


type RequestOptions = string | http.RequestOptions | https.RequestOptions;
type RequestCallback = (res: http.IncomingMessage) => void;

interface HttpModule {
    request: (opt: RequestOptions, callback?: RequestCallback) => http.ClientRequest;
}

function patchRequest(module: HttpModule, protocol: string) {
    const originalRequest = module.request;

    module.request = function (opt, callback) {
        const target = isString(opt) ? opt : (protocol + "://" + opt.host + "" + opt.path);

        const clientRequest = originalRequest(opt);
        clientRequest.on("response", bindContext((res) => {
            function listener() {
                let socket: Socket;

                if (clientRequest.socket) {
                    socket = clientRequest.socket;
                } else {
                    console.error("No sockets available on request" + stringify(res) + stringify(request));
                    return;
                }
                const bytesSend = socket.bytesWritten;
                const bytesReceived = socket.bytesRead;

                const store = getStore();

                if (!store) {
                    return;
                }

                const stats = getElseSet(store, "network", () => { return { count: 0, sent: 0, received: 0, history: [] } });
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
                const httpCode = ((res.statusCode + "") || "?").slice(0, 5).padEnd(5);
                const send = ("" + bytesSend).slice(0, 10).padEnd(10);
                const received = ("" + bytesReceived).slice(0, 10).padEnd(10);

                logger.debug(`${url} ${method} ${httpCode} ${send} ${received}`);
            }
            res.once("close", bindContext(listener));

            if (callback) {
                bindContext(callback)(res);
            }
        }));
        return clientRequest;
    }
}
patchRequest(http, "http");
patchRequest(https, "https");

type CheerioStatic = cheerio.Root;

export class Queue {
    public readonly queue: Callback[];
    public working: boolean;
    private readonly maxLimit: number;
    private readonly limitVariation: number;

    public constructor(maxLimit = 1000) {
        this.maxLimit = maxLimit > 10 ? maxLimit : 10;
        this.limitVariation = this.maxLimit / 2;
        this.queue = [];
        this.working = false;
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
                }).finally(() => removeContext("worker")).then(resolve).catch(reject);
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

        if (!worker) {
            return;
        }
        worker().finally(() => {
            // start next work ranging from maxLimit / 2 to maxLimit ms
            const randomDuration = this.maxLimit - Math.random() * (this.maxLimit / 2);
            setTimeout(() => this.doWork(), randomDuration);
        });
    }
}

const queues: Map<string, Queue> = new Map();
const fastQueues: Map<string, Queue> = new Map();

export type Callback = () => Promise<any>;

function methodToRequest(options: Optional<Options>, toUseRequest: Request) {
    const method = options && options.method ? options.method : "";

    switch (method.toLowerCase()) {
    case "get":
        return toUseRequest.get(options);
    case "head":
        return toUseRequest.head(options);
    case "put":
        return toUseRequest.put(options);
    case "post":
        return toUseRequest.post(options);
    case "patch":
        return toUseRequest.patch(options);
    case "del":
        return toUseRequest.del(options);
    case "delete":
        return toUseRequest.delete(options);
    default:
        return toUseRequest.get(options);
    }
}

function processRequest(uri: string, otherRequest?: Request, queueToUse = queues, limit?: number) {
    const exec = /https?:\/\/([^/]+)/.exec(uri);

    if (!exec) {
        throw Error("not a valid url");
    }
    // get the host of the uri
    let host = exec[1];

    const pathBeginIndex = host.indexOf("/");

    if (pathBeginIndex > 0) {
        host = host.substring(0, pathBeginIndex);
    } else if (pathBeginIndex === 0) {
        throw Error("not a valid url");
    }
    let queue: any = queueToUse.get(host);

    if (!queue) {
        queueToUse.set(host, queue = new Queue(limit));
    }

    const toUseRequest: Request = otherRequest || request;
    return { toUseRequest, queue };
}

export const queueRequest: QueueRequest<string> = (uri, options, otherRequest): Promise<string> => {

    const { toUseRequest, queue } = processRequest(uri, otherRequest);
    if (!options) {
        options = { uri };
    } else {
        // @ts-expect-error
        options.url = uri;
    }
    return queue.push(() => methodToRequest(options, toUseRequest));
};

export const queueCheerioRequestBuffered: QueueRequest<CheerioStatic> = (uri, options, otherRequest):
    Promise<CheerioStatic> => {

    const { toUseRequest, queue } = processRequest(uri, otherRequest);

    if (!options) {
        options = { uri };
    }
    options.transform = transformCheerio;
    return queue.push(() => methodToRequest(options, toUseRequest));
};

export type QueueRequest<T> = (uri: string, options?: Options, otherRequest?: Request) => Promise<T>;

type Resolve<T> = (value?: T | PromiseLike<T>) => void;
type Reject = (reason?: any) => void;

function streamParse5(resolve: Resolve<CheerioStatic>, reject: Reject, uri: string, options?: Options) {
    // i dont know which class it is from, (named 'Node' in debugger), but it matches with CheerioElement Api mostly
    // TODO: 22.06.2019 parse5 seems to have problems with parse-streaming,
    //  as it seems to add '"' quotes multiple times in the dom and e.g. <!DOCTYPE html PUBLIC "" ""> in the root,
    //  even though <!DOCTYPE html> is given as input (didnt look that close at the input down the lines)
    // @ts-expect-error
    const parser = new ParserStream<CheerioElement>({ treeAdapter: ParserStream.treeAdapters.htmlparser2 });
    parser.on("finish", () => {
        if (parser.document && parser.document.children) {
            const load = cheerio.load(parser.document.children);
            if (load) {
                resolve(load);
            } else {
                reject("Document could not be loaded");
            }
        } else {
            reject("No Document parsed");
        }
    });
    const stream = new BufferToStringStream();
    stream.on("data", (chunk: string) => console.log("first chunk:\n " + chunk.substring(0, 100)));
    requestNative(uri, options)
        .on("response", (resp) => {
            resp.pause();

            if (/^cloudflare/i.test("" + resp.caseless.get("server"))) {
                resp.destroy();

                if (!options) {
                    options = { uri };
                }
                options.transform = transformCheerio;
                resolve(request(options));
                return;
            }
            resp.pipe(stream).pipe(parser);
        })
        .on("error", (e) => {
            reject(e);
        });
    return options;
}

function streamHtmlParser2(resolve: Resolve<CheerioStatic>, reject: Reject, uri: string, options?: Options) {
    // TODO: 22.06.2019 seems to produce sth bad, maybe some error in how i stream the buffer to string?
    // TODO: 22.06.2019 seems to produce this error primarily (noticed there only) on webnovel.com, parts are messed up
    const parser = new WritableParseStream(
        new htmlparser2.DomHandler(
            (error, dom) => {
                // @ts-expect-error
                const load = cheerio.load(dom, { decodeEntities: false });
                resolve(load);
            }, {
            // FIXME: 02.09.2019 why does it not accept this property?
            // @ts-expect-error
                withDomLvl1: true,
                normalizeWhitespace: false,
            }
        ),
        {
            decodeEntities: false,
        }
    ).on("error", (err) => reject(err));
    const stream = new BufferToStringStream();

    requestNative(uri, options)
        .on("response", (resp) => {
            resp.pause();

            if (/^cloudflare/i.test("" + resp.caseless.get("server"))) {
                resp.destroy();

                if (!options) {
                    options = { uri };
                }
                options.transform = transformCheerio;
                resolve(request(options));
                return;
            } else if (resp.statusCode === 404) {
                resp.destroy();
                reject(new MissingResourceError(uri, uri));
            } else if (resp.statusCode >= 400 || resp.statusCode < 200) {
                resp.destroy();
                reject(new StatusCodeError(resp.statusCode, "", options as requestPromise.Options, resp));
            }
            resp.pipe(stream).pipe(parser);
        })
        .on("error", (e) => {
            reject(e);
        });
    return options;
}

export const queueCheerioRequestStream: QueueRequest<CheerioStatic> = (uri, options): Promise<CheerioStatic> => {

    const { queue } = processRequest(uri);

    if (!options) {
        options = { uri };
    }
    return queue.push(() => new Promise((resolve, reject) => streamHtmlParser2(resolve, reject, uri, options)));
};

export const queueCheerioRequest = queueCheerioRequestBuffered;

const transformCheerio = (body: string): CheerioStatic => cheerio.load(body, { decodeEntities: false });

const queueFullResponseWithLimit = (uri: string, options?: Options, otherRequest?: Request,
    queueToUse = queues, limit?: number): Promise<FullResponse> => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest, queueToUse, limit);

    // @ts-expect-error
    const requestOptions: Options = options || {};
    requestOptions.resolveWithFullResponse = true;
    // @ts-expect-error
    requestOptions.uri = uri;

    return queue
        .push(() => requestOptions.method ? toUseRequest(requestOptions) : toUseRequest.get(requestOptions))
        .then((value: FullResponse) => {
            return value;
        });
};

// TODO: 21.06.2019 use stream to load with parse5 streamer with request into cheerio

export const queueRequestFullResponse: QueueRequest<FullResponse> = (uri, options, otherRequest):
    Promise<FullResponse> => {

    return queueFullResponseWithLimit(uri, options, otherRequest);
};

export type Request = RequestAPI<any, any, any>;

export const queueFastRequestFullResponse: QueueRequest<FullResponse> = (uri, options, otherRequest):
    Promise<FullResponse> => {

    return queueFullResponseWithLimit(uri, options, otherRequest, fastQueues, 100);
};

function queueWithLimit(key: string, callback: Callback, limit?: number, queueToUse?: Map<string, Queue>) {
    queueToUse = queueToUse || queues;

    let queue: any = queueToUse.get(key);

    if (!queue) {
        queueToUse.set(key, queue = new Queue(limit));
    }
    return queue.push(callback);
}

export const queueWork = (key: string, callback: Callback): Promise<any> => {
    return queueWithLimit(key, callback);
};

export const queueFastWork = (key: string, callback: Callback): Promise<any> => {
    return queueWithLimit(key, callback, 50, fastQueues);
};

/*
parse5-parser-stream

// Fetch the page content and obtain it's <head> node
http.get('http://inikulin.github.io/parse5/', res => {
    const parser = new ParserStream();

    parser.once('finish', () => {
        console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
    });

    res.pipe(parser);
});
 */
