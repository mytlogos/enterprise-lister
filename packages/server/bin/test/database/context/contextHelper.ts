import * as storageTools from "enterprise-core/dist/database/storages/storageTools";
import * as storage from "enterprise-core/dist/database/storages/storage";
import { QueryContext } from "enterprise-core/dist/database/contexts/queryContext";
import { MediaType, delay } from "enterprise-core/dist/tools";
import { EmptyPromise } from "enterprise-core/dist/types";
import { Query } from "mysql";
import bcrypt from "bcryptjs";

function inContext<T>(callback: storageTools.ContextCallback<T, QueryContext>, transaction = true) {
  return storage.storageInContext(callback, (con) => storageTools.queryContextProvider(con), transaction);
}

export async function setupTestDatabase(): EmptyPromise {
  storage.poolConfig.update({ host: "localhost" });
  await storage.poolConfig.recreate(true);
  storage.startStorage();
  await delay(5000);

  await inContext((context) => context.query("CREATE DATABASE IF NOT EXISTS enterprise_test;"));

  storage.poolConfig.update({ database: "enterprise_test", host: "localhost" });
  await storage.poolConfig.recreate(true);
  storage.startStorage();
  await delay(5000);
}

export function checkEmptyQuery(query: Query): EmptyPromise {
  return new Promise((resolve, reject) => {
    let rejected = false;
    query.on("result", () => {
      rejected = true;
      reject();
    });
    query.on("error", () => {
      rejected = true;
      reject();
    });
    query.on("end", () => {
      if (!rejected) {
        resolve();
      }
    });
  });
}

export function resultFromQuery(query: Query): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    let rejected = false;
    query
      .on("result", (row: unknown) => rows.push(row))
      .on("error", (error) => {
        rejected = true;
        reject(error);
      })
      .on("end", () => {
        if (!rejected) {
          resolve(rows);
        }
      });
  });
}

/**
 * Data which is not related to users
 */
interface StaticData {
  media: Array<{ id: number; medium: MediaType }>;
  parts: Array<{ id: number; mediumId: number; totalIndex: number }>;
  episodes: Array<{ id: number; partId: number; totalIndex: number }>;
  releases: Array<{ url: string; episodeId: number; title: string; releaseDate: Date }>;
  media_in_waits: Array<{ id: number; medium: MediaType }>;
  news: Array<{ id: number; medium: MediaType }>;
}

/**
 * Static Test Data
 */
const data: StaticData = {
  media: [
    {
      id: 1,
      medium: MediaType.TEXT,
    },
  ],
  parts: [
    {
      id: 1,
      mediumId: 1,
      totalIndex: 1,
    },
  ],
  episodes: [
    {
      id: 1,
      partId: 1,
      totalIndex: 1,
    },
  ],
  releases: [],
  media_in_waits: [],
  news: [],
};

interface Progress {
  uuid: string;
  episodeId: number;
  progress: number;
}

interface User {
  name: string;
  uuid: string;
  password: string;
  alg: string;
  externalUser: [];
  list_medium: [];
  progress: Progress[];
}

/**
 * Static Test Data per user
 */
const user: User[] = [
  {
    name: "Almani",
    uuid: "123789",
    password: bcrypt.hashSync("test-password", 10),
    alg: "bcrypt",
    externalUser: [],
    list_medium: [],
    progress: [
      {
        uuid: "123789",
        episodeId: 1,
        progress: 0.5,
      },
    ],
  },
];

/**
 * Data which should be available in the database.
 */
const databaseData: [Record<string, User>, StaticData] = [
  {},
  {
    episodes: [],
    media: [],
    media_in_waits: [],
    news: [],
    parts: [],
    releases: [],
  },
];

export function getDatabaseData(): [Record<string, User>, StaticData] {
  return databaseData;
}

export async function tearDownTestDatabase(): EmptyPromise {
  return inContext((context) => context.query("DROP DATABASE enterprise_test;"));
}

export async function fillUserTable(): EmptyPromise {
  const dummy = user[0];
  await inContext((context) =>
    context.query("INSERT IGNORE INTO user (name, uuid, password, alg) VALUES (?,?,?,?);", [
      dummy.name,
      dummy.uuid,
      dummy.password,
      dummy.alg,
    ]),
  );
  if (!databaseData[0][dummy.uuid]) {
    databaseData[0][dummy.uuid] = {
      ...dummy,
      externalUser: [],
      list_medium: [],
    };
  }
}

export async function fillMediumTable(): EmptyPromise {
  const dummy = data.media[0];
  await inContext((context) =>
    context.query("INSERT IGNORE INTO medium (id, medium) VALUES (?,?);", [dummy.id, dummy.medium]),
  );

  if (!databaseData[1].media.find((value) => value.id === dummy.id)) {
    databaseData[1].media.push({ ...dummy });
  }
}

export async function fillPartTable(): EmptyPromise {
  await fillMediumTable();
  const dummy = data.parts[0];
  await inContext((context) =>
    context.query("INSERT IGNORE INTO part (id, medium_id, totalIndex) VALUES (?,?,?);", [
      dummy.id,
      dummy.mediumId,
      dummy.totalIndex,
    ]),
  );

  if (!databaseData[1].parts.find((value) => value.id === dummy.id)) {
    databaseData[1].parts.push({ ...dummy });
  }
}

export async function fillEpisodeTable(): EmptyPromise {
  await fillPartTable();
  const dummy = data.episodes[0];

  await inContext((context) =>
    context.query("INSERT IGNORE INTO episode (id, part_id, totalIndex) VALUES (?,?,?);", [
      dummy.id,
      dummy.partId,
      dummy.totalIndex,
    ]),
  );

  if (!databaseData[1].episodes.find((value) => value.id === dummy.id)) {
    databaseData[1].episodes.push({ ...dummy });
  }
}

export async function fillEpisodeReleaseTable(): EmptyPromise {
  await fillEpisodeTable();
  const dummy = {
    episodeId: 1,
    url: "",
    title: "",
    releaseDate: new Date(),
  };
  await inContext((context) =>
    context.query("INSERT IGNORE INTO episode_release (episode_id, url, title, releaseDate) VALUES (?,?,?,?);", [
      dummy.episodeId,
      dummy.url,
      dummy.title,
      dummy.releaseDate,
    ]),
  );

  if (!databaseData[1].releases.find((value) => value.episodeId === dummy.episodeId && value.url === dummy.url)) {
    databaseData[1].releases.push({ ...dummy });
  }
}

export async function fillUserEpisodeTable(): EmptyPromise {
  await fillEpisodeTable();
  await fillUserTable();
  const dummy = user[0].progress[0];

  await inContext((context) =>
    context.query("INSERT IGNORE INTO user_episode (user_uuid, episode_id, progress) VALUES (?,?,?);", [
      dummy.uuid,
      dummy.episodeId,
      dummy.progress,
    ]),
  );
  if (
    !databaseData[0][user[0].uuid].progress.find(
      (value) => value.uuid === dummy.uuid && value.episodeId === dummy.episodeId,
    )
  ) {
    databaseData[0][user[0].uuid].progress.push({ ...dummy });
  }
}

export async function cleanUser(): EmptyPromise {
  await inContext((context) => context.query("DELETE FROM user;"));
  databaseData[0] = {};
}

export async function cleanUserEpisode(): EmptyPromise {
  await inContext((context) => context.query("TRUNCATE user_episode;"));
  Object.values(databaseData[0]).forEach((value) => (value.progress = []));
}

export async function cleanEpisodeRelease(): EmptyPromise {
  await inContext((context) => context.query("TRUNCATE episode_release;"));
  databaseData[1].releases = [];
}

export async function cleanEpisode(): EmptyPromise {
  await inContext((context) => context.query("DELETE FROM episode;"));
  databaseData[1].episodes = [];
}

export async function cleanPart(): EmptyPromise {
  await inContext((context) => context.query("DELETE FROM part;"));
  databaseData[1].parts = [];
}

export async function cleanMedium(): EmptyPromise {
  await inContext((context) => context.query("DELETE FROM medium;"));
  databaseData[1].media = [];
}

export async function cleanAll(): EmptyPromise {
  await cleanUserEpisode();
  await cleanEpisodeRelease();
  await cleanEpisode();
  await cleanPart();
  await cleanMedium();
  await cleanUser();
}
