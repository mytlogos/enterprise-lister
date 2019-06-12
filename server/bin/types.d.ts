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
    title: string;
    synonyms: string[];
}

export interface Part {
    mediumId: number;
    id: number;
    title?: string;
    totalIndex: number;
    partialIndex?: number;
    episodes: Episode[];
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

export interface EpisodeRelease {
    episodeId: number;
    title: string;
    url: string;
    releaseDate: Date;
    sourceType: string;
}

export interface List {
    userUuid: string;
    id: number;
    name: string;
    medium: number;
    items: number[];
}

export interface User {
    uuid: string;
    name: string;
    session: string;
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
}

export interface Synonyms {
    mediumId: number;
    synonym: MultiSingle<string>;
}

export interface ScrapeItem {
    link: string;
    lastDate?: Date;
    type?: number;
    userId?: number;
    mediumId?: number;
}

export interface LikeMedium {
    medium?: SimpleMedium;
    title: string;
    link: string;
}

export interface LikeMediumQuery {
    title: string;
    link: string;
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
