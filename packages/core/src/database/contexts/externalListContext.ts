import { Id, Insert, Uuid } from "../../types";
import { promiseMultiSingle } from "../../tools";
import { QueryContext } from "./queryContext";
import { sql } from "slonik";
import { entity, ExternalList, simpleExternalList, SimpleExternalList } from "../databaseTypes";
import { isString } from "validate.js";

export type UpdateExternalList = Partial<ExternalList> & { id: Id };

export class ExternalListContext extends QueryContext {
  public async getAll(uuid: Uuid): Promise<ExternalList[]> {
    // FIXME: 03.03.2020 this query is invalid, really???
    const result = await this.con.any(
      sql`SELECT 
        el.id, el.user_uuid, el.name, el.medium, el.url
        FROM external_reading_list as el
        INNER JOIN external_user as eu ON el.user_uuid=eu.uuid
        WHERE eu.local_uuid = ${uuid};`,
    );
    return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
  }

  /**
   * Adds an external list of an user to the storage.
   */
  public async addExternalList(
    externalUserUuid: Uuid,
    externalList: Insert<SimpleExternalList>,
  ): Promise<SimpleExternalList> {
    return this.con.one(
      sql.type(simpleExternalList)`
      INSERT INTO external_reading_list (name, user_uuid, medium, url)
      VALUES(${externalList.name},${externalUserUuid},${externalList.medium},${externalList.url})
      RETURNING id, name, user_uuid, medium, url;`,
    );
  }

  /**
   * Updates an external list.
   */
  public async updateExternalList(externalList: UpdateExternalList): Promise<boolean> {
    await this.update(
      "external_reading_list",
      () => {
        const updates = [];
        if (externalList.medium) {
          updates.push(sql`medium = ${externalList.medium}`);
        }

        if (externalList.name) {
          updates.push(sql`name = ${externalList.name}`);
        }
        return updates;
      },
      { column: "user_uuid", value: externalList.id },
    );
    // FIXME: storeModifications("external_list", "delete", result);
    return false;
  }

  /**
   * Removes one or multiple externalLists from the given user.
   */
  public async removeExternalList(uuid: Uuid, externalListId: number | number[]): Promise<boolean> {
    // TODO: 29.06.2019 replace with id IN (...) and list_id IN (...)
    const results = await promiseMultiSingle(externalListId, async (item) => {
      // first delete any references of externalList: list-media links
      await this.delete("external_list_medium", {
        column: "list_id",
        value: item,
      });
      // FIXME: storeModifications("external_list_item", "delete", result);

      // then delete list itself
      await this.delete(
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
      // FIXME: storeModifications("external_list", "delete", result);
      return false;
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
    const result = await this.con.one(
      sql.type(simpleExternalList)`
      SELECT id, name, user_uuid, medium, url
      FROM external_reading_list
      WHERE id = ${id}`,
    );
    return this.createShallowExternalList(result);
  }

  /**
   * Creates a shallow external List with only the id´s of their items
   * as list.
   *
   * @param {ExternalList} storageList
   * @return {Promise<ExternalList>}
   */
  public async createShallowExternalList(storageList: SimpleExternalList): Promise<ExternalList> {
    const result = await this.con.manyFirst(
      sql.type(entity)`SELECT id FROM external_list_medium WHERE list_id = ${storageList.id};`,
    );
    return {
      ...storageList,
      items: [...result],
    };
  }

  /**
   * Gets all external lists from the externalUser from the storage.
   */
  public async getExternalUserLists(uuid: Uuid): Promise<ExternalList[]> {
    const result = await this.con.any(
      sql`SELECT id, name, user_uuid, medium, url
      FROM external_reading_list
      WHERE user_uuid = ${uuid};`,
    );
    return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
  }

  /**
   * Adds a medium to an external list in the storage.
   */
  public async addItemToList(listId: number, mediumId: number): Promise<boolean> {
    await this.con.query(sql`INSERT INTO external_list_medium (list_id, medium_id) VALUES (${listId},${mediumId});`);
    // FIXME: storeModifications("external_list_item", "insert", result);
    return false;
  }

  /**
   * Adds a medium to the list.
   *
   * If no listId is available it selects the
   * 'Standard' List of the given user and adds it there.
   */
  public async addItemsToList(mediumIds: number[], listIdOrUuid: Uuid | number): Promise<boolean> {
    // if list_ident is not a number,
    // then take it as uuid from user and get the standard listId of 'Standard' list
    let listId: number;
    if (isString(listIdOrUuid)) {
      listId = await this.con.oneFirst(
        sql.type(entity)`SELECT id FROM reading_list WHERE name = 'Standard' AND user_uuid = ${listIdOrUuid};`,
      );
    } else {
      listId = listIdOrUuid as number;
    }

    const values = mediumIds.map((value) => [listId, value]);

    await this.con.query(
      sql`INSERT INTO external_list_medium (list_id, medium_id)
      SELECT * FROM ${sql.unnest(values, ["int8", "in8"])}
      ON CONFLICT DO NOTHING;`,
    );
    // let added = false;

    // multiSingle(result, (value) => {
    //   // FIXME: storeModifications("external_list_item", "insert", value);

    //   if (value.rowCount > 0) {
    //     added = true;
    //   }
    // });
    return false;
  }

  /**
   * Removes an item from an external list.
   */
  public async removeMedium(listId: number, mediumId: number | number[]): Promise<boolean> {
    const changed = await promiseMultiSingle(mediumId, async (value) => {
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
      // FIXME: storeModifications("external_list_item", "delete", result);
      return result.rowCount > 0;
    });
    return Array.isArray(changed) ? changed.reduce((p, c) => p || c) : changed;
  }
}
