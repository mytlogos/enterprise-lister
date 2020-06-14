import {MediaType} from "./tools";
import {ScrapeType} from "./externals/types";

export interface SearchResult {
    coverUrl?: string;
    link: string;
    title: string;
    author?: string;
}

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

export interface UpdateMedium {
    id: number;
    countryOfOrigin?: string;
    languageOfOrigin?: string;
    author?: string;
    title?: string;
    medium?: number;
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
    medium: MediaType;
    synonyms: string[];
}

export interface MediumToc {
    mediumId: number;
    link: string;
}

export interface MinPart {
    id: number;
    title?: string;
    mediumId: number;
    totalIndex: number;
    partialIndex?: number;
}

export interface Part extends MinPart {
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
    combiIndex?: number;
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
    locked?: boolean;
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
    locked?: boolean;
    link: string;
    date: Date;
}

export interface Synonyms {
    mediumId: number;
    synonym: MultiSingle<string>;
}

export interface ScrapeItem {
    link: string;
    type: ScrapeType;
    nextScrape?: Date;
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

export interface EpisodeContentData {
    episodeTitle: string;
    index: number;
    mediumTitle: string;
}

export enum ReleaseState {
    Unknown = 0,
    Ongoing = 1,
    Hiatus = 2,
    Discontinued = 3,
    Dropped = 4,
    Complete = 5,
}

export type ExternalUserUuid = string;
export type UserUuid = string;

export enum ScrapeName {
    searchForToc = "searchForToc",
    toc = "toc",
    oneTimeToc = "oneTimeToc",
    feed = "feed",
    news = "news",
    newsAdapter = "newsAdapter",
    oneTimeUser = "oneTimeUser",
    checkTocs = "checkTocs",
    queueTocs = "queueTocs",
    remapMediaParts = "remapMediaParts",
    queueExternalUser = "queueExternalUser",
}

export enum JobState {
    RUNNING = "running",
    WAITING = "waiting",
}

export interface JobItem {
    type: ScrapeName;
    state: JobState;
    interval: number;
    deleteAfterRun: boolean;
    id: number;
    name: string;
    runAfter?: number;
    runningSince?: Date;
    nextRun?: Date;
    lastRun?: Date;
    arguments?: string;
}

export interface JobRequest {
    type: ScrapeName;
    interval: number;
    deleteAfterRun: boolean;
    runImmediately: boolean;
    name?: string;
    runAfter?: JobRequest | JobItem;
    arguments?: string;
}

export enum MilliTime {
    SECOND = 1000,
    MINUTE = 60000,
    HOUR = 3600000,
    DAY = 86400000
}
