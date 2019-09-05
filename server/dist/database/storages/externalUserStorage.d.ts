import { ExternalUser } from "../../types";
export declare class ExternalUserStorage {
    /**
     * Adds an external user of an user to the storage.
     */
    addExternalUser(localUuid: string, externalUser: ExternalUser): Promise<ExternalUser>;
    /**
     * Deletes an external user from the storage.
     */
    deleteExternalUser(externalUuid: string, uuid?: string): Promise<boolean>;
    /**
     * Gets an external user.
     */
    getExternalUser(uuid: string): Promise<ExternalUser>;
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
     * Updates an external user.
     */
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
}
