import { SubContext } from "./subContext";
import {
  Episode,
  EpisodeContentData,
  EpisodeRelease,
  MetaResult,
  ProgressResult,
  ReadEpisode,
  Result,
  SimpleEpisode,
  SimpleRelease,
  DisplayReleasesResponse,
  MediumRelease,
  Uuid,
  EmptyPromise,
  PromiseMultiSingle,
  MultiSingleValue,
  Optional,
  Nullable,
  UpdateMedium,
  TypedQuery,
  PureEpisode,
  DisplayRelease,
} from "../../types";
import {
  checkIndices,
  combiIndex,
  getElseSet,
  ignore,
  MediaType,
  multiSingle,
  promiseMultiSingle,
  separateIndex,
  batch,
  hasPropType,
} from "../../tools";
import logger from "../../logger";
import { MysqlServerError } from "../mysqlError";
import { escapeLike } from "../storages/storageTools";
import { storeModifications, toSqlList } from "../sqlTools";
import { DatabaseError, ValidationError } from "../../error";

export class EpisodeContext extends SubContext {
  /**
   * Return a Query of all episodes and together with the read progress and date of the given user uuid.
   * @param uuid uuid to check the progress of
   */
  public async getAll(uuid: Uuid): Promise<TypedQuery<PureEpisode>> {
    return this.queryStream(
      `SELECT
      episode.id, episode.partialIndex as "partialIndex", episode.totalIndex as "totalIndex", 
      episode.combiIndex as "combiIndex", episode.part_id as "partId",
      coalesce(progress, 0) as progress, read_date as "readDate"
      FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id AND user_uuid IS NULL OR user_uuid=?`,
      uuid,
    );
  }

  public async getAllReleases(): Promise<TypedQuery<EpisodeRelease>> {
    return this.queryStream(
      `SELECT
      episode_id as "episodeId", source_type as "sourceType", toc_id as "tocId",
      releaseDate as "releaseDate", locked, url, title
      FROM episode_release`,
    );
  }

  public async getDisplayReleases(
    latestDate: Date,
    untilDate: Nullable<Date>,
    read: Nullable<boolean>,
    uuid: Uuid,
    ignoredLists: number[],
    requiredLists: number[],
    ignoredMedia: number[],
    requiredMedia: number[],
  ): Promise<DisplayReleasesResponse> {
    const progressCondition = read == null ? "1" : read ? "progress = 1" : "(progress IS NULL OR progress < 1)";

    let additionalMainQuery = "";

    if (requiredMedia.length) {
      additionalMainQuery += ` AND part.medium_id IN (${toSqlList(requiredMedia)}) `;
    }

    if (ignoredMedia.length) {
      additionalMainQuery += ` AND part.medium_id NOT IN (${toSqlList(ignoredMedia)}) `;
    }

    let filterQuery = "";

    if (requiredLists.length) {
      filterQuery += ` AND part.medium_id IN (SELECT medium_id FROM list_medium WHERE list_id IN (${toSqlList(
        requiredLists,
      )})) `;
    } else if (ignoredLists.length) {
      filterQuery += ` AND part.medium_id NOT IN (SELECT medium_id FROM list_medium WHERE list_id IN (${toSqlList(
        ignoredLists,
      )})) `;
    }

    const releasePromise = this.select<DisplayRelease>(
      `SELECT 
      er.episode_id as "episodeId", er.title, er.url as link, 
      er.releaseDate as date, er.locked, medium_id as "mediumId", progress
      FROM (
        SELECT * FROM episode_release 
        WHERE releaseDate < ? AND (?::text IS NULL OR releaseDate > ?)
        ORDER BY releaseDate DESC LIMIT 10000
      ) as er
      INNER JOIN episode ON episode.id=er.episode_id 
      LEFT JOIN (SELECT * FROM user_episode WHERE user_uuid = ?) as ue ON episode.id=ue.episode_id
      INNER JOIN part ON part.id=part_id ${additionalMainQuery}
      WHERE ${progressCondition}${filterQuery}
      LIMIT 500;`,
      [latestDate, untilDate, untilDate, uuid],
    );
    const mediaPromise = this.select<{ id: number; title: string; medium: MediaType }>(
      "SELECT id, title, medium FROM medium;",
    );
    const latestReleaseResult = await this.selectFirst<{ releasedate: string }>(
      "SELECT releasedate FROM episode_release ORDER BY releaseDate LIMIT 1;",
    );
    const releases = await releasePromise;

    const mediaIds: Set<number> = new Set();

    for (const release of releases) {
      mediaIds.add(release.mediumId);
    }
    const media = (await mediaPromise).filter((value) => mediaIds.has(value.id));

    return {
      latest: latestReleaseResult ? new Date(latestReleaseResult.releasedate) : new Date(0),
      media,
      releases,
    };
  }

  public async getMediumReleases(mediumId: number, uuid: Uuid): Promise<MediumRelease[]> {
    return this.select(
      `SELECT 
      er.episode_id as "episodeId", er.title, er.url as link,
      er.releaseDate as date, er.locked, episode.combiIndex as "combiIndex", progress
      FROM episode_release as er
      INNER JOIN episode ON episode.id=er.episode_id
      LEFT JOIN (
        SELECT * FROM user_episode WHERE user_uuid = ?
      ) as ue ON episode.id=ue.episode_id
      INNER JOIN part ON part.id=part_id
      WHERE part.medium_id = ?;`,
      [uuid, mediumId],
    );
  }

  public async getAssociatedEpisode(url: string): Promise<number> {
    const result: Array<Pick<UpdateMedium, "id">> = await this.select(
      "SELECT id FROM episode INNER JOIN episode_release ON episode.id=episode_release.episode_id WHERE url=?",
      url,
    );
    if (result.length === 1) {
      return result[0].id;
    }
    return 0;
  }

  /**
   *
   */
  public async getLatestReleases(mediumId: number): Promise<SimpleEpisode[]> {
    const resultArray: any[] = await this.select(
      "SELECT episode.* FROM episode_release " +
        "INNER JOIN episode ON episode.id=episode_release.episode_id " +
        "INNER JOIN part ON part.id=episode.part_id  " +
        "WHERE medium_id=? " +
        "GROUP BY episode_id " +
        "ORDER BY episode.totalIndex DESC, episode.partialIndex DESC " +
        "LIMIT 5;",
      mediumId,
    );
    return Promise.all(
      resultArray.map(async (rawEpisode) => {
        const releases = await this.getReleases(rawEpisode.id);
        return {
          id: rawEpisode.id,
          partialIndex: rawEpisode.partialindex,
          partId: rawEpisode.part_id,
          totalIndex: rawEpisode.totalindex,
          combiIndex: rawEpisode.combiindex,
          releases,
        };
      }),
    );
  }

  public async getReleases(episodeId: number | number[]): Promise<EpisodeRelease[]> {
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
      return [];
    }
    const resultArray: Optional<any[]> = await this.queryInList(
      "SELECT * FROM episode_release WHERE episode_id IN (??)",
      [episodeId],
    );
    if (!resultArray?.length) {
      return [];
    }
    return resultArray.map((value: any): EpisodeRelease => {
      return {
        episodeId: value.episode_id,
        sourceType: value.source_type,
        releaseDate: value.releasedate,
        locked: !!value.locked,
        url: value.url,
        title: value.title,
        tocId: value.toc_id,
      };
    });
  }

  public async getReleasesByHost(episodeId: number | number[], host: string): Promise<EpisodeRelease[]> {
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
      return [];
    }
    const resultArray: Optional<any[]> = await this.queryInList(
      "SELECT * FROM episode_release WHERE locate(?, url) = 1 AND episode_id IN (??);",
      [host, episodeId],
    );
    if (!resultArray?.length) {
      return [];
    }
    return resultArray.map((value: any): EpisodeRelease => {
      return {
        episodeId: value.episode_id,
        sourceType: value.source_type,
        releaseDate: value.releasedate,
        locked: !!value.locked,
        url: value.url,
        title: value.title,
      };
    });
  }

  public async getMediumReleasesByHost(mediumId: number, host: string): Promise<EpisodeRelease[]> {
    const resultArray: any[] = await this.select(
      `
      SELECT er.* FROM episode_release as er
      INNER JOIN episode as e ON e.id=er.episode_id
      INNER JOIN part as p ON p.id=e.part_id
      WHERE medium_id = ? 
      AND locate(?, url) = 1
      `,
      [mediumId, host],
    );
    return resultArray.map((value: any): EpisodeRelease => {
      return {
        episodeId: value.episode_id,
        sourceType: value.source_type,
        releaseDate: value.releasedate,
        locked: !!value.locked,
        url: value.url,
        title: value.title,
        tocId: value.toc_id,
      };
    });
  }

  public async getPartsEpisodeIndices(
    partId: number | number[],
  ): Promise<Array<{ partId: number; episodes: number[] }>> {
    const result: Optional<Array<{ part_id: number; combiindex: number }>> = await this.queryInList(
      "SELECT part_id, combiIndex " + "FROM episode WHERE part_id IN (??)",
      [partId],
    );
    if (!result) {
      return [];
    }
    const idMap = new Map<number, { partId: number; episodes: number[] }>();
    result.forEach((value) => {
      const partValue = getElseSet(idMap, value.part_id, () => {
        return { partId: value.part_id, episodes: [] };
      });
      partValue.episodes.push(value.combiindex);
    });
    if (Array.isArray(partId)) {
      partId.forEach((value) => {
        getElseSet(idMap, value, () => {
          return { partId: value, episodes: [] };
        });
      });
    } else {
      getElseSet(idMap, partId, () => {
        return { partId, episodes: [] };
      });
    }
    return [...idMap.values()];
  }

  /**
   * Add progress of an user in regard to an episode to the storage.
   * A null value for readDate will be saved as "now".
   * Returns always true if it succeeded (no error).
   */
  public async addProgress(
    uuid: Uuid,
    episodeId: number | number[],
    progress: number,
    readDate: Nullable<Date>,
  ): Promise<boolean> {
    if (progress < 0 || progress > 1) {
      return Promise.reject(new ValidationError(`Invalid Progress: ${progress}`));
    }
    const results = await this.multiInsert(
      "REPLACE INTO user_episode " + "(user_uuid, episode_id, progress, read_date) " + "VALUES ",
      episodeId,
      (value) => [uuid, value, progress, readDate || new Date()],
    );
    multiSingle(results, (value) => storeModifications("progress", "update", value));
    return true;
  }

  /**
   * Removes progress of an user in regard to an episode.
   */
  public async removeProgress(uuid: Uuid, episodeId: number): Promise<boolean> {
    const result = await this.delete(
      "user_episode",
      {
        column: "user_uuid",
        value: uuid,
      },
      {
        column: "episode_id",
        value: episodeId,
      },
    );
    storeModifications("progress", "delete", result);
    return result.rowCount > 0;
  }

  /**
   * Sets the progress of an user in regard to an episode with one or multiple progressResult objects.
   */
  public setProgress(uuid: Uuid, progressResult: ProgressResult | ProgressResult[]): EmptyPromise {
    return promiseMultiSingle(progressResult, async (value: ProgressResult) => {
      const resultArray: any[] = await this.select(
        "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?)",
        [value.novel, value.chapter, value.chapIndex],
      );
      const episodeId: Optional<number> = resultArray[0]?.episode_id;

      if (episodeId == null) {
        const msg = `could not find an episode for '${value.novel}', '${value.chapter + ""}', '${
          value.chapIndex + ""
        }'`;
        logger.info(msg);
        return;
      }
      await this.addProgress(uuid, episodeId, value.progress, value.readDate);
    }).then(ignore);
  }

  /**
   * Get the progress of an user in regard to an episode.
   * Defaults to zero if no entry is found.
   */
  public async getProgress(uuid: Uuid, episodeId: number): Promise<number> {
    const result = await this.select<any>(
      "SELECT * FROM user_episode " + "WHERE user_uuid = ? " + "AND episode_id = ?",
      [uuid, episodeId],
    );

    return result[0]?.progress || 0;
  }

  /**
   * Updates the progress of an user in regard to an episode.
   */
  public updateProgress(uuid: Uuid, episodeId: number, progress: number, readDate: Nullable<Date>): Promise<boolean> {
    // TODO for now its the same as calling addProgress, but somehow do it better maybe?
    return this.addProgress(uuid, episodeId, progress, readDate);
  }

  /**
   * Marks an Episode as read and adds it into Storage if the episode does not exist yet.
   */
  public async markEpisodeRead(uuid: Uuid, result: Result): EmptyPromise {
    if (!result.accept) {
      return;
    }
    const teaserMatcher = /\(?teaser\)?$|(\s+$)/i;
    return promiseMultiSingle(result.result, async (value: MetaResult): EmptyPromise => {
      // TODO what if it is not a serial medium but only an article? should it even save such things?
      if (
        !value.novel ||
        (!value.chapIndex && !value.chapter) ||
        // do not mark episode if they are a teaser only
        value.chapter?.match(teaserMatcher)
      ) {
        return;
      }

      const resultArray: any[] = await this.select(
        "SELECT episode_id FROM result_episode WHERE novel=? AND (chapter=? OR chapIndex=?);",
        [value.novel, value.chapter, value.chapIndex],
      );
      // if a similar/same result was mapped to an episode before, get episode_id and update read
      if (resultArray[0]?.episode_id != null) {
        const insertResult = await this.query(
          "INSERT INTO user_episode (user_uuid, episode_id,progress) VALUES (?,?,0) ON CONFLICT DO NOTHING;",
          [uuid, resultArray[0].episode_id],
        );
        storeModifications("progress", "insert", insertResult);
        return;
      }

      const escapedNovel = escapeLike(value.novel, { singleQuotes: true, noBoundaries: true });
      const media = await this.select<{
        title: string;
        id: number;
        synonym?: string;
      }>(
        "SELECT title, id,synonym FROM medium " +
          "LEFT JOIN medium_synonyms ON medium.id=medium_synonyms.medium_id " +
          "WHERE medium.title LIKE ? OR medium_synonyms.synonym LIKE ?;",
        [escapedNovel, escapedNovel],
      );
      // TODO for now only get the first medium?, later test it against each other
      let bestMedium = media[0];

      if (!bestMedium) {
        const addedMedium = await this.parentContext.mediumContext.addMedium(
          {
            title: value.novel,
            medium: MediaType.TEXT,
          },
          uuid,
        );
        bestMedium = { id: addedMedium.id as number, title: value.novel };
        // TODO add medium if it is not known?
      }

      let volumeId;

      // if there is either an volume or volIndex in result
      // search or add the given volume to link the episode to the part/volume
      let volumeTitle = value.volume;
      // if there is no volume yet, with the given volumeTitle or index, add one
      let volIndex = Number(value.volIndex);

      if (volIndex || volumeTitle) {
        // TODO: do i need to convert volIndex from a string to a number for the query?
        const volumeArray = await this.select<{ id: number }>(
          "SELECT id FROM part WHERE medium_id=? AND title LIKE ? OR totalIndex=?)",
          [
            bestMedium.id,
            volumeTitle &&
              escapeLike(volumeTitle, {
                singleQuotes: true,
                noBoundaries: true,
              }),
            volIndex,
          ],
        );

        const volume = volumeArray[0];

        if (volume) {
          volumeId = volume.id;
        } else {
          if (Number.isNaN(volIndex)) {
            const lowestIndexArray = await this.select<{ totalindex: number }>(
              "SELECT MIN(totalIndex) as totalIndex FROM part WHERE medium_id=?",
              bestMedium.id,
            );
            // TODO look if totalIndex incremential needs to be replaced with combiIndex
            const lowestIndexObj = lowestIndexArray[0];
            // if the lowest available totalIndex not indexed, decrement, else take -2
            // -1 is reserved for all episodes, which do not have any volume/part assigned
            volIndex = lowestIndexObj && lowestIndexObj.totalindex < 0 ? --lowestIndexObj.totalindex : -2;
          }
          volumeTitle ??= "Volume " + volIndex;
          const addedVolume = await this.parentContext.partContext.addPart(
            // @ts-expect-error
            { title: volumeTitle, totalIndex: volIndex, mediumId: bestMedium.id },
          );
          volumeId = addedVolume.id;
        }
      } else {
        // check if there is a part/volume, with index -1, reserved for all episodes, which are not indexed
        const volumeArray = await this.select<{
          id: number;
        }>("SELECT id FROM part WHERE medium_id=? AND totalIndex=?", [bestMedium.id, -1]);
        const volume = volumeArray[0];

        if (!volume) {
          volumeId = (await this.parentContext.partContext.createStandardPart(bestMedium.id)).id;
        } else {
          volumeId = volume.id;
        }
      }

      if (!Number.isInteger(volumeId) || volumeId <= 0) {
        throw new ValidationError("no volume id available");
      }

      const episodeSelectArray = await this.select<{ id: number; part_id: number; link: string }>(
        "SELECT id, part_id, url FROM episode " +
          "LEFT JOIN episode_release " +
          "ON episode.id=episode_release.episode_id " +
          "WHERE title LIKE ? OR totalIndex=?",
        [
          value.chapter &&
            escapeLike(value.chapter, {
              noBoundaries: true,
              singleQuotes: true,
            }),
          value.chapIndex,
        ],
      );

      const episodeSelect = episodeSelectArray[0];

      let episodeId = episodeSelect?.id;

      if (episodeId == null) {
        let episodeIndex = Number(value.chapIndex);

        // if there is no index, decrement the minimum index available for this medium
        if (Number.isNaN(episodeIndex)) {
          const latestEpisodeArray = await this.select<{ totalindex: number }>(
            "SELECT MIN(totalIndex) as totalIndex FROM episode " +
              "WHERE part_id EXISTS (SELECT id from part WHERE medium_id=?);",
            bestMedium.id,
          );
          const latestEpisode = latestEpisodeArray[0];

          // TODO: 23.07.2019 look if totalIndex needs to be replaced with combiIndex
          // if the lowest available totalIndex not indexed, decrement, else take -1
          episodeIndex = latestEpisode && latestEpisode.totalindex < 0 ? --latestEpisode.totalindex : -1;
        }

        const chapter = value.chapter ?? "Chapter " + episodeIndex;

        const episode = await this.addEpisode({
          id: 0,
          partId: volumeId,
          totalIndex: episodeIndex,
          releases: [
            {
              title: chapter,
              url: result.url,
              releaseDate: new Date(),
              // TODO get source type
              sourceType: "",
              episodeId: 0,
            },
          ],
        });
        episodeId = episode.id;
      }

      // now after setting the storage up, so that all data is 'consistent' with this result,
      // mark the episode as read
      // normally the progress should be updated by messages of the tracker
      // it should be inserted only, if there does not exist any progress
      let queryResult = await this.query(
        "INSERT INTO user_episode (user_uuid, episode_id, progress) VALUES (?,?,0) ON CONFLICT DO NOTHING;",
        [uuid, episodeId],
      );
      storeModifications("progress", "insert", queryResult);
      queryResult = await this.query(
        "INSERT INTO result_episode (novel, chapter, chapIndex, volume, volIndex, episode_id) " +
          "VALUES (?,?,?,?,?,?);",
        [value.novel, value.chapter, value.chapIndex, value.volume, value.volIndex, episodeId],
      );
      storeModifications("result_episode", "insert", queryResult);
    }).then(ignore);
  }

  public async addRelease<T extends EpisodeRelease>(releases: T[]): Promise<T[]>;
  public async addRelease<T extends EpisodeRelease>(releases: T): Promise<T>;

  public async addRelease<T extends MultiSingleValue<EpisodeRelease>>(releases: T): Promise<T> {
    const results = await this.multiInsert(
      "INSERT INTO episode_release (episode_id, title, url, source_type, releaseDate, locked, toc_id) VALUES",
      releases,
      (release) => {
        if (!release.episodeId) {
          throw new ValidationError("missing episodeId on release");
        }
        return [
          release.episodeId,
          release.title,
          release.url,
          release.sourceType,
          release.releaseDate,
          release.locked,
          release.tocId,
        ];
      },
      true,
    );
    multiSingle(results, (value) => storeModifications("release", "insert", value));
    return releases;
  }

  public getEpisodeLinks(episodeIds: number[]): Promise<SimpleRelease[]> {
    return this.queryInList('SELECT episode_id as "episodeId", url FROM episode_release WHERE episode_id IN (??)', [
      episodeIds,
    ]) as Promise<SimpleRelease[]>;
  }

  public getEpisodeLinksByMedium(mediumId: number): Promise<SimpleRelease[]> {
    return this.select<SimpleRelease>(
      `SELECT
      episode_id as "episodeId", url
      FROM episode_release 
      inner join episode on episode.id=episode_release.episode_id 
      inner join part on part.id=episode.part_id
      WHERE medium_id = ?;`,
      mediumId,
    );
  }

  public getSourcedReleases(
    sourceType: string,
    mediumId: number,
  ): Promise<Array<{ sourceType: string; url: string; title: string; mediumId: number }>> {
    return this.select(
      "SELECT url, episode_release.title FROM episode_release " +
        "INNER JOIN episode ON episode.id=episode_release.episode_id " +
        "INNER JOIN part ON part.id=episode.part_id " +
        "WHERE source_type=? AND medium_id=?;",
      [sourceType, mediumId],
    ).then((resultArray) =>
      resultArray.map((value: any) => {
        value.sourceType = sourceType;
        value.mediumId = mediumId;
        return value;
      }),
    );
  }

  public async updateRelease(releases: MultiSingleValue<EpisodeRelease>): EmptyPromise {
    if (!Array.isArray(releases)) {
      releases = [releases];
    }
    const batches = batch(releases, 100);
    await Promise.all(
      batches.map(async (releaseBatch) => {
        const params = releaseBatch.flatMap((release) => {
          return [
            release.episodeId,
            release.url,
            release.title,
            release.releaseDate,
            release.sourceType,
            !!release.locked,
            release.tocId,
          ];
        });
        const result = await this.query(
          `
          INSERT INTO episode_release
          (episode_id, url, title, releaseDate, source_type, locked, toc_id) 
          VALUES ${"(?,?,?,?,?,?,?),".repeat(releaseBatch.length).slice(0, -1)}
          ON DUPLICATE KEY UPDATE 
          title = VALUES(title),
          releaseDate = VALUES(releaseDate),
          source_type = VALUES(source_type),
          locked = VALUES(locked),
          toc_id = VALUES(toc_id);
          `,
          params,
        );
        storeModifications("release", "update", result);
      }),
    );
  }

  public async deleteRelease(release: EpisodeRelease | EpisodeRelease[]): EmptyPromise {
    if (Array.isArray(release)) {
      await Promise.all(
        batch(release, 100).map((releaseBatch) => {
          return this.query(
            `DELETE FROM episode_release WHERE (episode_id, url) in (${releaseBatch.map(() => "(?,?)").join(",")})`,
            releaseBatch.flatMap((item) => [item.episodeId, item.url]),
          );
        }),
      );
    } else {
      const result = await this.delete(
        "episode_release",
        {
          column: "episode_id",
          value: release.episodeId,
        },
        {
          column: "url",
          value: release.url,
        },
      );
      storeModifications("release", "delete", result);
    }
  }

  public async getEpisodeContentData(chapterLink: string): Promise<EpisodeContentData> {
    const results = await this.selectFirst<EpisodeContentData>(
      `SELECT
      episode_release.title as "episodeTitle", episode.combiIndex as index,
      medium.title as "mediumTitle"
      FROM episode_release 
      INNER JOIN episode ON episode.id=episode_release.episode_id 
      INNER JOIN part ON part.id=episode.part_id 
      INNER JOIN medium ON medium.id=part.medium_id 
      WHERE episode_release.url=?`,
      chapterLink,
    );

    if (!results) {
      return {
        episodeTitle: "",
        index: 0,
        mediumTitle: "",
      };
    }
    return {
      episodeTitle: results.episodeTitle,
      index: results.index,
      mediumTitle: results.mediumTitle,
    };
  }

  public addEpisode(episode: SimpleEpisode): Promise<Episode>;
  public addEpisode(episode: SimpleEpisode[]): Promise<Episode[]>;

  /**
   * Adds a episode of a part to the storage.
   */
  public addEpisode<T extends MultiSingleValue<SimpleEpisode>>(episodes: T): PromiseMultiSingle<T, Episode> {
    // TODO: 29.06.2019 insert multiple rows, what happens with insertId?
    const insertReleases: EpisodeRelease[] = [];
    // @ts-expect-error
    return promiseMultiSingle(episodes, async (episode: SimpleEpisode): Promise<Episode> => {
      if (episode.partId == null || episode.partId <= 0) {
        throw new ValidationError(`episode without partId: ${episode.partId}`);
      }
      let insertId: Optional<number>;
      const episodeCombiIndex = episode.combiIndex == null ? combiIndex(episode) : episode.combiIndex;
      try {
        const result = await this.query(
          "INSERT INTO episode " +
            "(part_id, totalIndex, partialIndex, combiIndex) " +
            "VALUES (?,?,?,?) RETURNING id;",
          [episode.partId, episode.totalIndex, episode.partialIndex, episodeCombiIndex],
        );
        storeModifications("episode", "insert", result);
        insertId = result.rows[0].id;
      } catch (e) {
        // do not catch if it isn't an duplicate key error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (
          !e ||
          (hasPropType<number>(e, "errno") &&
            e.errno !== MysqlServerError.ER_DUP_KEY &&
            e.errno !== MysqlServerError.ER_DUP_ENTRY)
        ) {
          throw e;
        }
        const result = await this.select<{ id: number }>("SELECT id from episode where part_id=? and combiIndex=?", [
          episode.partId,
          combiIndex(episode),
        ]);
        insertId = result[0].id;
      }
      if (!Number.isInteger(insertId)) {
        throw new ValidationError(`invalid ID ${insertId + ""}`);
      }

      if (episode.releases) {
        // @ts-expect-error
        episode.releases.forEach((value) => (value.episodeId = insertId));
        insertReleases.push(...episode.releases);
      }
      return {
        id: insertId as number,
        partId: episode.partId,
        partialIndex: episode.partialIndex,
        totalIndex: episode.totalIndex,
        combiIndex: episodeCombiIndex,
        releases: episode.releases,
        progress: 0,
        readDate: null,
      };
    }).then(async (value: MultiSingleValue<Episode>) => {
      if (insertReleases.length) {
        await this.addRelease(insertReleases);
      }
      return value;
    });
  }

  public getEpisode(id: number, uuid: Uuid): Promise<Episode>;
  public getEpisode(id: number[], uuid: Uuid): Promise<Episode[]>;

  /**
   * Gets an episode from the storage.
   */
  public async getEpisode(id: number | number[], uuid: Uuid): Promise<Episode | Episode[]> {
    const episodes: Optional<any[]> = await this.queryInList(
      "SELECT episode.*, ue.progress, ue.read_date FROM episode LEFT JOIN user_episode ue ON episode.id=ue.episode_id " +
        "WHERE (user_uuid IS NULL OR user_uuid=?) AND episode.id IN (??);",
      [uuid, id],
    );
    if (!episodes?.length) {
      return [];
    }
    const idMap = new Map<number, any>();
    const releases = await this.getReleases(
      episodes.map((value: any): number => {
        idMap.set(value.id, value);
        return value.id;
      }),
    );

    releases.forEach((value) => {
      const episode = idMap.get(value.episodeId);
      if (!episode) {
        throw new DatabaseError("episode missing for queried release");
      }
      if (!episode.releases) {
        episode.releases = [];
      }
      episode.releases.push(value);
    });
    return episodes.map((episode) => {
      return {
        progress: episode.progress != null ? episode.progress : 0,
        readDate: episode.progress != null ? episode.read_date : null,
        id: episode.id,
        partialIndex: episode.partialindex,
        partId: episode.part_id,
        totalIndex: episode.totalindex,
        combiIndex: episode.combiindex,
        releases: episode.releases || [],
      };
    });
  }

  public async getPartMinimalEpisodes(partId: number): Promise<Array<{ id: number; combiIndex: number }>> {
    return this.select('SELECT id, combiIndex as "combiIndex" FROM episode WHERE part_id=?', partId);
  }

  public async getPartEpisodePerIndex(partId: number, index: number | number[]): Promise<SimpleEpisode[]> {
    const episodes: Optional<any[]> = await this.queryInList(
      "SELECT * FROM episode WHERE part_id = ? AND combiIndex IN (??);",
      [partId, index],
    );
    if (!episodes?.length) {
      return [];
    }
    const availableIndices: number[] = [];
    const idMap = new Map<number, any>();
    const episodeIds = episodes.map((value: any) => {
      availableIndices.push(value.combiindex);
      idMap.set(value.id, value);
      return value.id;
    });
    const releases = await this.getReleases(episodeIds);
    releases.forEach((value) => {
      const episode = idMap.get(value.episodeId);
      if (!episode) {
        throw new DatabaseError("missing episode for release");
      }
      if (!episode.releases) {
        episode.releases = [];
      }
      episode.releases.push(value);
    });

    multiSingle(index, (value: number) => {
      if (!availableIndices.includes(value)) {
        const separateValue = separateIndex(value);
        checkIndices(separateValue);
        episodes.push(separateValue);
      }
    });
    return episodes.map((value) => {
      checkIndices(value);
      return {
        id: value.id,
        partId,
        totalIndex: value.totalindex,
        partialIndex: value.partialindex,
        combiIndex: value.combiindex,
        releases: value.releases || [],
      };
    });
  }

  public async getMediumEpisodes(mediumId: number): Promise<Array<SimpleEpisode & { combiIndex: number }>> {
    const episodes: any[] = await this.select(
      `
      SELECT
      episode.id,
      episode.part_id,
      episode.combiindex as "combiIndex",
      episode.totalindex as "totalIndex",
      episode.partialindex as "partialIndex",
      FROM episode
      INNER JOIN part ON part.id=episode.part_id
      WHERE medium_id = ?;
      `,
      mediumId,
    );
    if (!episodes?.length) {
      return [];
    }
    return episodes.map((value) => {
      checkIndices(value);
      return {
        id: value.id,
        partId: value.part_id,
        totalIndex: value.totalIndex,
        partialIndex: value.partialIndex,
        combiIndex: value.combiIndex || combiIndex(value),
        releases: [],
      };
    });
  }

  public getMediumEpisodePerIndex(mediumId: number, index: number, ignoreRelease?: boolean): Promise<SimpleEpisode>;
  public getMediumEpisodePerIndex(mediumId: number, index: number[], ignoreRelease?: boolean): Promise<SimpleEpisode[]>;

  public async getMediumEpisodePerIndex(
    mediumId: number,
    index: number | number[],
    ignoreRelease = false,
  ): Promise<SimpleEpisode | SimpleEpisode[]> {
    const episodes: Optional<any[]> = await this.queryInList(
      `SELECT 
      episode.id,
      episode.part_id,
      episode.combiindex as "combiIndex",
      episode.totalindex as "totalIndex",
      episode.partialindex as "partialIndex",
      FROM episode 
      INNER JOIN part ON part.id=episode.part_id
      WHERE medium_id = ? AND episode.combiIndex IN (??);`,
      [mediumId, index],
    );
    if (!episodes?.length) {
      return [];
    }
    const availableIndices: number[] = [];
    const idMap = new Map<number, any>();
    const episodeIds = episodes.map((value: any) => {
      availableIndices.push(value.combiIndex);
      idMap.set(value.id, value);
      return value.id;
    });
    const releases = ignoreRelease ? [] : await this.getReleases(episodeIds);
    releases.forEach((value) => {
      const episode = idMap.get(value.episodeId);
      if (!episode) {
        throw new DatabaseError("missing episode for release");
      }
      if (!episode.releases) {
        episode.releases = [];
      }
      episode.releases.push(value);
    });

    multiSingle(index, (value: number) => {
      if (!availableIndices.includes(value)) {
        const separateValue = separateIndex(value);
        episodes.push(separateValue);
      }
    });
    return episodes.map((value) => {
      checkIndices(value);
      return {
        id: value.id,
        partId: value.part_id,
        totalIndex: value.totalIndex,
        partialIndex: value.partialIndex,
        combiIndex: value.combiIndex,
        releases: value.releases || [],
      };
    });
  }

  /**
   * Updates an episode from the storage.
   */
  public async updateEpisode(episode: SimpleEpisode): Promise<boolean> {
    const result = await this.update(
      "episode",
      (updates, values) => {
        if (episode.partId) {
          updates.push("part_id = ?");
          values.push(episode.partId);
        }

        if (episode.partialIndex != null) {
          updates.push("partialIndex = ?");
          values.push(episode.partialIndex);
        }

        if (episode.totalIndex != null) {
          updates.push("totalIndex = ?");
          values.push(episode.totalIndex);
        }
        if (episode.totalIndex || episode.partialIndex) {
          updates.push("combiIndex = ?");
          values.push(episode.combiIndex == null ? combiIndex(episode) : episode.combiIndex);
        }
      },
      {
        column: "id",
        value: episode.id,
      },
    );
    storeModifications("episode", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Updates an episode from the storage.
   */
  public async moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean> {
    if (!oldPartId || !newPartId) {
      return false;
    }
    const replaceIds = await this.select<{
      oldid: number;
      newid: number;
    }>(
      "SELECT oldEpisode.id as oldId, newEpisode.id as newId FROM " +
        "(Select * from episode where part_id=?) as oldEpisode " +
        "inner join (Select * from episode where part_id=?) as newEpisode " +
        "ON oldEpisode.combiIndex=newEpisode.combiIndex",
      [oldPartId, newPartId],
    );

    const changePartIdsResult: any[] = await this.select(
      "SELECT id FROM episode WHERE combiIndex IN " +
        "(SELECT combiIndex FROM episode WHERE part_id = ?) AND part_id = ?;",
      [newPartId, oldPartId],
    );
    const changePartIds: number[] = changePartIdsResult.map((value) => value.id);

    let result = await this.queryInList("UPDATE episode SET part_id= ? " + "WHERE part_id= ? AND combiIndex IN (??);", [
      newPartId,
      oldPartId,
      changePartIds,
    ]);
    multiSingle(result, (value) => storeModifications("release", "update", value));
    if (!replaceIds.length) {
      return true;
    }
    const deleteReleaseIds: number[] = [];
    await Promise.all(
      replaceIds.map((replaceId) => {
        return this.query("UPDATE episode_release set episode_id=? where episode_id=?", [
          replaceId.newid,
          replaceId.oldid,
        ])
          .then((value) => storeModifications("release", "update", value))
          .catch((reason) => {
            if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
              deleteReleaseIds.push(replaceId.oldid);
            } else {
              throw reason;
            }
          });
      }),
    );
    const deleteProgressIds: number[] = [];

    await Promise.all(
      replaceIds.map((replaceId) => {
        return this.query("UPDATE user_episode set episode_id=? where episode_id=?", [replaceId.newid, replaceId.oldid])
          .then((value) => storeModifications("progress", "update", value))
          .catch((reason) => {
            if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
              deleteProgressIds.push(replaceId.oldid);
            } else {
              throw reason;
            }
          });
      }),
    );
    const deleteResultIds: number[] = [];

    await Promise.all(
      replaceIds.map((replaceId) => {
        return this.query("UPDATE result_episode set episode_id=? where episode_id=?", [
          replaceId.newid,
          replaceId.oldid,
        ])
          .then((value) => storeModifications("result_episode", "update", value))
          .catch((reason) => {
            if (reason && MysqlServerError.ER_DUP_ENTRY === reason.errno) {
              deleteResultIds.push(replaceId.oldid);
            } else {
              throw reason;
            }
          });
      }),
    );
    const oldIds = replaceIds.map((value) => value.oldid);
    // TODO: 26.08.2019 this does not go quite well, throws error with 'cannot delete parent reference'
    result = await this.queryInList("DELETE FROM episode_release WHERE episode_id IN (??);", [deleteReleaseIds]);
    multiSingle(result, (value) => storeModifications("release", "delete", value));

    result = await this.queryInList("DELETE FROM user_episode WHERE episode_id IN (??);", [deleteProgressIds]);
    multiSingle(result, (value) => storeModifications("progress", "delete", value));

    result = await this.queryInList("DELETE FROM result_episode WHERE episode_id IN (??);", [deleteResultIds]);
    multiSingle(result, (value) => storeModifications("result_episode", "delete", value));

    result = await this.queryInList("DELETE FROM episode WHERE part_id= ? AND id IN (??);", [oldPartId, oldIds]);
    multiSingle(result, (value) => storeModifications("episode", "delete", value));
    return true;
  }

  /**
   * Deletes an episode from the storage irreversibly.
   */
  public async deleteEpisode(id: number): Promise<boolean> {
    // remove episode from progress first
    let result = await this.delete("user_episode", { column: "episode_id", value: id });
    storeModifications("progress", "delete", result);

    result = await this.delete("episode_release", { column: "episode_id", value: id });
    storeModifications("release", "delete", result);

    // lastly remove episode itself
    result = await this.delete("episode", { column: "id", value: id });
    storeModifications("episode", "delete", result);
    return result.rowCount > 0;
  }

  public async getChapterIndices(mediumId: number): Promise<number[]> {
    const result: any[] = await this.select(
      "SELECT episode.combiIndex FROM episode INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?",
      mediumId,
    );
    return result.map((value) => value.combiindex);
  }

  public async getAllChapterLinks(mediumId: number): Promise<string[]> {
    const result: any[] = await this.select(
      "SELECT url FROM episode " +
        "INNER JOIN episode_release ON episode.id=episode_release.episode_id " +
        "INNER JOIN part ON episode.part_id=part.id WHERE medium_id=?",
      mediumId,
    );
    return result.map((value) => value.url).filter((value) => value);
  }

  public async getUnreadChapter(uuid: Uuid): Promise<number[]> {
    const resultArray = await this.select(
      "SELECT id FROM episode WHERE id NOT IN " +
        "(SELECT episode_id FROM user_episode WHERE progress >= 1 AND user_uuid=?);",
      uuid,
    );
    return resultArray.map((value: any) => value.id);
  }

  public async getReadToday(uuid: Uuid): Promise<ReadEpisode[]> {
    const resultArray = await this.select(
      "SELECT * FROM user_episode WHERE read_date > (NOW() - INTERVAL 1 DAY) AND user_uuid=?;",
      uuid,
    );
    return resultArray.map((value: any): ReadEpisode => {
      return {
        episodeId: value.episode_id,
        readDate: value.read_date,
        progress: value.progress,
      };
    });
  }

  /**
   * Requires either a valid partIndex or episodeIndex.
   * Marks all episodes with lower indices excluding the parameter index as read.
   *
   * @param uuid uuid of the user which has read
   * @param mediumId id of the medium to mark the episodes for
   * @param partIndex index of the part
   * @param episodeIndex index of the episode
   * @returns void
   */
  public async markLowerIndicesRead(
    uuid: Uuid,
    mediumId: number,
    partIndex?: number,
    episodeIndex?: number,
  ): EmptyPromise {
    if (!uuid || !mediumId || (partIndex == null && episodeIndex == null)) {
      return;
    }
    // TODO: 09.03.2020 rework query and input, for now the episodeIndices are only relative to their parts mostly,
    //  not always relative to the medium
    // first update existing user-episode-progress where it not marked as read
    let result = await this.query(
      "UPDATE user_episode, episode, part " +
        "SET user_episode.progress=1, user_episode.read_date=NOW() " +
        "WHERE user_episode.progress != 1 " +
        "AND user_episode.user_uuid = ? " +
        "AND user_episode.episode_id=episode.id " +
        "AND episode.part_id=part.id " +
        "AND part.medium_id=? " +
        "AND (? IS NULL OR part.combiIndex < ?) " +
        "AND episode.combiIndex < ?",
      [uuid, mediumId, partIndex, partIndex, episodeIndex],
    );
    storeModifications("progress", "update", result);

    // then insert non-existing user-episode-progress as read
    result = await this.query(
      "INSERT INTO user_episode (user_uuid, episode_id, progress, read_date) " +
        "SELECT ?, episode.id, 1, NOW() FROM episode, part " +
        "WHERE episode.part_id=part.id " +
        "AND part.medium_id=? " +
        "AND (? IS NULL OR part.combiIndex < ?) " +
        "AND episode.combiIndex < ? " +
        "ON CONFLICT DO NOTHING",
      [uuid, mediumId, partIndex, partIndex, episodeIndex],
    );
    storeModifications("progress", "insert", result);
  }
}
