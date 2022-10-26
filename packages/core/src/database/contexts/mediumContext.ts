import {
  LikeMedium,
  LikeMediumQuery,
  Synonyms,
  Uuid,
  PromiseMultiSingle,
  MultiSingleValue,
  MultiSingleNumber,
  TypedQuery,
  Id,
  Insert,
  TocSearchMedium,
  Medium,
  SecondaryMedium,
  UpdateMedium,
} from "../../types";
import { count, getElseSet, multiSingle, promiseMultiSingle } from "../../tools";
import { escapeLike } from "../storages/storageTools";
import { DatabaseError, MissingEntityError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { entity, mediumSynonym, simpleMedium, SimpleMedium, softInsertEntity } from "../databaseTypes";
import { sql } from "slonik";
import { PartContext } from "./partContext";
import { JobContext } from "./jobContext";
import { EpisodeReleaseContext } from "./episodeReleaseContext";
import { MediumTocContext } from "./mediumTocContext";
import { EpisodeContext } from "./episodeContext";
import { InternalListContext } from "./internalListContext";

export class MediumContext extends QueryContext {
  /**
   * Adds a medium to the storage.
   */
  public async addMedium(medium: Insert<SimpleMedium>, uuid?: Uuid): Promise<SimpleMedium> {
    simpleMedium.parse(medium);

    if (!medium?.medium || !medium?.title) {
      return Promise.reject(new ValidationError(`Invalid Medium: ${medium?.title}-${medium?.medium}`));
    }
    const id = await this.con.oneFirst(
      sql.type(entity)`
      INSERT INTO medium(medium, title)
      VALUES (${medium.medium},${medium.title})
      RETURNING id;`,
    );
    // FIXME: storeModifications("medium", "insert", result);

    await this.getContext(PartContext).createStandardPart(id);

    const newMedium = {
      ...medium,
      id,
    };

    // if it should be added to an list, do it right away
    if (uuid) {
      // add item to listId of medium or the standard list
      await this.getContext(InternalListContext).addItemsToList([newMedium.id], uuid);
    }
    return newMedium;
  }

  public async getSimpleMedium(ids: number[]): Promise<readonly SimpleMedium[]> {
    const resultArray = await this.con.any(
      sql.type(simpleMedium)`
      SELECT id, country_of_origin, language_of_origin,
      author, title, medium, artist, lang, state_origin,
      state_tl, series, universe
      FROM medium
      WHERE id = ANY(${sql.array(ids, "int8")});`,
    );
    const requestedIds = new Set(ids);
    const missingIds = resultArray.filter((medium) => !requestedIds.has(medium.id)).map((medium) => medium.id);

    if (missingIds.length) {
      throw new MissingEntityError(`Media with ids ${JSON.stringify(missingIds)} do not exist`);
    }
    return resultArray;
  }

  public async getTocSearchMedia(): Promise<TocSearchMedium[]> {
    const result = await this.con.any<{ host: string | null; mediumId: number; title: string; medium: number }>(
      // eslint-disable-next-line @typescript-eslint/quotes
      sql`SELECT substring(episode_release.url, 1, 8 + strpos(substring(url from 9), '/')) as host,
        medium.id as medium_id, medium.title, medium.medium
        FROM medium
        LEFT JOIN part ON part.medium_id=medium.id
        LEFT JOIN episode ON part_id=part.id
        LEFT JOIN episode_release ON episode_release.episode_id=episode.id
        GROUP BY medium_id, host;`,
    );
    const idMap = new Map<number, TocSearchMedium>();
    const tocSearchMedia = result
      .map((value) => {
        const medium = idMap.get(value.mediumId);
        if (medium) {
          if (medium.hosts && value.host) {
            medium.hosts.push(value.host);
          }
          return false;
        }
        const searchMedium: TocSearchMedium = {
          mediumId: value.mediumId,
          hosts: [],
          synonyms: [],
          medium: value.medium,
          title: value.title,
        };
        if (value.host && searchMedium.hosts) {
          searchMedium.hosts.push(value.host);
        }
        idMap.set(value.mediumId, searchMedium);
        return searchMedium;
      })
      .filter((value): value is TocSearchMedium => !!value);
    const synonyms = await this.getSynonyms(tocSearchMedia.map((value) => value.mediumId));

    synonyms.forEach((value) => {
      const medium = idMap.get(value.mediumId);
      if (!medium) {
        throw new MissingEntityError("missing medium for queried synonyms");
      }

      if (!medium.synonyms) {
        medium.synonyms = [];
      }
      if (Array.isArray(value.synonym)) {
        medium.synonyms.push(...value.synonym);
      } else {
        medium.synonyms.push(value.synonym);
      }
    });
    return tocSearchMedia;
  }

  public async getTocSearchMedium(id: number): Promise<TocSearchMedium> {
    const result = await this.con.one(
      sql.type(simpleMedium)`
      SELECT id, country_of_origin, language_of_origin,
      author, title, medium, artist, lang, state_origin,
      state_tl, series, universe
      FROM medium
      WHERE medium.id =${id};`,
    );
    const synonyms: Synonyms[] = await this.getSynonyms([id]);

    return {
      mediumId: result.id,
      medium: result.medium,
      title: result.title,
      synonyms: synonyms[0]?.synonym || [],
    };
  }

  /**
   * Gets one or multiple media from the storage.
   */
  public getMedium<T extends MultiSingleNumber>(id: T, uuid: Uuid): PromiseMultiSingle<T, Medium> {
    // TODO: 29.06.2019 replace with id IN (...)
    return promiseMultiSingle(id, async (mediumId: number): Promise<Medium> => {
      const result = await this.con.one(
        sql.type(simpleMedium)`
        SELECT id, country_of_origin, language_of_origin,
        author, title, medium, artist, lang, state_origin,
        state_tl, series, universe
        FROM medium
        WHERE medium.id=${mediumId}`,
      );

      const latestReleasesResult = await this.getContext(EpisodeContext).getLatestReleases(mediumId);

      const currentReadResult = await this.con.maybeOneFirst(
        sql.type(entity)`
        SELECT user_episode.episode_id as id
        FROM (
          SELECT episode_id FROM user_episode
          WHERE episode_id IN (
            SELECT id from episode
            WHERE part_id IN (
              SELECT id FROM part
              WHERE medium_id=${mediumId}
            )
          )
          AND user_uuid=${uuid}
        ) as user_episode
        INNER JOIN episode ON user_episode.episode_id=episode.id
        ORDER BY total_index DESC, partial_index DESC LIMIT 1`,
      );
      const unReadResult = await this.con.anyFirst(
        sql.type(entity)`
        SELECT episode.id as id
        FROM episode
        WHERE part_id IN (
          SELECT id FROM part WHERE medium_id=${mediumId}
        )
        AND id NOT IN (
          SELECT episode_id FROM user_episode WHERE user_uuid=${uuid}
        )
        ORDER BY total_index DESC, partial_index DESC;`,
      );
      const partsResult = await this.con.anyFirst(sql.type(entity)`SELECT id FROM part WHERE medium_id=${mediumId};`);

      return {
        ...result,
        parts: partsResult,
        currentRead: currentReadResult,
        latestReleased: latestReleasesResult.map((packet) => packet.id),
        unreadEpisodes: unReadResult,
      };
    });
  }

  public async getAllMediaFull(): Promise<TypedQuery<SimpleMedium>> {
    return this.stream(
      sql.type(simpleMedium)`SELECT 
      id, country_of_origin, language_of_origin,
      author, title, medium, artist, lang, 
      state_origin, state_tl, series, universe
      FROM medium`,
    );
  }

  public async getAllSecondary(uuid: Uuid): Promise<SecondaryMedium[]> {
    const readStatsPromise = this.con.any<{ id: number; totalEpisode: number; readEpisodes: number }>(
      sql`
      SELECT part.medium_id as id, COUNT(*) as total_episodes ,
      COUNT(case when episode.id in (
        select episode_id from user_episode where user_uuid = ${uuid} and progress = 1
      ) then 1 else null end) as read_episodes
      FROM part
      INNER JOIN episode ON part.id=episode.part_id
      GROUP BY part.medium_id;`,
    );
    const tocs = await this.getContext(MediumTocContext).getTocs();
    const readStats = await readStatsPromise;
    const idMap = new Map<number, SecondaryMedium>();

    for (const value of readStats) {
      const secondary: SecondaryMedium = {
        id: value.id,
        readEpisodes: value.readEpisodes,
        tocs: [],
        totalEpisodes: value.totalEpisode,
      };
      idMap.set(value.id, secondary);
    }

    for (const toc of tocs) {
      const secondary = getElseSet(idMap, toc.mediumId, () => ({
        id: toc.mediumId,
        readEpisodes: 0,
        totalEpisodes: 0,
        tocs: [],
      }));
      secondary.tocs.push(toc);
    }

    return [...idMap.values()];
  }

  public async getAllMedia(): Promise<readonly number[]> {
    return this.con.anyFirst(sql.type(entity)`SELECT id FROM medium`);
  }

  /**
   * Gets one or multiple media from the storage.
   */
  public getLikeMedium<T extends MultiSingleValue<LikeMediumQuery>>(likeMedia: T): PromiseMultiSingle<T, LikeMedium> {
    return promiseMultiSingle(likeMedia, async (value): Promise<LikeMedium> => {
      const escapedLinkQuery = escapeLike(value.link || "", { noRightBoundary: true });
      const escapedTitle = escapeLike(value.title, { singleQuotes: true });

      const result = await this.con.any(
        sql`
        SELECT id, medium
        FROM medium
        WHERE title LIKE ${escapedTitle} OR id IN (
          SELECT medium_id
          FROM medium_toc
          WHERE link LIKE ${escapedLinkQuery}
        )${value.type != null ? sql`medium = ${value.type}` : sql``}
        LIMIT 1;`,
      );

      return {
        medium: result[0] as unknown as LikeMedium["medium"],
        title: value.title,
        link: value.link ?? "",
      };
    });
  }

  /**
   * Updates a medium from the storage.
   */
  public async updateMedium(medium: UpdateMedium): Promise<boolean> {
    // define updatable keys
    const keys: Array<keyof UpdateMedium> = [
      "countryOfOrigin",
      "languageOfOrigin",
      "author",
      "title",
      "medium",
      "artist",
      "lang",
      "stateOrigin",
      "stateTl",
      "series",
      "universe",
    ];
    // prevent anybody from removing most important data from media
    if (medium.title != null && !medium.title) {
      delete medium.title;
    }
    if (medium.medium != null && !medium.medium) {
      delete medium.medium;
    }
    if (!Number.isInteger(medium.id) || medium.id <= 0) {
      throw new ValidationError("invalid medium, id, title or medium is invalid: " + JSON.stringify(medium));
    }
    const result = await this.update(
      "medium",
      () => {
        const updates = [];
        for (const key of keys) {
          const value = medium[key];

          if (value === null) {
            updates.push(sql`${sql.identifier([key])} = NULL`);
          } else if (value != null) {
            updates.push(sql`${sql.identifier([key])} = ${value}`);
          }
        }
        return updates;
      },
      { column: "id", value: medium.id },
    );
    // FIXME: storeModifications("medium", "update", result);
    return result.rowCount > 0;
  }

  public async getSynonyms(mediumId: number[]): Promise<Synonyms[]> {
    const synonyms = await this.con.any(
      sql.type(mediumSynonym)`
      SELECT medium_id, synonym
      FROM medium_synonyms
      WHERE medium_id = ANY(${sql.array(mediumId, "int8")});`,
    );
    if (!synonyms) {
      return [];
    }
    const synonymMap = new Map<number, { mediumId: number; synonym: string[] }>();
    synonyms.forEach((value: any) => {
      const synonym = getElseSet(synonymMap, value.medium_id, () => ({ mediumId: value.medium_id, synonym: [] }));
      synonym.synonym.push(value.synonym);
    });
    return [...synonymMap.values()];
  }

  public async removeSynonyms(synonyms: Synonyms | Synonyms[]): Promise<boolean> {
    await promiseMultiSingle(synonyms, (value: Synonyms) => {
      return promiseMultiSingle(value.synonym, async (item) => {
        const result = await this.delete(
          "medium_synonyms",
          {
            column: "synonym",
            value: item,
          },
          {
            column: "medium_id",
            value: value.mediumId,
          },
        );
        // FIXME: storeModifications("synonym", "delete", result);
        return result.rowCount > 0;
      });
    });
    return true;
  }

  public async addSynonyms<T extends MultiSingleValue<Synonyms>>(synonyms: T): Promise<boolean> {
    const params: Array<[number, string]> = [];
    multiSingle(synonyms, (value) => {
      multiSingle(value.synonym, (item: string) => {
        params.push([value.mediumId, item]);
      });
    });
    await this.con.query(
      sql`INSERT INTO medium_synonyms (medium_id, synonym)
      SELECT * FROM ${sql.unnest(params, ["int8", "text"])}
      ON CONFLICT DO NOTHING;`,
    );
    // FIXME: multiSingle(result, (value) => storeModifications("synonym", "insert", value));
    return true;
  }

  public async mergeMedia(sourceMediumId: number, destMediumId: number): Promise<boolean> {
    // transfer all tocs from source to dest and with it all associated episodes
    // add source title as synonym for dest
    // remove any jobs related to source
    // replace or ignore source id with dest id in:
    //  list_medium, external_list_medium, medium_synonyms, news_medium
    // the parts will be dropped for source id, the next job for dest should correct that again if possible
    // the tocs will be transferred and do not need to be moved manually here
    // transferring the tocs should remove any related jobs,
    // and toc jobs should be the only jobs related directly to an medium
    const sourceTocs = await this.getContext(MediumTocContext).getTocLinkByMediumId(sourceMediumId);
    const destTocs = await this.getContext(MediumTocContext).getTocLinkByMediumId(destMediumId);

    // transfer unknown tocs and all related episodes
    await Promise.all(
      sourceTocs
        .filter((toc) => !destTocs.includes(toc))
        .map((tocLink) => this.transferToc(sourceMediumId, destMediumId, tocLink)),
    );

    // remove all tocs of source
    await this.delete("medium_toc", { column: "medium_id", value: sourceMediumId });
    // FIXME: storeModifications("toc", "delete", result);

    await this.con.query(sql`UPDATE list_medium SET medium_id=${destMediumId} WHERE medium_id=${sourceMediumId}`);
    // FIXME: storeModifications("list_item", "update", result);

    await this.delete("list_medium", { column: "medium_id", value: sourceMediumId });
    // FIXME: storeModifications("list_item", "delete", result);

    await this.con.query(
      sql`UPDATE external_list_medium SET medium_id=${destMediumId} WHERE medium_id=${sourceMediumId}`,
    );
    // FIXME: storeModifications("external_list_item", "update", result);

    await this.delete("external_list_medium", { column: "medium_id", value: sourceMediumId });
    // FIXME: storeModifications("external_list_item", "delete", result);

    await this.con.query(sql`UPDATE medium_synonyms SET medium_id=${destMediumId} WHERE medium_id=${sourceMediumId}`);
    // FIXME: storeModifications("synonym", "update", result);

    await this.delete("medium_synonyms", { column: "medium_id", value: sourceMediumId });
    // FIXME: storeModifications("synonym", "delete", result);

    await this.con.query(sql`UPDATE news_medium SET medium_id=${destMediumId} WHERE medium_id=${sourceMediumId}`);

    await this.delete("news_medium", { column: "medium_id", value: sourceMediumId });
    await this.con.query(
      sql`DELETE er FROM episode_release as er, episode as e, part as p
      WHERE er.episode_id = e.id
      AND e.part_id = p.id
      AND p.medium_id = ${sourceMediumId}`,
    );
    // FIXME: storeModifications("release", "delete", deletedReleaseResult);

    await this.con.query(
      sql`DELETE ue FROM user_episode as ue, episode as e, part as p
        WHERE ue.episode_id = e.id
        AND e.part_id = p.id
        AND p.medium_id = ${sourceMediumId}`,
    );
    // FIXME: storeModifications("progress", "delete", deletedProgressResult);

    await this.con.query(
      sql`DELETE e FROM episode as e, part as p WHERE e.part_id = p.id AND p.medium_id = ${sourceMediumId}`,
    );
    // FIXME: storeModifications("episode", "delete", deletedEpisodesResult);

    await this.con.query(sql`DELETE FROM part WHERE medium_id = ${sourceMediumId}`);
    // FIXME: storeModifications("part", "delete", deletedPartResult);

    await this.con.query(sql`DELETE FROM medium WHERE medium_id = ${sourceMediumId}`);
    // FIXME: storeModifications("medium", "delete", deletedMediumResult);

    return true;
  }

  public async splitMedium(sourceMediumId: number, destMedium: SimpleMedium, toc: string): Promise<Id> {
    if (!destMedium?.medium || !destMedium.title) {
      return Promise.reject(
        new ValidationError(`Invalid destination Medium: ${destMedium?.title}-${destMedium?.medium}`),
      );
    }
    const id = await this.con.oneFirst(
      sql.type(softInsertEntity)`
      INSERT INTO medium(medium, title)
      VALUES (${destMedium.medium},${destMedium.title})
      ON CONFLICT DO NOTHING
      RETURNING id;`,
    );

    // FIXME: storeModifications("medium", "insert", result);
    let mediumId: number;
    // medium exists already if insertId == 0
    if (id === 0) {
      mediumId = await this.con.oneFirst(
        sql.type(entity)`SELECT id FROM medium WHERE (medium, title) = (${destMedium.medium},${destMedium.title});`,
      );
    } else {
      await this.getContext(PartContext).createStandardPart(id);
      mediumId = id;
    }
    const success = await this.transferToc(sourceMediumId, mediumId, toc);
    return success ? mediumId : 0;
  }

  public async transferToc(sourceMediumId: number, destMediumId: number, toc: string): Promise<boolean> {
    const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(toc);

    if (!domainRegMatch) {
      throw new ValidationError("Invalid TocLink, Unable to extract Domain: " + toc);
    }

    const domain = domainRegMatch[1];

    await this.getContext(JobContext).removeJobLike("name", `toc-${sourceMediumId}-${toc}`);
    const standardPartId = await this.getContext(PartContext).getStandardPartId(destMediumId);

    if (!standardPartId) {
      throw new DatabaseError("medium does not have a standard part");
    }

    await this.con.query(
      sql`UPDATE medium_toc SET medium_id = ${destMediumId} WHERE (medium_id, link) = (${sourceMediumId},${toc});`,
    );
    // FIXME: storeModifications("toc", "update", updatedTocResult);

    const releases = await this.getContext(EpisodeReleaseContext).getEpisodeLinksByMedium(sourceMediumId);
    const episodeMap: Map<number, string[]> = new Map();
    const valueCb = () => [];

    for (const release of releases) {
      getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
    }
    const copyEpisodes: number[] = [];
    const removeEpisodesAfter: number[] = [];

    for (const [episodeId, links] of episodeMap.entries()) {
      const toMoveCount = count(links, (value) => value.includes(domain));

      if (toMoveCount) {
        copyEpisodes.push(episodeId);

        if (links.length === toMoveCount) {
          removeEpisodesAfter.push(episodeId);
        }
      }
    }
    // add the episodes of the releases
    await this.con.query(
      sql`INSERT INTO episode
        (part_id, total_index, partial_index, combi_index, updated_at)
        SELECT ${standardPartId}, episode.total_index, episode.partial_index, episode.combi_index, episode.updated_at
        FROM episode INNER JOIN part ON part.id=episode.part_id
        WHERE part.medium_id = ${sourceMediumId} AND episode.id = ANY(${sql.array(copyEpisodes, "int8")})
        ON CONFLICT DO NOTHING;`,
    );
    // FIXME: multiSingle(copyEpisodesResult, (value) => storeModifications("episode", "insert", value));

    await this.con.query(
      sql`UPDATE episode_release, episode as src_e, episode as dest_e, part
        SET episode_release.episode_id = dest_e.id
        WHERE episode_release.episode_id = src_e.id
        AND src_e.part_id = part.id
        AND part.medium_id = ${sourceMediumId}
        AND dest_e.part_id = ${standardPartId}
        AND src_e.combiIndex = dest_e.combiIndex
        AND strpos(episode_release.url, ${domain}) > 0;`,
    );
    // FIXME: storeModifications("release", "update", updatedReleaseResult);

    await this.con.query(
      sql`UPDATE user_episode, episode as src_e, episode as dest_e, part
        SET user_episode.episode_id = dest_e.id
        WHERE user_episode.episode_id = src_e.id
        AND src_e.part_id = part.id
        AND part.medium_id = ${sourceMediumId}
        AND dest_e.part_id = ${standardPartId}
        AND src_e.combiIndex = dest_e.combiIndex
        AND src_e.id = ANY(${sql.array(removeEpisodesAfter, "int8")});`,
    );
    // FIXME: multiSingle(updatedProgressResult, (value) => storeModifications("progress", "update", value));

    await this.con.query(
      sql`DELETE FROM episode_release WHERE episode_id = ANY(${sql.array(removeEpisodesAfter, "int8")});`,
    );
    // FIXME: multiSingle(deletedReleasesResult, (value) => storeModifications("release", "delete", value));

    await this.con.query(
      sql`DELETE FROM user_episode WHERE episode_id = ANY(${sql.array(removeEpisodesAfter, "int8")});`,
    );
    // FIXME: multiSingle(deletedUserEpisodesResult, (value) => storeModifications("progress", "delete", value));

    await this.con.query(sql`DELETE FROM episode WHERE id = ANY(${sql.array(removeEpisodesAfter, "int8")});`, [
      removeEpisodesAfter,
    ]);
    // FIXME: multiSingle(deletedEpisodesResult, (value) => storeModifications("episode", "delete", value));

    const copiedOnlyEpisodes: number[] = copyEpisodes.filter((value) => !removeEpisodesAfter.includes(value));
    await this.con.query(
      sql`INSERT INTO user_episode
        (user_uuid, episode_id, progress, read_date)
        SELECT user_episode.user_uuid, dest_e.id, user_episode.progress, user_episode.read_date
        FROM user_episode, episode as src_e, episode as dest_e, part
        WHERE user_episode.episode_id = src_e.id
        AND src_e.part_id = part.id
        AND part.medium_id = ${sourceMediumId}
        AND dest_e.part_id = ${standardPartId}
        AND src_e.combiIndex = dest_e.combiIndex
        AND src_e.id = ANY(${sql.array(copiedOnlyEpisodes, "int8")})
        ON CONFLICT DO NOTHING;`,
    );
    // FIXME: multiSingle(copiedProgressResult, (value) => storeModifications("progress", "insert", value));
    return true;
  }
}
