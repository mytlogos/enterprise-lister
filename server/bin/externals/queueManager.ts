import request, {FullResponse, Options} from "cloudscraper";
import {RequestAPI} from "request";

class Queue {
    public queue: Callback[];
    public working: boolean;

    constructor() {
        this.queue = [];
        this.working = false;
    }

    public push(callback: Callback): Promise<any> {
        return new Promise((resolve, reject) => {
            const worker = () => {
                return new Promise((subResolve, subReject) => {
                    try {
                        const result = callback();
                        subResolve(result);
                    } catch (e) {
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

    public doWork() {
        const worker = this.queue.shift();
        this.working = !!worker;

        if (!worker) {
            return;
        }
        worker().finally(() => {
            // start next work ranging from 500 to 1000 ms
            const randomDuration = 1000 - Math.random() * 500;
            setTimeout(() => this.doWork(), randomDuration);
        });
    }
}

const queues: Map<string, any> = new Map();

export type Callback = () => any;

const domainReg = /https?:\/\/(.+?)\//;

function processRequest(uri: string, otherRequest?: RequestAPI<any, any, any>) {
    const exec = domainReg.exec(uri);

    if (!exec) {
        throw Error("not a valid url");
    }
    // get the host of the uri
    const host = exec[1];

    let queue: any = queues.get(host);
    if (!queue) {
        queues.set(host, queue = new Queue());
    }

    const toUseRequest: RequestAPI<any, any, any> = otherRequest || request;
    return {toUseRequest, queue};
}

export const queueRequest = (uri: string, options?: Options, otherRequest?: RequestAPI<any, any, any>):
    Promise<string> => {

    const {toUseRequest, queue} = processRequest(uri, otherRequest);
    return queue.push(() => toUseRequest.get(uri, options));
};

export const queueRequestFullResponse = (uri: string, options?: Options, otherRequest?: RequestAPI<any, any, any>):
    Promise<FullResponse> => {

    const {toUseRequest, queue} = processRequest(uri, otherRequest);

    if (!options) {
        options = {resolveWithFullResponse: true, uri};
    }

    return queue.push(() => toUseRequest.get(options));
};

export const queueWork = (key: string, callback: Callback): Promise<any> => {
    let queue: any = queues.get(key);
    if (!queue) {
        queues.set(key, queue = new Queue());
    }
    return queue.push(callback);
};
