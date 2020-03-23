import { Hook } from "./types";
import { ReleaseState } from "../types";
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
interface ListScrapeRelease {
    partIndex?: number;
    episodeIndex?: number;
    end?: boolean;
}
export interface ScrapeMedium {
    title: RowResult;
    current: ListScrapeRelease | RowResult;
    latest: ListScrapeRelease | RowResult;
    medium: number;
    synonyms?: string[];
    langCOO?: string;
    langTL?: string;
    statusCOO?: ReleaseState;
    statusTl?: ReleaseState;
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
    } | string): Promise<boolean>;
    scrapeLists(): Promise<ListScrapeResult>;
    scrapeMedium(medium: ScrapeMedium): Promise<void>;
    scrapeMedia(media: ScrapeMedium[]): Promise<ScrapeMedium[]>;
    stringifyCookies(): string;
    parseAndReplaceCookies(cookies: string): void;
}
export declare function factory(type: number, cookies?: string): ListManager;
export {};
