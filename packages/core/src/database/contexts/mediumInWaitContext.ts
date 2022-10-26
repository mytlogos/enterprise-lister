import {
  Medium,
  SimpleMedium,
  MultiSingleValue,
  EmptyPromise,
  MediumInWait,
  TypedQuery,
  MediumInWaitSearch,
  Uuid,
} from "../../types";
import { equalsIgnore, promiseMultiSingle, sanitizeString } from "../../tools";
import { escapeLike } from "../storages/storageTools";
import { DatabaseError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { MediumTocContext } from "./mediumTocContext";
import { MediumContext } from "./mediumContext";
import { PartContext } from "./partContext";
import { InternalListContext } from "./internalListContext";
import { joinAnd } from "./helper";

export class MediumInWaitContext extends QueryContext {
  public async createFromMediaInWait(
    medium: MediumInWait,
    uuid: Uuid,
    same?: MediumInWait[],
    listId?: number,
  ): Promise<Medium> {
    const title = sanitizeString(medium.title);
    const newMedium: SimpleMedium = await this.getContext(MediumContext).addMedium({
      title,
      medium: medium.medium,
    });

    const id = newMedium.id;
    if (!id) {
      throw new DatabaseError("no medium id available");
    }
    const toDeleteMediaInWaits = [medium];

    if (same && Array.isArray(same)) {
      await Promise.all(
        same
          .filter((value) => value && value.medium === medium.medium)
          .map((value) => this.getContext(MediumTocContext).addToc(id, value.link)),
      );

      const synonyms: string[] = same
        .map((value) => sanitizeString(value.title))
        .filter((value) => !equalsIgnore(value, medium.title));

      if (synonyms.length) {
        await this.getContext(MediumContext).addSynonyms({ mediumId: id, synonym: synonyms });
      }
      toDeleteMediaInWaits.push(...same);
    }
    if (listId) {
      await this.getContext(InternalListContext).addItemsToList([id], uuid, listId);
    }
    if (medium.link) {
      await this.getContext(MediumTocContext).addToc(id, medium.link);
    }

    await this.deleteMediaInWait(toDeleteMediaInWaits);
    const parts = await this.getContext(PartContext).getMediumParts(id);
    return {
      ...newMedium,
      parts: parts.map((value) => value.id),
      latestReleased: [],
      currentRead: 0,
      unreadEpisodes: [],
    };
  }

  public async consumeMediaInWait(mediumId: number, same: MediumInWait[]): Promise<boolean> {
    if (!same?.length) {
      return false;
    }
    await Promise.all(
      same.filter((value) => value).map((value) => this.getContext(MediumTocContext).addToc(mediumId, value.link)),
    );

    const synonyms: string[] = same.map((value) => sanitizeString(value.title));

    await this.getContext(MediumContext).addSynonyms({ mediumId, synonym: synonyms });
    await this.deleteMediaInWait(same);
    return true;
  }

  public async getMediaInWait(search?: MediumInWaitSearch): Promise<TypedQuery<MediumInWait>> {
    const limit = search?.limit && search.limit > 0 ? sql` LIMIT ${search.limit}` : sql``;
    const whereFilter = [];

    if (search?.medium) {
      whereFilter.push(sql`medium = ${search.medium}`);
    }

    if (search?.link && search.link !== "undefined") {
      whereFilter.push(sql`link like ${"%" + escapeLike(search.link) + "%"}`);
    }

    if (search?.title && search.title !== "undefined") {
      whereFilter.push(sql`title like ${"%" + escapeLike(search.title) + "%"}`);
    }
    return this.stream(
      sql`SELECT title, medium, link FROM medium_in_wait${
        whereFilter.length ? sql` WHERE ${joinAnd(whereFilter)}` : sql``
      } ORDER BY title${limit}`,
    );
  }

  public async deleteMediaInWait(mediaInWait: MultiSingleValue<MediumInWait>): EmptyPromise {
    if (!mediaInWait) {
      return;
    }
    await promiseMultiSingle(mediaInWait, async (value: MediumInWait) => {
      await this.delete(
        "medium_in_wait",
        {
          column: "title",
          value: value.title,
        },
        {
          column: "medium",
          value: value.medium,
        },
        {
          column: "link",
          value: value.link,
        },
      );
      // FIXME: storeModifications("medium_in_wait", "delete", result);
    });
  }

  public async addMediumInWait(mediaInWait: readonly MediumInWait[]): EmptyPromise {
    const values = mediaInWait.map((value) => [value.title, value.medium, value.link]);
    await this.con.query(
      sql`
      INSERT INTO medium_in_wait (title, medium, link)
      SELECT * FROM ${sql.unnest(values, ["text", "int8", "text"])}
      ON CONFLICT DO NOTHING`,
    );
    // FIXME: multiSingle(results, (result) => storeModifications("medium_in_wait", "insert", result));
  }

  public async deleteUsedMediumInWait() {
    await this.con.query(
      sql`delete from medium_in_wait where (title, medium, link) in (select title, medium, link from medium_toc);`,
    );
    // FIXME: storeModifications("medium_in_wait", "delete", result);
  }
}
