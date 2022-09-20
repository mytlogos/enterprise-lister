import { TypedQuery, DisplayReleasesResponse, Nullable, Uuid, Insert, EmptyPromise } from "../../types";
import { sql } from "slonik";
import {
  displayRelease,
  minimalMedium,
  mediumRelease,
  SimpleRelease,
  MediumRelease,
  simpleRelease,
  minimalRelease,
  MinimalRelease,
} from "../databaseTypes";
import { QueryContext } from "./queryContext";
import { joinAnd } from "./helper";

export class EpisodeReleaseContext extends QueryContext {
  public async getAllReleases(): Promise<TypedQuery<SimpleRelease>> {
    return this.stream(
      sql`SELECT
      episode_id, source_type, toc_id,
      release_date, locked, url, title
      FROM episode_release;`,
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
    const whereClause = [];
    whereClause.push(read == null ? sql`1` : read ? sql`progress >= 1` : sql`(progress IS NULL OR progress < 1)`);

    if (requiredLists.length) {
      const array = sql.array(requiredLists, "int8");
      whereClause.push(sql`part.medium_id IN (SELECT medium_id FROM list_medium WHERE list_id = ANY(${array})`);
    } else if (ignoredLists.length) {
      const array = sql.array(ignoredLists, "int8");
      whereClause.push(sql`part.medium_id NOT IN (SELECT medium_id FROM list_medium WHERE list_id = ANY(${array})`);
    }

    // part of the join condition
    const additionalMainQueries = [];

    if (requiredMedia.length) {
      const array = sql.array(requiredMedia, "int8");
      additionalMainQueries.push(sql`part.medium_id = ANY(${array})`);
    }

    if (ignoredMedia.length) {
      const array = sql.array(ignoredMedia, "int8");
      additionalMainQueries.push(sql`part.medium_id != ALL(${array})`);
    }

    const additionalMainQuery = additionalMainQueries.length ? sql`AND ${joinAnd(additionalMainQueries)}` : sql``;
    const lowerDateLimitQuery = untilDate ? sql`AND release_date > ${sql.timestamp(untilDate)}` : sql``;

    const releasePromise = this.con.any(
      sql.type(displayRelease)`SELECT 
      er.episode_id as episodeId, er.title, er.url as link, 
      er.releaseDate as date, er.locked, medium_id as mediumId, progress
      FROM (
        SELECT * FROM episode_release 
        WHERE releaseDate < ${sql.timestamp(latestDate)}${lowerDateLimitQuery}
        ORDER BY releaseDate DESC LIMIT 10000
      ) as er
      INNER JOIN episode ON episode.id=er.episode_id 
      LEFT JOIN (SELECT * FROM user_episode WHERE user_uuid = ${uuid}) as ue ON episode.id=ue.episode_id
      INNER JOIN part ON part.id=part_id ${additionalMainQuery}
      WHERE ${joinAnd(whereClause)}
      LIMIT 500;`,
    );

    const mediaPromise = this.con.any(sql.type(minimalMedium)`SELECT id, title, medium FROM medium;`);

    const latestReleaseResult = await this.con.oneFirst<{ releasedate: string }>(
      sql`SELECT releasedate FROM episode_release ORDER BY releaseDate LIMIT 1;`,
    );
    const releases = await releasePromise;

    const mediaIds: Set<number> = new Set();

    for (const release of releases) {
      mediaIds.add(release.mediumId);
    }
    const media = (await mediaPromise).filter((value) => mediaIds.has(value.id));

    return {
      latest: latestReleaseResult ? new Date(latestReleaseResult) : new Date(0),
      media,
      releases,
    };
  }

  public async getMediumReleases(mediumId: number, uuid: Uuid): Promise<readonly MediumRelease[]> {
    return this.con.any(
      sql.type(mediumRelease)`
      SELECT 
        er.episode_id, er.title, er.url as link,
        er.release_date as date, er.locked, episode.combi_index, progress
      FROM episode_release as er
      INNER JOIN episode ON episode.id=er.episode_id
      LEFT JOIN (
        SELECT * FROM user_episode WHERE user_uuid = ${uuid}
      ) as ue ON episode.id=ue.episode_id
      INNER JOIN part ON part.id=part_id
      WHERE part.medium_id = ${mediumId};`,
    );
  }

  public async getReleases(episodeId: number[]): Promise<readonly SimpleRelease[]> {
    if (!episodeId || (Array.isArray(episodeId) && !episodeId.length)) {
      return [];
    }
    if (!Array.isArray(episodeId)) {
      episodeId = [episodeId];
    }

    const resultArray = await this.con.any(
      sql.type(simpleRelease)`
      SELECT episode_id, source_type, toc_id,
      release_date, locked, url, title
      FROM episode_release
      WHERE episode_id = ANY(${sql.array(episodeId, "int8")});`,
    );

    if (!resultArray.length) {
      return [];
    }
    // always ensure that locked is set
    resultArray.forEach((value) => (value.locked = !!value.locked));
    return resultArray;
  }

  public async getReleasesByHost(episodeId: number[], host: string): Promise<readonly SimpleRelease[]> {
    if (!episodeId.length) {
      return [];
    }
    return this.con.any(
      sql.type(simpleRelease)`
      SELECT episode_id, source_type, toc_id,
      release_date, locked, url, title
      FROM episode_release
      WHERE strpos(url, ${host}) = 1 AND episode_id = ANY(${sql.array(episodeId, "int8")});`,
    );
  }

  public async getMediumReleasesByHost(mediumId: number, host: string): Promise<readonly SimpleRelease[]> {
    return this.con.any(
      sql.type(simpleRelease)`
      SELECT er.episode_id, er.source_type, er.toc_id,
      er.release_date, er.locked, er.url, er.title
      FROM episode_release as er
      INNER JOIN episode as e ON e.id=er.episode_id
      INNER JOIN part as p ON p.id=e.part_id
      WHERE medium_id = ${mediumId}
      AND strpos(url, ${host}) = 1
      `,
    );
  }

  public async addReleases(releases: Array<Insert<SimpleRelease>>): Promise<readonly SimpleRelease[]> {
    const insert = releases.map((value) => [
      value.episodeId,
      value.title,
      value.url,
      value.sourceType,
      value.releaseDate,
      value.locked,
      value.tocId,
    ]);

    // FIXME: multiSingle(results, (value) => storeModifications("release", "insert", value));
    return this.con.any(
      sql.type(simpleRelease)`
      INSERT INTO episode_release (episode_id, title, url, source_type, release_date, locked, toc_id) 
      SELECT * FROM ${sql.unnest(insert, ["int8", "text", "text", "text", "timestamp", "boolean", "int8"])}
      ON CONFLICT DO NOTHING
      RETURNING episode_id, title, url, source_type, release_date, locked, toc_id;`,
    );
  }

  public async getEpisodeLinks(episodeIds: number[]): Promise<readonly MinimalRelease[]> {
    return this.con.any(
      sql.type(minimalRelease)`
      SELECT episode_id, url FROM episode_release
      WHERE episode_id = ANY(${sql.array(episodeIds, "int8")});`,
    );
  }

  public async getEpisodeLinksByMedium(mediumId: number): Promise<readonly MinimalRelease[]> {
    return this.con.any(
      sql.type(minimalRelease)`
      SELECT
        episode_id, url
      FROM episode_release 
      inner join episode on episode.id=episode_release.episode_id 
      inner join part on part.id=episode.part_id
      WHERE medium_id = ${mediumId};`,
    );
  }

  public async getSourcedReleases(
    sourceType: string,
    mediumId: number,
  ): Promise<Array<{ sourceType: string; url: string; title: string; mediumId: number }>> {
    const resultArray = await this.con.any(
      sql`
        SELECT url, episode_release.title
        FROM episode_release
        INNER JOIN episode ON episode.id=episode_release.episode_id
        INNER JOIN part ON part.id=episode.part_id
        WHERE source_type=${sourceType} AND medium_id=${mediumId};`,
    );
    return resultArray.map((value: any) => {
      value.sourceType = sourceType;
      value.mediumId = mediumId;
      return value;
    });
  }

  /**
   * Currently does an upsert instead of purely an insert.
   * @param releases releases to update
   */
  public async updateReleases(releases: SimpleRelease[]): EmptyPromise {
    const values = releases.map((value) => [
      value.episodeId,
      value.title,
      value.url,
      value.sourceType,
      value.releaseDate,
      value.locked,
      value.tocId,
    ]);

    await this.con.query(
      sql`
      INSERT INTO episode_release
      (episode_id, title, url, source_type, release_date, locked, toc_id) 
      SELECT * FROM ${sql.unnest(values, ["int8", "text", "text", "text", "timestamp", "boolean", "int8"])}
      ON CONFLICT (episode_id, url) DO UPDATE SET 
      title = EXCLUDED.title,
      releaseDate = EXCLUDED.release_date,
      source_type = EXCLUDED.source_type,
      locked = EXCLUDED.locked,
      toc_id = EXCLUDED.toc_id;
      `,
    );
    // FIXME: storeModifications("release", "update", result);
  }

  public async deleteReleases(release: SimpleRelease[]): EmptyPromise {
    // FIXME: storeModifications("release", "delete", result);
    const ids = release.map((value) => value.id);
    await this.con.query(
      sql`DELETE FROM episode_release
      WHERE id = ANY(${sql.array(ids, "int8")});`,
    );
  }
}
