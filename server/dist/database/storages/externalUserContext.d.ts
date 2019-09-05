import { SubContext } from "./subContext";
import { ExternalUser } from "../../types";
export declare class ExternalUserContext extends SubContext {
    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser>;
    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid: string): Promise<boolean>;
    /**
     * Gets an external user.
     */
    getExternalUser(externalUuid: string): Promise<ExternalUser>;
    /**
     * Gets an external user with cookies, without items.
     */
    getExternalUserWithCookies(uuid: string): Promise<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>;
    /**
     *
     */
    getScrapeExternalUser(): Promise<Array<{
        userUuid: string;
        type: number;
        uuid: string;
        cookies: string;
    }>>;
    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     */
    createShallowExternalUser(storageUser: {
        name: string;
        uuid: string;
        service: number;
        local_uuid: string;
    }): Promise<ExternalUser>;
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
}
