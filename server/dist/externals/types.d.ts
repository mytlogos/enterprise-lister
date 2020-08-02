import { EpisodeNews, News, ReleaseState, SearchResult, TocSearchMedium } from "../types";
import { MediaType } from "../tools";
import { JobCallback } from "../jobManager";
export interface ScraperJob {
    type: string;
    onSuccess?: () => void;
    onDone?: () => void | ScraperJob | ScraperJob[];
    onFailure?: (reason?: any) => void;
    cb: (item: any) => Promise<any>;
}
export interface OneTimeEmittableJob extends ScraperJob {
    type: "onetime_emittable";
    key: string;
    item: any;
}
export interface PeriodicEmittableJob extends ScraperJob {
    type: "periodic_emittable";
    interval: number;
    key: string;
    item: any;
}
export interface PeriodicJob extends ScraperJob {
    type: "periodic";
    interval: number;
    cb: JobCallback;
}
export interface Hook {
    name: string;
    medium: MediaType;
    domainReg?: RegExp;
    tocPattern?: RegExp;
    redirectReg?: RegExp;
    newsAdapter?: NewsScraper;
    tocAdapter?: TocScraper;
    tocSearchAdapter?: TocSearchScraper;
    searchAdapter?: SearchScraper;
    contentDownloadAdapter?: ContentDownloader;
}
export interface Dependant {
    oneTimeUser?: Array<{
        cookies: string;
        uuid: string;
    }> | {
        cookies: string;
        uuid: string;
    };
    oneTimeToc?: TocRequest[] | TocRequest;
    feed?: string[] | string;
    news?: any[] | any;
    toc?: any[] | any;
}
export interface TocRequest {
    url: string;
    uuid?: string;
    mediumId?: number;
}
export interface DownloadContent {
    content: string[];
    title: string;
    episodeId: number;
}
export interface TocContent {
    title: string;
    combiIndex: number;
    totalIndex: number;
    partialIndex?: number;
}
export interface TocEpisode extends TocContent {
    url: string;
    releaseDate?: Date;
    locked?: boolean;
}
export interface TocPart extends TocContent {
    episodes: TocEpisode[];
}
export interface Toc {
    title: string;
    content: TocContent[];
    mediumId?: number;
    synonyms?: string[];
    mediumType: MediaType;
    partsOnly?: boolean;
    end?: boolean;
    link: string;
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
export interface EpisodeContent {
    mediumTitle: string;
    episodeTitle: string;
    index?: number;
    locked?: boolean;
    content: string[];
}
export interface NewsScrapeResult {
    news?: News[];
    episodes?: EpisodeNews[];
    update?: boolean;
}
export interface NewsScraper {
    (): Promise<NewsScrapeResult | undefined>;
    link: string;
    hookName?: string;
}
export interface TocSearchScraper {
    (medium: TocSearchMedium): Promise<Toc | undefined>;
    link: string;
    medium: MediaType;
    blindSearch?: boolean;
    hookName?: string;
}
export interface SearchScraper {
    (text: string, medium: number): Promise<SearchResult[]>;
    medium: MediaType;
}
export interface TocScraper {
    (url: string): Promise<Toc[]>;
    hookName?: string;
}
export interface ContentDownloader {
    (url: string): Promise<EpisodeContent[]>;
    hookName?: string;
}
export interface TocResult {
    tocs: Toc[];
    uuid?: string;
}
export declare enum ScrapeType {
    LIST = 0,
    FEED = 1,
    NEWS = 2,
    TOC = 3,
    ONETIMEUSER = 4,
    ONETIMETOC = 5,
    SEARCH = 6
}
