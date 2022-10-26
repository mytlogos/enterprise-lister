import {
  Episode,
  FullPart,
  Part,
  ShallowPart,
  Uuid,
  VoidablePromise,
  SimpleRelease,
  TypedQuery,
  AddPart,
} from "../../types";
import { combiIndex, getElseSetObj, multiSingle, separateIndex } from "../../tools";
import { isDuplicateError, MissingEntityError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { entity, SimpleEpisodeReleases, simplePart, SimplePart } from "../databaseTypes";
import { EpisodeContext } from "./episodeContext";

interface MinEpisode {
  id: number;
  partId: number;
}

export class PartContext extends QueryContext {
  public async getAll(): Promise<TypedQuery<SimplePart>> {
    return this.stream(
      sql.type(simplePart)`
      SELECT id, total_index, partial_index, combi_index, title, medium_id
      FROM part`,
    );
  }

  public async getStandardPartId(mediumId: number): Promise<number | null> {
    return this.con.maybeOneFirst(
      sql.type(entity)`SELECT id FROM part WHERE medium_id = ${mediumId} AND total_index=-1`,
    );
  }

  public async getStandardPart(mediumId: number): VoidablePromise<ShallowPart> {
    const standardPartResult = await this.con.maybeOne(
      sql.type(simplePart)`SELECT id, total_index, partial_index, combi_index, title, medium_id
      FROM part WHERE medium_id = ${mediumId} AND total_index=-1`,
    );

    if (!standardPartResult) {
      return;
    }

    const episodesIds = await this.con.anyFirst(
      sql.type(entity)`SELECT id FROM episode WHERE part_id = ${standardPartResult.id}`,
    );

    const standardPart: ShallowPart = {
      ...standardPartResult,
      episodes: episodesIds,
    };
    return standardPart;
  }

  public async getMediumPartIds(mediumId: number): Promise<readonly number[]> {
    return this.con.anyFirst(sql.type(entity)`SELECT id FROM part WHERE medium_id = ${mediumId};`);
  }

  /**
   * Returns all parts of an medium.
   */
  public async getMediumParts(mediumId: number, uuid?: Uuid): Promise<readonly Part[]> {
    const parts = await this.con.any(
      sql.type(simplePart)`
      SELECT id, total_index, partial_index, combi_index, title, medium_id
      FROM part WHERE medium_id = ${mediumId}`,
    );

    const idMap = new Map<number, FullPart>();

    // recreate shallow parts
    const fullParts = parts.map((value) => {
      const part = {
        ...value,
        episodes: [],
      };
      idMap.set(value.id, part);
      return part;
    });
    const episodesIds = (await this.con.any(
      sql`SELECT id, part_id
      FROM episode
       WHERE part_id = ANY(${sql.array([...idMap.keys()], "int8")});`,
    )) as unknown as readonly MinEpisode[];

    if (episodesIds.length) {
      if (uuid) {
        const values = episodesIds.map((episode: any): number => episode.id);
        const episodes = await this.getContext(EpisodeContext).getEpisode(values, uuid);
        episodes.forEach((value) => {
          const part = idMap.get(value.partId);
          if (!part) {
            throw new MissingEntityError(
              `no part ${value.partId} found even though only available episodes were queried`,
            );
          }
          part.episodes.push(value);
        });
      } else {
        episodesIds.forEach((value) => {
          const part = idMap.get(value.partId);
          if (!part) {
            throw new MissingEntityError(
              `no part ${value.partId} found even though only available episodes were queried`,
            );
          }
          // @ts-expect-error
          part.episodes.push(value.id);
        });
      }
    }
    return fullParts;
  }

  /**
   * Returns all parts of an medium with specific totalIndex.
   * If there is no such part, it returns an object with only the totalIndex as property.
   */
  public async getMediumPartsPerIndex(mediumId: number, partCombiIndex: number[]): Promise<readonly SimplePart[]> {
    const parts = await this.con.any(
      sql.type(simplePart)`SELECT id, total_index, partial_index, combi_index, title, medium_id
      FROM part
      WHERE medium_id = ${mediumId} AND combiIndex = ANY(${sql.array(partCombiIndex, "int8")});`,
      [mediumId, partCombiIndex],
    );
    if (!parts.length) {
      return [];
    }

    const result = [...parts];

    multiSingle(partCombiIndex, (combinedIndex: number) => {
      if (parts.every((part) => part.combiIndex !== combinedIndex)) {
        const separateValue = separateIndex(combinedIndex);
        result.push({
          id: 0,
          combiIndex: combinedIndex,
          mediumId: 0,
          totalIndex: separateValue.totalIndex,
          partialIndex: separateValue.partialIndex,
          title: "unknown",
        });
      }
    });

    return result;
  }

  /**
   * Returns all parts of an medium.
   */
  public async getParts(partId: number[], uuid: Uuid, full = true): Promise<Part[]> {
    const parts = await this.con.any(
      sql.type(simplePart)`SELECT id, total_index, partial_index, combi_index, title, medium_id
      FROM part WHERE id = ANY(${sql.array(partId, "int8")});`,
    );
    if (!parts.length) {
      return [];
    }
    const partIdMap = new Map<number, number[] | Episode[]>();
    const ids = parts.map((value) => {
      partIdMap.set(value.id, []);
      return value.id;
    });
    const episodesResult = await this.con.any<{ id: number; part_id: number }>(
      sql`SELECT id, part_id FROM episode WHERE part_id = ANY(${sql.array(ids, "in8")});`,
    );

    if (full) {
      const episodeIds = episodesResult.map((value) => value.id);
      const fullEpisodes = await this.getContext(EpisodeContext).getEpisode(episodeIds, uuid);
      fullEpisodes.forEach((value) => {
        const values = partIdMap.get(value.partId) as Episode[];
        if (!values) {
          throw new MissingEntityError("missing part for queried episode");
        }
        values.push(value);
      });
    } else {
      episodesResult.forEach((value) => {
        const values = partIdMap.get(value.part_id) as number[];
        if (!values) {
          throw new MissingEntityError("missing part for queried episode");
        }
        values.push(value.id);
      });
    }
    return parts.map((part): Part => {
      return {
        id: part.id,
        totalIndex: part.totalIndex,
        partialIndex: part.partialIndex,
        title: part.title,
        episodes: partIdMap.get(part.id) ?? [],
        mediumId: part.mediumId,
      };
    });
  }

  /**
   * Returns all parts of an medium.
   */
  public async getPartItems(partIds: number[]): Promise<Record<number, number[]>> {
    if (!partIds.length) {
      return {};
    }
    // @ts-expect-error
    const episodesResult = await this.con.any<MinEpisode>(
      sql`SELECT id, part_id FROM episode WHERE part_id = ANY(${sql.array(partIds, "int8")});`,
    );

    const result = {};

    episodesResult.forEach((value) => {
      (getElseSetObj(result, value.partId, () => []) as number[]).push(value.id);
    });
    for (const partId of partIds) {
      getElseSetObj(result, partId, () => []);
    }
    return result;
  }

  /**
   * Returns all parts of an medium.
   */
  public async getPartReleases(partIds: number[]): Promise<Record<number, SimpleRelease[]>> {
    if (!partIds.length) {
      return {};
    }
    // @ts-expect-error
    const episodesResult = await this.con.any<SimpleRelease & { partId: number }>(
      sql`SELECT episode_id, url, part_id
      FROM episode_release
      INNER JOIN episode ON episode.id = episode_id
      WHERE part_id = ANY(${sql.array(partIds, "int8")});`,
    );

    const result = {};

    episodesResult.forEach((value) => {
      const items = getElseSetObj(result, value.partId, () => []) as any[];
      // @ts-expect-error
      delete value.part_id;
      items.push(value);
    });

    for (const partId of partIds) {
      getElseSetObj(result, partId, () => []);
    }
    return result;
  }

  public async getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<readonly number[]> {
    if (!nonStandardPartIds.length) {
      return [];
    }
    return this.con.anyFirst<{ partId: number }>(
      sql`
      SELECT part_id FROM episode WHERE combiIndex IN (
        SELECT combiIndex FROM episode WHERE part_id = ${standardId}
      ) 
      AND part_id = ANY(${sql.array(nonStandardPartIds, "in8")})
      GROUP BY part_id;`,
    );
  }

  /**
   * Adds a part of an medium to the storage.
   */
  public async addPart(part: AddPart): Promise<Part | FullPart> {
    if (part.totalIndex === -1) {
      // @ts-expect-error
      return this.createStandardPart(part.mediumId);
    }
    let partId: number;
    const partCombiIndex = combiIndex(part);

    try {
      partId = await this.con.oneFirst(
        sql.type(entity)`INSERT INTO part (medium_id, title, total_index, partial_index, combi_index)
        VALUES (
          ${part.mediumId},${part.title ?? null},${part.totalIndex},${part.partialIndex ?? null},${partCombiIndex}
        )
        RETURNING id;`,
      );
      // FIXME: storeModifications("part", "insert", result);
    } catch (e) {
      // do not catch if it isn't an duplicate key error
      if (!e || !isDuplicateError(e)) {
        throw e;
      }
      partId = await this.con.oneFirst(
        sql.type(entity)`SELECT id from part where medium_id=${part.mediumId} and combiIndex=${partCombiIndex}`,
      );
    }

    let episodes: readonly SimpleEpisodeReleases[];

    if (part.episodes?.length) {
      if (!Number.isInteger(part.episodes[0])) {
        part.episodes.forEach((episode) => {
          episode.partId = partId;
          return episode;
        });
        // TODO: how to handle this?, also insert release? or separately?
        episodes = await this.getContext(EpisodeContext).addEpisode(part.episodes);
      } else {
        episodes = [];
      }
    } else {
      episodes = [];
    }
    return {
      mediumId: part.mediumId,
      id: partId,
      title: part.title,
      partialIndex: part.partialIndex,
      totalIndex: part.totalIndex,
      episodes,
    };
  }

  /**
   * Updates a part.
   */
  public async updatePart(part: Part): Promise<boolean> {
    const result = await this.update(
      "part",
      () => {
        const updates = [];
        if (part.title) {
          updates.push(sql`title = ${part.title}`);
        } else if (part.title === null) {
          updates.push(sql`title = NULL`);
        }

        if (part.partialIndex) {
          updates.push(sql`partial_index = ${part.partialIndex ?? null}`);
        }

        if (part.totalIndex) {
          updates.push(sql`total_index = ${part.totalIndex}`);
        }

        if (part.totalIndex || part.partialIndex) {
          updates.push(sql`combi_index = ${combiIndex(part)}`);
        }
        return updates;
      },
      {
        column: "id",
        value: part.id,
      },
    );
    // FIXME: storeModifications("part", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Deletes a part from the storage.
   */
  public async deletePart(id: number): Promise<boolean> {
    // TODO delete all episode in this part or just transfer them to the "all" part?
    return false;
  }

  public async createStandardPart(mediumId: number): Promise<ShallowPart> {
    const partName = "Non Indexed Volume";
    const id = await this.con.oneFirst(
      sql.type(entity)`
      INSERT INTO part (medium_id,title, total_index, combi_index)
      VALUES (${mediumId},${partName},-1,-1)
      RETURNING id;`,
    );
    // FIXME: storeModifications("part", "insert", value);
    return {
      totalIndex: -1,
      title: partName,
      id,
      mediumId,
      episodes: [],
    };
  }
}
