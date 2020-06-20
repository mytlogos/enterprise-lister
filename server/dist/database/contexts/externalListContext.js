"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
class ExternalListContext extends subContext_1.SubContext {
    async getAll(uuid) {
        // FIXME: 03.03.2020 this query is invalid
        const result = await this.query("SELECT el.id, el.user_uuid as uuid, el.name, el.medium, el.url " +
            "FROM external_reading_list as el " +
            "INNER JOIN external_user as eu ON el.user_uuid=eu.uuid " +
            "WHERE eu.local_uuid = ?;", uuid);
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowExternalList(value)));
    }
    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    async addExternalList(userUuid, externalList) {
        const result = await this.query("INSERT INTO external_reading_list " +
            "(name, user_uuid, medium, url) " +
            "VALUES(?,?,?,?);", [externalList.name, userUuid, externalList.medium, externalList.url]);
        const insertId = result.insertId;
        if (!Number.isInteger(insertId)) {
            throw Error(`invalid ID ${insertId}`);
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
    updateExternalList(externalList) {
        return this.update("external_reading_list", (updates, values) => {
            if (externalList.medium) {
                updates.push("medium = ?");
                values.push(externalList.medium);
            }
            if (externalList.name) {
                updates.push("name = ?");
                values.push(externalList.name);
            }
        }, { column: "user_uuid", value: externalList.id });
    }
    /**
     * Removes one or multiple externalLists from the given user.
     */
    async removeExternalList(uuid, externalListId) {
        // TODO: 29.06.2019 replace with id IN (...) and list_id IN (...)
        // @ts-ignore
        return tools_1.promiseMultiSingle(externalListId, async (item) => {
            // first delete any references of externalList: list-media links
            await this.delete("external_list_medium", { column: "list_id", value: item });
            // then delete list itself
            return this.delete("external_reading_list", {
                column: "user_uuid",
                value: uuid,
            }, {
                column: "id",
                value: item,
            });
        });
    }
    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    async getExternalList(id) {
        const result = await this.query("SELECT * FROM external_reading_list WHERE id = ?", id);
        return this.createShallowExternalList(result[0]);
    }
    /**
     * Creates a shallow external List with only the id´s of their items
     * as list.
     *
     * @param {ExternalList} storageList
     * @return {Promise<ExternalList>}
     */
    async createShallowExternalList(storageList) {
        const result = await this.query("SELECT * FROM external_list_medium WHERE list_id = ?;", storageList.id);
        storageList.items = result.map((value) => value.medium_id);
        // todo return input or copy object?
        return storageList;
    }
    /**
     * Gets an array of all lists of an user.
     */
    async getExternalUserLists(uuid) {
        const result = await this.query("SELECT id, name, user_uuid as uuid, medium, url" +
            " FROM external_reading_list WHERE uuid = ?;", uuid);
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowExternalList(value)));
    }
    /**
     * Adds a medium to an external list in the storage.
     */
    async addItemToExternalList(listId, mediumId) {
        const result = await this.query("INSERT INTO external_list_medium " +
            "(list_id, medium_id) " +
            "VALUES (?,?)", [listId, mediumId]);
        return result.affectedRows > 0;
    }
    /**
     * Adds a medium to the list.
     *
     * If no listId is available it selects the
     * 'Standard' List of the given user and adds it there.
     */
    async addItemToList(medium, uuid) {
        // if list_ident is not a number,
        // then take it as uuid from user and get the standard listId of 'Standard' list
        if (medium.listId == null || !Number.isInteger(medium.listId)) {
            if (!uuid) {
                throw Error(tools_1.Errors.INVALID_INPUT);
            }
            const idResult = await this.query("SELECT id FROM reading_list WHERE `name` = 'Standard' AND user_uuid = ?;", uuid);
            medium.listId = idResult[0].id;
        }
        const result = await this.multiInsert(`INSERT IGNORE INTO external_list_medium (list_id, medium_id) VALUES`, medium.id, (value) => [medium.listId, value]);
        return result.affectedRows > 0;
    }
    /**
     * Removes an item from a list.
     */
    removeMedium(listId, mediumId) {
        return tools_1.promiseMultiSingle(mediumId, (value) => {
            return this.delete("external_list_medium", {
                column: "list_id",
                value: listId,
            }, {
                column: "medium_id",
                value,
            });
        }).then(() => true);
    }
}
exports.ExternalListContext = ExternalListContext;
//# sourceMappingURL=externalListContext.js.map