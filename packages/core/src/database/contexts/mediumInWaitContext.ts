import { SubContext } from "./subContext";
import {
  Medium,
  SimpleMedium,
  MultiSingleValue,
  EmptyPromise,
  MediumInWait,
  TypedQuery,
  MediumInWaitSearch,
} from "../../types";
import { equalsIgnore, ignore, promiseMultiSingle, sanitizeString, multiSingle } from "../../tools";
import { storeModifications } from "../sqlTools";
import { escapeLike } from "../storages/storageTools";
import { DatabaseError } from "../../error";

export class MediumInWaitContext extends SubContext {
  public async createFromMediaInWait(medium: MediumInWait, same?: MediumInWait[], listId?: number): Promise<Medium> {
    const title = sanitizeString(medium.title);
    const newMedium: SimpleMedium = await this.parentContext.mediumContext.addMedium({
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
          .map((value) => this.parentContext.mediumContext.addToc(id, value.link)),
      );

      const synonyms: string[] = same
        .map((value) => sanitizeString(value.title))
        .filter((value) => !equalsIgnore(value, medium.title));

      if (synonyms.length) {
        await this.parentContext.mediumContext.addSynonyms({ mediumId: id, synonym: synonyms });
      }
      toDeleteMediaInWaits.push(...same);
    }
    if (listId) {
      await this.parentContext.internalListContext.addItemToList({ id, listId });
    }
    if (medium.link) {
      await this.parentContext.mediumContext.addToc(id, medium.link);
    }

    await this.deleteMediaInWait(toDeleteMediaInWaits);
    const parts = await this.parentContext.partContext.getMediumParts(id);
    return {
      ...newMedium,
      parts: parts.map((value) => value.id),
      latestReleased: [],
      currentRead: 0,
      unreadEpisodes: [],
    };
  }

  public async consumeMediaInWait(mediumId: number, same: MediumInWait[]): Promise<boolean> {
    if (!same || !same.length) {
      return false;
    }
    await Promise.all(
      same.filter((value) => value).map((value) => this.parentContext.mediumContext.addToc(mediumId, value.link)),
    );

    const synonyms: string[] = same.map((value) => sanitizeString(value.title));

    await this.parentContext.mediumContext.addSynonyms({ mediumId, synonym: synonyms });
    await this.deleteMediaInWait(same);
    return true;
  }

  public async getMediaInWait(search?: MediumInWaitSearch): Promise<TypedQuery<MediumInWait>> {
    const limit = search?.limit && search.limit > 0 ? ` LIMIT ${search.limit}` : "";
    const whereFilter = [];
    const values = [];

    if (search?.medium) {
      whereFilter.push("medium = ?");
      values.push(search.medium);
    }

    if (search?.link && search.link !== "undefined") {
      whereFilter.push(`link like '%${escapeLike(search.link)}%'`);
      values.push(search.link);
    }

    if (search?.title && search.title !== "undefined") {
      whereFilter.push(`link like '%${escapeLike(search.title)}%'`);
      values.push(search.title);
    }
    return this.queryStream(
      `SELECT * FROM medium_in_wait${
        whereFilter.length ? " WHERE " + whereFilter.join(" AND ") : ""
      } ORDER BY title${limit}`,
      values,
    );
  }

  public async deleteMediaInWait(mediaInWait: MultiSingleValue<MediumInWait>): EmptyPromise {
    if (!mediaInWait) {
      return;
    }
    return promiseMultiSingle(mediaInWait, async (value: MediumInWait) => {
      const result = await this.delete(
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
      storeModifications("medium_in_wait", "delete", result);
      return result.affectedRows > 0;
    }).then(ignore);
  }

  public async addMediumInWait(mediaInWait: MultiSingleValue<MediumInWait>): EmptyPromise {
    const results = await this.multiInsert(
      "INSERT IGNORE INTO medium_in_wait (title, medium, link) VALUES ",
      mediaInWait,
      (value: any) => [value.title, value.medium, value.link],
    );
    multiSingle(results, (result) => storeModifications("medium_in_wait", "insert", result));
  }
}
