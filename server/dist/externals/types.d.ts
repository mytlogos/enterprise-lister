import { EpisodeNews, News, TocSearchMedium } from "../types";
import { MediaType } from "../tools";
import { JobCallback } from "../jobQueue";
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
export interface ScrapeNewsChapter {
    mediumTitle: string;
    mediumLink: string;
    type: MediaType;
    allowedParts?: number;
    standardPartOnly?: boolean;
    partTitle?: string;
    sourceType: string;
    date: Date;
    episodeLink: string;
    episodeTitle: string;
    episodeTotalIndex: number;
    episodePartialIndex?: number;
    partTotalIndex?: number;
    partPartialIndex?: number;
}
export interface ScrapeNews extends News {
    scrapeNewsChapter: ScrapeNewsChapter;
}
export interface Hook {
    name: string;
    domainReg?: RegExp;
    tocPattern?: RegExp;
    redirectReg?: RegExp;
    newsAdapter?: NewsScraper[] | NewsScraper;
    tocAdapter?: TocScraper;
    tocSearchAdapter?: TocSearchScraper;
    contentAdapter?: ChapterMetaScraper;
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
    oneTimeToc?: OneTimeToc[] | OneTimeToc;
    feed?: string[] | string;
    news?: any[] | any;
    toc?: any[] | any;
    medium?: any[] | any;
}
export interface OneTimeToc {
    url: string;
    uuid: string;
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
}
export interface EpisodeContent {
    mediumTitle: string;
    episodeTitle: string;
    index?: number;
    locked?: boolean;
    content: string[];
}
export interface EpisodeMeta {
    title: string;
}
export interface NewsScrapeResult {
    news?: News[];
    episodes?: EpisodeNews[];
    update?: boolean;
}
export interface NewsScraper {
    (): Promise<NewsScrapeResult | undefined>;
    link: string;
}
export declare type TocScraper = (url: string) => Promise<Toc[]>;
export declare type TocSearchScraper = (medium: TocSearchMedium) => Promise<Toc | undefined>;
export declare type ChapterMetaScraper = (url: string) => Promise<EpisodeMeta[]>;
export declare type ContentDownloader = (url: string) => Promise<EpisodeContent[]>;
