import { ExternalList } from "../../types";
export declare class ExternalListStorage {
    /**
     * Adds an external list of an user to the storage.
     */
    addExternalList(userUuid: string, externalList: ExternalList): Promise<ExternalList>;
    /**
     * Updates an external list.
     */
    updateExternalList(externalList: ExternalList): Promise<boolean>;
    /**
     * Removes one or multiple externalLists from the given user.
     */
    removeExternalList(externalUuid: string, externalListId: number | number[]): Promise<boolean>;
    /**
     * Gets an external list from the storage.
     */
    getExternalList(id: number): Promise<ExternalList>;
    /**
     * Gets all external lists from the externalUser from the storage.
     */
    getExternalLists(uuid: string): Promise<ExternalList[]>;
    /**
     * Adds a medium to an external list in the storage.
     */
    addItemToExternalList(listId: number, mediumId: number): Promise<boolean>;
    /**
     * Removes a medium from an external list in the storage.
     */
    removeItemFromExternalList(listId: number, mediumId: number): Promise<boolean>;
}
