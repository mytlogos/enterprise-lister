import { SubContext } from "./subContext";
import { ExternalUser, Uuid, MultiSingleValue, PromiseMultiSingle, DisplayExternalUser, TypedQuery } from "../../types";
import { Errors, promiseMultiSingle } from "../../tools";
import { v1 as uuidGenerator } from "uuid";
import { storeModifications } from "../sqlTools";
import { ExternalStorageUser } from "../../externals/types";

export class ExternalUserContext extends SubContext {
  public async getAll(uuid: Uuid): Promise<TypedQuery<DisplayExternalUser>> {
    const lists = await this.parentContext.externalListContext.getAll(uuid);
    return this.queryStream(
      "SELECT uuid, local_uuid as localUuid, name as identifier, service as type FROM external_user " +
        "WHERE local_uuid = ?;",
      uuid,
    ).on("result", (row) => {
      row.lists = [];
      for (const list of lists) {
        if (list.uuid === row.uuid) {
          row.lists.push(list);
        }
      }
    });
  }

  /**
   * Adds an external user of an user to the storage.
   */
  public async addExternalUser(localUuid: Uuid, externalUser: ExternalUser): Promise<ExternalUser> {
    let result = await this.query(
      "SELECT * FROM external_user " + "WHERE name = ? " + "AND local_uuid = ? " + "AND service = ?",
      [externalUser.identifier, localUuid, externalUser.type],
    );
    if (result.length) {
      throw Error(Errors.USER_EXISTS_ALREADY);
    }
    const uuid = uuidGenerator();

    result = await this.query(
      "INSERT INTO external_user " + "(name, uuid, local_uuid, service, cookies) " + "VALUES (?,?,?,?,?);",
      [externalUser.identifier, uuid, localUuid, externalUser.type, externalUser.cookies],
    );
    storeModifications("external_user", "insert", result);

    if (!result.affectedRows) {
      return Promise.reject(new Error(Errors.UNKNOWN));
    }
    externalUser.localUuid = localUuid;
    return externalUser;
  }

  /**
   * Deletes an external user from the storage.
   */
  public async deleteExternalUser(externalUuid: Uuid, userUuid: Uuid): Promise<boolean> {
    // TODO: 27.02.2020 use uuid to check if uuid owns externalUser
    // We need a bottom-up approach to delete,
    // because deleting top-down
    // would violate the foreign keys restraints

    // first delete list - medium links
    let result = await this.query(
      "DELETE FROM external_list_medium " +
        "WHERE list_id " +
        "IN (SELECT id FROM external_reading_list " +
        "WHERE user_uuid =?);",
      externalUuid,
    );
    storeModifications("external_list_item", "delete", result);

    // proceed to delete lists of external user
    result = await this.delete("external_reading_list", { column: "user_uuid", value: externalUuid });
    storeModifications("external_list", "delete", result);

    // finish by deleting external user itself
    result = await this.delete("external_user", { column: "uuid", value: externalUuid });
    storeModifications("external_user", "delete", result);
    return result.affectedRows > 0;
  }

  /**
   * Gets an external user.
   */
  public async getExternalUser<T extends MultiSingleValue<Uuid>>(externalUuid: T): PromiseMultiSingle<T, ExternalUser> {
    return promiseMultiSingle(externalUuid, async (value) => {
      const resultArray: any[] = await this.query("SELECT * FROM external_user WHERE uuid = ?;", value);
      if (!resultArray.length) {
        throw Error("No result found for given uuid");
      }
      return this.createShallowExternalUser(resultArray[0]);
    });
  }

  /**
   * Gets an external user with cookies, without items.
   */
  public async getExternalUserWithCookies(uuid: Uuid): Promise<ExternalStorageUser> {
    const value = await this.query(
      "SELECT uuid, local_uuid, service, cookies FROM external_user WHERE uuid = ?;",
      uuid,
    );
    return {
      uuid: value[0].uuid,
      userUuid: value[0].local_uuid,
      type: value[0].service,
      cookies: value[0].cookies,
    };
  }

  /**
   * Return all ExternalUser not scraped in the last seven days.
   */
  public async getScrapeExternalUser(): Promise<ExternalUser[]> {
    const result = await this.query(
      "SELECT uuid, local_uuid, service, cookies, name, last_scrape FROM external_user " +
        "WHERE last_scrape IS NULL OR last_scrape < TIMESTAMPADD(day, -7, now())",
    );

    return result.map(
      (value: any): ExternalUser => {
        return {
          uuid: value.uuid,
          localUuid: value.local_uuid,
          type: value.service,
          cookies: value.cookies,
          identifier: value.name,
          lastScrape: value.last_scrape && new Date(value.last_scrape),
          lists: [],
        };
      },
    );
  }

  /**
   *  Creates a ExternalUser with
   *  shallow lists.
   */
  public async createShallowExternalUser(storageUser: {
    name: string;
    uuid: Uuid;
    service: number;
    local_uuid: Uuid;
  }): Promise<ExternalUser> {
    const externalUser: ExternalUser = {
      identifier: storageUser.name,
      uuid: storageUser.uuid,
      type: storageUser.service,
      lists: [],
      localUuid: storageUser.local_uuid,
    };
    externalUser.lists = await this.parentContext.externalListContext.getExternalUserLists(externalUser.uuid);
    return externalUser;
  }

  /**
   * Updates an external user.
   */
  public async updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
    const result = await this.update(
      "external_user",
      (updates, values) => {
        if (externalUser.identifier) {
          updates.push("name = ?");
          values.push(externalUser.identifier);
        }

        if (externalUser.lastScrape) {
          updates.push("last_scrape = ?");
          values.push(externalUser.lastScrape);
        }

        if (externalUser.cookies) {
          updates.push("cookies = ?");
          values.push(externalUser.cookies);
        } else if (externalUser.cookies == null) {
          updates.push("cookies = NULL");
        }
      },
      { column: "uuid", value: externalUser.uuid },
    );
    storeModifications("external_user", "update", result);
    return result.changedRows > 0;
  }
}
