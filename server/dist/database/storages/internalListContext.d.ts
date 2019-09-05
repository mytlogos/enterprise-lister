import { SubContext } from "./subContext";
import { List, Medium } from "../../types";
export declare class InternalListContext extends SubContext {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     */
    addList(uuid: string, { name, medium }: {
        name: string;
        medium: number;
    }): Promise<List>;
    /**
     * Returns all mediums of a list with
     * the list_id.
     */
    getList(listId: number | number[], media: number[], uuid: string): Promise<{
        list: List[] | List;
        media: Medium[];
    }>;
    /**
     * Recreates a list from storage.
     */
    createShallowList(storageList: {
        id: number;
        name: string;
        medium: number;
        user_uuid: string;
    }): Promise<List>;
    /**
     * Updates the properties of a list.
     */
    updateList(list: List): Promise<boolean>;
    /**
     * Deletes a single list irreversibly.
     */
    deleteList(listId: number, uuid: string): Promise<boolean>;
    /**
     * Returns all available lists for the given user.
     */
    getUserLists(uuid: string): Promise<List[]>;
    /**
     * Moves a medium from an old list to a new list.
     *
     * @return {Promise<boolean>}
     */
    moveMedium(oldListId: number, newListId: number, mediumId: number | number[]): Promise<boolean>;
    /**
     * Removes an item from a list.
     */
    removeMedium(listId: number, mediumId: number | number[], external?: boolean): Promise<boolean>;
}
