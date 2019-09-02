import { Hook } from "./types";
export declare enum ListType {
    NOVELUPDATES = 0
}
export interface ListScrapeResult {
    lists: ScrapeList[];
    media: ScrapeMedium[];
    feed: string[];
}
export interface RowResult {
    text: string;
    link: string;
    date?: string;
}
export interface ScrapeList {
    name: string;
    link: string;
    medium: number;
    media: ScrapeMedium[] | number[];
}
export interface ScrapeMedium {
    title: RowResult;
    current: RowResult;
    latest: RowResult;
    medium: number;
    synonyms?: string[];
    langCOO?: string;
    langTL?: string;
    statusCOO?: string;
    authors?: Array<{
        name: string;
        link: string;
    }>;
    artists?: Array<{
        name: string;
        link: string;
    }>;
}
export declare function getListManagerHooks(): Hook[];
export interface ListManager {
    test(credentials: {
        identifier: string;
        password: string;
    }): Promise<boolean>;
    scrapeLists(): Promise<ListScrapeResult>;
    scrapeMedium(medium: ScrapeMedium): void;
    scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]>;
    stringifyCookies(): string;
    parseAndReplaceCookies(cookies: string): void;
}
export declare function factory(type: number, cookies?: string): ListManager;
