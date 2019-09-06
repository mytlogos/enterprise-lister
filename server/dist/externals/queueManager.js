"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cloudscraper_1 = tslib_1.__importDefault(require("cloudscraper"));
const request_1 = tslib_1.__importDefault(require("request"));
const cheerio_1 = tslib_1.__importDefault(require("cheerio"));
const parse5_parser_stream_1 = tslib_1.__importDefault(require("parse5-parser-stream"));
const parse5_1 = tslib_1.__importDefault(require("parse5"));
const htmlparser2 = tslib_1.__importStar(require("htmlparser2"));
const transform_1 = require("../transform");
class Queue {
    constructor(maxLimit = 1000) {
        this.maxLimit = maxLimit > 10 ? maxLimit : 10;
        this.limitVariation = this.maxLimit / 2;
        this.queue = [];
        this.working = false;
    }
    push(callback) {
        return new Promise((resolve, reject) => {
            const worker = () => {
                return new Promise((subResolve, subReject) => {
                    try {
                        const result = callback();
                        subResolve(result);
                    }
                    catch (e) {
                        subReject(e);
                    }
                }).then(resolve).catch(reject);
            };
            this.queue.push(worker);
            if (!this.working) {
                this.doWork();
            }
        });
    }
    doWork() {
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
exports.Queue = Queue;
const queues = new Map();
const fastQueues = new Map();
function methodToRequest(options, toUseRequest) {
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
function processRequest(uri, otherRequest, queueToUse = queues, limit) {
    const exec = /https?:\/\/([^\/]+)/.exec(uri);
    if (!exec) {
        throw Error("not a valid url");
    }
    // get the host of the uri
    let host = exec[1];
    const pathBeginIndex = host.indexOf("/");
    if (pathBeginIndex > 0) {
        host = host.substring(0, pathBeginIndex);
    }
    else if (pathBeginIndex === 0) {
        throw Error("not a valid url");
    }
    let queue = queueToUse.get(host);
    if (!queue) {
        queueToUse.set(host, queue = new Queue(limit));
    }
    const toUseRequest = otherRequest || cloudscraper_1.default;
    return { toUseRequest, queue };
}
exports.queueRequest = (uri, options, otherRequest) => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest);
    if (!options) {
        options = { uri };
    }
    else {
        // @ts-ignore
        options.url = uri;
    }
    return queue.push(() => methodToRequest(options, toUseRequest));
};
exports.queueCheerioRequestBuffered = (uri, options, otherRequest) => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest);
    if (!options) {
        options = { uri };
    }
    options.transform = transformCheerio;
    return queue.push(() => methodToRequest(options, toUseRequest));
};
function streamParse5(resolve, reject, uri, options) {
    // i dont know which class it is from, (named 'Node' in debugger), but it matches with CheerioElement Api mostly
    // TODO: 22.06.2019 parse5 seems to have problems with parse-streaming,
    //  as it seems to add '"' quotes multiple times in the dom and e.g. <!DOCTYPE html PUBLIC "" ""> in the root,
    //  even though <!DOCTYPE html> is given as input (didnt look that close at the input down the lines)
    // @ts-ignore
    const parser = new parse5_parser_stream_1.default({ treeAdapter: parse5_1.default.treeAdapters.htmlparser2 });
    parser.on("finish", () => {
        if (parser.document && parser.document.children) {
            // @ts-ignore
            const load = cheerio_1.default.load(parser.document.children);
            if (load) {
                resolve(load);
            }
            else {
                reject("Document could not be loaded");
            }
        }
        else {
            reject("No Document parsed");
        }
    });
    const stream = new transform_1.BufferToStringStream();
    stream.on("data", (chunk) => console.log("first chunk:\n " + chunk.substring(0, 100)));
    request_1.default(uri, options)
        .on("response", (resp) => {
        resp.pause();
        if (/^cloudflare/i.test("" + resp.caseless.get("server"))) {
            resp.destroy();
            if (!options) {
                options = { uri };
            }
            options.transform = transformCheerio;
            resolve(cloudscraper_1.default(options));
            return;
        }
        resp.pipe(stream).pipe(parser);
    })
        .on("error", (e) => {
        reject(e);
    });
    return options;
}
function streamHtmlParser2(resolve, reject, uri, options) {
    // TODO: 22.06.2019 seems to produce sth bad, maybe some error in how i stream the buffer to string?
    // TODO: 22.06.2019 seems to produce this error primarily (noticed there only) on webnovel.com, parts are messed up
    const parser = new htmlparser2.WritableStream(new htmlparser2.DomHandler((error, dom) => {
        // @ts-ignore
        const load = cheerio_1.default.load(dom);
        resolve(load);
    }, {
        // FIXME: 02.09.2019 why does it not accept this property?
        // @ts-ignore
        withDomLvl1: true,
        normalizeWhitespace: false,
    }), {
        decodeEntities: true,
    }).on("error", (err) => reject(err));
    const stream = new transform_1.BufferToStringStream();
    request_1.default(uri, options)
        .on("response", (resp) => {
        resp.pause();
        if (/^cloudflare/i.test("" + resp.caseless.get("server"))) {
            resp.destroy();
            if (!options) {
                options = { uri };
            }
            options.transform = transformCheerio;
            resolve(cloudscraper_1.default(options));
            return;
        }
        resp.pipe(stream).pipe(parser);
    })
        .on("error", (e) => {
        reject(e);
    });
    return options;
}
exports.queueCheerioRequestStream = (uri, options) => {
    const { queue } = processRequest(uri);
    if (!options) {
        options = { uri };
    }
    return queue.push(() => new Promise((resolve, reject) => streamHtmlParser2(resolve, reject, uri, options)));
};
exports.queueCheerioRequest = exports.queueCheerioRequestStream;
const transformCheerio = (body) => cheerio_1.default.load(body, { decodeEntities: false });
const queueFullResponseWithLimit = (uri, options, otherRequest, queueToUse = queues, limit) => {
    const { toUseRequest, queue } = processRequest(uri, otherRequest, queueToUse, limit);
    // @ts-ignore
    const requestOptions = options || {};
    requestOptions.resolveWithFullResponse = true;
    // @ts-ignore
    requestOptions.uri = uri;
    return queue
        .push(() => requestOptions.method ? toUseRequest(requestOptions) : toUseRequest.get(requestOptions))
        .then((value) => {
        return value;
    });
};
// TODO: 21.06.2019 use stream to load with parse5 streamer with request into cheerio
exports.queueRequestFullResponse = (uri, options, otherRequest) => {
    return queueFullResponseWithLimit(uri, options, otherRequest);
};
exports.queueFastRequestFullResponse = (uri, options, otherRequest) => {
    return queueFullResponseWithLimit(uri, options, otherRequest, fastQueues, 100);
};
function queueWithLimit(key, callback, limit, queueToUse) {
    queueToUse = queueToUse || queues;
    let queue = queueToUse.get(key);
    if (!queue) {
        queueToUse.set(key, queue = new Queue(limit));
    }
    return queue.push(callback);
}
exports.queueWork = (key, callback) => {
    return queueWithLimit(key, callback);
};
exports.queueFastWork = (key, callback) => {
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
//# sourceMappingURL=queueManager.js.map