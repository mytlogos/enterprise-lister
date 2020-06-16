"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
const uuid_1 = require("uuid");
class ExternalUserContext extends subContext_1.SubContext {
    async getAll(uuid) {
        const lists = await this.parentContext.externalListContext.getAll(uuid);
        return this
            .queryStream("SELECT uuid, local_uuid as localUuid, name as identifier, service as type FROM external_user " +
            "WHERE local_uuid = ?;", uuid)
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
    async addExternalUser(localUuid, externalUser) {
        let result = await this.query("SELECT * FROM external_user " +
            "WHERE name = ? " +
            "AND local_uuid = ? " +
            "AND service = ?", [externalUser.identifier, localUuid, externalUser.type]);
        if (result.length) {
            // @ts-ignore
            throw Error(tools_1.Errors.USER_EXISTS_ALREADY);
        }
        const uuid = uuid_1.v1();
        result = await this.query("INSERT INTO external_user " +
            "(name, uuid, local_uuid, service, cookies) " +
            "VALUES (?,?,?,?,?);", [externalUser.identifier, uuid, localUuid, externalUser.type, externalUser.cookies]);
        if (!result.affectedRows) {
            return Promise.reject(new Error(tools_1.Errors.UNKNOWN));
        }
        externalUser.localUuid = localUuid;
        return externalUser;
    }
    /**
     * Deletes an external user from the storage.
     */
    async deleteExternalUser(externalUuid) {
        // We need a bottom-up approach to delete,
        // because deleting top-down
        // would violate the foreign keys restraints
        // first delete list - medium links
        await this.query("DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid =?);", externalUuid);
        // proceed to delete lists of external user
        await this.delete("external_reading_list", { column: "user_uuid", value: externalUuid });
        // finish by deleting external user itself
        return this.delete("external_user", { column: "uuid", value: externalUuid });
    }
    /**
     * Gets an external user.
     */
    async getExternalUser(externalUuid) {
        return tools_1.promiseMultiSingle(externalUuid, async (value) => {
            const resultArray = await this.query("SELECT * FROM external_user WHERE uuid = ?;", value);
            if (!resultArray.length) {
                throw Error("No result found for given uuid");
            }
            return this.createShallowExternalUser(resultArray[0]);
        });
    }
    /**
     * Gets an external user with cookies, without items.
     */
    async getExternalUserWithCookies(uuid) {
        const value = await this.query("SELECT uuid, local_uuid, service, cookies FROM external_user WHERE uuid = ?;", uuid);
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
    async getScrapeExternalUser() {
        const result = await this.query("SELECT uuid, local_uuid, service, cookies, name, last_scrape FROM external_user " +
            "WHERE last_scrape IS NULL OR last_scrape > NOW() - 7");
        return result.map((value) => {
            return {
                uuid: value.uuid,
                localUuid: value.local_uuid,
                type: value.service,
                cookies: value.cookies,
                identifier: value.name,
                lastScrape: value.last_scrape && new Date(value.last_scrape),
                lists: [],
            };
        });
    }
    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     */
    async createShallowExternalUser(storageUser) {
        const externalUser = {
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
    updateExternalUser(externalUser) {
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
            }
            else if (externalUser.cookies == null) {
                updates.push("cookies = NULL");
            }
        }, { column: "uuid", value: externalUser.uuid });
    }
}
exports.ExternalUserContext = ExternalUserContext;
//# sourceMappingURL=externalUserContext.js.map