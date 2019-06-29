import { ListScrapeResult } from "./listManager";
import { Episode, News, ScrapeItem } from "../types";
import { Dependant, DownloadContent, Hook, NewsScraper, OneTimeToc, Toc } from "./types";
export declare function processNewsScraper(adapter: NewsScraper): Promise<{
    link: string;
    result: News[];
}>;
export declare function checkTocs(): Promise<{
    toc: Toc[];
    uuid?: string;
}>;
export declare function oneTimeToc({ url: link, uuid, mediumId }: OneTimeToc): Promise<{
    toc: Toc[];
    uuid: string;
}>;
/**
 *
 * @param scrapeItem
 * @return {Promise<void>}
 */
export declare function news(scrapeItem: ScrapeItem): Promise<{
    link: string;
    result: News[];
}>;
/**
 *
 * @param value
 * @return {Promise<void>}
 */
export declare function toc(value: ScrapeItem): Promise<void>;
/**
 * Scrapes ListWebsites and follows possible redirected pages.
 */
export declare function list(value: {
    cookies: string;
    uuid: string;
}): Promise<{
    external: {
        cookies: string;
        uuid: string;
    };
    lists: ListScrapeResult;
}>;
/**
 *
 * @param {string} feedLink
 * @return {Promise<News>}
 */
export declare function feed(feedLink: string): Promise<{
    link: string;
    result: News[];
}>;
export declare const scrapeTypes: {
    LIST: number;
    FEED: number;
    NEWS: number;
    TOC: number;
};
/**
 *
 * @return {Promise<void>}
 */
export declare function setup(): Promise<void>;
export declare function add(dependant: Dependant): void;
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
