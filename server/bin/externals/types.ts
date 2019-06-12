import {News, TocSearchMedium} from "../types";
import {MediaType} from "../tools";

export interface Hook {
    domainReg?: RegExp;
    redirectReg?: RegExp;
    newsAdapter?: NewsScraper[] | NewsScraper;
    tocAdapter?: TocScraper;
    tocSearchAdapter?: TocSearchScraper;
    contentAdapter?: ChapterMetaScraper;
    contentDownloadAdapter?: ContentDownloader;
}

export interface Dependant {
    oneTimeUser?: Array<{ cookies: string, uuid: string }> | { cookies: string, uuid: string };
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
    content: string;
    title: string;
    episodeId: number;
}

export interface TocContent {
    title: string;
    index: number;
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
    contentType: MediaType;
    content: any;
}

export interface TextEpisodeContent extends EpisodeContent {
    contentType: MediaType.TEXT;
    content: string;
}

export interface AudioEpisodeContent extends EpisodeContent {
    contentType: MediaType.AUDIO;
    content: any;
}

export interface ImageEpisodeContent extends EpisodeContent {
    contentType: MediaType.IMAGE;
    content: any;
}

export interface VideoEpisodeContent extends EpisodeContent {
    contentType: MediaType.VIDEO;
    content: any;
}

export interface EpisodeMeta {
    title: string;
}

export interface NewsScraper {
    (): Promise<News[]>;

    link: string;
}

export type TocScraper = (url: string) => Promise<Toc[]>;
export type TocSearchScraper = (medium: TocSearchMedium) => Promise<Toc | undefined>;
export type ChapterMetaScraper = (url: string) => Promise<EpisodeMeta[]>;
export type ContentDownloader = (url: string) => Promise<EpisodeContent[]>;
