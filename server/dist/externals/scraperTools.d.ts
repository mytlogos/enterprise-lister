import { ListScrapeResult } from "./listManager";
import { Episode, News, ScrapeItem } from "../types";
import { ContentDownloader, Dependant, DownloadContent, Hook, NewsScraper, OneTimeToc, ScraperJob, Toc, TocContent, TocScraper, TocSearchScraper } from "./types";
export declare const scrapeNews: (adapter: NewsScraper) => Promise<{
    link: string;
    result: News[];
}>;
export declare const checkTocs: () => Promise<ScraperJob[]>;
export declare const oneTimeToc: ({ url: link, uuid, mediumId }: OneTimeToc) => Promise<{
    tocs: Toc[];
    uuid: string;
}>;
/**
 *
 * @param scrapeItem
 * @return {Promise<void>}
 */
export declare let news: (scrapeItem: ScrapeItem) => Promise<{
    link: string;
    result: News[];
}>;
/**
 *
 * @param value
 * @return {Promise<void>}
 */
export declare const toc: (value: ScrapeItem) => Promise<void>;
/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export declare const list: (value: {
    cookies: string;
    uuid: string;
}) => Promise<{
    external: {
        cookies: string;
        uuid: string;
    };
    lists: ListScrapeResult;
}>;
export declare const feed: (feedLink: string) => Promise<{
    link: string;
    result: News[];
}>;
export declare function checkTocContent(content: TocContent): void;
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
export declare enum ScrapeTypes {
    LIST = 0,
    FEED = 1,
    NEWS = 2,
    TOC = 3,
    ONETIMEUSER = 4,
    ONETIMETOC = 5
}
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
export declare function initHooks(): void;
/**
 *
 */
export declare function start(): void;
export declare function on(event: "toc", callback: (value: {
    uuid?: string;
    tocs: Toc[];
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
