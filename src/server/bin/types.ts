import { MediaType } from "./tools";
import { ScrapeType } from "./externals/types";
import { FieldInfo, MysqlError, Query } from "mysql";

export interface SearchResult {
  coverUrl?: Link;
  link: Link;
  title: string;
  author?: string;
  medium: MediaType;
}

export interface MinMedium {
  id: Id;
  title: string;
  medium: MediaType;
}

export interface SimpleMedium {
  id?: Id;
  countryOfOrigin?: string;
  languageOfOrigin?: string;
  author?: string;
  title: string;
  medium: MediaType;
  artist?: string;
  lang?: string;
  stateOrigin?: ReleaseState;
  stateTL?: ReleaseState;
  series?: string;
  universe?: string;

  [key: string]: any;
}

export interface SecondaryMedium {
  id: Id;
  totalEpisodes: number;
  readEpisodes: number;
  tocs: FullMediumToc[];
}

export type UpdateMedium = Partial<SimpleMedium> & {
  id: Id;
};

export interface Medium extends SimpleMedium {
  parts?: Id[];
  latestReleased: number[];
  currentRead: Id;
  unreadEpisodes: Id[];
}

export interface TocSearchMedium {
  mediumId: Id;
  hosts?: string[];
  title: string;
  medium: MediaType;
  synonyms: string[];
}

export interface MediumToc {
  mediumId: Id;
  link: Link;
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
  id: Id;
  title?: string;
  mediumId: number;
}

export interface Part extends MinPart {
  episodes: Episode[] | Id[];
}

export interface FullPart extends Part {
  episodes: Episode[];
}

export interface ShallowPart extends Part {
  episodes: Id[];
}

export interface SimpleEpisode extends Indexable {
  id: Id;
  partId: Id;
  combiIndex?: number;
  releases: EpisodeRelease[];
}

export type CombinedEpisode = SimpleEpisode & {
  combiIndex: number;
};

export interface Episode extends SimpleEpisode {
  progress: number;
  readDate: Nullable<Date>;
}

export type PureEpisode = Omit<Episode, "releases">;

export interface ReadEpisode {
  episodeId: Id;
  readDate: Date;
  progress: number;
}

export interface SimpleRelease {
  episodeId: Id;
  url: Link;
}

export interface EpisodeRelease extends SimpleRelease {
  title: string;
  releaseDate: Date;
  locked?: boolean;
  sourceType?: string;
  tocId?: Id;
}

export type PureDisplayRelease = Omit<EpisodeRelease, "sourceType" | "tocId">;

export interface DisplayRelease {
  episodeId: Id;
  title: string;
  link: Link;
  mediumId: Id;
  locked?: boolean;
  date: Date;
  progress: number;
}

export interface DisplayReleasesResponse {
  releases: DisplayRelease[];
  media: MinMedium[];
  latest: Date;
}

export interface MediumRelease {
  episodeId: Id;
  title: string;
  link: Link;
  combiIndex: number;
  locked?: boolean;
  date: Date;
}

export interface MinList {
  name: string;
  medium: number;
}

export type UserList = MinList & {
  id: Id;
};

export interface StorageList extends MinList {
  id: Id;
  user_uuid: Uuid;
}

export interface List extends MinList {
  id: Id;
  userUuid: Uuid;
  items: Id[];
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
  unreadNews: Id[];
  unreadChapter: Id[];
  readToday: ReadEpisode[];
  externalUser: ExternalUser[];
  lists: List[];
}

export interface ExternalList {
  uuid?: Uuid;
  id: Id;
  name: string;
  medium: number;
  url: Link;
  items: number[];
}

export type PureExternalList = Omit<ExternalList, "items">;

export interface ExternalUser {
  localUuid: Uuid;
  uuid: Uuid;
  identifier: string;
  type: number;
  lists: ExternalList[];
  lastScrape?: Date;
  cookies?: Nullable<string>;
}

export type DisplayExternalUser = Omit<ExternalUser, "lastScrape" | "cookies">;
export type PureExternalUser = Omit<DisplayExternalUser, "lists">;

export interface News {
  title: string;
  link: Link;
  date: Date;
  id?: Id;
  read?: boolean;
  mediumId?: Id;
  mediumTitle?: number;
}

export type PureNews = Omit<News, "mediumId" | "mediumTitle">;

export interface NewsResult {
  link: Link;
  rawNews: News[];
}

export interface EpisodeNews {
  mediumType: MediaType;
  mediumTocLink?: Link;
  mediumTitle: string;
  partIndex?: number;
  partTotalIndex?: number;
  partPartialIndex?: number;
  episodeTitle: string;
  episodeIndex: number;
  episodeTotalIndex: number;
  episodePartialIndex?: number;
  locked?: boolean;
  link: Link;
  date: Date;
}

export interface Synonyms {
  mediumId: Id;
  synonym: string[];
}

export interface ScrapeItem {
  link: Link;
  type: ScrapeType;
  nextScrape?: Date;
  userId?: Uuid;
  externalUserId?: Uuid;
  mediumId?: Id;
  info?: string;
}

export interface LikeMedium {
  medium?: SimpleMedium;
  title: string;
  link: Link;
}

export interface LikeMediumQuery {
  title: string;
  link?: Link;
  type?: MediaType;
}

export interface MetaResult {
  novel: string;
  volume?: string;
  volIndex?: string;
  chapter?: string;
  chapIndex?: string;
  type: MediaType;
  seeAble: boolean;
}

export interface Result {
  result: MetaResult | MetaResult[];
  preliminary?: boolean;
  accept?: boolean;
  url: Link;
}

export interface ProgressResult extends MetaResult {
  progress: number;
  readDate: Date;
}

export interface PageInfo {
  link: Link;
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
export type OptionalMultiSingle<T, U> = T extends Array<infer R> ? U[] | never[] : Optional<U>;

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

/**
 * Set specific properties with string keys as required.
 */
export type NonNull<T, K extends StringKeys<T>> = T &
  {
    [S in K]-?: T[K];
  };

export type Primitive = string | number | boolean;

export interface Invalidation {
  mediumId?: Id;
  partId?: Id;
  episodeId?: Id;
  uuid: Nullable<Uuid>;
  userUuid?: boolean;
  externalUuid?: Uuid;
  externalListId?: Id;
  listId?: Id;
  newsId?: Id;
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

/**
 * A String in a HTTP Url Format.
 */
export type Link = string;

/**
 * An Integer between 1 (inclusive) and 2^64 (inclusive?)
 */
export type Id = number;

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
  id: Id;
  name: string;
  runAfter?: Id;
  runningSince?: Date;
  nextRun?: Date;
  lastRun?: Date;
  arguments?: string;
  previousScheduledAt?: Date;
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

export interface BasicJobStats {
  count: number;
  avgnetwork: number;
  avgreceived: number;
  avgsend: number;
  avgduration: number;
  allupdate: number;
  allcreate: number;
  alldelete: number;
  failed: number;
  succeeded: number;
  queries: number;
  avglagging: number;
}

export interface TimeJobStats extends BasicJobStats {
  timepoint: Date;
  domain?: Record<string, BasicJobStats>;
}

export interface AllJobStats extends BasicJobStats {
  minnetwork: number;
  maxnetwork: number;
  minreceived: number;
  maxreceived: number;
  minsend: number;
  maxsend: number;
  maxD: number;
  minD: number;
  maxQ: number;
  minQ: number;
}

export interface JobStats extends AllJobStats {
  name: string;
}

export type JobHistoryItem = Pick<JobItem, "id" | "type" | "name" | "deleteAfterRun" | "runAfter" | "arguments"> & {
  scheduled_at: Date;
  start: Date;
  end: Date;
  result: string;
  message: string;
  context: string;
};

export interface JobDetails {
  job?: JobItem;
  history: JobHistoryItem[];
}
export type JobStatFilter = NamedJobStatFilter | TimeJobStatFilter;

export interface NamedJobStatFilter {
  type: "named";
}

export type TimeBucket = "day" | "hour" | "minute";

export interface TimeJobStatFilter {
  type: "timed";
  unit: TimeBucket;
  groupByDomain: boolean;
}

export enum MilliTime {
  SECOND = 1000,
  MINUTE = 60000,
  HOUR = 3600000,
  DAY = 86400000,
}

export interface TypedQuery<Packet = any> extends Query {
  on(ev: "packet", callback: (packet: any) => void): Query;

  on(ev: "result", callback: (row: Packet, index: number) => void): Query;

  on(ev: "error", callback: (err: MysqlError) => void): Query;

  on(ev: "fields", callback: (fields: FieldInfo[], index: number) => void): Query;

  on(ev: "end", callback: () => void): Query;
}

export interface ListMedia {
  list: List[] | List;
  media: Medium[];
}

export interface DataStats {
  media: Record<Id, Record<Id, { episodeCount: number; episodeSum: number; releaseCount: number }>>;
  mediaStats: Record<Id, { tocs: number }>;
  lists: Record<Id, Id[]>;
  extLists: Record<Id, Id[]>;
  extUser: Record<Uuid, Id[]>;
}

export interface NewData {
  tocs: FullMediumToc[];
  media: SimpleMedium[];
  releases: PureDisplayRelease[];
  episodes: PureEpisode[];
  parts: MinPart[];
  lists: UserList[];
  extLists: PureExternalList[];
  extUser: PureExternalUser[];
  mediaInWait: MediumInWait[];
  news: PureNews[];
}

export interface MediumInWait {
  title: string;
  medium: MediaType;
  link: string;
}

export interface MediumInWaitSearch {
  title?: string;
  medium?: MediaType;
  link?: string;
  limit?: number;
}

export interface ScraperHook {
  id: number;
  name: string;
  state: string;
  message: string;
}

export type AppEventType = "start" | "end";
export type AppEventProgram = "server" | "crawler";

export interface AppEvent {
  id: number;
  program: "server" | "crawler";
  date: Date;
  type: AppEventType;
}

export interface AppEventFilter {
  program?: AppEventProgram | AppEventProgram[];
  fromDate?: Date;
  toDate?: Date;
  type?: AppEventType | AppEventType[];
  sortOrder?: keyof AppEvent | Array<keyof AppEvent>;
}

type MinMax<T extends string> = Record<T | `min_${T}` | `max_${T}`, number>;

export type JobStatSummary = {
  name: string;
  type: string;
  count: number;
  failed: number;
  succeeded: number;
} & MinMax<
  | "network_requests"
  | "network_send"
  | "network_received"
  | "duration"
  | "updated"
  | "created"
  | "deleted"
  | "sql_queries"
  | "lagging"
>;
