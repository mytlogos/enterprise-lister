import { MediaType } from "./tools";
import { ScrapeType } from "./externals/types";
import { FieldInfo, MysqlError, Query } from "mysql";

/**
 * @openapi
 * components:
 *   schemas:
 *     SearchResult:
 *       type: object
 *       properties:
 *         coverUrl:
 *           type: string
 *         link:
 *           type: string
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         medium:
 *           type: integer
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     SimpleMedium:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         countryOfOrigin:
 *           type: string
 *         languageOfOrigin:
 *           type: string
 *         author:
 *           type: string
 *         title:
 *           type: string
 *         medium:
 *           type: integer
 *         artist:
 *           type: string
 *         lang:
 *           type: string
 *         stateOrigin:
 *           type: integer
 *         stateTL:
 *           type: integer
 *         series:
 *           type: string
 *         universe:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     SecondaryMedium:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         totalEpisodes:
 *           type: integer
 *         readEpisodes:
 *           type: integer
 *         tocs:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/FullMediumToc"
 */
export interface SecondaryMedium {
  id: Id;
  totalEpisodes: number;
  readEpisodes: number;
  tocs: FullMediumToc[];
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateMedium:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         countryOfOrigin:
 *           type: string
 *         languageOfOrigin:
 *           type: string
 *         author:
 *           type: string
 *         title:
 *           type: string
 *         medium:
 *           type: integer
 *         artist:
 *           type: string
 *         lang:
 *           type: string
 *         stateOrigin:
 *           type: integer
 *         stateTL:
 *           type: integer
 *         series:
 *           type: string
 *         universe:
 *           type: string
 */
export type UpdateMedium = Partial<SimpleMedium> & {
  id: Id;
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Medium:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         countryOfOrigin:
 *           type: string
 *         languageOfOrigin:
 *           type: string
 *         author:
 *           type: string
 *         title:
 *           type: string
 *         medium:
 *           type: integer
 *         artist:
 *           type: string
 *         lang:
 *           type: string
 *         stateOrigin:
 *           type: integer
 *         stateTL:
 *           type: integer
 *         series:
 *           type: string
 *         universe:
 *           type: string
 *         parts:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 *         latestReleased:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 *         currentRead:
 *           $ref: "#/components/schemas/Id"
 *         unreadEpisodes:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 */
export interface Medium extends SimpleMedium {
  parts?: Id[];
  latestReleased: Id[];
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

/**
 * @openapi
 * components:
 *   schemas:
 *     FullMediumToc:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         link:
 *           type: string
 *         countryOfOrigin:
 *           type: string
 *         languageOfOrigin:
 *           type: string
 *         author:
 *           type: string
 *         title:
 *           type: string
 *         medium:
 *           type: integer
 *         artist:
 *           type: string
 *         lang:
 *           type: string
 *         stateOrigin:
 *           type: integer
 *         stateTL:
 *           type: integer
 *         series:
 *           type: string
 *         universe:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     MinPart:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         title:
 *           type: string
 */
export interface MinPart extends Indexable {
  id: Id;
  title?: string;
  mediumId: number;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     Part:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         title:
 *           type: string
 *         episodes:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Episode"
 */
export interface Part extends MinPart {
  episodes: Episode[] | Id[];
}

/**
 * @openapi
 * components:
 *   schemas:
 *     AddPart:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         title:
 *           type: string
 *         episodes:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/SimpleEpisode"
 */
export interface AddPart extends MinPart {
  episodes: SimpleEpisode[];
}

export interface FullPart extends Part {
  episodes: Episode[];
}

export interface ShallowPart extends Part {
  episodes: Id[];
}

/**
 * @openapi
 * components:
 *   schemas:
 *     SimpleEpisode:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         partId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         combiIndex:
 *           type: number
 *         releases:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/EpisodeRelease"
 */
export interface SimpleEpisode extends Indexable {
  id: Id;
  partId: Id;
  combiIndex?: number;
  releases: EpisodeRelease[];
}

export type CombinedEpisode = SimpleEpisode & {
  combiIndex: number;
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Episode:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         partId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         combiIndex:
 *           type: number
 *         releases:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/EpisodeRelease"
 *         progress:
 *           type: number
 *         readDate:
 *           type: string
 */
export interface Episode extends SimpleEpisode {
  progress: number;
  readDate: Nullable<Date>;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     PureEpisode:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         partId:
 *           $ref: "#/components/schemas/Id"
 *         totalIndex:
 *           type: integer
 *         partialIndex:
 *           type: integer
 *         combiIndex:
 *           type: number
 *         progress:
 *           type: number
 *         readDate:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     EpisodeRelease:
 *       type: object
 *       properties:
 *         episodeId:
 *           $ref: "#/components/schemas/Id"
 *         tocId:
 *           $ref: "#/components/schemas/Id"
 *         url:
 *           type: string
 *         title:
 *           type: string
 *         releaseDate:
 *           type: string
 *         locked:
 *           type: boolean
 *         sourceType:
 *           type: string
 */
export interface EpisodeRelease extends SimpleRelease {
  title: string;
  releaseDate: Date;
  locked?: boolean;
  sourceType?: string;
  tocId?: Id;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     PureDisplayRelease:
 *       type: object
 *       properties:
 *         episodeId:
 *           $ref: "#/components/schemas/Id"
 *         tocId:
 *           $ref: "#/components/schemas/Id"
 *         url:
 *           type: string
 *         title:
 *           type: string
 *         releaseDate:
 *           type: string
 *         locked:
 *           type: boolean
 */
export type PureDisplayRelease = Omit<EpisodeRelease, "sourceType" | "tocId">;

/**
 * @openapi
 * components:
 *   schemas:
 *     DisplayRelease:
 *       type: object
 *       properties:
 *         episodeId:
 *           $ref: "#/components/schemas/Id"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         link:
 *           type: string
 *         title:
 *           type: string
 *         date:
 *           type: string
 *         locked:
 *           type: boolean
 *         progress:
 *           type: number
 */
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

/**
 * @openapi
 * components:
 *    schemas:
 *      MediumRelease:
 *        type: object
 *        properties:
 *          episodeId:
 *           $ref: "#/components/schemas/Id"
 *          title:
 *            type: string
 *          link:
 *            type: string
 *          combiIndex:
 *            type: number
 *          locked:
 *            type: boolean
 *          date:
 *            type: string
 */
export interface MediumRelease {
  episodeId: Id;
  title: string;
  link: Link;
  combiIndex: number;
  locked?: boolean;
  date: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     MinList:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         medium:
 *           type: integer
 */
export interface MinList {
  name: string;
  medium: number;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UserList:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         name:
 *           type: string
 *         medium:
 *           type: integer
 */
export type UserList = MinList & {
  id: Id;
};

export interface StorageList extends MinList {
  id: Id;
  user_uuid: Uuid;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     List:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         userUuid:
 *           $ref: "#/components/schemas/Uuid"
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 *         name:
 *           type: string
 *         medium:
 *           type: integer
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     SimpleUser:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         userUuid:
 *           $ref: "#/components/schemas/Uuid"
 *         session:
 *           type: string
 */
export interface SimpleUser {
  uuid: Uuid;
  name: string;
  session: string;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         userUuid:
 *           $ref: "#/components/schemas/Uuid"
 *         session:
 *           type: string
 *         unreadNews:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 *         unreadChapter:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 *         readToday:
 *           type: array
 *           items:
 *             type:
 *             properties:
 *               episodeId:
 *                 $ref: "#/components/schemas/Id"
 *               readDate:
 *                 type: string
 *               progress:
 *                 type: number
 *         externalUser:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ExternalUser"
 *         lists:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/List"
 */
export interface User extends SimpleUser {
  unreadNews: Id[];
  unreadChapter: Id[];
  readToday: ReadEpisode[];
  externalUser: ExternalUser[];
  lists: List[];
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ExternalList:
 *       type: object
 *       properties:
 *         uuid:
 *           $ref: "#/components/schemas/Uuid"
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         name:
 *           type: string
 *         medium:
 *           type: integer
 *         url:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/Id"
 */
export interface ExternalList {
  uuid?: Uuid;
  id: Id;
  name: string;
  medium: number;
  url: Link;
  items: Id[];
}

/**
 * @openapi
 * components:
 *   schemas:
 *     PureExternalList:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         uuid:
 *           $ref: "#/components/schemas/Uuid"
 *         name:
 *           type: string
 *         medium:
 *           type: integer
 *         url:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     DisplayExternalUser:
 *       type: object
 *       properties:
 *         localUuid:
 *           $ref: "#/components/schemas/Uuid"
 *         uuid:
 *           $ref: "#/components/schemas/Uuid"
 *         identifier:
 *           type: string
 *         type:
 *           type: integer
 *         lists:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ExternalList"
 */
export type DisplayExternalUser = Omit<ExternalUser, "lastScrape" | "cookies">;

/**
 * @openapi
 * components:
 *   schemas:
 *     PureExternalUser:
 *       type: object
 *       properties:
 *         uuid:
 *           $ref: "#/components/schemas/Uuid"
 *         localUuid:
 *           $ref: "#/components/schemas/Uuid"
 *         identifier:
 *           type: string
 *         type:
 *           type: integer
 */
export type PureExternalUser = Omit<DisplayExternalUser, "lists">;

/**
 * @openapi
 * components:
 *    schemas:
 *      News:
 *        type: object
 *        properties:
 *          title:
 *            type: string
 *          link:
 *            type: string
 *          date:
 *            type: string
 *          id:
 *            $ref: "#/components/schemas/Id"
 *          read:
 *            type: boolean
 *          mediumId:
 *            $ref: "#/components/schemas/Id"
 *          mediumTitle:
 *            type: string
 */
export interface News {
  title: string;
  link: Link;
  date: Date;
  id?: Id;
  read?: boolean;
  mediumId?: Id;
  mediumTitle?: string;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     PureNews:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         title:
 *           type: string
 *         link:
 *           type: string
 *         read:
 *           type: boolean
 *         date:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *    schemas:
 *      MetaResult:
 *        type: object
 *        properties:
 *          novel:
 *            type: string
 *          volume:
 *            type: string
 *          volIndex:
 *            type: string
 *          chapIndex:
 *            type: string
 *          type:
 *            type: integer
 *          seeAble:
 *            type: boolean
 */
export interface MetaResult {
  novel: string;
  volume?: string;
  volIndex?: string;
  chapter?: string;
  chapIndex?: string;
  type: MediaType;
  seeAble: boolean;
}

/**
 * @openapi
 * components:
 *    schemas:
 *      Result:
 *        type: object
 *        properties:
 *          result:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/MetaResult"
 *          preliminary:
 *            type: boolean
 *          accept:
 *            type: boolean
 *          url:
 *            type: string
 */
export interface Result {
  result: MetaResult | MetaResult[];
  preliminary?: boolean;
  accept?: boolean;
  url: Link;
}

/**
 * @openapi
 * components:
 *    schemas:
 *      ProgressResult:
 *        type: object
 *        properties:
 *          novel:
 *            type: string
 *          volume:
 *            type: string
 *          volIndex:
 *            type: string
 *          chapIndex:
 *            type: string
 *          type:
 *            type: integer
 *          seeAble:
 *            type: boolean
 *          progress:
 *            type: number
 *          readDate:
 *            type: string
 */
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
 *
 * @openapi
 * components:
 *   schemas:
 *     Uuid:
 *       type: string
 */
export type Uuid = string;

/**
 * A String in a HTTP Url Format.
 */
export type Link = string;

/**
 * An Integer between 1 (inclusive) and 2^64 (inclusive?)
 *
 * @openapi
 * components:
 *   schemas:
 *     Id:
 *       type: integer
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

/**
 * @openapi
 * components:
 *    schemas:
 *      JobItem:
 *        type: object
 *        properties:
 *          type:
 *            type: string
 *          state:
 *            type: string
 *          interval:
 *            type: integer
 *          deleteAfterRun:
 *            type: boolean
 *          id:
 *            $ref: "#/components/schemas/Id"
 *          name:
 *            type: string
 *          runAfter:
 *            $ref: "#/components/schemas/Id"
 *          runningSince:
 *            type: string
 *          nextRun:
 *            type: string
 *          lastRun:
 *            type: string
 *          arguments:
 *            type: string
 *          previousScheduledAt:
 *            type: string
 */
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

/**
 * TODO: domain property need more doc
 *
 * @openapi
 * components:
 *    schemas:
 *      TimeJobStats:
 *        type: object
 *        properties:
 *          count:
 *            type: integer
 *          avgnetwork:
 *            type: number
 *          avgreceived:
 *            type: number
 *          avgsend:
 *            type: number
 *          avgduration:
 *            type: number
 *          allupdate:
 *            type: integer
 *          allcreate:
 *            type: integer
 *          alldelete:
 *            type: integer
 *          failed:
 *            type: integer
 *          succeeded:
 *            type: integer
 *          queries:
 *            type: integer
 *          avglagging:
 *            type: number
 *          timepoint:
 *            type: string
 *          domain:
 *            type: object
 */
export interface TimeJobStats extends BasicJobStats {
  timepoint: Date;
  domain?: Record<string, BasicJobStats>;
}

/**
 * @openapi
 * components:
 *    schemas:
 *      AllJobStats:
 *        type: object
 *        properties:
 *          count:
 *            type: integer
 *          avgnetwork:
 *            type: number
 *          avgreceived:
 *            type: number
 *          avgsend:
 *            type: number
 *          avgduration:
 *            type: number
 *          allupdate:
 *            type: integer
 *          allcreate:
 *            type: integer
 *          alldelete:
 *            type: integer
 *          failed:
 *            type: integer
 *          succeeded:
 *            type: integer
 *          queries:
 *            type: integer
 *          avglagging:
 *            type: number
 *          minnetwork:
 *            type: integer
 *          maxnetwork:
 *            type: integer
 *          minreceived:
 *            type: integer
 *          maxreceived:
 *            type: integer
 *          minsend:
 *            type: integer
 *          maxsend:
 *            type: integer
 *          maxD:
 *            type: integer
 *          minD:
 *            type: integer
 *          maxQ:
 *            type: integer
 *          minQ:
 *            type: integer
 */
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

/**
 * @openapi
 * components:
 *    schemas:
 *      JobStats:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          count:
 *            type: integer
 *          avgnetwork:
 *            type: number
 *          avgreceived:
 *            type: number
 *          avgsend:
 *            type: number
 *          avgduration:
 *            type: number
 *          allupdate:
 *            type: integer
 *          allcreate:
 *            type: integer
 *          alldelete:
 *            type: integer
 *          failed:
 *            type: integer
 *          succeeded:
 *            type: integer
 *          queries:
 *            type: integer
 *          avglagging:
 *            type: number
 *          minnetwork:
 *            type: integer
 *          maxnetwork:
 *            type: integer
 *          minreceived:
 *            type: integer
 *          maxreceived:
 *            type: integer
 *          minsend:
 *            type: integer
 *          maxsend:
 *            type: integer
 *          maxD:
 *            type: integer
 *          minD:
 *            type: integer
 *          maxQ:
 *            type: integer
 *          minQ:
 *            type: integer
 */
export interface JobStats extends AllJobStats {
  name: string;
}

/**
 * @openapi
 * components:
 *    schemas:
 *      JobHistoryItem:
 *        type: object
 *        properties:
 *          scheduled_at:
 *            type: string
 *          start:
 *            type: string
 *          end:
 *            type: string
 *          result:
 *            type: string
 *          message:
 *            type: string
 *          context:
 *            type: string
 *          state:
 *            type: string
 *          interval:
 *            type: integer
 *          runningSince:
 *            type: string
 *          nextRun:
 *            type: string
 *          lastRun:
 *            type: string
 *          previousScheduledAt:
 *            type: string
 */
export type JobHistoryItem = Pick<JobItem, "id" | "type" | "name" | "deleteAfterRun" | "runAfter" | "arguments"> & {
  scheduled_at: Date;
  start: Date;
  end: Date;
  result: string;
  message: string;
  context: string;
};

/**
 * @openapi
 * components:
 *    schemas:
 *      JobDetails:
 *        type: object
 *        properties:
 *          job:
 *            $ref: "#/components/schemas/JobItem"
 *          history:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/JobHistoryItem"
 */
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

/**
 * @openapi
 * components:
 *    schemas:
 *      ListMedia:
 *        type: object
 *        properties:
 *          list:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/List"
 *          media:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/Medium"
 */
export interface ListMedia {
  list: List[] | List;
  media: Medium[];
}

/**
 * TODO: specify type more
 *
 * @openapi
 * components:
 *    schemas:
 *      DataStats:
 *        type: object
 *        properties:
 *          media:
 *            type: object
 *            additionalProperties:
 *              type: object
 *              properties:
 *                episodeCount:
 *                  type: integer
 *                releaseCount:
 *                  type: integer
 *                episodeSum:
 *                  type: integer
 *          mediaStats:
 *            type: object
 *            additionalProperties:
 *              type: object
 *              properties:
 *                tocs:
 *                  type: integer
 *          lists:
 *            type: object
 *            additionalProperties:
 *              type: array
 *              items:
 *                $ref: "#/components/schemas/Id"
 *          extLists:
 *            type: object
 *            additionalProperties:
 *              type: array
 *              items:
 *                $ref: "#/components/schemas/Id"
 *          extUser:
 *            type: object
 *            additionalProperties:
 *              type: array
 *              items:
 *                $ref: "#/components/schemas/Id"
 */
export interface DataStats {
  media: Record<Id, Record<Id, { episodeCount: number; episodeSum: number; releaseCount: number }>>;
  mediaStats: Record<Id, { tocs: number }>;
  lists: Record<Id, Id[]>;
  extLists: Record<Id, Id[]>;
  extUser: Record<Uuid, Id[]>;
}

/**
 * TODO: specify type more
 *
 * @openapi
 * components:
 *    schemas:
 *      NewData:
 *        type: object
 *        properties:
 *          tocs:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/FullMediumToc"
 *          media:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/SimpleMedium"
 *          releases:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/PureDisplayRelease"
 *          episode:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/PureEpisode"
 *          parts:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/MinPart"
 *          lists:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/UserList"
 *          extLists:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/PureExternalList"
 *          extUser:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/PureExternalUser"
 *          mediaInWait:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/MediumInWait"
 *          news:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/PureNews"
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     MediumInWait:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         medium:
 *           type: integer
 *         link:
 *           type: string
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     ScraperHook:
 *       type: object
 *       properties:
 *         id:
 *           $ref: "#/components/schemas/Id"
 *         name:
 *           type: string
 *         state:
 *           type: string
 *         message:
 *           type: string
 */
export interface ScraperHook {
  id: number;
  name: string;
  state: string;
  message: string;
}

export type AppEventType = "start" | "end";
export type AppEventProgram = "server" | "crawler";

/**
 * @openapi
 * components:
 *    schemas:
 *      AppEvent:
 *        type: object
 *        properties:
 *          id:
 *            $ref: "#/components/schemas/Id"
 *          program:
 *            type: string
 *          date:
 *            type: string
 *          type:
 *            type: string
 */
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

/**
 * @openapi
 * components:
 *    schemas:
 *      JobStatSummary:
 *        type: object
 *        properties:
 *          name:
 *            type: string
 *          type:
 *            type: string
 *          count:
 *            type: integer
 *          failed:
 *            type: integer
 *          succeeded:
 *            type: integer
 *          network_requests:
 *            type: integer
 *          network_send:
 *            type: integer
 *          network_received:
 *            type: integer
 *          duration:
 *            type: integer
 *          updated:
 *            type: integer
 *          created:
 *            type: integer
 *          deleted:
 *            type: integer
 *          sql_queries:
 *            type: integer
 *          lagging:
 *            type: integer
 *          min_network_requests:
 *            type: integer
 *          min_network_send:
 *            type: integer
 *          min_network_received:
 *            type: integer
 *          min_duration:
 *            type: integer
 *          min_updated:
 *            type: integer
 *          min_created:
 *            type: integer
 *          min_deleted:
 *            type: integer
 *          min_sql_queries:
 *            type: integer
 *          min_lagging:
 *            type: integer
 *          max_network_requests:
 *            type: integer
 *          max_network_send:
 *            type: integer
 *          max_network_received:
 *            type: integer
 *          max_duration:
 *            type: integer
 *          max_updated:
 *            type: integer
 *          max_created:
 *            type: integer
 *          max_deleted:
 *            type: integer
 *          max_sql_queries:
 *            type: integer
 *          max_lagging:
 *            type: integer
 */
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
