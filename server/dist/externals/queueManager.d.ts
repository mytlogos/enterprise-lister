/// <reference types="cheerio" />
import { FullResponse, Options } from "cloudscraper";
import { RequestAPI } from "request";
export declare type Callback = () => any;
export declare const queueRequest: QueueRequest<string>;
export declare const queueCheerioRequestBuffered: QueueRequest<CheerioStatic>;
export declare type QueueRequest<T> = (uri: string, options?: Options, otherRequest?: Request) => Promise<T>;
export declare const queueCheerioRequestStream: QueueRequest<CheerioStatic>;
export declare const queueCheerioRequest: QueueRequest<CheerioStatic>;
export declare const queueRequestFullResponse: QueueRequest<FullResponse>;
export declare type Request = RequestAPI<any, any, any>;
export declare const queueFastRequestFullResponse: QueueRequest<FullResponse>;
export declare const queueWork: (key: string, callback: Callback) => Promise<any>;
export declare const queueFastWork: (key: string, callback: Callback) => Promise<any>;
