"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const subContext_1 = require("./subContext");
const tools_1 = require("../../tools");
class InternalListContext extends subContext_1.SubContext {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    async addList(uuid, { name, medium }) {
        const result = await this.query("INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)", [uuid, name, medium]);
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
    async getList(listId, media, uuid) {
        const toLoadMedia = new Set();
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        const lists = await tools_1.promiseMultiSingle(listId, async (id) => {
            const result = await this.query("SELECT * FROM reading_list WHERE id = ?;", id);
            const list = await this.createShallowList(result[0]);
            for (const itemId of list.items) {
                if (!media.includes(itemId)) {
                    toLoadMedia.add(itemId);
                }
            }
            return list;
        });
        const loadedMedia = await this.getMedium([...toLoadMedia], uuid);
        return { list: lists, media: loadedMedia };
    }
    /**
     * Recreates a list from storage.
     */
    async createShallowList(storageList) {
        if (!storageList.name) {
            // @ts-ignore
            throw Error(tools_1.Errors.INVALID_INPUT);
        }
        const list = {
            items: [],
            name: storageList.name,
            medium: storageList.medium,
            id: storageList.id,
            userUuid: storageList.user_uuid,
        };
        const result = await this.query("SELECT medium_id FROM list_medium WHERE list_id = ?", storageList.id);
        await list.items.push(...result.map((value) => value.medium_id));
        return list;
    }
    /**
     * Updates the properties of a list.
     */
    async updateList(list) {
        if (!list.userUuid) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        return this.update("reading_list", (updates, values) => {
            if (list.name) {
                updates.push("name = ?");
                values.push(list.name);
            }
            if (list.medium) {
                updates.push("medium = ?");
                values.push(list.medium);
            }
        }, {
            column: "id",
            value: list.id
        });
    }
    /**
     * Deletes a single list irreversibly.
     */
    async deleteList(listId, uuid) {
        const result = await this.query("SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?", [listId, uuid]);
        // first check if such a list does exist for the given user
        if (!result.length) {
            return Promise.reject(new Error(tools_1.Errors.DOES_NOT_EXIST));
        }
        // first remove all links between a list and their media
        await this.delete("list_medium", { column: "list_id", value: listId });
        // lastly delete the list itself
        return this.delete("reading_list", { column: "id", value: listId });
    }
    /**
     * Returns all available lists for the given user.
     */
    async getUserLists(uuid) {
        // query all available lists for user
        const result = await this.query("SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;", [uuid, uuid]);
        // query a shallow list, so that only the id´s of their media is contained
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowList(value)));
    }
    /**
     * Moves a medium from an old list to a new list.
     *
     * @return {Promise<boolean>}
     */
    async moveMedium(oldListId, newListId, mediumId) {
        // first remove medium from old list
        await this.removeMedium(oldListId, mediumId);
        // add item to new list
        return this.addItemToList(false, { listId: newListId, id: mediumId });
    }
    /**
     * Removes an item from a list.
     */
    removeMedium(listId, mediumId, external = false) {
        const table = external ? "external_list_medium" : "list_medium";
        return tools_1.promiseMultiSingle(mediumId, (value) => {
            return this.delete(table, {
                column: "list_id",
                value: listId,
            }, {
                column: "medium_id",
                value,
            });
        }).then(() => true);
    }
}
exports.InternalListContext = InternalListContext;
//# sourceMappingURL=internalListContext.js.map