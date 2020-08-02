import { List, Medium } from "../../types";
export declare class InternalListStorage {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    addList(uuid: string, list: {
        name: string;
        medium: number;
    }): Promise<List>;
    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<SimpleMedium>}>}
     */
    getList(listId: number | number[], media: number[], uuid: string): Promise<{
        list: List | List[];
        media: Medium[];
    }>;
    /**
     * Updates the properties of a list.
     */
    updateList(list: List): Promise<boolean>;
    /**
     * Deletes a list irreversibly.
     */
    deleteList(listId: number, uuid: string): Promise<boolean>;
    /**
     * Returns all available lists for the given user.
     *
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid: string): Promise<List[]>;
    /**
     * Adds a medium to a list.
     */
    addItemToList(listId: number, mediumId: number | number[]): Promise<boolean>;
    /**
     * Moves a medium from an old list to a new list.
     */
    moveMedium(oldListId: number, newListId: number, mediumId: number | number[]): Promise<boolean>;
    /**
     * Removes an item from a list.
     */
    removeMedium(listId: number, mediumId: number | number[]): Promise<boolean>;
}
