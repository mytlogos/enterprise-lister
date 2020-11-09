import {SubContext} from "./subContext";
import {List, Medium, Uuid} from "../../types";
import {Errors, promiseMultiSingle} from "../../tools";
import { storeModifications } from "../sqlTools";

export class InternalListContext extends SubContext {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    public async addList(uuid: Uuid, {name, medium}: { name: string; medium: number }): Promise<List> {
        const result = await this.query(
            "INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)",
            [uuid, name, medium],
        );
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
    public async getList(listId: number | number[], media: number[], uuid: Uuid):
        Promise<{ list: List[] | List; media: Medium[] }> {

        const toLoadMedia: Set<number> = new Set();
        // TODO: 29.06.2019 replace with id IN (...)
        // @ts-ignore
        const lists: List | List[] = await promiseMultiSingle(listId, async (id: number) => {
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

        return {list: lists, media: loadedMedia};
    }

    /**
     * Recreates a list from storage.
     */
    public async createShallowList(storageList:
                                       { id: number; name: string; medium: number; user_uuid: Uuid },
    ): Promise<List> {

        if (!storageList.name) {
            // @ts-ignore
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
            return Promise.reject(new Error(Errors.INVALID_INPUT));
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
    public async deleteList(listId: number, uuid: Uuid): Promise<boolean> {
        const result = await this.query(
            "SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?",
            [listId, uuid],
        );

        // first check if such a list does exist for the given user
        if (!result.length) {
            return Promise.reject(new Error(Errors.DOES_NOT_EXIST));
        }
        // first remove all links between a list and their media
        await this.delete("list_medium", {column: "list_id", value: listId});
        // lastly delete the list itself
        return this.delete("reading_list", {column: "id", value: listId});
    }

    /**
     * Returns all available lists for the given user.
     */
    public async getUserLists(uuid: Uuid): Promise<List[]> {
        // query all available lists for user
        const result = await this.query(
            "SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;",
            [uuid, uuid],
        );

        // query a shallow list, so that only the id´s of their media is contained
        // @ts-ignore
        return Promise.all(result.map((value) => this.createShallowList(value)));
    }

    /**
     * Adds a medium to the list.
     *
     * If no listId is available it selects the
     * 'Standard' List of the given user and adds it there.
     */
    public async addItemToList(medium: { id: number | number[]; listId?: number }, uuid?: Uuid)
        : Promise<boolean> {
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
            (value) => [medium.listId, value]
        );
        storeModifications("list_item", "insert", result);
        return result.affectedRows > 0;
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
        return this.addItemToList( {listId: newListId, id: mediumId});
    }

    /**
     * Removes an item from a list.
     */
    public async removeMedium(listId: number, mediumId: number | number[], external = false): Promise<boolean> {
        await promiseMultiSingle(mediumId, (value) => {
            return this.delete("list_medium", {
                column: "list_id",
                value: listId,
            }, {
                column: "medium_id",
                value,
            });
        });
        return true;
    }
}
