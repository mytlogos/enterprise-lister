import {SubContext} from "./subContext";
import {ExternalList, Uuid} from "../../types";
import {Errors, promiseMultiSingle, multiSingle} from "../../tools";
import { storeModifications } from "../sqlTools";
import { OkPacket } from "mysql";

export class ExternalListContext extends SubContext {
    public async getAll(uuid: Uuid): Promise<ExternalList[]> {
        // FIXME: 03.03.2020 this query is invalid
        const result = await this.query(
            "SELECT el.id, el.user_uuid as uuid, el.name, el.medium, el.url " +
            "FROM external_reading_list as el " +
            "INNER JOIN external_user as eu ON el.user_uuid=eu.uuid " +
            "WHERE eu.local_uuid = ?;",
            uuid
        );
        // @ts-ignore
        return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
    }

    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    public async addExternalList(userUuid: Uuid, externalList: ExternalList): Promise<ExternalList> {
        const result = await this.query(
            "INSERT INTO external_reading_list " +
            "(name, user_uuid, medium, url) " +
            "VALUES(?,?,?,?);",
            [externalList.name, userUuid, externalList.medium, externalList.url],
        );
        storeModifications("external_list", "insert", result);
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
    public async updateExternalList(externalList: ExternalList): Promise<boolean> {
        const result = await this.update("external_reading_list", (updates, values) => {
            if (externalList.medium) {
                updates.push("medium = ?");
                values.push(externalList.medium);
            }

            if (externalList.name) {
                updates.push("name = ?");
                values.push(externalList.name);
            }
        }, {column: "user_uuid", value: externalList.id});
        storeModifications("external_list", "delete", result);
        return result.changedRows > 0;
    }

    /**
     * Removes one or multiple externalLists from the given user.
     */
    public async removeExternalList(uuid: Uuid, externalListId: number | number[]): Promise<boolean> {
        // TODO: 29.06.2019 replace with id IN (...) and list_id IN (...)
        // @ts-ignore
        const results = await promiseMultiSingle(externalListId, async (item) => {
            // first delete any references of externalList: list-media links
            let result = await this.delete("external_list_medium", {column: "list_id", value: item});
            storeModifications("external_list_item", "delete", result);

            // then delete list itself
            result = await this.delete("external_reading_list",
                {
                    column: "user_uuid",
                    value: uuid,
                },
                {
                    column: "id",
                    value: item,
                });
            storeModifications("external_list", "delete", result);
            return result.affectedRows > 0;
        });
        return Array.isArray(results) ? results.some(v => v) : results;
    }


    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    public async getExternalList(id: number): Promise<ExternalList> {
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
    public async createShallowExternalList(storageList: ExternalList): Promise<ExternalList> {
        const result = await this.query("SELECT * FROM external_list_medium WHERE list_id = ?;", storageList.id);
        storageList.items = result.map((value: any) => value.medium_id);
        // TODO return input or copy object?
        return storageList;
    }

    /**
     * Gets all external lists from the externalUser from the storage.
     */
    public async getExternalUserLists(uuid: Uuid): Promise<ExternalList[]> {
        const result = await this.query(
            "SELECT id, name, user_uuid as uuid, medium, url" +
            " FROM external_reading_list WHERE user_uuid = ?;",
            uuid
        );
        // @ts-ignore
        return Promise.all(result.map((value: any) => this.createShallowExternalList(value)));
    }

    /**
     * Adds a medium to an external list in the storage.
     */
    public async addItemToExternalList(listId: number, mediumId: number): Promise<boolean> {
        const result = await this.query(
            "INSERT INTO external_list_medium " +
            "(list_id, medium_id) " +
            "VALUES (?,?)",
            [listId, mediumId],
        );
        storeModifications("external_list_item", "insert", result);
        return result.affectedRows > 0;
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
            "INSERT IGNORE INTO external_list_medium (list_id, medium_id) VALUES",
            medium.id,
            (value) => [medium.listId, value]
        );
        let added = false;
        // @ts-expect-error
        multiSingle(result, (value: OkPacket) => {
            storeModifications("external_list_item", "insert", value);

            if (value.affectedRows > 0) {
                added = true
            }
        })
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
                });
            storeModifications("external_list_item", "delete", result);
            return result.affectedRows > 0;
        }).then(() => true);
    }
}
