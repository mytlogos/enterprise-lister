import { List, Uuid, ListMedia, Id, Insert } from "../../types";
import { promiseMultiSingle } from "../../tools";
import { MissingEntityError, ValidationError } from "../../error";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { entity, SimpleList, simpleList } from "../databaseTypes";
import { MediumContext } from "./mediumContext";

export class InternalListContext extends QueryContext {
  /**
   * Adds a list to the storage and
   * links it to the user of the uuid.
   */
  public async addList({ name, medium, userUuid }: Insert<SimpleList>): Promise<SimpleList> {
    return this.con.one(
      sql.type(simpleList)`
      INSERT INTO reading_list (user_uuid, name, medium)
      VALUES (${userUuid},${name},${medium}) RETURNING id, name, medium, user_uuid`,
    );
  }

  /**
   * Returns all mediums of a list with
   * the list_id.
   */
  public async getLists(listId: number[], media: number[], uuid: Uuid): Promise<ListMedia> {
    const toLoadMedia: Set<number> = new Set();

    const simpleLists = await this.con.any(
      sql.type(simpleList)`
      SELECT id, name, medium, user_uuid
      FROM reading_list
      WHERE id = ANY(${sql.array(listId, "int8")});`,
    );

    const lists = await Promise.all(
      simpleLists.map(async (item) => {
        const list = await this.createShallowList(item);

        for (const itemId of list.items) {
          if (!media.includes(itemId)) {
            toLoadMedia.add(itemId);
          }
        }
        return list;
      }),
    );

    const loadedMedia = await this.getContext(MediumContext).getMedium([...toLoadMedia], uuid);

    return { list: lists, media: loadedMedia };
  }

  public async getShallowList(listId: number[], uuid: Uuid): Promise<List[]> {
    const result = await this.con.any(
      sql.type(simpleList)`
      SELECT id, name, medium, user_uuid
      FROM reading_list
      WHERE uuid = ${uuid} AND id = ANY(${sql.array(listId, "int8")});`,
    );
    return Promise.all(result.map((list) => this.createShallowList(list)));
  }

  /**
   * Recreates a list from storage.
   */
  public async createShallowList(storageList: SimpleList): Promise<List> {
    if (!storageList.name) {
      throw new ValidationError("Missing List Name");
    }

    const result = await this.con.manyFirst(
      sql.type(entity)`SELECT medium_id as id FROM list_medium WHERE list_id = ${storageList.id};`,
    );
    return {
      items: [...result],
      name: storageList.name,
      medium: storageList.medium,
      id: storageList.id,
      userUuid: storageList.userUuid,
    };
  }

  /**
   * Updates the properties of a list.
   */
  public async updateList(list: List): Promise<boolean> {
    if (!list.userUuid) {
      throw new ValidationError("Missing List User Uuid");
    }
    const result = await this.update(
      "reading_list",
      () => {
        const updates = [];

        if (list.name) {
          updates.push(sql`name = ${list.name}`);
        }

        if (list.medium) {
          updates.push(sql`medium = ${list.medium}`);
        }
        return updates;
      },
      {
        column: "id",
        value: list.id,
      },
    );
    // FIXME: storeModifications("list", "update", result);
    return result.rowCount > 0;
  }

  /**
   * Deletes a single list irreversibly.
   */
  public async deleteList(listId: number, uuid: Uuid): Promise<boolean> {
    const result = await this.con.manyFirst(
      sql.type(entity)`SELECT id FROM reading_list WHERE id = ${listId} AND user_uuid = ${uuid}`,
    );

    // first check if such a list does exist for the given user
    if (!result.length) {
      return Promise.reject(new MissingEntityError(`List ${listId}-${uuid} does not exist`));
    }
    // first remove all links between a list and their media
    await this.delete("list_medium", { column: "list_id", value: listId });
    // FIXME: storeModifications("list_item", "delete", deleteResult);

    // lastly delete the list itself
    await this.delete("reading_list", { column: "id", value: listId });
    // FIXME: storeModifications("list", "delete", deleteResult);
    return false;
  }

  /**
   * Returns all available lists for the given user.
   */
  public async getUserLists(uuid: Uuid): Promise<List[]> {
    // query all available lists for user
    const result = await this.con.any(
      sql.type(simpleList)`
      SELECT id, name, medium, user_uuid FROM reading_list WHERE reading_list.user_uuid = ${uuid};`,
    );

    // query a shallow list, so that only the id´s of their media is contained
    return Promise.all(result.map((value) => this.createShallowList(value)));
  }

  /**
   * Adds a medium to the list.
   *
   * If no listId is available it selects the
   * 'Standard' List of the given user and adds it there.
   */
  public async addItemsToList(mediumIds: number[], uuid: Uuid, targetListId?: Id): Promise<boolean> {
    // TODO: 27.02.2020 use uuid to check that listId is owned by uuid

    let listId: number;
    // if list_ident is not a number,
    // then take it as uuid from user and get the standard listId of 'Standard' list
    if (!targetListId) {
      const idResult = await this.con.oneFirst(
        sql.type(entity)`SELECT id FROM reading_list WHERE name = 'Standard' AND user_uuid = ${uuid};`,
      );
      listId = idResult;
    } else {
      const ownedByUuid = await this.con.exists(
        sql`SELECT 1 FROM reading_list WHERE id = ${targetListId} AND user_uuid = ${uuid};`,
      );

      if (!ownedByUuid) {
        throw Error("cannot add item to list it does not own");
      }

      listId = targetListId;
    }
    const values = mediumIds.map((mediumId) => [listId, mediumId]);

    await this.con.query(
      sql`
      INSERT INTO list_medium (list_id, medium_id)
      SELECT * FROM ${sql.unnest(values, ["int8", "int8"])}
      ON CONFLICT DO NOTHING`,
    );
    // FIXME: let added = false;
    // multiSingle(result, (value) => {
    //   storeModifications("list_item", "insert", value);

    //   if (value.rowCount > 0) {
    //     added = true;
    //   }
    // });
    return false;
  }

  /**
   * Moves a medium from an old list to a new list.
   *
   * @return {Promise<boolean>}
   */
  public async moveMedium(oldListId: number, newListId: number, mediumIds: number[], uuid: Uuid): Promise<boolean> {
    // first remove medium from old list
    await this.removeMedium(oldListId, mediumIds);
    // add item to new list
    return this.addItemsToList(mediumIds, uuid, newListId);
  }

  /**
   * Removes an item from a list.
   */
  public async removeMedium(listId: number, mediumId: number | number[], external = false): Promise<boolean> {
    const results = await promiseMultiSingle(mediumId, async (value) => {
      const result = await this.delete(
        "list_medium",
        {
          column: "list_id",
          value: listId,
        },
        {
          column: "medium_id",
          value,
        },
      );
      // FIXME: storeModifications("list_item", "delete", result);
      return result.rowCount > 0;
    });
    return Array.isArray(results) ? results.some((v) => v) : results;
  }
}
