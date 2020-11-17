import { MediaType } from "./tools";
import { ScrapeType } from "./externals/types";

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

export interface SecondaryMedium {
    id: number;
    totalEpisodes: number;
    readEpisodes: number;
    tocs: FullMediumToc[];
}

export type UpdateMedium = Partial<SimpleMedium> & {
    id: number;
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

export type FullMediumToc = MediumToc & UpdateMedium;

export interface ExtractedIndex {
    combi: number;
    total: number;
    fraction?: number;
}

export interface Indexable {
    totalIndex: number;
    partialIndex?: number;
}

export interface MinPart extends Indexable {
    id: number;
    title?: string;
    mediumId: number;
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

export interface SimpleEpisode extends Indexable {
    id: number;
    partId: number;
    combiIndex?: number;
    releases: EpisodeRelease[];
}

export interface Episode extends SimpleEpisode {
    progress: number;
    readDate: Nullable<Date>;
}

export interface ReadEpisode {
    episodeId: number;
    readDate: Date;
    progress: number;
}

export interface SimpleRelease {
    episodeId: number;
    url: string;
}

export interface EpisodeRelease extends SimpleRelease {
    title: string;
    releaseDate: Date;
    locked?: boolean;
    sourceType?: string;
    tocId?: number;
}

export interface DisplayRelease {
    episodeId: number;
    title: string;
    link: string;
    mediumId: number;
    locked?: boolean;
    date: Date;
    progress: number;
}

export interface DisplayReleasesResponse {
    releases: DisplayRelease[];
    media: Record<number, string>;
    latest: Date;
}

export interface MediumRelease {
    episodeId: number;
    title: string;
    link: string;
    combiIndex: number;
    locked?: boolean;
    date: Date;
}

export interface MinList {
    name: string;
    medium: number;
}

export interface StorageList extends MinList {
    id: number;
    user_uuid: Uuid;
}

export interface List extends MinList {
    id: number;
    userUuid: Uuid;
    items: number[];
}

export interface UpdateUser {
    name?: string;
    newPassword?: string;
    password?: string;
}

export interface SimpleUser {
    uuid: Uuid;
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
    uuid?: Uuid;
    id: number;
    name: string;
    medium: number;
    url: string;
    items: number[];
}

export interface ExternalUser {
    localUuid: Uuid;
    uuid: Uuid;
    identifier: string;
    type: number;
    lists: ExternalList[];
    lastScrape?: Date;
    cookies?: Nullable<string>;
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

export interface NewsResult {
    link: string;
    rawNews: News[] ;
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
    synonym: string[];
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
    result: MetaResult | MetaResult[];
    preliminary?: boolean;
    accept?: boolean;
    url: string;
}

export interface ProgressResult extends MetaResult {
    progress: number;
    readDate: Date;
}

export interface PageInfo {
    link: string;
    key: string;
    values: string[];
}

/**
 * Conditional Type when being an Array or not of U is related to T.
 * 
 * T extends R   -> U
 * T extends R[] -> U[]
 */
export type MultiSingle<T, U> = T extends Array<infer R> ? U[] : U;

/**
 * When Type is either a lone value or an array of values.
 */
export type MultiSingleValue<T> = T[] | T;

/**
 * Conditional Type when being an Array or not of U in a Promise is related to T.
 * 
 * T extends R   -> U
 * T extends R[] -> U[]
 */
export type PromiseMultiSingle<T, U> = Promise<T extends Array<infer R> ? U[] : U>;

/**
 * Convenience type of a lone number or an array of numbers.
 */
export type MultiSingleNumber = MultiSingleValue<number>;

/**
 * Conditional Type with optional values when being an Array or not of U in is related to T.
 * 
 * T extends R   -> Optional<U>   // may be undefined
 * T extends R[] -> U[] | never[] // an array of U or an empty array
 */
export type OptionalMultiSingle<T, U> = T extends Array<infer R> ? (U[] | never[]) : Optional<U>;

/**
 * A Promise with an Optional Value.
 */
export type VoidablePromise<T> = Promise<Optional<T>>;

/**
 * A Promise which always resolves to undefined.
 */
export type EmptyPromise = Promise<void>;

/**
 * Where type may be null.
 */
export type Nullable<T> = T | null;

/**
 * Where type may be undefined.
 */
export type Optional<T> = T | undefined;

/**
 * Unpack the type of a possible nested generic Array or Promise type.
 * 
 * T extends U[]        -> U
 * T extends Promise<U> -> U
 * sonst T
 */
export type Unpack<T> = T extends Promise<infer U> ? U : UnpackArray<T>;

/**
 * Unpack the type of a possible nested generic Array.
 * 
 * T extends U[]        -> U
 * sonst T
 */
export type UnpackArray<T> = T extends Array<infer U> ? U : T;

export type StringKeys<T> = keyof T & string;

/**
 * Type consisting of Property names of T whose type extends from U.
 */
export type PropertyNames<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Yield a type of T where all Properties have a Type which extends from U.
 */
export type Properties<T, U> = Pick<T, PropertyNames<T, U>>;
export type PromiseFunction = (...args: any[]) => Promise<any>;

/**
 * Type of T where all Properties with name in K are omitted.
 * All properties left are Functions which return a Promise.
 */
export type PromiseFunctions<T, K extends StringKeys<T>> = Properties<Omit<T, K>, PromiseFunction>;

export interface Invalidation {
    mediumId?: number;
    partId?: number;
    episodeId?: number;
    uuid: Nullable<Uuid>;
    userUuid?: boolean;
    externalUuid?: Uuid;
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

/**
 * A String in RFC UUID Format with a length of 36 characters.
 */
export type Uuid = string;

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

export interface AllJobStats {
    count: number;
    avgnetwork: number;
    minnetwork: number;
    maxnetwork: number;
    avgreceived: number;
    minreceived: number;
    maxreceived: number;
    avgsend: number;
    minsend: number;
    maxsend: number;
    avgduration: number;
    maxD: number;
    minD: number;
    allupdate: number;
    allcreate: number;
    alldelete: number;
    failed: number;
    succeeded: number;
    queries: number;
    maxQ: number;
    minQ: number;
}

export interface JobStats extends AllJobStats {
    name: string;
}

export type JobHistoryItem = Pick<JobItem, "id" | "type" | "name" | "deleteAfterRun" | "runAfter" | "arguments"> & {
    start: Date;
    end: Date;
    result: string;
    message: string;
    context: string;
}

export interface JobDetails {
    job?: JobItem;
    history: JobHistoryItem[];
}

export enum MilliTime {
    SECOND = 1000,
    MINUTE = 60000,
    HOUR = 3600000,
    DAY = 86400000
}
