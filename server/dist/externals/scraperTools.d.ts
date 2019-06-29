import { ListScrapeResult } from "./listManager";
import { Episode, News, ScrapeItem } from "../types";
import { ContentDownloader, Dependant, DownloadContent, Hook, NewsScraper, Toc, TocScraper, TocSearchScraper } from "./types";
export declare const processNewsScraper: (...args: any[]) => Promise<{
    link: string;
    result: News[];
}>;
export declare const checkTocs: (...args: any[]) => Promise<{
    toc: Toc[];
    uuid?: string | undefined;
}>;
export declare const oneTimeToc: (...args: any[]) => Promise<{
    toc: Toc[];
    uuid: string;
}>;
/**
 *
 * @param scrapeItem
 * @return {Promise<void>}
 */
export declare let news: (...args: any[]) => Promise<{
    link: string;
    result: News[];
}>;
/**
 *
 * @param value
 * @return {Promise<void>}
 */
export declare const toc: (...args: any[]) => Promise<void>;
/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export declare const list: (...args: any[]) => Promise<{
    external: {
        cookies: string;
        uuid: string;
    };
    lists: ListScrapeResult;
}>;
export declare const feed: (...args: any[]) => Promise<{
    link: string;
    result: News[];
}>;
export interface ListScrapeEvent {
    external: {
        cookies: string;
        uuid: string;
        userUuid: string;
        type: number;
    };
    lists: ListScrapeResult;
}
export interface Scraper {
    addDependant(dependant: Dependant): void;
    removeDependant(dependant: Dependant): void;
    setup(): Promise<void>;
    start(): void;
    stop(): void;
    pause(): void;
    on(event: "toc", callback: (value: {
        uuid: string;
        toc: Toc[];
    }) => void): void;
    on(event: "feed" | "news", callback: (value: {
        link: string;
        result: News[];
    }) => void): void;
    on(event: "list", callback: (value: ListScrapeEvent) => void): void;
    on(event: "toc:error", callback: (errorValue: any) => void): void;
    on(event: "news:error", callback: (errorValue: any) => void): void;
    on(event: "feed:error", callback: (errorValue: any) => void): void;
    on(event: "list:error", callback: (errorValue: any) => void): void;
    on(event: string, callback: (value: any) => void): void;
}
export declare const scrapeTypes: {
    LIST: number;
    FEED: number;
    NEWS: number;
    TOC: number;
};
export interface ScrapeDependants {
    news: ScrapeItem[];
    oneTimeUser: Array<{
        cookies: string;
        uuid: string;
    }>;
    oneTimeTocs: Array<{
        url: string;
        uuid: string;
    }>;
    feeds: string[];
    tocs: ScrapeItem[];
    media: ScrapeItem[];
}
/**
 *
 * @return {Promise<void>}
 */
export declare function setup(): Promise<void>;
export declare class ScraperHelper {
    readonly redirects: RegExp[];
    readonly tocScraper: Map<RegExp, TocScraper>;
    readonly episodeDownloader: Map<RegExp, ContentDownloader>;
    readonly tocDiscovery: Map<RegExp, TocSearchScraper>;
    readonly newsAdapter: NewsScraper[];
    private readonly eventMap;
    on(event: string, callback: (value: any) => void): void;
    emit(event: string, value: any): void;
    init(): void;
    private registerHooks;
}
export declare function addDependant(dependant: Dependant): void;
export declare function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]>;
/**
 *
 * @param {Dependant} dependant
 */
export declare function remove(dependant: Dependant): void;
export declare function registerHooks(hook: Hook[] | Hook): void;
/**
 *
 */
export declare function pause(): void;
/**
 *
 */
export declare function start(): void;
export declare function on(event: "toc", callback: (value: {
    uuid: string;
    toc: Toc[];
}) => void): void;
export declare function on(event: "feed" | "news", callback: (value: {
    link: string;
    result: News[];
}) => void): void;
export declare function on(event: "list", callback: (value: {
    external: {
        cookies: string;
        uuid: string;
        userUuid: string;
        type: number;
    };
    lists: ListScrapeResult;
}) => void): void;
export declare function on(event: "toc:error", callback: (errorValue: any) => void): void;
export declare function on(event: "news:error", callback: (errorValue: any) => void): void;
export declare function on(event: "feed:error", callback: (errorValue: any) => void): void;
export declare function on(event: "list:error", callback: (errorValue: any) => void): void;
