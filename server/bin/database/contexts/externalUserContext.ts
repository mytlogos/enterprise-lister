import {SubContext} from "./subContext";
import {ExternalUser} from "../../types";
import {Errors} from "../../tools";
import uuidGenerator from "uuid/v1";
import {Query} from "mysql";

export class ExternalUserContext extends SubContext {
    public async getAll(uuid: string): Promise<Query> {
        const lists = await this.parentContext.externalListContext.getAll(uuid);
        return this
            .queryStream(
                "SELECT uuid, local_uuid as localUuid, name as identifier, service as type FROM external_user " +
                "WHERE local_uuid = ?;",
                uuid
            )
            .on("result", (row) => {
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
    public async addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser> {
        let result = await this.query("SELECT * FROM external_user " +
            "WHERE name = ? " +
            "AND local_uuid = ? " +
            "AND service = ?",
            [externalUser.identifier, localUuid, externalUser.type],
        );
        if (result.length) {
            // @ts-ignore
            throw Error(Errors.USER_EXISTS_ALREADY);
        }
        const uuid = uuidGenerator();

        result = await this.query("INSERT INTO external_user " +
            "(name, uuid, local_uuid, service, cookies) " +
            "VALUES (?,?,?,?,?);",
            [externalUser.identifier, uuid, localUuid, externalUser.type, externalUser.cookies],
        );

        if (!result.affectedRows) {
            return Promise.reject(new Error(Errors.UNKNOWN));
        }
        externalUser.localUuid = localUuid;
        return externalUser;
    }

    /**
     * Deletes an external user from the storage.
     */
    public async deleteExternalUser(externalUuid: string): Promise<boolean> {
        // We need a bottom-up approach to delete,
        // because deleting top-down
        // would violate the foreign keys restraints

        // first delete list - medium links
        await this.query(
            "DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid =?);"
            , externalUuid,
        );
        // proceed to delete lists of external user
        await this.delete("external_reading_list", {column: "user_uuid", value: externalUuid});
        // finish by deleting external user itself
        return this.delete("external_user", {column: "uuid", value: externalUuid});
    }

    /**
     * Gets an external user.
     */
    public async getExternalUser(externalUuid: string): Promise<ExternalUser> {
        const resultArray: any[] = await this.query("SELECT * FROM external_user WHERE uuid = ?;", externalUuid);
        return this.createShallowExternalUser(resultArray[0]);
    }

    /**
     * Gets an external user with cookies, without items.
     */
    public async getExternalUserWithCookies(uuid: string)
        : Promise<{ userUuid: string, type: number, uuid: string, cookies: string }> {

        const value = await this.query(
            "SELECT uuid, local_uuid, service, cookies FROM external_user WHERE uuid = ?;",
            uuid);
        return {
            uuid: value[0].uuid,
            userUuid: value[0].local_uuid,
            type: value[0].service,
            cookies: value[0].cookies,
        };
    }

    /**
     *
     */
    public async getScrapeExternalUser():
        Promise<Array<{ userUuid: string, type: number, uuid: string, cookies: string }>> {

        const result = await this.query(
            "SELECT uuid, local_uuid, service, cookies FROM external_user " +
            "WHERE last_scrape IS NULL OR last_scrape > NOW() - 7",
        );

        return result.map((value: any) => {
            return {
                uuid: value.uuid,
                userUuid: value.local_uuid,
                type: value.service,
                cookies: value.cookies,
            };
        });
    }

    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     */
    public async createShallowExternalUser(storageUser: {
        name: string, uuid: string, service: number, local_uuid: string
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
    public updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
        return this.update("external_user", (updates, values) => {
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
        }, {column: "uuid", value: externalUser.uuid});
    }
}
