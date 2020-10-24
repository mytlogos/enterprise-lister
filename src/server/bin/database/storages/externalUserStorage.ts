import {ExternalUser, Uuid} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {storageInContext} from "./storage";
import {ExternalUserContext} from "../contexts/externalUserContext";
import {Query} from "mysql";

function inContext<T>(callback: ContextCallback<T, ExternalUserContext>, transaction = true) {
    return storageInContext(callback, (con) => queryContextProvider(con).externalUserContext, transaction);
}

export class ExternalUserStorage {
    public getAll(uuid: Uuid): Promise<Query> {
        return inContext((context) => context.getAll(uuid));
    }
    /**
     * Adds an external user of an user to the storage.
     */
    public addExternalUser(localUuid: Uuid, externalUser: ExternalUser): Promise<ExternalUser> {
        return inContext((context) => context.addExternalUser(localUuid, externalUser));
    }

    /**
     * Deletes an external user from the storage.
     */
    public deleteExternalUser(externalUuid: Uuid, uuid?: Uuid): Promise<boolean> {
        // TODO: 27.02.2020 use uuid to check if uuid owns externalUser
        return inContext((context) => context.deleteExternalUser(externalUuid));

    }

    /**
     * Gets an external user.
     */
    public getExternalUser(uuid: Uuid | string[]): Promise<ExternalUser | ExternalUser[]> {
        return inContext((context) => context.getExternalUser(uuid));
    }

    /**
     * Gets an external user with cookies, without items.
     */
    public getExternalUserWithCookies(uuid: Uuid)
        : Promise<{ userUuid: Uuid; type: number; uuid: Uuid; cookies: string }> {

        return inContext((context) => context.getExternalUserWithCookies(uuid));
    }

    /**
     *
     */
    public getScrapeExternalUser(): Promise<ExternalUser[]> {
        return inContext((context) => context.getScrapeExternalUser());
    }

    /**
     * Updates an external user.
     */
    public updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
        return inContext((context) => context.updateExternalUser(externalUser));
    }
}
