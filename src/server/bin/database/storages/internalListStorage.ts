import {List, Medium, Uuid} from "../../types";
import {storageInContext} from "./storage";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {InternalListContext} from "../contexts/internalListContext";

function inContext<T>(callback: ContextCallback<T, InternalListContext>, transaction = true) {
    return storageInContext(callback, (con) => queryContextProvider(con).internalListContext, transaction);
}

export class InternalListStorage {
    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @return {Promise<List>}
     */
    public addList(uuid: Uuid, list: { name: string; medium: number }): Promise<List> {
        return inContext((context) => context.addList(uuid, list));
    }

    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @return {Promise<{list: List, media: Array<SimpleMedium>}>}
     */
    public getList(listId: number | number[], media: number[], uuid: Uuid):
        Promise<{ list: List | List[]; media: Medium[] }> {

        return inContext((context) => context.getList(listId, media, uuid));
    }

    /**
     * Updates the properties of a list.
     */
    public updateList(list: List): Promise<boolean> {
        return inContext((context) => context.updateList(list));
    }

    /**
     * Deletes a list irreversibly.
     */
    public deleteList(listId: number, uuid: Uuid): Promise<boolean> {
        return inContext((context) => context.deleteList(listId, uuid));
    }

    /**
     * Returns all available lists for the given user.
     *
     * @return {Promise<Array<List>>}
     */
    public getUserLists(uuid: Uuid): Promise<List[]> {
        return inContext((context) => context.getUserLists(uuid));
    }


    /**
     * Adds a medium to a list.
     */
    public addItemToList(listId: number, mediumId: number | number[]): Promise<boolean> {
        return inContext((context) => context.addItemToList({listId, id: mediumId}));
    }

    /**
     * Moves a medium from an old list to a new list.
     */
    public moveMedium(oldListId: number, newListId: number, mediumId: number | number[]): Promise<boolean> {
        return inContext((context) => context.moveMedium(oldListId, newListId, mediumId));
    }

    /**
     * Removes an item from a list.
     */
    public removeMedium(listId: number, mediumId: number | number[]): Promise<boolean> {
        return inContext((context) => context.removeMedium(listId, mediumId));
    }
}
