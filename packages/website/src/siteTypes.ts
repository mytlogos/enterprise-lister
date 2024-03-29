import { CustomHook, ExternalList, JobHistoryItem as ServerJobHistoryItem, List } from "enterprise-core/dist/types";

export type ClickListener = (evt: MouseEvent) => void;
export type KeyboardListener = (evt: KeyboardEvent) => void;

export type EmptyObject = Record<string, never>;

export type Indexable<T> = T & {
  [key in keyof T]: T[key];
};

export type StringKey<T> = Extract<keyof T, string>;

export enum MediaType {
  TEXT = 0x1,
  AUDIO = 0x2,
  VIDEO = 0x4,
  IMAGE = 0x8,
}

export interface TransferMedium {
  mediumId: any;
  listId: any;
  external: any;
  id: number;
}

export interface TransferList {
  listId: any;
  id: number;
  name: string | undefined;
  external: any;
}

export interface SimpleMedium {
  id: number;
  countryOfOrigin?: string;
  languageOfOrigin?: string;
  author?: string;
  title: string;
  medium: number;
  artist?: string;
  lang?: string;
  stateOrigin?: ReleaseState;
  stateTL?: ReleaseState;
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

export interface FullMediumToc {
  mediumId: number;
  link: string;
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

export enum ReleaseState {
  Unknown = 0,
  Ongoing = 1,
  Hiatus = 2,
  Discontinued = 3,
  Dropped = 4,
  Complete = 5,
}

export interface Medium extends SimpleMedium {
  parts?: number[];
  latestReleased: number[];
  currentRead: number;
  unreadEpisodes: number[];
}

export interface Part {
  id: number;
  title?: string;
  totalIndex: number;
  partialIndex?: number;
  episodes: Episode[];
}

export interface Episode {
  id: number;
  partId?: number;
  title?: string;
  totalIndex: number;
  partialIndex?: number;
  url: string;
  releaseDate: Date;
}

export interface User {
  uuid: string;
  name: string;
  session: string;
}

export interface StoreInternalList extends List {
  external: false;
}

export interface StoreExternalList extends ExternalList {
  external: true;
}

export interface ExternalUser {
  uuid: string;
  identifier: string;
  type: number;
  readonly lists: StoreExternalList[];
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
}

export interface EpisodeNews {
  mediumType: MediaType;
  mediumTitle: string;
  partTitle?: string;
  partIndex?: number;
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
  synonym: string | string[];
}

export interface Column {
  name: string;
  prop: StringKey<Medium>;
  show: boolean;
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
  media: MinMedium[];
  latest: Date;
}

export interface MediumRelease {
  episodeId: number;
  combiIndex: number;
  title: string;
  link: string;
  locked?: boolean;
  date: Date;
  progress: number;
}
export interface Job {
  id: number;
  name: string;
  state: "running" | "waiting";
  job_state?: "enabled" | "disabled";
  runningSince?: Date | null;
  nextRun?: Date | null;
}

export interface Modification {
  created: number;
  deleted: number;
  updated: number;
}

export interface NetworkTrack {
  count: number;
  sent: number;
  received: number;
  history: Array<{
    url: string;
    method: string;
    statusCode: number;
    send: number;
    received: number;
  }>;
}

export interface JobTrack {
  modifications: Record<string, Modification>;
  network: NetworkTrack;
  queryCount: number;
  error?: { name: string; message: string };
}

export interface JobHistoryItem extends Omit<ServerJobHistoryItem, "message"> {
  message: string | JobTrack;
}

export interface JobDetails {
  job?: Job;
  history: JobHistoryItem[];
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

export type TimeBucket = "day" | "hour" | "minute";

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

export interface TocContent {
  title: string;
  combiIndex: number;
  totalIndex: number;
  partialIndex?: number;
}

export interface TocEpisode extends TocContent {
  url: string;
  releaseDate?: Date;
  noTime?: boolean;
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
  authors?: Array<{ name: string; link: string }>;
  artists?: Array<{ name: string; link: string }>;
}

export interface AddMedium {
  title: string;
  medium: number;
  author?: string;
  artist?: string;
  countryOfOrigin?: string;
  languageOfOrigin?: string;
  lang?: string;
  stateOrigin?: number;
  stateTL?: number;
  series?: string;
  universe?: string;
}

export interface SearchResult {
  coverUrl?: string;
  link: string;
  title: string;
  author?: string;
  medium: MediaType;
}

export interface MinMedium {
  id: number;
  title: string;
  medium: MediaType;
}

export interface StoreUser {
  settings: any;
  columns: Column[];
  unreadNotificationsCount: number;
  readNotificationsCount: number;
}

export interface Modal {
  show: boolean;
  error: string;
}

export interface Modals {
  addList: Modal;
  addMedium: Modal;
  addExternalUser: Modal;
  login: Modal;
  register: Modal;
  settings: Modal;
  error: Modal;
}

export interface VuexStore {
  user: StoreUser;
  session: string;
  name: string;
  uuid: string;
  modals: Modals;
}

export interface DisplayReleaseItem {
  episodeId: number;
  title: string;
  link: string;
  mediumId: number;
  medium: number;
  mediumTitle: string;
  locked?: boolean;
  date: string;
  time: number;
  read: boolean;
  key: string;
}

export interface ReleaseStore {
  readFilter: boolean | undefined;
  typeFilter: number;
  onlyMedia: number[];
  onlyLists: number[];
  ignoreMedia: number[];
  ignoreLists: number[];
  latest: Date;
  until: Date;
  releases: DisplayReleaseItem[];
  lastFetch?: { args: string; date: number };
  fetching: boolean;
}

export type StoreList = StoreInternalList | StoreExternalList;

export interface ListsStore {
  lists: StoreInternalList[];
}

export interface NewsStore {
  news: News[];
}

export interface CustomHookStore {
  hooks: Record<number, CustomHook>;
}

export interface ScraperHook {
  id: number;
  name: string;
  state: string;
  message: string;
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

export enum HookState {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

export type SelectorValueType = "json" | "regex" | "text";

export type SelectorType = [SelectorValueType] | ["regex", "text"];
