import { TableSchema } from "./tableSchema";
import { DatabaseContext } from "./contexts/databaseContext";
import { Uuid, EmptyPromise, ReleaseState, ScrapeName, JobState } from "../types";
import z from "zod";
import { MediaType } from "../tools";
import { SqlSqlToken } from "slonik";

export interface DatabaseSchema {
  readonly version: number;
  readonly triggers: ReadonlyArray<SqlSqlToken<any>>;
  readonly tables: readonly TableSchema[];
  readonly migrations: readonly Migration[];
  readonly procedures: ReadonlyArray<SqlSqlToken<any>>;
}

// for operations which alter things, like tables and cannot be done by simple insert or delete operations
export interface Migration {
  readonly fromVersion: number;
  readonly toVersion: number;

  migrate(context: DatabaseContext): EmptyPromise;
}

export enum SqlFunction {
  NOW = "NOW()",
  CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP",
}

export enum Modifier {
  PRIMARY_KEY = "PRIMARY_KEY",
  UNIQUE = "UNIQUE",
  NOT_NULL = "NOT NULL",
  NOT = "NOT",
  NULL = "NULL",
  UNSIGNED = "UNSIGNED",
  AUTO_INCREMENT = "AUTO_INCREMENT",
}

export enum ColumnType {
  DOUBLE = "DOUBLE",
  BOOLEAN = "BOOLEAN",
  TEXT = "TEXT",
  CHAR = "CHAR",
  VARCHAR = "VARCHAR",
  DATETIME = "DATETIME",
  TIMESTAMP = "TIMESTAMP",
  FLOAT = "FLOAT",
  INT = "INT",
}

export interface ConnectionContext {
  startTransaction(): EmptyPromise;

  commit(): EmptyPromise;

  rollback(): EmptyPromise;

  markAborted(): void;

  aborted(): boolean;
}

export interface ChangeUser {
  name?: string;
  newPassword?: string;
  password?: string;
}

export interface NewsItemRequest {
  uuid: Uuid;
  since?: Date;
  till?: Date;
  newsIds?: number[];
}

const id = z.number().int().min(1);

/**
 * What one would get from select * from app_events;
 */
export const appEvent = z.object({
  id,
  program: z.enum(["server", "crawler"]),
  date: z.date(),
  type: z.enum(["end", "start"]),
});

export interface AppEvent extends z.infer<typeof appEvent> {}

export const entity = z.object({
  id,
});

export interface Entity extends z.infer<typeof entity> {}

/**
 * What one would get from select * from custom_hook;
 */
export const customHook = z.object({
  id,
  name: z.string().min(1),
  state: z.string().min(1),
  updatedAt: z.date().optional(),
  enabled: z.boolean(),
  comment: z.string(),
});

export interface CustomHook extends z.infer<typeof customHook> {}

export const dbTrigger = z.object({
  table: z.string().min(1),
  event: z.string().min(1),
  timing: z.string().min(1),
  trigger: z.string().min(1),
});

export interface DbTrigger extends z.infer<typeof dbTrigger> {}

export const minimalRelease = z.object({
  episodeId: id,
  url: z.string().url(),
});

export interface MinimalRelease extends z.infer<typeof minimalRelease> {}

/**
 * What one would get from select * from episode_release;
 */
export const simpleRelease = minimalRelease.extend({
  id,
  title: z.string().min(1),
  releaseDate: z.date(),
  locked: z.boolean(),
  sourceType: z.string().optional(),
  tocId: z.number().int().min(1).optional(),
});

export interface SimpleRelease extends z.infer<typeof simpleRelease> {}

export const displayRelease = minimalRelease.extend({
  title: z.string(),
  mediumId: id,
  locked: z.boolean(),
  date: z.date(),
  progress: z.number().min(0).max(1),
});

export interface DisplayRelease extends z.infer<typeof displayRelease> {}

export const minimalMedium = z.object({
  title: z.string(),
  medium: z.nativeEnum(MediaType),
  id,
});

export interface MinimalMedium extends z.infer<typeof minimalMedium> {}

export const mediumRelease = minimalRelease.extend({
  title: z.string().min(1),
  combiIndex: z.number(),
  locked: z.boolean().optional(),
  date: z.date(),
});

export interface MediumRelease extends z.infer<typeof mediumRelease> {}

/**
 * What one would get from select * from episode;
 */
export const simpleEpisode = z.object({
  id,
  partId: id,
  combiIndex: z.number(),
  totalIndex: z.number().int(),
  partialIndex: z.number().int().optional(),
});

export interface SimpleEpisode extends z.infer<typeof simpleEpisode> {}

export const simpleEpisodeReleases = simpleEpisode.extend({
  releases: z.array(simpleRelease),
});

export interface SimpleEpisodeReleases extends z.infer<typeof simpleEpisodeReleases> {}

export const pureEpisode = simpleEpisode.extend({
  readDate: z.date().nullable(),
  progress: z.number().min(0).max(1),
});

export interface PureEpisode extends z.infer<typeof pureEpisode> {}

export const episode = pureEpisode.extend({
  releases: z.array(simpleRelease),
});

export interface Episode extends z.infer<typeof episode> {}

export const episodeContentData = z.object({
  episodeTitle: z.string(),
  index: z.number(),
  mediumTitle: z.string(),
});

export interface EpisodeContentData extends z.infer<typeof episodeContentData> {}

export const simpleReadEpisode = z.object({});

export interface SimpleReadEpisode extends z.infer<typeof simpleReadEpisode> {}

export const simpleExternalList = z.object({
  id,
  userUuid: z.string().uuid(),
  name: z.string(),
  medium: z.number(),
  url: z.string().url(),
});

export interface SimpleExternalList extends z.infer<typeof simpleExternalList> {}

export const externalList = simpleExternalList.extend({
  items: z.array(id),
});

export interface ExternalList extends z.infer<typeof externalList> {}

export const simpleExternalUser = z.object({
  localUuid: z.string().uuid(),
  uuid: z.string().uuid(),
  identifier: z.string().min(1),
  type: z.number(),
  lastScrape: z.date().optional(),
  cookies: z.string().nullish().optional(),
});

export interface SimpleExternalUser extends z.infer<typeof simpleExternalUser> {}

export const basicDisplayExternalUser = z.object({
  localUuid: z.string().uuid(),
  uuid: z.string().uuid(),
  identifier: z.string().min(1),
  type: z.number(),
});

export interface BasicDisplayExternalUser extends z.infer<typeof basicDisplayExternalUser> {}

export const displayExternalUser = basicDisplayExternalUser.extend({
  lists: z.array(externalList),
});

export interface DisplayExternalUser extends z.infer<typeof displayExternalUser> {}

export const simpleExternalUserListed = simpleExternalUser.extend({
  lists: z.array(externalList),
});

export interface SimpleExternalUserListed extends z.infer<typeof simpleExternalUserListed> {}

/**
 * What one would get from select * from part;
 */
export const simplePart = z.object({
  id,
  mediumId: id,
  title: z.string(),
  combiIndex: z.number(),
  totalIndex: z.number().int(),
  partialIndex: z.number().int().optional(),
});

export interface SimplePart extends z.infer<typeof simplePart> {}

export const simpleMedium = z.object({
  id,
  title: z.string().min(1),
  medium: z.nativeEnum(MediaType),
  countryOfOrigin: z.string().optional(),
  languageOfOrigin: z.string().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
  lang: z.string().optional(),
  stateOrigin: z.nativeEnum(ReleaseState).optional(),
  stateTl: z.nativeEnum(ReleaseState).optional(),
  series: z.string().optional(),
  universe: z.string().optional(),
});

export interface SimpleMedium extends z.infer<typeof simpleMedium> {}

export const simpleList = z.object({
  id,
  userUuid: z.string().uuid(),
  name: z.string().min(1),
  medium: z.number().min(0).int(),
});

export interface SimpleList extends z.infer<typeof simpleList> {}

export const userList = z.object({
  id,
  medium: z.number().min(0).int(),
  name: z.string().min(1),
});

export interface UserList extends z.infer<typeof userList> {}

export const mediumInWait = z.object({
  title: z.string(),
  medium: z.nativeEnum(MediaType),
  link: z.string().url(),
});

export interface MediumInWait extends z.infer<typeof mediumInWait> {}

export const minimalMediumtoc = z.object({
  id,
  mediumId: id,
  link: z.string().url(),
});

export interface MinimalMediumtoc extends z.infer<typeof minimalMediumtoc> {}

export const simpleMediumToc = minimalMediumtoc.extend({
  title: z.string().min(1),
  medium: z.nativeEnum(MediaType),
  countryOfOrigin: z.string().optional(),
  languageOfOrigin: z.string().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
  lang: z.string().optional(),
  stateOrigin: z.nativeEnum(ReleaseState).optional(),
  stateTl: z.nativeEnum(ReleaseState).optional(),
  series: z.string().optional(),
  universe: z.string().optional(),
});

export interface SimpleMediumToc extends z.infer<typeof simpleMediumToc> {}

export const simpleJob = z.object({
  id,
  enabled: z.boolean(),
  name: z.string().min(1),
  type: z.nativeEnum(ScrapeName),
  state: z.nativeEnum(JobState),
  deleteAfterRun: z.boolean(),
  interval: z.number().int().min(60000),
  // TODO: maybe remove this column, i dont need it either way
  runAfter: z.number().int().nullish(),
  runningSince: z.date().optional(),
  nextRun: z.date().optional(),
  lastRun: z.date().optional(),
  arguments: z.string().optional(),
});

export interface SimpleJob extends z.infer<typeof simpleJob> {}

export const simpleJobHistory = z.object({
  id,
  name: z.string().min(1),
  type: z.nativeEnum(ScrapeName),
  arguments: z.string().optional(),
  scheduledAt: z.date().optional(),
  start: z.date(),
  end: z.date(),
  result: z.enum(["warning", "failed", "success"]),
  message: z.string().min(1),
  context: z.string(),
  created: z.number().int(),
  updated: z.number().int(),
  deleted: z.number().int(),
  queries: z.number().int(),
  networkQueries: z.number().int(),
  networkReceived: z.number().int(),
  networkSend: z.number().int(),
  // TODO: previously generated columns in mariadb
  lagging: z.number().int().optional(),
  duration: z.number().int().optional(),
});

export interface SimpleJobHistory extends z.infer<typeof simpleJobHistory> {}

export const simpleJobStatSummary = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  count: z.number().int(),
  failed: z.number().int(),
  succeeded: z.number().int(),
  networkRequests: z.number().int(),
  minNetworkRequests: z.number().int(),
  maxNetworkRequests: z.number().int(),
  networkSend: z.number().int(),
  minNetworkSend: z.number().int(),
  maxNetworkSend: z.number().int(),
  networkReceived: z.number().int(),
  minNetworkReceived: z.number().int(),
  maxNetworkReceived: z.number().int(),
  duration: z.number().int(),
  minDuration: z.number().int(),
  maxDuration: z.number().int(),
  updated: z.number().int(),
  minUpdated: z.number().int(),
  maxUpdated: z.number().int(),
  created: z.number().int(),
  minCreated: z.number().int(),
  maxCreated: z.number().int(),
  deleted: z.number().int(),
  minDeleted: z.number().int(),
  maxDeleted: z.number().int(),
  sqlQueries: z.number().int(),
  minSqlQueries: z.number().int(),
  maxSqlQueries: z.number().int(),
  lagging: z.number().int(),
  minLagging: z.number().int(),
  maxLagging: z.number().int(),
});

export interface SimpleJobStatSummary extends z.infer<typeof simpleJobStatSummary> {}

export const mediumSynonym = z.object({
  id,
  synonym: z.string().min(1),
});

export interface MediumSynonym extends z.infer<typeof mediumSynonym> {}

export const linkValue = z.object({
  link: z.string().url(),
});

export interface LinkValue extends z.infer<typeof linkValue> {}

// contrary to `entity`, also allow zero as id
export const softInsertEntity = z.object({
  id: z.number().int().min(0),
});

export interface SoftInsertEntity extends z.infer<typeof softInsertEntity> {}

export const simpleNews = z.object({
  id,
  title: z.string(),
  link: z.string().url(),
  // TODO: this needs a default value of NOW()
  date: z.date().nullish(),
});

export interface SimpleNews extends z.infer<typeof simpleNews> {}

export const news = simpleNews.extend({
  read: z.boolean(),
});

export interface News extends z.infer<typeof news> {}

export const notification = z.object({
  id,
  title: z.string(),
  content: z.string(),
  date: z.date(),
  key: z.string(),
  type: z.string(),
});

export interface Notification extends z.infer<typeof notification> {}

export const userNotification = notification.extend({
  read: z.boolean(),
});

export interface UserNotification extends z.infer<typeof userNotification> {}

export const simpleScraperHook = z.object({
  id,
  name: z.string().min(1),
  enabled: z.boolean(),
  message: z.string(),
});

export interface SimpleScraperHook extends z.infer<typeof simpleScraperHook> {}

export const simpleUser = z.object({
  name: z.string(),
  uuid: z.string(),
  password: z.string(),
  alg: z.string(),
  salt: z.string().nullable(),
});
