/// <reference path="../../bin/cloudscraper.d.ts" />
import { RequestAPI } from "request";
export declare type Callback = () => any;
export declare const queueRequest: (uri: string, options?: (import("request").UriOptions & import("cloudscraper").CloudscraperOptions) | (import("request").UrlOptions & import("cloudscraper").CloudscraperOptions) | undefined, otherRequest?: RequestAPI<any, any, any> | undefined) => Promise<string>;
export declare const queueRequestFullResponse: (uri: string, options?: (import("request").UriOptions & import("cloudscraper").CloudscraperOptions) | (import("request").UrlOptions & import("cloudscraper").CloudscraperOptions) | undefined, otherRequest?: RequestAPI<any, any, any> | undefined) => Promise<import("request").Response>;
export declare const queueWork: (key: string, callback: Callback) => Promise<any>;
