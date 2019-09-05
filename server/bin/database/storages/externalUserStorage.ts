import {ExternalUser} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {storageInContext} from "./storage";
import {ExternalUserContext} from "../contexts/externalUserContext";

function inContext<T>(callback: ContextCallback<T, ExternalUserContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).externalUserContext);
}

export class ExternalUserStorage {
    /**
     * Adds an external user of an user to the storage.
     */
    public addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser> {
        return inContext((context) => context.addExternalUser(localUuid, externalUser));
    }

    /**
     * Deletes an external user from the storage.
     */
    public deleteExternalUser(externalUuid: string, uuid?: string): Promise<boolean> {
        return inContext((context) => context.deleteExternalUser(externalUuid));

    }

    /**
     * Gets an external user.
     */
    public getExternalUser(uuid: string): Promise<ExternalUser> {
        return inContext((context) => context.getExternalUser(uuid));
    }

    /**
     * Gets an external user with cookies, without items.
     */
    public getExternalUserWithCookies(uuid: string)
        : Promise<{ userUuid: string, type: number, uuid: string, cookies: string }> {

        return inContext((context) => context.getExternalUserWithCookies(uuid));
    }

    /**
     *
     */
    public getScrapeExternalUser(): Promise<Array<{ userUuid: string, type: number, uuid: string, cookies: string }>> {
        return inContext((context) => context.getScrapeExternalUser());
    }

    /**
     * Updates an external user.
     */
    public updateExternalUser(externalUser: ExternalUser): Promise<boolean> {
        return inContext((context) => context.updateExternalUser(externalUser));
    }
}
