import {
  EpisodeNews,
  News,
  ReleaseState,
  SearchResult,
  TocSearchMedium,
  Uuid,
  VoidablePromise,
  MultiSingleValue,
  Link,
  Id,
  ExternalStorageUser,
  JobTrack,
  ScrapeName,
} from "enterprise-core/dist/types";
import { MediaType } from "enterprise-core/dist/tools";
import { JobCallback } from "../scheduler/jobQueue";
import { ListScrapeResult } from "./listManager";

/**
 * Channels accessible in Scraper.
 */
export type ScraperChannel = "enterprise-jobqueue" | "enterprise-jobs" | "enterprise-requestqueue";

export interface BasicChannelMessage {
  messageType: string;
}

export type ChannelMessage = JobChannelMessage | JobQueueChannelMessage | RequestQueueChannelMessage;
export type WSRequest = JobWSRequest | JobQueueWSRequest | RequestQueueWSRequest;

export type RequestQueueWSRequest = "START_REQUESTQUEUE" | "STOP_REQUESTQUEUE";

/**
 * Channel Message Type for "enterprise-requestqueue".
 */
export interface RequestQueueChannelMessage extends BasicChannelMessage {
  messageType: "requestqueue";
  queueName: string;
  maxInterval: number;
  queued: number;
  working: boolean;
}

export type JobQueueWSRequest = "START_JOBQUEUE" | "STOP_JOBQUEUE";

/**
 * Channel Message Type for "enterprise-jobqueue".
 */
export interface JobQueueChannelMessage extends BasicChannelMessage {
  messageType: "jobqueue";
  active: number;
  queued: number;
  max: number;
}

export type JobWSRequest = "START_JOBS" | "STOP_JOBS";

/**
 * Channel Message Type for "enterprise-jobs".
 */
export interface BasicJobChannelMessage extends BasicChannelMessage {
  messageType: "jobs";
  type: string;
  jobName: string;
  jobId: number;
  timestamp: number;
}

export type JobChannelMessage = StartJobChannelMessage | EndJobChannelMessage;

/**
 * Channel Message Type of Finished Jobs for "enterprise-jobs".
 */
export interface EndJobChannelMessage extends BasicJobChannelMessage {
  messageType: "jobs";
  type: "finished";
  jobType: ScrapeName;
  jobName: string;
  jobId: number;
  timestamp: number;
  result: string;
  reason?: string;
  jobTrack: JobTrack;
}

/**
 * Channel Message Type of Started Jobs for "enterprise-jobs".
 */
export interface StartJobChannelMessage extends BasicJobChannelMessage {
  messageType: "jobs";
  type: "started";
  jobName: string;
  jobId: number;
  timestamp: number;
}

export interface ScraperJob {
  type: string;
  onSuccess?: () => void;
  onDone?: () => undefined | ScraperJob | ScraperJob[];
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

// @ts-expect-error
export interface PeriodicJob extends ScraperJob {
  type: "periodic";
  interval: number;
  cb: JobCallback;
}

export interface Hook {
  name: string;
  medium: MediaType;
  custom?: boolean;
  disabled?: boolean;
  domainReg?: RegExp;
  tocPattern?: RegExp; // used for toc discover
  redirectReg?: RegExp;
  newsAdapter?: NewsScraper;
  tocAdapter?: TocScraper;
  tocSearchAdapter?: TocSearchScraper;
  searchAdapter?: SearchScraper;
  contentDownloadAdapter?: ContentDownloader;
}

export interface Dependant {
  oneTimeUser?: MultiSingleValue<{ cookies: string; uuid: Uuid }>;
  oneTimeToc?: TocRequest[] | TocRequest;
  feed?: string[] | string;
  news?: any[] | any;
  toc?: any[] | any;
}

export interface TocRequest {
  url: string;
  uuid?: Uuid;
  mediumId?: number;
  lastRequest?: Date;
}

/**
 * @openapi
 * components:
 *    schemas:
 *      DownloadContent:
 *        type: object
 *        properties:
 *          content:
 *            type: array
 *            items:
 *              type: string
 *          title:
 *            type: string
 *          episodeId:
 *            $ref: "#/components/schemas/Id"
 */
export interface DownloadContent {
  content: string[];
  title: string;
  episodeId: number;
}

// TODO: correct the api doc for this type
/**
 * @openapi
 * components:
 *    schemas:
 *      TocContent:
 *        type: object
 *        properties:
 *          title:
 *            type: string
 *          combiIndex:
 *            type: number
 *          totalIndex:
 *            type: integer
 *          partialIndex:
 *            type: integer
 */
export type TocContent = TocEpisode | TocPart;

/**
 * @openapi
 * components:
 *    schemas:
 *      TocContent:
 *        type: object
 *        properties:
 *          title:
 *            type: string
 *          combiIndex:
 *            type: number
 *          totalIndex:
 *            type: integer
 *          partialIndex:
 *            type: integer
 */
export interface BasicTocContent {
  title: string;
  combiIndex: number;
  totalIndex: number;
  partialIndex?: number;
}

export interface TocEpisode extends BasicTocContent {
  url: string;
  releaseDate?: Date;
  noTime?: boolean;
  locked?: boolean;
  tocId?: number;
}

export interface TocPart extends BasicTocContent {
  episodes: TocEpisode[];
}

/**
 * @openapi
 *components:
 *  schemas:
 *    LinkablePerson:
 *      type: object
 *      properties:
 *        name:
 *          type: string
 *        link:
 *          type: string
 */
export interface LinkablePerson {
  name: string;
  link: string;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     Toc:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         content:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/TocContent"
 *         mediumId:
 *           $ref: "#/components/schemas/Id"
 *         synonyms:
 *           type: array
 *           items:
 *             type: string
 *         partsOnly:
 *           type: boolean
 *         end:
 *           type: boolean
 *         link:
 *           type: string
 *         langCOO:
 *           type: string
 *         langTL:
 *           type: string
 *         statusCOO:
 *           type: string
 *         statusTl:
 *           type: string
 *         authors:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/LinkablePerson"
 *         artists:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/LinkablePerson"
 */
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
  authors?: LinkablePerson[];
  artists?: LinkablePerson[];
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
  (): VoidablePromise<NewsScrapeResult>;

  link: string;
  hookName?: string;
}

export interface TocSearchScraper {
  (medium: TocSearchMedium): VoidablePromise<Toc>;

  link: string;
  medium: MediaType;
  blindSearch?: boolean;
  hookName?: string;
}

export interface SearchScraper {
  (text: string, medium: number): Promise<SearchResult[]>;

  medium: MediaType;
  hookName?: string;
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
  uuid?: Uuid;
}

export interface ExternalListResult {
  external: ExternalStorageUser;
  lists: ListScrapeResult;
}

export enum ScrapeType {
  LIST = 0,
  FEED = 1,
  NEWS = 2,
  TOC = 3,
  ONETIMEUSER = 4,
  ONETIMETOC = 5,
  SEARCH = 6,
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
