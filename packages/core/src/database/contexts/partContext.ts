import { SubContext } from "./subContext";
import {
  Episode,
  FullPart,
  MinPart,
  Part,
  ShallowPart,
  Uuid,
  MultiSingleNumber,
  Optional,
  VoidablePromise,
  SimpleRelease,
  TypedQuery,
  AddPart,
} from "../../types";
import { combiIndex, getElseSetObj, hasPropType, multiSingle, separateIndex } from "../../tools";
import { MysqlServerError } from "../mysqlError";
import { storeModifications } from "../sqlTools";
import { DatabaseError, MissingEntityError } from "../../error";

interface MinEpisode {
  id: number;
  partId: number;
}

export class PartContext extends SubContext {
  public async getAll(): Promise<TypedQuery<MinPart>> {
    return this.queryStream("SELECT id, totalIndex, partialIndex, title, medium_id as mediumId FROM part");
  }

  public async getStandardPartId(mediumId: number): VoidablePromise<number> {
    const [standardPartResult]: any = await this.query(
      "SELECT id FROM part WHERE medium_id = ? AND totalIndex=-1",
      mediumId,
    );
    return standardPartResult ? standardPartResult.id : undefined;
  }

  public async getStandardPart(mediumId: number): VoidablePromise<ShallowPart> {
    const [standardPartResult]: any = await this.query(
      "SELECT * FROM part WHERE medium_id = ? AND totalIndex=-1",
      mediumId,
    );

    if (!standardPartResult) {
      return;
    }

    const episodesIds: MinEpisode[] = await this.queryInList(
      "SELECT id, part_id as partId FROM episode WHERE part_id IN (??)",
      standardPartResult.id,
    );

    const standardPart: ShallowPart = {
      id: standardPartResult.id,
      totalIndex: standardPartResult.totalIndex,
      partialIndex: standardPartResult.partialIndex,
      title: standardPartResult.title,
      episodes: [],
      mediumId: standardPartResult.medium_id,
    };
    episodesIds.forEach((value) => standardPart.episodes.push(value.id));
    return standardPart;
  }

  public async getMediumPartIds(mediumId: number): Promise<number[]> {
    const result = await this.query("SELECT id FROM part WHERE medium_id = ?;", mediumId);
    return result.rows.map((value) => value.id);
  }

  /**
   * Returns all parts of an medium.
   */
  public async getMediumParts(mediumId: number, uuid?: Uuid): Promise<Part[]> {
    const parts = await this.query("SELECT * FROM part WHERE medium_id = ?", mediumId);

    const idMap = new Map<number, FullPart>();

    // recreate shallow parts
    const fullParts = parts.rows.map((value) => {
      const part = {
        id: value.id,
        totalIndex: value.totalIndex,
        partialIndex: value.partialIndex,
        title: value.title,
        episodes: [],
        mediumId: value.medium_id,
      };
      idMap.set(value.id, part);
      return part;
    });
    const episodesIds: MinEpisode[] = await this.queryInList(
      "SELECT id, part_id as partId FROM episode WHERE part_id IN (??);",
      [parts.rows.map((v) => v.id)],
    );

    if (episodesIds.length) {
      if (uuid) {
        const values = episodesIds.map((episode: any): number => episode.id);
        const episodes = await this.parentContext.episodeContext.getEpisode(values, uuid);
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
  public async getMediumPartsPerIndex(mediumId: number, partCombiIndex: MultiSingleNumber): Promise<MinPart[]> {
    const parts: Optional<any[]> = await this.queryInList(
      "SELECT * FROM part WHERE medium_id = ? AND combiIndex IN (??);",
      [mediumId, partCombiIndex],
    );
    if (!parts?.length) {
      return [];
    }

    multiSingle(partCombiIndex, (combinedIndex: number) => {
      if (parts.every((part) => part.combiIndex !== combinedIndex)) {
        const separateValue = separateIndex(combinedIndex);
        parts.push(separateValue);
      }
    });

    return parts.map((value): MinPart => {
      return {
        id: value.id,
        totalIndex: value.totalIndex,
        partialIndex: value.partialIndex,
        title: value.title,
        mediumId: value.medium_id,
      };
    });
  }

  /**
   * Returns all parts of an medium.
   */
  public async getParts<T extends MultiSingleNumber>(partId: T, uuid: Uuid, full = true): Promise<Part[]> {
    const parts: Optional<any[]> = await this.queryInList("SELECT * FROM part WHERE id IN (??);", [partId]);
    if (!parts?.length) {
      return [];
    }
    const partIdMap = new Map<number, any>();
    const episodesResult: Optional<any[]> = await this.queryInList(
      "SELECT id, part_id FROM episode WHERE part_id IN (??);",
      [
        parts.map((value) => {
          partIdMap.set(value.id, value);
          return value.id;
        }),
      ],
    );

    const episodes: Array<{ id: number; part_id: number }> = episodesResult || [];

    if (full) {
      const episodeIds = episodes.map((value) => value.id);
      const fullEpisodes = await this.parentContext.episodeContext.getEpisode(episodeIds, uuid);
      fullEpisodes.forEach((value) => {
        const part = partIdMap.get(value.partId);
        if (!part) {
          throw new MissingEntityError("missing part for queried episode");
        }
        if (!part.episodes) {
          part.episodes = [];
        }
        part.episodes.push(value);
      });
    } else {
      episodes.forEach((value) => {
        const part: Part = partIdMap.get(value.part_id);
        (part.episodes as number[]).push(value.id);
      });
    }
    return parts.map((part) => {
      return {
        id: part.id,
        totalIndex: part.totalIndex,
        partialIndex: part.partialIndex,
        title: part.title,
        episodes: part.episodes || [],
        mediumId: part.medium_id,
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
    const episodesResult: MinEpisode[] = await this.queryInList(
      "SELECT id, part_id as partId FROM episode WHERE part_id IN (??);",
      [partIds],
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
    const episodesResult: Array<SimpleRelease & { part_id: number }> = await this.queryInList(
      "SELECT episode.id as episodeId, part_id, url FROM episode_release INNER JOIN episode ON episode.id = episode_id WHERE part_id IN (??);",
      [partIds],
    );

    const result = {};

    episodesResult.forEach((value) => {
      const items = getElseSetObj(result, value.part_id, () => []) as any[];
      // @ts-expect-error
      delete value.part_id;
      items.push(value);
    });

    for (const partId of partIds) {
      getElseSetObj(result, partId, () => []);
    }
    return result;
  }

  public async getOverLappingParts(standardId: number, nonStandardPartIds: number[]): Promise<number[]> {
    if (!nonStandardPartIds.length) {
      return [];
    }
    const results = await this.queryInList(
      "SELECT part_id FROM episode WHERE combiIndex IN" +
        "(SELECT combiIndex FROM episode WHERE part_id = ?) " +
        "AND part_id IN (??) GROUP BY part_id;",
      [standardId, nonStandardPartIds],
    );
    if (!results) {
      return [];
    }
    return results.map((value) => value.part_id);
  }

  /**
   * Adds a part of an medium to the storage.
   */
  public async addPart(part: AddPart): Promise<Part | FullPart> {
    if (part.totalIndex === -1) {
      return this.createStandardPart(part.mediumId);
    }
    let partId: number;
    const partCombiIndex = combiIndex(part);

    try {
      const result = await this.query(
        "INSERT INTO part (medium_id, title, totalIndex, partialIndex, combiIndex) VALUES (?,?,?,?,?) RETURNING id;",
        [part.mediumId, part.title, part.totalIndex, part.partialIndex, partCombiIndex],
      );
      partId = result.rows[0].id;
      storeModifications("part", "insert", result);
    } catch (e) {
      // do not catch if it isn't an duplicate key error
      if (
        !e ||
        (hasPropType<number>(e, "errno") &&
          e.errno !== MysqlServerError.ER_DUP_KEY &&
          e.errno !== MysqlServerError.ER_DUP_ENTRY)
      ) {
        throw e;
      }
      const result = await this.query("SELECT id from part where medium_id=? and combiIndex=?", [
        part.mediumId,
        partCombiIndex,
      ]);
      partId = result.rows[0].id;
    }

    if (!Number.isInteger(partId) || partId <= 0) {
      throw new DatabaseError(`invalid ID ${partId}`);
    }
    let episodes: Episode[];

    if (part.episodes?.length) {
      if (!Number.isInteger(part.episodes[0])) {
        part.episodes.forEach((episode) => {
          episode.partId = partId;
          return episode;
        });
        episodes = await this.parentContext.episodeContext.addEpisode(part.episodes);
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
      (updates, values) => {
        if (part.title) {
          updates.push("title = ?");
          values.push(part.title);
        } else {
          if (part.title === null) {
            updates.push("title = NULL");
          }
        }

        if (part.partialIndex) {
          updates.push("partialIndex = ?");
          values.push(part.partialIndex);
        }

        if (part.totalIndex) {
          updates.push("totalIndex = ?");
          values.push(part.totalIndex);
        }
      },
      {
        column: "id",
        value: part.id,
      },
    );
    storeModifications("part", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Deletes a part from the storage.
   */
  public async deletePart(id: number): Promise<boolean> {
    // TODO delete all episode in this part or just transfer them to the "all" part?
    return false;
  }

  public createStandardPart(mediumId: number): Promise<ShallowPart> {
    const partName = "Non Indexed Volume";
    return this.query(
      "INSERT INTO part (medium_id,title, totalIndex, combiIndex) VALUES (?,?,?,?) ON CONFLICT DO NOTHING RETURNING id;",
      [mediumId, partName, -1, -1],
    ).then((value): ShallowPart => {
      storeModifications("part", "insert", value);
      return {
        totalIndex: -1,
        title: partName,
        id: value.rows[0].id,
        mediumId,
        episodes: [],
      };
    });
  }
}
