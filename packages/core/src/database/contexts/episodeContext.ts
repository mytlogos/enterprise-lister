import { Uuid, EmptyPromise, Nullable, TypedQuery, Insert } from "../../types";
import { checkIndices, combiIndex, getElseSet, separateIndex } from "../../tools";
import { DatabaseError, isDuplicateError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import {
  entity,
  Episode,
  episodeContentData,
  EpisodeContentData,
  PureEpisode,
  pureEpisode,
  SimpleEpisode,
  simpleEpisode,
  SimpleEpisodeReleases,
  SimpleReadEpisode,
  SimpleRelease,
} from "../databaseTypes";
import { sql } from "slonik";
import { EpisodeReleaseContext } from "./episodeReleaseContext";

export class EpisodeContext extends QueryContext {
  /**
   * Return a Query of all episodes and together with the read progress and date of the given user uuid.
   * @param uuid uuid to check the progress of
   */
  public async getAll(uuid: Uuid): Promise<TypedQuery<PureEpisode>> {
    return this.stream(
      sql.type(pureEpisode)`SELECT
      episode.id, episode.partial_index, episode.total_index,
      episode.combi_index, episode.part_id as partId,
      coalesce(progress, 0) as progress, read_date
      FROM episode LEFT JOIN user_episode ON episode.id=user_episode.episode_id AND user_uuid IS NULL OR user_uuid=${uuid}`,
    );
  }

  public async getAssociatedEpisode(url: string): Promise<number> {
    const result = await this.con.maybeOneFirst(
      sql.type(entity)`
      SELECT id FROM episode
      INNER JOIN episode_release ON episode.id=episode_release.episode_id
      WHERE url=${url}`,
    );
    return result ?? 0;
  }

  /**
   *
   */
  public async getLatestReleases(mediumId: number): Promise<SimpleEpisodeReleases[]> {
    const resultArray = await this.con.any(
      sql.type(simpleEpisode)`
      SELECT episode.* FROM episode_release
      INNER JOIN episode ON episode.id=episode_release.episode_id
      INNER JOIN part ON part.id=episode.part_id 
      WHERE medium_id=${mediumId}
      GROUP BY episode.id
      ORDER BY episode.totalIndex DESC, episode.partialIndex DESC
      LIMIT 5;`,
    );
    const releases = await this.getContext(EpisodeReleaseContext).getReleases(resultArray.map((value) => value.id));
    const episodeMap = new Map<number, SimpleEpisodeReleases>();

    for (const episode of resultArray) {
      episodeMap.set(episode.id, {
        id: episode.id,
        partialIndex: episode.partialIndex,
        partId: episode.partId,
        totalIndex: episode.totalIndex,
        combiIndex: episode.combiIndex,
        releases: [],
      });
    }

    for (const release of releases) {
      episodeMap.get(release.episodeId)?.releases.push(release);
    }
    return [...episodeMap.values()].sort((a, b) => b.combiIndex - a.combiIndex);
  }

  public async getPartsEpisodeIndices(partId: number[]): Promise<Array<{ partId: number; episodes: number[] }>> {
    const result = await this.con.any<{ part_id: number; combiindex: number }>(
      sql`SELECT part_id, combi_index FROM episode WHERE part_id = ANY(${sql.array(partId, "int8")});`,
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
    episodeId: number[],
    progress: number,
    readDate: Nullable<Date>,
  ): Promise<boolean> {
    if (progress < 0 || progress > 1) {
      return Promise.reject(new ValidationError(`Invalid Progress: ${progress}`));
    }
    readDate ??= new Date();

    await this.con.query(
      sql`
      INSERT INTO user_episode (user_uuid, episode_id, progress, read_date)
        SELECT ${uuid},id,${progress},${sql.timestamp(readDate)}
        FROM ${sql.unnest([episodeId], ["int8"])} as insert_data(id)
      ON CONFLICT DO UPDATE SET progress=EXCLUDED.progress, read_date=EXCLUDED.read_date;`,
    );
    // FIXME: multiSingle(results, (value) => storeModifications("progress", "update", value));
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
    // FIXME: storeModifications("progress", "delete", result);
    return result.rowCount > 0;
  }

  /**
   * Get the progress of an user in regard to an episode.
   * Defaults to zero if no entry is found.
   */
  public async getProgress(uuid: Uuid, episodeId: number): Promise<number> {
    const result = await this.con.maybeOneFirst<{ progress: number }>(
      sql`SELECT progress FROM user_episode WHERE user_uuid = ${uuid} AND episode_id = ${episodeId}`,
    );
    return result ?? 0;
  }

  /**
   * Updates the progress of an user in regard to an episode.
   */
  public updateProgress(uuid: Uuid, episodeId: number, progress: number, readDate: Nullable<Date>): Promise<boolean> {
    // TODO for now its the same as calling addProgress, but somehow do it better maybe?
    return this.addProgress(uuid, [episodeId], progress, readDate);
  }

  public async getEpisodeContentData(chapterLink: string): Promise<EpisodeContentData> {
    const result = await this.con.maybeOne(
      sql.type(episodeContentData)`
      SELECT
      episode_release.title as episode_title, episode.combi_index as index, medium.title as medium_title
      FROM episode_release 
      INNER JOIN episode ON episode.id=episode_release.episode_id 
      INNER JOIN part ON part.id=episode.part_id 
      INNER JOIN medium ON medium.id=part.medium_id 
      WHERE episode_release.url=${chapterLink}`,
    );

    return (
      result ?? {
        episodeTitle: "",
        index: 0,
        mediumTitle: "",
      }
    );
  }

  /**
   * Adds a episode of a part to the storage.
   */
  public async addEpisode(episodes: Array<Insert<SimpleEpisodeReleases>>): Promise<readonly SimpleEpisodeReleases[]> {
    // FIXME: storeModifications("episode", "insert", result);
    const values = episodes.map((value) => [value.partId, value.combiIndex, value.totalIndex, value.partialIndex]);

    const insertedEpisodes = await this.con.any(
      sql.type(simpleEpisode)`INSERT INTO episode
      (part_id, combi_index, total_index, partial_index)
      SELECT * FROM ${sql.unnest(values, ["int8", "float8", "int8", "int8"])}
      RETURNING id, part_id, combi_index, total_index, partial_index;`,
    );

    if (insertedEpisodes.length !== episodes.length) {
      throw new DatabaseError(
        `returned rows length does not match inserted rows length: ${insertedEpisodes.length} != ${episodes.length}`,
      );
    }

    const insertReleases: Array<Insert<SimpleRelease>> = [];

    // assume that the order of returned rows is the same as the order of inserted episodes
    for (let index = 0; index < episodes.length; index++) {
      const episode = episodes[index];
      const insertedEpisode = insertedEpisodes[index];

      if (
        episode.partId !== insertedEpisode.partId ||
        episode.totalIndex !== insertedEpisode.totalIndex ||
        // eslint-disable-next-line eqeqeq
        episode.partialIndex != insertedEpisode.partialIndex
      ) {
        throw new DatabaseError("returned rows order does not match inserted rows order!");
      }

      for (const release of episode.releases) {
        release.episodeId = insertedEpisode.id;
      }

      insertReleases.push(...episode.releases);
    }

    const insertedReleases = await this.getContext(EpisodeReleaseContext).addReleases(insertReleases);
    const idReleaseMap = new Map<number, SimpleRelease[]>();

    for (const release of insertedReleases) {
      getElseSet(idReleaseMap, release.episodeId, () => []).push(release);
    }

    return insertedEpisodes.map((episode) => {
      return {
        ...episode,
        releases: idReleaseMap.get(episode.id) ?? [],
      };
    });
  }

  /**
   * Gets an episode from the storage.
   */
  public async getEpisode(id: number[], uuid: Uuid): Promise<Episode[]> {
    const episodes = await this.con.any(
      sql.type(pureEpisode)`
      SELECT e.id, e.part_id, e.combi_index, e.total_index, e.partial_index,
      coalesce(ue.progress, 0), ue.read_date
      FROM episode e
      LEFT JOIN user_episode ue ON episode.id=ue.episode_id
      WHERE (user_uuid IS NULL OR user_uuid=${uuid}) AND episode.id = ANY(${sql.array(id, "int8")});`,
    );
    if (!episodes.length) {
      return [];
    }
    const idMap = new Map<number, SimpleRelease[]>();
    const releases = await this.getContext(EpisodeReleaseContext).getReleases(
      episodes.map((value): number => value.id),
    );

    releases.forEach((value) => {
      getElseSet(idMap, value.episodeId, () => []).push(value);
    });
    return episodes.map((episode) => {
      return {
        progress: episode.progress != null ? episode.progress : 0,
        readDate: episode.progress != null ? episode.readDate : null,
        id: episode.id,
        partialIndex: episode.partialIndex,
        partId: episode.partId,
        totalIndex: episode.totalIndex,
        combiIndex: episode.combiIndex,
        releases: idMap.get(episode.id) ?? [],
      };
    });
  }

  public async getPartMinimalEpisodes(partId: number): Promise<ReadonlyArray<{ id: number; combiIndex: number }>> {
    return this.con.any<{ id: number; combiIndex: number }>(
      sql`SELECT id, combi_index FROM episode WHERE part_id=${partId}`,
    );
  }

  /**
   * Get an episode for each index requested.
   * If an episode is not found for the given index and part_id,
   * a dummy episode is returned, with id and part_id set to zero
   * and empty release array.
   *
   * @param partId limit episodes to part_id
   * @param indices filters episode by combi_index
   * @returns an episode for each index
   */
  public async getPartEpisodePerIndex(partId: number, indices: number[]): Promise<readonly SimpleEpisodeReleases[]> {
    const episodes = await this.con.any(
      sql.type(simpleEpisode)`
      SELECT e.id, e.part_id, e.combi_index, e.total_index, e.partial_index
      FROM episode WHERE part_id = ${partId} AND combi_index = ANY(${sql.array(indices, "int8")});`,
    );

    if (!episodes.length) {
      return [];
    }
    return this.toSimpleEpisodeReleases(episodes, indices);
  }

  public async getMediumEpisodes(mediumId: number): Promise<readonly SimpleEpisode[]> {
    return this.con.any(
      sql.type(simpleEpisode)`
      SELECT
      episode.id,
      episode.part_id,
      episode.combi_index,
      episode.total_index,
      episode.partial_index
      FROM episode
      INNER JOIN part ON part.id=episode.part_id
      WHERE medium_id = ${mediumId};
      `,
    );
  }

  public async getMediumEpisodePerIndex(
    mediumId: number,
    indices: number[],
    ignoreRelease = false,
  ): Promise<readonly SimpleEpisodeReleases[]> {
    const episodes = await this.con.any(
      sql.type(simpleEpisode)`SELECT 
      episode.id,
      episode.part_id,
      episode.combi_index,
      episode.total_index,
      episode.partial_index
      FROM episode 
      INNER JOIN part ON part.id=episode.part_id
      WHERE medium_id = ${mediumId} AND episode.combiIndex = ANY(${sql.array(indices, "int8")});`,
      [mediumId, indices],
    );
    if (!episodes.length) {
      return [];
    }
    if (ignoreRelease) {
      return episodes as SimpleEpisodeReleases[];
    }
    return this.toSimpleEpisodeReleases(episodes, indices);
  }

  private async toSimpleEpisodeReleases(
    episodes: readonly SimpleEpisode[],
    requestedIndices: number[],
  ): Promise<readonly SimpleEpisodeReleases[]> {
    const availableIndices = new Set<number>();

    const episodeIds = episodes.map((value: any) => {
      availableIndices.add(value.combiindex);
      return value.id;
    });

    const releases = await this.getContext(EpisodeReleaseContext).getReleases(episodeIds);

    const idMap = new Map<number, SimpleRelease[]>();
    releases.forEach((value) => getElseSet(idMap, value.episodeId, () => []).push(value));

    const result = episodes.map((episode): SimpleEpisodeReleases => {
      const value = episode as SimpleEpisodeReleases;
      value.releases = idMap.get(episode.id) ?? [];
      return value;
    });

    requestedIndices.forEach((index: number) => {
      if (!availableIndices.has(index)) {
        const separateValue = separateIndex(index);
        checkIndices(separateValue);
        result.push({
          combiIndex: index,
          id: 0,
          partId: 0,
          releases: [],
          totalIndex: separateValue.totalIndex,
          partialIndex: separateValue.partialIndex,
        });
      }
    });
    return result;
  }

  /**
   * Updates an episode from the storage.
   */
  public async updateEpisode(episode: SimpleEpisode): Promise<boolean> {
    const result = await this.update(
      "episode",
      () => {
        const updates = [];
        if (episode.partId) {
          updates.push(sql`part_id = ${episode.partId}`);
        }

        if (episode.partialIndex != null) {
          updates.push(sql`partial_index = ${episode.partialIndex}`);
        }

        if (episode.totalIndex != null) {
          updates.push(sql`total_index = ${episode.totalIndex}`);
        }
        if (episode.totalIndex || episode.partialIndex) {
          updates.push(sql`combi_index = ${episode.combiIndex == null ? combiIndex(episode) : episode.combiIndex}`);
        }
        return updates;
      },
      {
        column: "id",
        value: episode.id,
      },
    );
    // FIXME: storeModifications("episode", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Updates an episode from the storage.
   */
  public async moveEpisodeToPart(oldPartId: number, newPartId: number): Promise<boolean> {
    if (!oldPartId || !newPartId) {
      return false;
    }
    const replaceIds = await this.con.any<{
      oldId: number;
      newId: number;
    }>(
      sql`
      SELECT oldEpisode.id as old_id, newEpisode.id as new_id
      FROM
      (
        Select id, combi_index from episode where part_id=${oldPartId}
      ) as oldEpisode
      inner join (
        Select id, combi_index from episode where part_id=${newPartId}
      ) as newEpisode
      ON oldEpisode.combi_index=newEpisode.combi_index`,
    );

    const changePartIds = await this.con.manyFirst(
      sql.type(entity)`
      SELECT id FROM episode
      WHERE combi_index IN (SELECT combi_index FROM episode WHERE part_id = ${newPartId})
      AND part_id = ${oldPartId};`,
    );

    await this.con.query(
      sql`UPDATE episode SET part_id=${newPartId} 
      WHERE part_id=${oldPartId} AND combi_index = ANY(${sql.array(changePartIds, "int8")});`,
    );
    // FIXME: multiSingle(result, (value) => storeModifications("release", "update", value));

    if (!replaceIds.length) {
      return true;
    }
    const deleteReleaseIds: number[] = [];

    await Promise.all(
      replaceIds.map((replaceId) => {
        // FIXME: .then((value) => storeModifications("release", "update", value))
        return this.con
          .query(sql`UPDATE episode_release set episode_id=${replaceId.newId} where episode_id=${replaceId.oldId}`)
          .catch((reason) => {
            if (isDuplicateError(reason)) {
              deleteReleaseIds.push(replaceId.oldId);
            } else {
              throw reason;
            }
          });
      }),
    );
    const deleteProgressIds: number[] = [];

    await Promise.all(
      replaceIds.map((replaceId) => {
        // FIXME: .then((value) => storeModifications("progress", "update", value))
        return this.con
          .query(sql`UPDATE user_episode set episode_id=${replaceId.newId} where episode_id=${replaceId.oldId}`)
          .catch((reason) => {
            if (isDuplicateError(reason)) {
              deleteProgressIds.push(replaceId.oldId);
            } else {
              throw reason;
            }
          });
      }),
    );
    const oldIds = replaceIds.map((value) => value.oldId);
    // TODO: 26.08.2019 this does not go quite well, throws error with 'cannot delete parent reference'
    await this.con.query(
      sql`DELETE FROM episode_release WHERE episode_id = ANY(${sql.array(deleteReleaseIds, "int8")});`,
    );
    // FIXME: multiSingle(result, (value) => storeModifications("release", "delete", value));

    await this.con.query(
      sql`DELETE FROM user_episode WHERE episode_id = ANY(${sql.array(deleteProgressIds, "int8")});`,
    );
    // FIXME: multiSingle(result, (value) => storeModifications("progress", "delete", value));

    await this.con.query(
      sql`DELETE FROM episode WHERE part_id=${oldPartId} AND id = ANY(${sql.array(oldIds, "int8")});`,
    );
    // FIXME: multiSingle(result, (value) => storeModifications("episode", "delete", value));
    return true;
  }

  /**
   * Deletes an episode from the storage irreversibly.
   */
  public async deleteEpisode(id: number): Promise<boolean> {
    // remove episode from progress first
    await this.delete("user_episode", { column: "episode_id", value: id });
    // FIXME: storeModifications("progress", "delete", result);

    await this.delete("episode_release", { column: "episode_id", value: id });
    // FIXME: storeModifications("release", "delete", result);

    // lastly remove episode itself
    await this.delete("episode", { column: "id", value: id });
    // FIXME: storeModifications("episode", "delete", result);
    return true;
  }

  public async getChapterIndices(mediumId: number): Promise<readonly number[]> {
    return this.con.manyFirst<{ combiIndex: number }>(
      sql`SELECT episode.combi_index FROM episode INNER JOIN part ON episode.part_id=part.id WHERE medium_id=${mediumId}`,
    );
  }

  public async getAllChapterLinks(mediumId: number): Promise<readonly string[]> {
    return this.con.manyFirst<{ url: string }>(
      sql`SELECT url FROM episode
        INNER JOIN episode_release ON episode.id=episode_release.episode_id
        INNER JOIN part ON episode.part_id=part.id WHERE medium_id=${mediumId}`,
    );
  }

  public async getUnreadChapter(uuid: Uuid): Promise<readonly number[]> {
    return this.con.manyFirst(
      sql.type(entity)`
      SELECT id FROM episode WHERE id NOT IN
      (
        SELECT episode_id FROM user_episode WHERE progress >= 1 AND user_uuid=${uuid}
      );`,
    );
  }

  public async getReadToday(uuid: Uuid): Promise<readonly SimpleReadEpisode[]> {
    return this.con.any(
      sql`SELECT episode_id, read_date, progress
      FROM user_episode WHERE read_date > (NOW() - INTERVAL 1 DAY) AND user_uuid=${uuid};`,
    );
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
    await this.con.query(
      sql`UPDATE user_episode, episode, part
        SET user_episode.progress=1, user_episode.read_date=NOW()
        WHERE user_episode.progress != 1
        AND user_episode.user_uuid = ${uuid}
        AND user_episode.episode_id=episode.id
        AND episode.part_id=part.id
        AND part.medium_id=${mediumId}
        ${partIndex ? sql`AND part.combi_index < ${partIndex}` : sql``}
        ${episodeIndex ? sql`AND episode.combi_index < ${episodeIndex}` : sql``}`,
    );
    // FIXME: storeModifications("progress", "update", result);

    // then insert non-existing user-episode-progress as read
    // TODO: cant both queries be collapsed in the one below? update happens on conflict
    await this.con.query(
      sql`INSERT INTO user_episode (user_uuid, episode_id, progress, read_date)
        SELECT ${uuid}, episode.id, 1, NOW() FROM episode, part
        WHERE episode.part_id=part.id
        AND part.medium_id=${mediumId}
        ${partIndex ? sql`AND part.combi_index < ${partIndex}` : sql``}
        ${episodeIndex ? sql`AND episode.combi_index < ${episodeIndex}` : sql``}
        ON CONFLICT DO NOTHING`,
    );
    // FIXME: storeModifications("progress", "insert", result);
  }
}
