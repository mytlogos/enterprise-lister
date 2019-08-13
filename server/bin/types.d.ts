import {MediaType} from "./tools";
import {ScrapeTypes} from "./externals/scraperTools";

export interface SimpleMedium {
    id?: number;
    countryOfOrigin?: string;
    languageOfOrigin?: string;
    author?: string;
    title: string;
    medium: number;
    artist?: string;
    lang?: string;
    stateOrigin?: number;
    stateTL?: number;
    series?: string;
    universe?: string;

    [key: string]: any;
}

export interface Medium extends SimpleMedium {
    parts?: number[];
    latestReleased: number[];
    currentRead: number;
    unreadEpisodes: number[];
}

export interface TocSearchMedium {
    mediumId: number;
    hosts?: string[];
    title: string;
    synonyms: string[];
}

export interface Part {
    id: number;
    title?: string;
    mediumId: number;
    totalIndex: number;
    partialIndex?: number;
    episodes: Episode[] | number[];

}

export interface FullPart extends Part {
    episodes: Episode[];
}

export interface ShallowPart extends Part {
    episodes: number[];
}

export interface SimpleEpisode {
    id: number;
    partId: number;
    totalIndex: number;
    partialIndex?: number;
    releases: EpisodeRelease[];
}

export interface Episode extends SimpleEpisode {
    progress: number;
    readDate: Date | null;
}

export interface SimpleRelease {
    episodeId: number;
    url: string;
}

export interface EpisodeRelease {
    episodeId: number;
    title: string;
    url: string;
    releaseDate: Date;
    sourceType?: string;
}

export interface List {
    userUuid: string;
    id: number;
    name: string;
    medium: number;
    items: number[];
}

export interface SimpleUser {
    uuid: string;
    name: string;
    session: string;
}

export interface User extends SimpleUser {
    unreadNews: number[];
    unreadChapter: number[];
    readToday: ReadEpisode[];
    externalUser: ExternalUser[];
    lists: List[];
}

export interface ExternalList {
    uuid?: string;
    id: number;
    name: string;
    medium: number;
    url: string;
    items: number[];
}

export interface ExternalUser {
    localUuid: string;
    uuid: string;
    identifier: string;
    type: number;
    lists: ExternalList[];
    lastScrape?: Date;
    cookies?: string | null;
}

export interface News {
    title: string;
    link: string;
    date: Date;
    id?: number;
    read?: boolean;
    mediumId?: number;
    mediumTitle?: number;
}

export interface EpisodeNews {
    mediumType: MediaType;
    mediumTocLink?: string;
    mediumTitle: string;
    partIndex?: number;
    partTotalIndex?: number;
    partPartialIndex?: number;
    episodeTitle: string;
    episodeIndex: number;
    episodeTotalIndex: number;
    episodePartialIndex?: number;
    link: string;
    date: Date;
}

export interface Synonyms {
    mediumId: number;
    synonym: MultiSingle<string>;
}

export interface ScrapeItem {
    link: string;
    type: ScrapeTypes;
    lastDate?: Date;
    userId?: string;
    externalUserId?: string;
    mediumId?: number;
    info?: string;
}

export interface LikeMedium {
    medium?: SimpleMedium;
    title: string;
    link: string;
}

export interface LikeMediumQuery {
    title: string;
    link?: string;
    type?: number;
}

export interface MetaResult {
    novel: string;
    volume?: string;
    volIndex?: string;
    chapter?: string;
    chapIndex?: string;
    type: string;
    seeAble: boolean;
}

export interface Result {
    result: MultiSingle<MetaResult>;
    preliminary?: boolean;
    accept?: boolean;
    url: string;
}

export interface ProgressResult extends MetaResult {
    progress: number;
    readDate: Date;
}

export type MultiSingle<T> = T | T[];

export interface ReadEpisode {
    episodeId: number;
    readDate: Date;
    progress: number;
}

export interface Invalidation {
    mediumId?: number;
    partId?: number;
    episodeId?: number;
    uuid: string | null;
    userUuid?: boolean;
    externalUuid?: string;
    externalListId?: number;
    listId?: number;
    newsId?: number;
}

export type EpisodeContentData = { episodeTitle: string; index: number; mediumTitle: string; };
