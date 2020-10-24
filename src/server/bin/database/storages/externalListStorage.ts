import {ExternalList, Uuid} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {storageInContext} from "./storage";
import {ExternalListContext} from "../contexts/externalListContext";


function inContext<T>(callback: ContextCallback<T, ExternalListContext>, transaction = true) {
    return storageInContext(callback, (con) => queryContextProvider(con).externalListContext, transaction);
}

export class ExternalListStorage {

    /**
     * Adds an external list of an user to the storage.
     */
    public addExternalList(userUuid: Uuid, externalList: ExternalList): Promise<ExternalList> {
        return inContext((context) => context.addExternalList(userUuid, externalList));
    }

    /**
     * Updates an external list.
     */
    public updateExternalList(externalList: ExternalList): Promise<boolean> {
        return inContext((context) => context.updateExternalList(externalList));
    }

    /**
     * Removes one or multiple externalLists from the given user.
     */
    public removeExternalList(externalUuid: Uuid, externalListId: number | number[]): Promise<boolean> {
        return inContext((context) => context.removeExternalList(externalUuid, externalListId));
    }

    /**
     * Gets an external list from the storage.
     */
    public getExternalList(id: number): Promise<ExternalList> {
        return inContext((context) => context.getExternalList(id));
    }

    /**
     * Gets all external lists from the externalUser from the storage.
     */
    public getExternalLists(uuid: Uuid): Promise<ExternalList[]> {
        return inContext((context) => context.getExternalUserLists(uuid));
    }

    /**
     * Adds a medium to an external list in the storage.
     */
    public addItemToExternalList(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.addItemToList({listId, id: mediumId}));
    }

    /**
     * Removes a medium from an external list in the storage.
     */
    public removeItemFromExternalList(listId: number, mediumId: number): Promise<boolean> {
        return inContext((context) => context.removeMedium(listId, mediumId));
    }
}
