import { SubContext } from "./subContext";
import { ExternalList } from "../../types";
export declare class ExternalListContext extends SubContext {
    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    addExternalList(userUuid: string, externalList: ExternalList): Promise<ExternalList>;
    /**
     * Updates an external list.
     */
    updateExternalList(externalList: ExternalList): Promise<boolean>;
    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(uuid: string, externalListId: number | number[]): Promise<boolean>;
    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    getExternalList(id: number): Promise<ExternalList>;
    /**
     * Creates a shallow external List with only the id´s of their items
     * as list.
     *
     * @param {ExternalList} storageList
     * @return {Promise<ExternalList>}
     */
    createShallowExternalList(storageList: ExternalList): Promise<ExternalList>;
    /**
     * Gets an array of all lists of an user.
     */
    getExternalUserLists(uuid: string): Promise<ExternalList[]>;
    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId: number, mediumId: number): Promise<boolean>;
}
