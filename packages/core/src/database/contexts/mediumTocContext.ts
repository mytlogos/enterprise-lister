import { ValidationError } from "../../error";
import { count, getElseSet, isInvalidId } from "../../tools";
import { EmptyPromise } from "../../types";
import { sql } from "slonik";
import {
  entity,
  linkValue,
  minimalMediumtoc,
  MinimalMediumtoc,
  SimpleMediumToc,
  simpleMediumToc,
} from "../databaseTypes";
import { QueryContext } from "./queryContext";
import { EpisodeReleaseContext } from "./episodeReleaseContext";
import { JobContext } from "./jobContext";

function selectAllColumns() {
  return sql`SELECT id, medium_id, link, country_of_origin,
  language_of_origin, author, title, medium,
  artist, lang, state_origin, state_tl, series, universe
  FROM medium_toc`;
}

export class MediumTocContext extends QueryContext {
  public async getSpecificToc(id: number, link: string): Promise<SimpleMediumToc | null> {
    return this.con.maybeOne(
      sql.type(simpleMediumToc)`${selectAllColumns()} WHERE medium_id = ${id} AND link = ${link};`,
    );
  }

  public async removeToc(tocLink: string): EmptyPromise {
    const result = await this.con.anyFirst(
      sql.type(entity)`SELECT medium_id as id FROM medium_toc WHERE link = ${tocLink}`,
    );
    await Promise.all(
      result.map((value) => {
        return this.removeMediumToc(value, tocLink);
      }),
    );
  }

  public getTocs(): Promise<readonly SimpleMediumToc[]> {
    return this.con.any(
      sql.type(simpleMediumToc)`
      ${selectAllColumns()};`,
    );
  }

  /**
   * Updates a mediumToc from the storage.
   */
  public async updateMediumToc(mediumToc: SimpleMediumToc): Promise<boolean> {
    // define the updatable keys
    const keys: Array<keyof SimpleMediumToc> = [
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

    if (isInvalidId(mediumToc.mediumId) || !mediumToc.link) {
      throw new ValidationError("invalid medium_id or link is invalid: " + JSON.stringify(mediumToc));
    }
    const conditions = [];

    if (isInvalidId(mediumToc.id)) {
      conditions.push({ column: "medium_id", value: mediumToc.mediumId });
      conditions.push({ column: "link", value: mediumToc.link });
    } else {
      conditions.push({ column: "id", value: mediumToc.id });
    }
    const result = await this.update(
      "medium_toc",
      () => {
        const updates = [];
        for (const key of keys) {
          const value = mediumToc[key];

          if (value === null) {
            updates.push(sql`${sql.identifier([key])} = NULL`);
          } else if (value != null) {
            updates.push(sql`${sql.identifier([key])} = ${value}`);
          }
        }
        return updates;
      },
      ...conditions,
    );
    // FIXME: storeModifications("toc", "update", result);
    return result.rowCount > 0;
  }

  public async addToc(mediumId: number, link: string): Promise<number> {
    const result = await this.con.oneFirst(
      sql.type(entity)`
      INSERT INTO medium_toc (medium_id, link, title, medium)
      VAlUES (${mediumId},${link},${""},${0})
      RETURNING id`,
    );
    // FIXME: storeModifications("toc", "insert", result);
    return result;
  }

  public async getTocLinkByMediumId(mediumId: number): Promise<readonly string[]> {
    return this.con.anyFirst(sql.type(linkValue)`SELECT link FROM medium_toc WHERE medium_id=${mediumId}`);
  }

  public async getTocsByMediumIds(mediumId: number[]): Promise<readonly SimpleMediumToc[]> {
    return this.con.any(
      sql.type(simpleMediumToc)`
      ${selectAllColumns()} WHERE medium_id = ANY(${sql.array(mediumId, "int8")});`,
    );
  }

  public getTocsByIds(tocIds: number[]): Promise<readonly SimpleMediumToc[]> {
    return this.con.any(sql.type(simpleMediumToc)`${selectAllColumns()} WHERE id = ANY(${sql.array(tocIds, "int8")});`);
  }

  public async removeMediumToc(mediumId: number, link: string): Promise<boolean> {
    const domainRegMatch = /https?:\/\/(.+?)(\/|$)/.exec(link);

    if (!domainRegMatch) {
      throw new ValidationError("Invalid link, Unable to extract Domain: " + link);
    }

    await this.getContext(JobContext).removeJobLike("name", `toc-${mediumId}-${link}`);
    const domain = domainRegMatch[1];

    const releases = await this.getContext(EpisodeReleaseContext).getEpisodeLinksByMedium(mediumId);
    const episodeMap: Map<number, string[]> = new Map();
    const valueCb = () => [];

    for (const release of releases) {
      getElseSet(episodeMap, release.episodeId, valueCb).push(release.url);
    }
    const removeEpisodesAfter: number[] = [];

    for (const [episodeId, links] of episodeMap.entries()) {
      const toMoveCount = count(links, (value) => value.includes(domain));

      if (toMoveCount) {
        if (links.length === toMoveCount) {
          removeEpisodesAfter.push(episodeId);
        }
      }
    }
    await this.con.query(
      sql`DELETE er FROM episode_release as er, episode as e, part as p
        WHERE er.episode_id = e.id
        AND e.part_id = p.id
        AND p.medium_id = ?
        AND strpos(er.url, ?) > 0;`,
      [mediumId, domain],
    );
    // FIXME: storeModifications("release", "delete", deletedReleaseResult);

    await this.con.query(
      sql`DELETE ue FROM user_episode as ue, episode as e, part as p
        WHERE ue.episode_id = e.id
        AND e.part_id = p.id
        AND p.medium_id = ${mediumId}
        AND e.id = ANY(${sql.array(removeEpisodesAfter, "int8")});`,
    );
    // FIXME: multiSingle(deletedProgressResult, (value) => storeModifications("progress", "delete", value));

    await this.con.query(sql`DELETE FROM episode WHERE episode.id = ANY(${sql.array(removeEpisodesAfter, "int8")});`);
    // FIXME: multiSingle(deletedEpisodesResult, (value) => storeModifications("episode", "delete", value));

    await this.delete("medium_toc", { column: "medium_id", value: mediumId }, { column: "link", value: link });
    // FIXME: storeModifications("toc", "delete", result);
    return false;
  }

  public getAllMediaTocs(): Promise<ReadonlyArray<{ link?: string; id: number }>> {
    return this.con.any<{ link?: string; id: number }>(
      sql`SELECT medium.id, medium_toc.link FROM medium LEFT JOIN medium_toc ON medium.id=medium_toc.medium_id`,
    );
  }

  public async getAllTocs(): Promise<readonly MinimalMediumtoc[]> {
    return this.con.any(sql.type(minimalMediumtoc)`SELECT id, medium_id, link FROM medium_toc;`);
  }
}
