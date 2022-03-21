import { SubContext } from "./subContext";
import { List, Uuid, MultiSingleNumber, MinList, StorageList, ListMedia, PromiseMultiSingle } from "../../types";
import { Errors, promiseMultiSingle, multiSingle } from "../../tools";
import { storeModifications } from "../sqlTools";

export class InternalListContext extends SubContext {
  /**
   * Adds a list to the storage and
   * links it to the user of the uuid.
   */
  public async addList(uuid: Uuid, { name, medium }: MinList): Promise<List> {
    const result = await this.query("INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)", [
      uuid,
      name,
      medium,
    ]);
    storeModifications("list", "insert", result);
    if (!Number.isInteger(result.insertId)) {
      throw Error(`invalid ID: ${result.insertId}`);
    }
    return {
      id: result.insertId,
      items: [],
      name,
      medium,
      userUuid: uuid,
    };
  }

  /**
   * Returns all mediums of a list with
   * the list_id.
   */
  public async getList<T extends MultiSingleNumber>(listId: T, media: number[], uuid: Uuid): Promise<ListMedia> {
    const toLoadMedia: Set<number> = new Set();
    // TODO: 29.06.2019 replace with id IN (...)
    const lists = await promiseMultiSingle(listId, async (id: number) => {
      const result = await this.query("SELECT * FROM reading_list WHERE id = ?;", id);
      const list = await this.createShallowList(result[0]);

      for (const itemId of list.items) {
        if (!media.includes(itemId)) {
          toLoadMedia.add(itemId);
        }
      }
      return list;
    });

    const loadedMedia = await this.parentContext.mediumContext.getMedium([...toLoadMedia], uuid);

    return { list: lists, media: loadedMedia };
  }

  public async getShallowList<T extends MultiSingleNumber>(listId: T, uuid: Uuid): PromiseMultiSingle<T, List> {
    // TODO: 29.06.2019 replace with id IN (...)
    return promiseMultiSingle(listId, async (id: number) => {
      const result = await this.query("SELECT * FROM reading_list WHERE uuid = ? AND id = ?;", [uuid, id]);
      return this.createShallowList(result[0]);
    });
  }

  /**
   * Recreates a list from storage.
   */
  public async createShallowList(storageList: StorageList): Promise<List> {
    if (!storageList.name) {
      throw Error(Errors.INVALID_INPUT);
    }

    const list: List = {
      items: [],
      name: storageList.name,
      medium: storageList.medium,
      id: storageList.id,
      userUuid: storageList.user_uuid,
    };

    const result = await this.query("SELECT medium_id FROM list_medium WHERE list_id = ?", storageList.id);
    list.items.push(...result.map((value: any) => value.medium_id));

    return list;
  }

  /**
   * Updates the properties of a list.
   */
  public async updateList(list: List): Promise<boolean> {
    if (!list.userUuid) {
      throw new Error(Errors.INVALID_INPUT);
    }
    const result = await this.update(
      "reading_list",
      (updates, values) => {
        if (list.name) {
          updates.push("name = ?");
          values.push(list.name);
        }

        if (list.medium) {
          updates.push("medium = ?");
          values.push(list.medium);
        }
      },
      {
        column: "id",
        value: list.id,
      },
    );
    storeModifications("list", "update", result);
    return result.changedRows > 0;
  }

  /**
   * Deletes a single list irreversibly.
   */
  public async deleteList(listId: number, uuid: Uuid): Promise<boolean> {
    const result = await this.query("SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?", [listId, uuid]);

    // first check if such a list does exist for the given user
    if (!result.length) {
      return Promise.reject(new Error(Errors.DOES_NOT_EXIST));
    }
    // first remove all links between a list and their media
    let deleteResult = await this.delete("list_medium", { column: "list_id", value: listId });
    storeModifications("list_item", "delete", deleteResult);

    // lastly delete the list itself
    deleteResult = await this.delete("reading_list", { column: "id", value: listId });
    storeModifications("list", "delete", deleteResult);
    return deleteResult.affectedRows > 0;
  }

  /**
   * Returns all available lists for the given user.
   */
  public async getUserLists(uuid: Uuid): Promise<List[]> {
    // query all available lists for user
    const result = await this.query("SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;", [uuid, uuid]);

    // query a shallow list, so that only the id´s of their media is contained
    // @ts-expect-error
    return Promise.all(result.map((value) => this.createShallowList(value)));
  }

  /**
   * Adds a medium to the list.
   *
   * If no listId is available it selects the
   * 'Standard' List of the given user and adds it there.
   */
  public async addItemToList(medium: { id: number | number[]; listId?: number }, uuid?: Uuid): Promise<boolean> {
    // TODO: 27.02.2020 use uuid to check that listId is owned by uuid

    // if list_ident is not a number,
    // then take it as uuid from user and get the standard listId of 'Standard' list
    if (medium.listId == null || !Number.isInteger(medium.listId)) {
      if (!uuid) {
        throw Error(Errors.INVALID_INPUT);
      }
      const idResult = await this.query(
        "SELECT id FROM reading_list WHERE `name` = 'Standard' AND user_uuid = ?;",
        uuid,
      );
      medium.listId = idResult[0].id;
    }
    const result = await this.multiInsert(
      "INSERT IGNORE INTO list_medium (list_id, medium_id) VALUES",
      medium.id,
      (value) => [medium.listId, value],
    );
    let added = false;
    // @ts-expect-error
    multiSingle(result, (value: OkPacket) => {
      storeModifications("list_item", "insert", value);

      if (value.affectedRows > 0) {
        added = true;
      }
    });
    return added;
  }

  /**
   * Moves a medium from an old list to a new list.
   *
   * @return {Promise<boolean>}
   */
  public async moveMedium(oldListId: number, newListId: number, mediumId: number | number[]): Promise<boolean> {
    // first remove medium from old list
    await this.removeMedium(oldListId, mediumId);
    // add item to new list
    return this.addItemToList({ listId: newListId, id: mediumId });
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
      storeModifications("list_item", "delete", result);
      return result.affectedRows > 0;
    });
    return Array.isArray(results) ? results.some((v) => v) : results;
  }
}
