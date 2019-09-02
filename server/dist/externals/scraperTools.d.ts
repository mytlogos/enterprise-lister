import { ListScrapeResult } from "./listManager";
import { Episode, JobRequest, News, ScrapeItem, TocSearchMedium } from "../types";
import { ContentDownloader, Dependant, DownloadContent, Hook, NewsScraper, ScraperJob, Toc, TocContent, TocRequest, TocResult, TocScraper, TocSearchScraper } from "./types";
export declare const scrapeNewsJob: (name: string) => Promise<{
    link: string;
    result: News[];
}>;
export declare const scrapeNews: (adapter: NewsScraper) => Promise<{
    link: string;
    result: News[];
}>;
export declare function searchForTocJob(name: string, item: TocSearchMedium): Promise<TocResult>;
export declare function searchForToc(item: TocSearchMedium, searcher: TocSearchScraper): Promise<TocResult>;
export declare const checkTocsJob: () => Promise<JobRequest[]>;
export declare const checkTocs: () => Promise<ScraperJob[]>;
export declare const queueTocsJob: () => Promise<JobRequest[]>;
export declare const queueTocs: () => Promise<void>;
export declare const oneTimeToc: ({ url: link, uuid, mediumId }: TocRequest) => Promise<{
    tocs: Toc[];
    uuid?: string | undefined;
}>;
export declare let news: (scrapeItem: ScrapeItem) => Promise<{
    link: string;
    result: News[];
}>;
export declare const toc: (value: TocRequest) => Promise<TocResult>;
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
export declare function checkTocContent(content: TocContent, allowMinusOne?: boolean): void;
export interface ListScrapeEvent {
    external: {
        cookies: string;
        uuid: string;
        userUuid: string;
        type: number;
    };
    lists: ListScrapeResult;
}
export declare enum ScrapeEvent {
    TOC = "toc",
    FEED = "feed",
    NEWS = "news",
    LIST = "list"
}
export declare enum ScrapeErrorEvent {
    TOC = "toc:error",
    FEED = "feed:error",
    NEWS = "news:error",
    LIST = "list:error"
}
export interface Scraper {
    addDependant(dependant: Dependant): void;
    removeDependant(dependant: Dependant): void;
    setup(): Promise<void>;
    start(): void;
    stop(): void;
    pause(): void;
    on(event: ScrapeEvent.TOC, callback: (value: {
        uuid?: string;
        toc: Toc[];
    }) => void): void;
    on(event: ScrapeEvent.FEED | ScrapeEvent.NEWS, callback: (value: {
        link: string;
        result: News[];
    }) => void): void;
    on(event: ScrapeEvent.LIST, callback: (value: ListScrapeEvent) => void): void;
    on(event: ScrapeErrorEvent.TOC, callback: (errorValue: any) => void): void;
    on(event: ScrapeErrorEvent.FEED, callback: (errorValue: any) => void): void;
    on(event: ScrapeErrorEvent.NEWS, callback: (errorValue: any) => void): void;
    on(event: ScrapeErrorEvent.LIST, callback: (errorValue: any) => void): void;
    on(event: string, callback: (value: any) => void): void;
}
export interface ScrapeDependants {
    news: ScrapeItem[];
    oneTimeUser: Array<{
        cookies: string;
        uuid: string;
    }>;
    oneTimeTocs: TocRequest[];
    feeds: string[];
    tocs: TocRequest[];
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
    private readonly nameHookMap;
    on(event: string, callback: (value: any) => void): void;
    emit(event: string, value: any): void;
    init(): void;
    getHook(name: string): Hook;
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
export declare function remapMediaParts(): Promise<void>;
export declare function queueExternalUser(): Promise<void>;
export declare function remapMediumPart(mediumId: number): Promise<void>;
