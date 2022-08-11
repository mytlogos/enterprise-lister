import {
  AppEvent,
  AppEventFilter,
  AppEventProgram,
  AppEventType,
  Id,
  JobHistoryResult,
  Json,
  Link,
  List,
  MediumInWait,
  MediumInWaitSearch,
  MinList,
  QueryItems,
  ScrapeName,
  SimpleEpisode,
  SimpleMedium,
  TimeBucket,
  UpdateMedium,
  UpdateUser,
  Uuid,
} from "enterprise-core/dist/types";
import {
  boolean,
  id,
  idArray,
  integer,
  JSONSchemaType,
  link,
  linkArray,
  number,
  string,
  uuid,
  uuidArray,
} from "enterprise-core/dist/validation";

export interface ReadNotification {
  id: Id;
  uuid: Uuid;
}

export const readNotificationSchema: JSONSchemaType<ReadNotification> = {
  $id: "/ReadNotification",
  type: "object",
  properties: {
    id: id(),
    uuid: uuid(),
  },
  required: ["id", "uuid"],
};

export interface Session {
  session: Uuid;
  uuid: Uuid;
}

export const sessionSchema: JSONSchemaType<Session> = {
  $id: "/Session",
  type: "object",
  properties: {
    session: uuid(),
    uuid: uuid(),
  },
  required: ["uuid", "session"],
};

export interface PutUser extends Session {
  user: UpdateUser;
}

export const putUserSchema: JSONSchemaType<PutUser> = {
  $id: "/PutUser",
  type: "object",
  properties: {
    session: uuid(),
    uuid: uuid(),
    user: { $ref: "/UpdateUser" },
  },
  required: ["uuid", "session"],
};

export const updateUserSchema: JSONSchemaType<UpdateUser> = {
  $id: "/UpdateUser",
  type: "object",
  properties: {
    name: { nullable: true, type: "string" },
    newPassword: { nullable: true, type: "string" },
    password: { nullable: true, type: "string" },
  },
};

export interface AddBookmarked extends Session {
  bookmarked: Link[];
}

export const addBookmarkedSchema: JSONSchemaType<AddBookmarked> = {
  $id: "/AddBookmarked",
  type: "object",
  properties: {
    uuid: uuid(),
    session: uuid(),
    bookmarked: linkArray(),
  },
  required: ["uuid", "session", "bookmarked"],
};

export interface AddToc extends Session {
  mediumId: Id;
  toc: Link;
}

export const addTocSchema: JSONSchemaType<AddToc> = {
  $id: "/AddToc",
  type: "object",
  properties: {
    uuid: uuid(),
    session: uuid(),
    mediumId: id(),
    toc: link(),
  },
  required: ["uuid", "session", "mediumId", "toc"],
};

export interface DownloadEpisode extends Session {
  episode: Id[];
}

export const downloadEpisodeSchema: JSONSchemaType<DownloadEpisode> = {
  $id: "/DownloadEpisode",
  type: "object",
  properties: {
    uuid: uuid(),
    session: uuid(),
    episode: idArray(),
  },
  required: ["uuid", "session", "episode"],
};

export interface Search {
  text: string;
  medium: number;
}

export const searchSchema: JSONSchemaType<Search> = {
  $id: "/Search",
  type: "object",
  properties: {
    text: string(),
    medium: number(),
  },
  required: ["text", "medium"],
};

export interface DeleteToc {
  link: Link;
  mediumId: Id;
}

export const deleteTocSchema: JSONSchemaType<DeleteToc> = {
  $id: "/DeleteToc",
  type: "object",
  properties: {
    link: link(),
    mediumId: id(),
  },
  required: ["link", "mediumId"],
};

export interface GetNotifications {
  from: string;
  uuid: Uuid;
  read: boolean;
  size?: number;
}

export const getNotificationsSchema: JSONSchemaType<GetNotifications> = {
  $id: "/GetNotifications",
  type: "object",
  properties: {
    from: string(),
    read: boolean(),
    size: { nullable: true, type: "integer", minimum: 0 },
    uuid: uuid(),
  },
  required: ["from", "read", "uuid"],
};

export interface GetNotificationsCount {
  uuid: Uuid;
  read: boolean;
}

export const getNotificationsCountSchema: JSONSchemaType<GetNotificationsCount> = {
  $id: "/GetNotificationsCount",
  type: "object",
  properties: {
    read: boolean(),
    uuid: uuid(),
  },
  required: ["read", "uuid"],
};

const AppEventProgramSchema: JSONSchemaType<AppEventProgram> = {
  $id: "/AppEventProgram",
  type: "string",
  enum: ["crawler", "server"],
};

const AppEventTypeSchema: JSONSchemaType<AppEventType> = {
  $id: "/AppEventType",
  type: "string",
  enum: ["start", "end"],
};

const AppEventKeySchema: JSONSchemaType<keyof AppEvent> = {
  $id: "/AppEventKey",
  type: "string",
  enum: ["id", "program", "date", "type"],
};

// @ts-expect-error
export const getAllAppEventsSchema: JSONSchemaType<Json<AppEventFilter>> = {
  $id: "/GetAllAppEvents",
  type: "object",
  properties: {
    fromDate: { type: "string", nullable: true },
    toDate: { type: "string", nullable: true },
    program: {
      oneOf: [
        { ...AppEventProgramSchema, $id: undefined, nullable: true },
        { type: "array", items: AppEventProgramSchema, nullable: true },
      ],
    },
    sortOrder: {
      oneOf: [
        { ...AppEventKeySchema, $id: undefined, nullable: true },
        { type: "array", items: AppEventKeySchema, nullable: true },
      ],
    },
    type: {
      oneOf: [
        { ...AppEventTypeSchema, $id: undefined, nullable: true },
        { type: "array", items: AppEventTypeSchema, nullable: true },
      ],
    },
  },
};

export interface GetAssociatedEpisode {
  url: Link;
}

export const getAssociatedEpisodeSchema: JSONSchemaType<GetAssociatedEpisode> = {
  $id: "/GetAssociatedEpisode",
  type: "object",
  properties: {
    url: link(),
  },
  required: ["url"],
};

export interface PostLoad {
  items: QueryItems;
  uuid: Uuid;
}

export const postLoadSchema: JSONSchemaType<PostLoad> = {
  $id: "/PostLoad",
  type: "object",
  properties: {
    uuid: uuid(),
    items: {
      type: "object",
      properties: {
        episodeReleases: idArray(),
        episodes: idArray(),
        externalMediaLists: idArray(),
        externalUser: uuidArray(),
        media: idArray(),
        mediaLists: idArray(),
        mediaTocs: idArray(),
        partEpisodes: idArray(),
        partReleases: idArray(),
        parts: idArray(),
        tocs: idArray(),
      },
      required: [
        "episodeReleases",
        "episodes",
        "externalMediaLists",
        "externalUser",
        "media",
        "mediaLists",
        "mediaTocs",
        "partEpisodes",
        "partReleases",
        "parts",
        "tocs",
      ],
    },
  },
  required: ["uuid", "items"],
};

export interface GetDisplayReleases {
  uuid: Uuid;
  latest: string;
  until?: string;
  read?: boolean;
  ignore_lists?: Id[];
  only_lists?: Id[];
  ignore_media?: Id[];
  only_media?: Id[];
}

export const getDisplayReleasesSchema: JSONSchemaType<GetDisplayReleases> = {
  $id: "/GetDisplayReleases",
  type: "object",
  properties: {
    uuid: uuid(),
    latest: string(),
    until: { type: "string", nullable: true },
    read: { type: "boolean", nullable: true },
    ignore_lists: { type: "array", items: id(), nullable: true },
    ignore_media: { type: "array", items: id(), nullable: true },
    only_lists: { type: "array", items: id(), nullable: true },
    only_media: { type: "array", items: id(), nullable: true },
  },
  required: ["uuid", "latest"],
};

export interface GetEpisode {
  uuid: Uuid;
  episodeId: Id[];
}

export const getEpisodeSchema: JSONSchemaType<GetEpisode> = {
  $id: "/GetEpisode",
  type: "object",
  properties: {
    uuid: uuid(),
    episodeId: idArray(),
  },
  required: ["uuid", "episodeId"],
};

export const simpleEpisodeSchema: JSONSchemaType<Json<SimpleEpisode>> = {
  $id: "/SimpleEpisode",
  type: "object",
  properties: {
    id: id(),
    partId: id(),
    combiIndex: { type: "integer", nullable: true },
    totalIndex: { type: "integer" },
    partialIndex: { type: "integer", nullable: true },
    releases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          episodeId: id(),
          url: link(),
          title: string(),
          releaseDate: string(),
          locked: { type: "boolean", nullable: true },
          sourceType: { type: "string", nullable: true },
          tocId: { type: "integer", nullable: true },
        },
        required: ["episodeId", "releaseDate", "title", "url"],
      },
    },
  },
  required: ["id", "partId", "releases", "totalIndex"],
};

export interface PostEpisode {
  partId: Id;
  episode: SimpleEpisode[];
}

export const postEpisodeSchema: JSONSchemaType<Json<PostEpisode>> = {
  $id: "/PostEpisode",
  type: "object",
  properties: {
    partId: id(),
    episode: {
      type: "array",
      items: simpleEpisodeSchema,
    },
  },
  required: ["partId", "episode"],
};

export interface PutEpisode {
  episode: SimpleEpisode[];
}

export const putEpisodeSchema: JSONSchemaType<Json<PutEpisode>> = {
  $id: "/PutEpisode",
  type: "object",
  properties: {
    episode: {
      type: "array",
      items: simpleEpisodeSchema,
    },
  },
  required: ["episode"],
};

export interface DeleteEpisode {
  episodeId: Id[];
}

export const deleteEpisodeSchema: JSONSchemaType<DeleteEpisode> = {
  $id: "/DeleteEpisode",
  type: "object",
  properties: {
    episodeId: idArray(),
  },
  required: ["episodeId"],
};

export interface GetPart {
  uuid: Uuid;
  partId?: Id[];
  mediumId?: Id;
}

export const getPartSchema: JSONSchemaType<GetPart> = {
  $id: "/GetPart",
  type: "object",
  properties: {
    uuid: uuid(),
    partId: { type: "array", items: id(), nullable: true },
    mediumId: { type: "integer", minimum: 1, nullable: true },
  },
  required: ["uuid"],
};

export interface GetPartItems {
  part: Id[];
}

export const getPartItemsSchema: JSONSchemaType<GetPartItems> = {
  $id: "/GetPartItems",
  type: "object",
  properties: {
    part: idArray(),
  },
  required: ["part"],
};

export interface GetPartReleases {
  part: Id[];
}

export const getPartReleasesSchema: JSONSchemaType<GetPartReleases> = {
  $id: "/GetPartReleases",
  type: "object",
  properties: {
    part: idArray(),
  },
  required: ["part"],
};

export interface PostPart {
  part: { id: Id; totalIndex: number; partialIndex?: number; title?: string; episodes: SimpleEpisode[] };
  mediumId: Id;
}

export const postPartSchema: JSONSchemaType<Json<PostPart>> = {
  $id: "/PostPart",
  type: "object",
  properties: {
    part: {
      type: "object",
      properties: {
        id: id(),
        title: { type: "string", nullable: true },
        episodes: { type: "array", items: simpleEpisodeSchema },
        totalIndex: integer(),
        partialIndex: { type: "integer", nullable: true },
      },
      required: ["id", "episodes"],
    },
    mediumId: id(),
  },
  required: ["part", "mediumId"],
};

export interface PutPart {
  part: { id: Id; totalIndex: number; partialIndex?: number; title?: string; mediumId: Id };
}

export const putPartSchema: JSONSchemaType<PutPart> = {
  $id: "/PutPart",
  type: "object",
  properties: {
    part: {
      type: "object",
      properties: {
        id: id(),
        mediumId: id(),
        title: { type: "string", nullable: true },
        totalIndex: integer(),
        partialIndex: { type: "integer", nullable: true },
      },
      required: ["id", "totalIndex"],
    },
  },
  required: ["part"],
};

export interface DeletePart {
  partId: Id;
}

export const deletePartSchema: JSONSchemaType<DeletePart> = {
  $id: "/DeletePart",
  type: "object",
  properties: {
    partId: id(),
  },
  required: ["partId"],
};

export interface PostMergeMedia {
  sourceId: Id;
  destinationId: Id;
}

export const postMergeMediaSchema: JSONSchemaType<PostMergeMedia> = {
  $id: "/PostMergeMedia",
  type: "object",
  properties: {
    sourceId: id(),
    destinationId: id(),
  },
  required: ["destinationId", "sourceId"],
};

export const simpleMediumSchema: JSONSchemaType<SimpleMedium> = {
  type: "object",
  properties: {
    id: { ...id(), nullable: true },
    title: string(),
    medium: integer(),
    countryOfOrigin: { ...string(), nullable: true },
    languageOfOrigin: { ...string(), nullable: true },
    author: { ...string(), nullable: true },
    artist: { ...string(), nullable: true },
    lang: { ...string(), nullable: true },
    stateOrigin: { ...integer(), nullable: true },
    stateTL: { ...integer(), nullable: true },
    series: { ...string(), nullable: true },
    universe: { ...string(), nullable: true },
  },
  required: ["title", "medium"],
};

export interface PostSplitMedium {
  sourceId: Id;
  destinationMedium: SimpleMedium;
  toc: Link;
}

export const postSplitMediumSchema: JSONSchemaType<PostSplitMedium> = {
  $id: "/PostSplitMedium",
  type: "object",
  properties: {
    sourceId: id(),
    destinationMedium: simpleMediumSchema,
    toc: link(),
  },
  required: ["destinationMedium", "toc", "sourceId"],
};

export interface PostTransferToc {
  sourceId: Id;
  destinationId: Id;
  toc: Link;
}

export const postTransferTocSchema: JSONSchemaType<PostTransferToc> = {
  $id: "/PostTransferToc",
  type: "object",
  properties: {
    sourceId: id(),
    destinationId: id(),
    toc: link(),
  },
  required: ["destinationId", "sourceId", "toc"],
};

export const MediumInWaitSchema: JSONSchemaType<MediumInWait> = {
  type: "object",
  properties: { title: string(), medium: integer(), link: link() },
  required: ["title", "medium", "link"],
};

export interface PutConsumeUnusedMedia {
  mediumId: Id;
  tocsMedia: MediumInWait[];
}

export const putConsumeUnusedMediaSchema: JSONSchemaType<PutConsumeUnusedMedia> = {
  $id: "/PutConsumeUnusedMedia",
  type: "object",
  properties: {
    mediumId: id(),
    tocsMedia: { type: "array", items: MediumInWaitSchema },
  },
  required: ["mediumId", "tocsMedia"],
};

export interface PostCreateFromUnusedMedia {
  listId: Id;
  createMedium: MediumInWait;
  tocsMedia?: MediumInWait[];
}

export const postCreateFromUnusedMediaSchema: JSONSchemaType<PostCreateFromUnusedMedia> = {
  $id: "/PostCreateFromUnusedMedia",
  type: "object",
  properties: {
    listId: id(),
    tocsMedia: { type: "array", items: MediumInWaitSchema, nullable: true },
    createMedium: MediumInWaitSchema,
  },
  required: ["listId", "createMedium"],
};

export const getUnusedMediaSchema: JSONSchemaType<MediumInWaitSearch> = {
  $id: "/GetUnusedMedia",
  type: "object",
  properties: {
    limit: { type: "integer", nullable: true },
    medium: { type: "integer", nullable: true },
    title: { type: "string", nullable: true },
    link: { ...link(), nullable: true },
  },
};

export interface GetMedium {
  uuid: Uuid;
  mediumId: Id[];
}

export const getMediumSchema: JSONSchemaType<GetMedium> = {
  $id: "/GetMedium",
  type: "object",
  properties: {
    uuid: uuid(),
    mediumId: idArray(),
  },
  required: ["uuid", "mediumId"],
};

export interface PostMedium {
  uuid: Uuid;
  medium: SimpleMedium;
}

export const postMediumSchema: JSONSchemaType<PostMedium> = {
  $id: "/PostMedium",
  type: "object",
  properties: {
    uuid: uuid(),
    medium: simpleMediumSchema,
  },
  required: ["uuid", "medium"],
};

export interface PutMedium {
  medium: UpdateMedium;
}

export const updateMediumSchema: JSONSchemaType<UpdateMedium> = {
  type: "object",
  properties: {
    id: id(),
    title: { ...string(), nullable: true },
    medium: { ...integer(), nullable: true },
    countryOfOrigin: { ...string(), nullable: true },
    languageOfOrigin: { ...string(), nullable: true },
    author: { ...string(), nullable: true },
    artist: { ...string(), nullable: true },
    lang: { ...string(), nullable: true },
    stateOrigin: { ...integer(), nullable: true },
    stateTL: { ...integer(), nullable: true },
    series: { ...string(), nullable: true },
    universe: { ...string(), nullable: true },
  },
  required: ["id"],
};

export const putMediumSchema: JSONSchemaType<PutMedium> = {
  $id: "/PutMedium",
  type: "object",
  properties: {
    medium: updateMediumSchema,
  },
  required: ["medium"],
};

export interface GetProgress {
  uuid: Uuid;
  episodeId: Id;
}

export const getProgressSchema: JSONSchemaType<GetProgress> = {
  $id: "/GetProgress",
  type: "object",
  properties: {
    uuid: uuid(),
    episodeId: id(),
  },
  required: ["uuid", "episodeId"],
};

export interface PostProgress {
  uuid: Uuid;
  episodeId: Id[];
  progress: number;
  readDate: string;
}

export const postProgressSchema: JSONSchemaType<PostProgress> = {
  $id: "/PostProgress",
  type: "object",
  properties: {
    uuid: uuid(),
    episodeId: idArray(),
    progress: number(),
    readDate: string(),
  },
  required: ["uuid", "episodeId", "progress", "readDate"],
};

export interface DeleteProgress {
  uuid: Uuid;
  episodeId: Id;
}

export const deleteProgressSchema: JSONSchemaType<DeleteProgress> = {
  $id: "/DeleteProgress",
  type: "object",
  properties: {
    uuid: uuid(),
    episodeId: id(),
  },
  required: ["uuid", "episodeId"],
};

export interface GetMediumReleases {
  uuid: Uuid;
  id: Id;
}

export const getMediumReleasesSchema: JSONSchemaType<GetMediumReleases> = {
  $id: "/GetMediumReleases",
  type: "object",
  properties: {
    uuid: uuid(),
    id: id(),
  },
  required: ["uuid", "id"],
};

export interface GetExternalUser {
  externalUuid: Uuid[];
}

export const getExternalUserSchema: JSONSchemaType<GetExternalUser> = {
  $id: "/GetExternalUser",
  type: "object",
  properties: {
    externalUuid: uuidArray(),
  },
  required: ["externalUuid"],
};

export interface PostExternalUser {
  uuid: Uuid;
  externalUser: { type: number; identifier: string; pwd: string };
}

export const postExternalUserSchema: JSONSchemaType<PostExternalUser> = {
  $id: "/PostExternalUser",
  type: "object",
  properties: {
    uuid: uuid(),
    externalUser: {
      type: "object",
      properties: { type: number(), identifier: string(), pwd: string() },
      required: ["identifier", "pwd", "type"],
    },
  },
  required: ["externalUser", "uuid"],
};

export interface DeleteExternalUser {
  uuid: Uuid;
  externalUuid: Uuid;
}

export const deleteExternalUserSchema: JSONSchemaType<DeleteExternalUser> = {
  $id: "/DeleteExternalUser",
  type: "object",
  properties: {
    uuid: uuid(),
    externalUuid: uuid(),
  },
  required: ["externalUuid", "uuid"],
};

export interface RefreshExternalUser {
  externalUuid: Uuid;
}

export const refreshExternalUserSchema: JSONSchemaType<RefreshExternalUser> = {
  $id: "/RefreshExternalUser",
  type: "object",
  properties: {
    externalUuid: uuid(),
  },
  required: ["externalUuid"],
};

export interface GetHistoryJobs {
  since?: string;
  limit?: number;
}

export const getHistoryJobsSchema: JSONSchemaType<GetHistoryJobs> = {
  $id: "/GetHistoryJobs",
  type: "object",
  properties: {
    since: { ...string(), nullable: true },
    limit: { ...integer(), nullable: true },
  },
};

export interface GetHistoryJobsPaginated {
  since?: string;
  name?: string;
  type?: ScrapeName;
  result?: JobHistoryResult;
  limit?: number;
}

export const getHistoryJobsPaginatedSchema: JSONSchemaType<GetHistoryJobsPaginated> = {
  $id: "/GetHistoryJobsPaginated",
  type: "object",
  properties: {
    since: { ...string(), nullable: true },
    name: { ...string(), nullable: true },
    limit: { ...integer({ minimum: 1, maximum: 1000 }), nullable: true },
    type: {
      type: "string",
      enum: [
        ScrapeName.checkTocs,
        ScrapeName.feed,
        ScrapeName.news,
        ScrapeName.newsAdapter,
        ScrapeName.oneTimeToc,
        ScrapeName.oneTimeUser,
        ScrapeName.queueExternalUser,
        ScrapeName.queueTocs,
        ScrapeName.remapMediaParts,
        ScrapeName.searchForToc,
        ScrapeName.toc,
      ],
      nullable: true,
    },
    result: { type: "string", enum: ["failed", "success", "warning"], nullable: true },
  },
};

export interface PostJobEnable {
  id: Id;
  enabled: boolean;
}

export const postJobEnableSchema: JSONSchemaType<PostJobEnable> = {
  $id: "/PostJobEnable",
  type: "object",
  properties: {
    id: id(),
    enabled: boolean(),
  },
  required: ["id", "enabled"],
};

export interface GetJobDetails {
  id: Id;
}

export const getJobDetailsSchema: JSONSchemaType<GetJobDetails> = {
  $id: "/GetJobDetails",
  type: "object",
  properties: {
    id: id(),
  },
  required: ["id"],
};

export interface GetJobStatsTimed {
  bucket: TimeBucket;
  groupByDomain: boolean;
}

export const getJobStatsTimedSchema: JSONSchemaType<GetJobStatsTimed> = {
  $id: "/GetJobStatsTimed",
  type: "object",
  properties: {
    bucket: { type: "string", enum: ["day", "hour", "minute"] },
    groupByDomain: boolean(),
  },
  required: ["bucket", "groupByDomain"],
};

export interface GetList {
  listId: Id[];
  media?: Id[];
  uuid: Uuid;
}

export const getListSchema: JSONSchemaType<GetList> = {
  $id: "/GetList",
  type: "object",
  properties: {
    listId: idArray(),
    uuid: uuid(),
    media: { type: "array", items: id(), nullable: true },
  },
  required: ["listId", "uuid"],
};

export interface PostList {
  list: MinList;
  uuid: Uuid;
}

export const postListSchema: JSONSchemaType<PostList> = {
  $id: "/PostList",
  type: "object",
  properties: {
    list: { type: "object", properties: { medium: integer(), name: string() }, required: ["medium", "name"] },
    uuid: uuid(),
  },
  required: ["list", "uuid"],
};

export interface PutList {
  list: List;
}

export const putListSchema: JSONSchemaType<PutList> = {
  $id: "/PutList",
  type: "object",
  properties: {
    list: {
      type: "object",
      properties: { medium: integer(), name: string(), id: id(), userUuid: uuid(), items: idArray() },
      required: ["medium", "name", "id", "items", "userUuid"],
    },
  },
  required: ["list"],
};

export interface DeleteList {
  listId: Id;
  uuid: Uuid;
}

export const deleteListSchema: JSONSchemaType<DeleteList> = {
  $id: "/DeleteList",
  type: "object",
  properties: {
    listId: id(),
    uuid: uuid(),
  },
  required: ["listId", "uuid"],
};

export interface GetListMedium {
  listId: Id;
  media: Id[];
  uuid: Uuid;
}

export const getListMediumSchema: JSONSchemaType<GetListMedium> = {
  $id: "/GetListMedium",
  type: "object",
  properties: {
    listId: id(),
    media: idArray(),
    uuid: uuid(),
  },
  required: ["listId", "uuid", "media"],
};

export interface PostListMedium {
  listId: Id;
  mediumId: Id[];
  uuid: Uuid;
}

export const postListMediumSchema: JSONSchemaType<PostListMedium> = {
  $id: "/PostListMedium",
  type: "object",
  properties: {
    listId: id(),
    mediumId: idArray(),
    uuid: uuid(),
  },
  required: ["listId", "uuid", "mediumId"],
};

export interface PutListMedium {
  oldListId: Id;
  newListId: Id;
  mediumId: Id[];
  uuid: Uuid;
}

export const putListMediumSchema: JSONSchemaType<PutListMedium> = {
  $id: "/PutListMedium",
  type: "object",
  properties: {
    newListId: id(),
    oldListId: id(),
    mediumId: idArray(),
    uuid: uuid(),
  },
  required: ["oldListId", "newListId", "uuid", "mediumId"],
};

export interface DeleteListMedium {
  listId: Id;
  mediumId: Id[];
  uuid: Uuid;
}

export const deleteListMediumSchema: JSONSchemaType<DeleteListMedium> = {
  $id: "/DeleteListMedium",
  type: "object",
  properties: {
    listId: id(),
    mediumId: idArray(),
    uuid: uuid(),
  },
  required: ["listId", "uuid", "mediumId"],
};

export interface GetNews {
  from?: string;
  to?: string;
  newsId?: Id[];
  uuid: Uuid;
}

export const getNewsSchema: JSONSchemaType<GetNews> = {
  $id: "/GetNews",
  type: "object",
  properties: {
    from: { ...string(), nullable: true },
    to: { ...string(), nullable: true },
    newsId: { ...idArray(), nullable: true },
    uuid: uuid(),
  },
  required: ["uuid"],
};

export interface ReadNews {
  read: Id[];
  uuid: Uuid;
}

export const readNewsSchema: JSONSchemaType<ReadNews> = {
  $id: "/ReadNews",
  type: "object",
  properties: {
    read: idArray(),
    uuid: uuid(),
  },
  required: ["uuid", "read"],
};

export interface Login {
  userName: string;
  pw: string;
}

export const loginSchema: JSONSchemaType<Login> = {
  $id: "/Login",
  type: "object",
  properties: {
    userName: string({ minLength: 5, maxLength: 100 }),
    pw: string({ minLength: 3, maxLength: 100 }),
  },
  required: ["userName", "pw"],
};

export interface GetToc {
  mediumId: Id | Id[];
}

export const getTocSchema: JSONSchemaType<GetToc> = {
  $id: "/GetToc",
  type: "object",
  properties: {
    mediumId: { oneOf: [id(), idArray()] },
  },
  required: ["mediumId"],
};
