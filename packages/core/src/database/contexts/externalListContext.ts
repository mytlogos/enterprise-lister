import { SubContext } from "./subContext";
import { Entity, ExternalList, Id, Insert, Uuid } from "../../types";
import { promiseMultiSingle, multiSingle } from "../../tools";
import { storeModifications } from "../sqlTools";
import { DatabaseError, ValidationError } from "../../error";

export type UpdateExternalList = Partial<ExternalList> & { id: Id };

export class ExternalListContext extends SubContext {
  public async getAll(uuid: Uuid): Promise<ExternalList[]> {
    // FIXME: 03.03.2020 this query is invalid
    const result = await this.select(
      "SELECT el.id, el.user_uuid as uuid, el.name, el.medium, el.url " +
        "FROM external_reading_list as el " +
        "INNER JOIN external_user as eu ON el.user_uuid=eu.uuid " +
        "WHERE eu.local_uuid = ?;",
      uuid,
    );
    return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
  }

  /**
   * Adds an external list of an user to the storage.
   *
   * @param {string} userUuid
   * @param {ExternalList} externalList
   * @return {Promise<ExternalList>}
   */
  public async addExternalList(userUuid: Uuid, externalList: Insert<ExternalList>): Promise<ExternalList> {
    const result = await this.query<Entity>(
      "INSERT INTO external_reading_list " + "(name, user_uuid, medium, url) " + "VALUES(?,?,?,?) RETURNING id;",
      [externalList.name, userUuid, externalList.medium, externalList.url],
    );
    storeModifications("external_list", "insert", result);
    const insertId = result.rows[0].id;

    if (!Number.isInteger(insertId)) {
      throw new DatabaseError(`invalid ID ${insertId + ""}`);
    }

    return {
      id: insertId,
      name: externalList.name,
      medium: externalList.medium,
      url: externalList.url,
      items: [],
    };
  }

  /**
   * Updates an external list.
   */
  public async updateExternalList(externalList: UpdateExternalList): Promise<boolean> {
    const result = await this.update(
      "external_reading_list",
      (updates, values) => {
        if (externalList.medium) {
          updates.push("medium = ?");
          values.push(externalList.medium);
        }

        if (externalList.name) {
          updates.push("name = ?");
          values.push(externalList.name);
        }
      },
      { column: "user_uuid", value: externalList.id },
    );
    storeModifications("external_list", "delete", result);
    return result.rowCount > 0;
  }

  /**
   * Removes one or multiple externalLists from the given user.
   */
  public async removeExternalList(uuid: Uuid, externalListId: number | number[]): Promise<boolean> {
    // TODO: 29.06.2019 replace with id IN (...) and list_id IN (...)
    const results = await promiseMultiSingle(externalListId, async (item) => {
      // first delete any references of externalList: list-media links
      let result = await this.delete("external_list_medium", {
        column: "list_id",
        value: item,
      });
      storeModifications("external_list_item", "delete", result);

      // then delete list itself
      result = await this.delete(
        "external_reading_list",
        {
          column: "user_uuid",
          value: uuid,
        },
        {
          column: "id",
          value: item,
        },
      );
      storeModifications("external_list", "delete", result);
      return result.rowCount > 0;
    });
    return Array.isArray(results) ? results.some((v) => v) : results;
  }

  /**
   * Gets an external list from the storage.
   *
   * @param {number} id
   * @return {Promise<ExternalList>}
   */
  public async getExternalList(id: number): Promise<ExternalList> {
    const result = await this.select<ExternalList>("SELECT * FROM external_reading_list WHERE id = ?", id);
    return this.createShallowExternalList(result[0]);
  }

  /**
   * Creates a shallow external List with only the id´s of their items
   * as list.
   *
   * @param {ExternalList} storageList
   * @return {Promise<ExternalList>}
   */
  public async createShallowExternalList(storageList: ExternalList): Promise<ExternalList> {
    const result = await this.select("SELECT * FROM external_list_medium WHERE list_id = ?;", storageList.id);
    storageList.items = result.map((value: any) => value.medium_id);
    // TODO return input or copy object?
    return storageList;
  }

  /**
   * Gets all external lists from the externalUser from the storage.
   */
  public async getExternalUserLists(uuid: Uuid): Promise<ExternalList[]> {
    const result = await this.select(
      "SELECT id, name, user_uuid as uuid, medium, url" + " FROM external_reading_list WHERE user_uuid = ?;",
      uuid,
    );
    return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
  }

  /**
   * Adds a medium to an external list in the storage.
   */
  public async addItemToExternalList(listId: number, mediumId: number): Promise<boolean> {
    const result = await this.query("INSERT INTO external_list_medium " + "(list_id, medium_id) " + "VALUES (?,?)", [
      listId,
      mediumId,
    ]);
    storeModifications("external_list_item", "insert", result);
    return result.rowCount > 0;
  }

  /**
   * Adds a medium to the list.
   *
   * If no listId is available it selects the
   * 'Standard' List of the given user and adds it there.
   */
  public async addItemToList(medium: { id: number | number[]; listId?: number }, uuid?: Uuid): Promise<boolean> {
    // if list_ident is not a number,
    // then take it as uuid from user and get the standard listId of 'Standard' list
    if (medium.listId == null || !Number.isInteger(medium.listId)) {
      if (!uuid) {
        throw new ValidationError("missing uuid parameter");
      }
      const idResult = await this.select<{ id: number }>(
        "SELECT id FROM reading_list WHERE name = 'Standard' AND user_uuid = ?;",
        uuid,
      );
      medium.listId = idResult[0].id;
    }
    const result = await this.multiInsert(
      "INSERT INTO external_list_medium (list_id, medium_id) VALUES",
      medium.id,
      (value) => [medium.listId, value],
      true,
    );
    let added = false;

    multiSingle(result, (value) => {
      storeModifications("external_list_item", "insert", value);

      if (value.rowCount > 0) {
        added = true;
      }
    });
    return added;
  }

  /**
   * Removes an item from an external list.
   */
  public removeMedium(listId: number, mediumId: number | number[]): Promise<boolean> {
    return promiseMultiSingle(mediumId, async (value) => {
      const result = await this.delete(
        "external_list_medium",
        {
          column: "list_id",
          value: listId,
        },
        {
          column: "medium_id",
          value,
        },
      );
      storeModifications("external_list_item", "delete", result);
      return result.rowCount > 0;
    }).then(() => true);
  }
}
