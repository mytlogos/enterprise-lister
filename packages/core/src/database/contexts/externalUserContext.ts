import { Uuid, Insert } from "../../types";
import { v1 as uuidGenerator } from "uuid";
import { DuplicateEntityError, MissingEntityError } from "../../error";
import { QueryContext } from "./queryContext";
import {
  BasicDisplayExternalUser,
  basicDisplayExternalUser,
  DisplayExternalUser,
  simpleExternalUser,
  SimpleExternalUser,
  SimpleExternalUserListed,
} from "../databaseTypes";
import { sql } from "slonik";

export class ExternalUserContext extends QueryContext {
  public async getAll(uuid: Uuid): Promise<DisplayExternalUser[]> {
    const lists = await this.externalListContext.getAll(uuid);
    const users = await this.con.many(
      sql.type(basicDisplayExternalUser)`
      SELECT
      uuid, local_uuid, identifier, type
      FROM external_user
      WHERE local_uuid = ${uuid};`,
    );

    return users.map((user): DisplayExternalUser => {
      const value = user as DisplayExternalUser;
      value.lists = [];
      for (const list of lists) {
        if (list.userUuid === user.uuid) {
          value.lists.push(list);
        }
      }
      return value;
    });
  }

  /**
   * Adds an external user of an user to the storage.
   */
  public async addExternalUser(localUuid: Uuid, externalUser: Insert<SimpleExternalUser>): Promise<SimpleExternalUser> {
    const result = await this.con.exists(
      sql`SELECT uuid FROM external_user
      WHERE identifier = ${externalUser.identifier} AND local_uuid = ${localUuid} AND type = ${externalUser.type}`,
    );
    if (result) {
      throw new DuplicateEntityError("Duplicate ExternalUser");
    }
    const uuid = uuidGenerator();

    await this.con.query(
      sql`
      INSERT INTO external_user (identifier, uuid, local_uuid, type, cookies)
      VALUES (${externalUser.identifier},${uuid},${localUuid},${externalUser.type},${externalUser.cookies ?? null});`,
    );

    // FIXME: storeModifications("external_user", "insert", insert);

    externalUser.localUuid = localUuid;
    return externalUser as SimpleExternalUser;
  }

  /**
   * Deletes an external user from the storage.
   */
  public async deleteExternalUser(externalUuid: Uuid, userUuid: Uuid): Promise<boolean> {
    // TODO: 27.02.2020 use uuid to check if uuid owns externalUser
    // We need a bottom-up approach to delete,
    // because deleting top-down
    // would violate the foreign keys restraints

    const ownsExternalUser = await this.con.exists(
      sql`SELECT uuid from external_user WHERE uuid = ${externalUuid} AND user_uuid = ${userUuid}`,
    );

    if (!ownsExternalUser) {
      throw Error("trying to delete unowned externalUser");
    }

    // first delete list - medium links
    await this.con.query(
      sql`DELETE FROM external_list_medium
      WHERE list_id
      IN (SELECT id FROM external_reading_list
      WHERE user_uuid =${externalUuid});`,
    );
    // FIXME: storeModifications("external_list_item", "delete", result);

    // proceed to delete lists of external user
    await this.delete("external_reading_list", { column: "user_uuid", value: externalUuid });
    // FIXME: storeModifications("external_list", "delete", result);

    // finish by deleting external user itself
    await this.delete("external_user", { column: "uuid", value: externalUuid });
    // FIXME: storeModifications("external_user", "delete", result);
    return false;
  }

  /**
   * Gets an external user.
   */
  public async getExternalUser(externalUuid: Uuid[]): Promise<readonly SimpleExternalUserListed[]> {
    const resultArray = await this.con.many(
      sql.type(basicDisplayExternalUser)`SELECT identifier, uuid, local_uuid, type, cookies
      FROM external_user WHERE uuid = ANY(${sql.array(externalUuid, "text")});`,
    );
    if (resultArray.length !== externalUuid.length) {
      throw new MissingEntityError("missing queried externalUser");
    }
    return Promise.all(resultArray.map((user) => this.createShallowExternalUser(user)));
  }

  /**
   * Gets an external user with cookies, without items.
   */
  public async getSimpleExternalUser(uuid: Uuid): Promise<SimpleExternalUser> {
    return this.con.one(
      sql.type(simpleExternalUser)`
      SELECT uuid, local_uuid, identifier, type, last_scrape, cookies
      FROM external_user
      WHERE uuid = ${uuid};`,
    );
  }

  /**
   * Return all ExternalUser not scraped in the last seven days.
   */
  public async getScrapeExternalUser(): Promise<readonly SimpleExternalUser[]> {
    return this.con.many(
      sql.type(simpleExternalUser)`
      SELECT uuid, local_uuid, type, cookies, identifier, last_scrape FROM external_user
      WHERE last_scrape IS NULL OR last_scrape < TIMESTAMPADD(day, -7, now())`,
    );
  }

  /**
   *  Creates a ExternalUser with
   *  shallow lists.
   */
  public async createShallowExternalUser(storageUser: BasicDisplayExternalUser): Promise<DisplayExternalUser> {
    const lists = await this.externalListContext.getExternalUserLists(storageUser.uuid);
    const result = storageUser as DisplayExternalUser;
    result.lists = lists;
    return result;
  }

  /**
   * Updates an external user.
   */
  public async updateExternalUser(externalUser: SimpleExternalUser): Promise<boolean> {
    await this.update(
      "external_user",
      () => {
        const updates = [];

        if (externalUser.identifier) {
          updates.push(sql`identifier = ${externalUser.identifier}`);
        }

        if (externalUser.lastScrape) {
          updates.push(sql`last_scrape = ${externalUser.lastScrape ? sql.date(externalUser.lastScrape) : null}`);
        }

        if (externalUser.cookies) {
          updates.push(sql`cookies = ${externalUser.cookies}`);
        } else if (externalUser.cookies == null) {
          updates.push(sql`cookies = NULL`);
        }
        return updates;
      },
      { column: "uuid", value: externalUser.uuid },
    );
    // FIXME: storeModifications("external_user", "update", result);
    return false;
  }
}
