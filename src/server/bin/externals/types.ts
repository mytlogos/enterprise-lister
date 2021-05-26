import {
  EpisodeNews,
  News,
  ReleaseState,
  SearchResult,
  TocSearchMedium,
  Uuid,
  VoidablePromise,
  MultiSingleValue,
} from "../types";
import { MediaType } from "../tools";
import { JobCallback } from "../jobManager";
import { ListScrapeResult } from "./listManager";

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

// @ts-expect-error
export interface PeriodicJob extends ScraperJob {
  type: "periodic";
  interval: number;
  cb: JobCallback;
}

export interface Hook {
  name: string;
  medium: MediaType;
  disabled?: boolean;
  domainReg?: RegExp;
  tocPattern?: RegExp;
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
  tocId?: number;
}

export interface TocPart extends TocContent {
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

export interface ExternalStorageUser {
  userUuid: Uuid;
  type: number;
  uuid: Uuid;
  cookies: string;
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
