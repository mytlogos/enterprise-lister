import { ListScrapeResult } from "./listManager";
import { Episode, JobRequest, News, SearchResult, TocSearchMedium } from "../types";
import { ContentDownloader, DownloadContent, Hook, NewsScraper, Toc, TocContent, TocRequest, TocResult, TocScraper, TocSearchScraper } from "./types";
export declare const filterScrapeAble: (urls: string) => {
    available: string[];
    unavailable: string[];
};
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
export declare const queueTocsJob: () => Promise<JobRequest[]>;
export declare const queueTocs: () => Promise<void>;
export declare const oneTimeToc: ({ url: link, uuid, mediumId }: TocRequest) => Promise<{
    tocs: Toc[];
    uuid?: string | undefined;
}>;
export declare const news: (link: string) => Promise<{
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
export declare class ScraperHelper {
    private readonly eventMap;
    readonly redirects: RegExp[];
    readonly tocScraper: Map<RegExp, TocScraper>;
    readonly episodeDownloader: Map<RegExp, ContentDownloader>;
    readonly tocDiscovery: Map<RegExp, TocSearchScraper>;
    readonly newsAdapter: NewsScraper[];
    on(event: string, callback: (value: any) => void): void;
    emit(event: string, value: any): void;
    init(): void;
    getHook(name: string): Hook;
    private registerHooks;
}
export declare function search(title: string, medium: number): Promise<SearchResult[]>;
export declare function downloadEpisodes(episodes: Episode[]): Promise<DownloadContent[]>;
export declare function remapMediaParts(): Promise<void>;
export declare function queueExternalUser(): Promise<JobRequest[]>;
export declare function remapMediumPart(mediumId: number): Promise<void>;
