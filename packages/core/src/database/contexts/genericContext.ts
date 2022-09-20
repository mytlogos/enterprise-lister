import { getElseSetObj, getElseSet } from "../../tools";
import { PageInfo, EmptyPromise, Uuid, NewData, DataStats, QueryItems, QueryItemsResult } from "../../types";
import { NotImplementedError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import * as validate from "validate.js";
import { sql } from "slonik";
import {
  basicDisplayExternalUser,
  mediumInWait,
  pureEpisode,
  simpleExternalList,
  simpleMedium,
  simpleMediumToc,
  simplePart,
  simpleRelease,
  userList,
} from "../databaseTypes";
import { EpisodeReleaseContext } from "./episodeReleaseContext";
import { EpisodeContext } from "./episodeContext";
import { PartContext } from "./partContext";
import { InternalListContext } from "./internalListContext";
import { MediumContext } from "./mediumContext";
import { MediumTocContext } from "./mediumTocContext";
import { ExternalUserContext } from "./externalUserContext";
import { ExternalListContext } from "./externalListContext";

/**
 * Query Methods which do not pertain to a single particular entity.
 */
export class GenericContext extends QueryContext {
  public async getPageInfo(link: string, key: string): Promise<PageInfo> {
    if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
      throw new ValidationError("invalid link or key");
    }
    const query = await this.con.manyFirst<{ value: string }>(
      sql`SELECT value FROM page_info WHERE link=${link} AND key_string=${key}`,
    );
    return {
      link,
      key,
      values: query.filter((value) => value),
    };
  }

  public async updatePageInfo(link: string, key: string, values: string[], toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || !key || !validate.isString(key)) {
      throw new ValidationError("invalid link or key");
    }
    await this.removePageInfo(link, key, toDeleteValues);

    const insertValues = values.map((value) => [link, key, value]);
    await this.con.query(
      sql`
      INSERT INTO page_info (link, key_string, value)
      SELECT * FROM ${sql.unnest(insertValues, ["text", "text", "text"])}`,
    );
  }

  public async removePageInfo(link: string, key?: string, toDeleteValues?: string[]): EmptyPromise {
    if (!validate.isString(link) || !link || (key && !validate.isString(key))) {
      throw new ValidationError("invalid link or key");
    }
    if (key) {
      if (toDeleteValues) {
        await this.con.query(
          sql`
          DELETE FROM page_info
          WHERE link=${link} AND keyString=${key} AND value=ANY(${sql.array(toDeleteValues, "text")});`,
        );
      } else {
        await this.delete("page_info", { column: "link", value: link }, { column: "key_string", value: key });
      }
    } else {
      await this.delete("page_info", { column: "link", value: link });
    }
  }

  public async queueNewTocs(): EmptyPromise {
    throw new NotImplementedError("queueNewTocs not supported");
  }

  public async getNew(uuid: Uuid, date = new Date(0)): Promise<NewData> {
    const sqlTimestamp = sql.timestamp(date);

    const episodeReleasePromise = this.con.any(
      sql.type(simpleRelease)`
      SELECT id, episode_id, title, url, release_date, locked, toc_id, source_type
      FROM episode_release WHERE updated_at > ${sqlTimestamp};`,
    );
    const episodePromise = this.con.any(
      sql.type(pureEpisode)`
        SELECT episode.id, part_id, total_index, partial_index,
        user_episode.progress, user_episode.read_date
        FROM episode
        LEFT JOIN user_episode ON episode.id=user_episode.episode_id
        WHERE (user_episode.user_uuid IS NULL OR user_episode.user_uuid = ${uuid})
        AND (updated_at > ${sqlTimestamp} OR read_date > ${sqlTimestamp});`,
    );
    const partPromise = this.con.any(
      sql.type(simplePart)`
      SELECT id, title, medium_id, total_index, partial_index, combi_index
      FROM part WHERE updated_at > ${sqlTimestamp};`,
    );

    const mediumPromise = this.con.any(
      sql.type(simpleMedium)`SELECT 
        id, country_of_origin, language_of_origin, author, artist, title,
        medium, lang, state_origin, state_tl, series, universe
        FROM medium WHERE updated_at > ${sqlTimestamp}`,
    );
    const listPromise = this.con.any(
      sql.type(userList)`
      SELECT id, name, medium FROM reading_list WHERE user_uuid=${uuid} AND updated_at > ${sqlTimestamp};`,
    );
    const exListPromise = this.con.any(
      sql.type(simpleExternalList)`
      SELECT list.id, list.name, list.user_uuid, list.medium, list.url
      FROM external_user INNER JOIN external_reading_list as list ON uuid=user_uuid
      WHERE local_uuid=${uuid} AND list.updated_at > ${sqlTimestamp};`,
    );
    const exUserPromise = this.con.any(
      sql.type(basicDisplayExternalUser)`
      SELECT identifier, uuid, type, local_uuid
      FROM external_user WHERE local_uuid = ${uuid} AND updated_at > ${sqlTimestamp}`,
    );
    const mediumInWaitPromise = this.con.any(
      sql.type(mediumInWait)`SELECT title, medium, link FROM medium_in_wait WHERE updated_at > ${sqlTimestamp}`,
    );
    const newsPromise = this.con.any<any>(
      sql`SELECT id, title, link, date, CASE WHEN user_id IS NULL THEN false ELSE true END as read
        FROM news_board LEFT JOIN news_user ON id=news_id
        WHERE (user_id IS NULL OR user_id = ${uuid}) AND updated_at > ${sqlTimestamp}`,
    );
    const tocPromise = this.con.any(
      sql.type(simpleMediumToc)`
      SELECT id, medium_id, link, country_of_origin, language_of_origin, author, artist, title,
      medium, lang, state_origin, state_tl, series, universe
      FROM medium_toc WHERE updated_at > ${sqlTimestamp}`,
    );
    return {
      tocs: await tocPromise,
      media: await mediumPromise,
      releases: await episodeReleasePromise,
      episodes: await episodePromise,
      parts: await partPromise,
      lists: await listPromise,
      extLists: await exListPromise,
      extUser: await exUserPromise,
      mediaInWait: await mediumInWaitPromise,
      news: await newsPromise,
    };
  }

  public async getStat(uuid: Uuid): Promise<DataStats> {
    const episodePromise = this.con.query<{
      part_id: number;
      episodeCount: number;
      episodeSum: number;
      releaseCount: number;
    }>(
      sql`
      SELECT part_id, count(distinct episode.id) as episode_count, sum(distinct episode.id) as episode_sum, count(url) as release_count
      FROM episode LEFT JOIN episode_release ON episode.id=episode_release.episode_id
      GROUP BY part_id`,
    );
    const partPromise = this.con.query<{ id: number; medium_id: number }>(sql`SELECT part.id, medium_id FROM part;`);
    const listPromise = this.con.query<{ id: number; medium_id: number }>(
      sql`SELECT id, medium_id FROM reading_list LEFT JOIN list_medium ON reading_list.id=list_id WHERE user_uuid=${uuid}`,
    );
    const exListPromise = this.con.query<{ id: number; medium_id: number }>(
      sql`
      SELECT id, medium_id
      FROM external_user
      INNER JOIN external_reading_list ON uuid=user_uuid
      LEFT JOIN external_list_medium ON external_reading_list.id=list_id
      WHERE local_uuid=${uuid}`,
    );
    const extUserPromise = this.con.query<{ id: number; uuid: string }>(
      sql`SELECT uuid, id FROM external_user LEFT JOIN external_reading_list ON uuid=user_uuid WHERE local_uuid=${uuid}`,
    );
    const tocPromise = this.con.query<{ medium_id: number; count: number }>(
      sql`SELECT medium_id, count(link) as "count" FROM medium_toc GROUP BY medium_id;`,
    );

    const tocs = await tocPromise;
    const parts = await partPromise;
    const episodes = await episodePromise;
    const emptyPart = { episodeCount: 0, episodeSum: 0, releaseCount: 0 };
    const partMap = new Map();

    for (const episode of episodes.rows) {
      partMap.set(episode.part_id, episode);
      // @ts-expect-error
      delete episode.part_id;
    }
    const media = {};
    const mediaStats = {};
    const lists = {};
    const extLists = {};
    const extUser = {};

    for (const toc of tocs.rows) {
      const medium = getElseSetObj(mediaStats, toc.medium_id, () => {
        return {
          tocs: 0,
        };
      });
      medium.tocs = toc.count;
    }

    for (const part of parts.rows) {
      const mediumParts: any = getElseSetObj(media, part.medium_id, () => ({}));
      mediumParts[part.id] = getElseSet(partMap, part.id, () => emptyPart);
    }

    for (const list of (await listPromise).rows) {
      const listMedia: number[] = getElseSetObj(lists, list.id, () => []);
      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const list of (await exListPromise).rows) {
      const listMedia: number[] = getElseSetObj(extLists, list.id, () => []);

      if (list.medium_id != null) {
        listMedia.push(list.medium_id);
      }
    }

    for (const user of (await extUserPromise).rows) {
      const userLists: number[] = getElseSetObj(extUser, user.uuid, () => []);
      userLists.push(user.id);
    }
    return {
      media,
      mediaStats,
      lists,
      extLists,
      extUser,
    };
  }

  public async queryItems(uuid: Uuid, query: QueryItems): Promise<QueryItemsResult> {
    const [
      externalUser,
      externalMediaLists,
      mediaLists,
      mediaTocs,
      tocs,
      media,
      parts,
      partReleases,
      partEpisodes,
      episodes,
      episodeReleases,
    ] = await Promise.all([
      this.getContext(ExternalUserContext).getExternalUser(query.externalUser),
      Promise.all(query.externalMediaLists.map((id) => this.getContext(ExternalListContext).getExternalList(id))),
      this.getContext(InternalListContext).getShallowList(query.mediaLists, uuid),
      this.getContext(MediumTocContext).getTocsByMediumIds(query.mediaTocs),
      this.getContext(MediumTocContext).getTocsByIds(query.tocs),
      this.getContext(MediumContext).getSimpleMedium(query.media),
      this.getContext(PartContext).getParts(query.parts, uuid, false),
      this.getContext(PartContext).getPartReleases(query.partReleases),
      this.getContext(PartContext).getPartItems(query.partEpisodes),
      this.getContext(EpisodeContext).getEpisode(query.episodes, uuid),
      this.getContext(EpisodeReleaseContext).getReleases(query.episodeReleases),
    ]);

    return {
      episodeReleases, // by episode id
      episodes,
      partEpisodes, // by part id
      partReleases, // by part id
      parts,
      media,
      tocs, // by toc id
      mediaTocs, // by medium id
      mediaLists,
      externalMediaLists,
      externalUser,
    };
  }
}
