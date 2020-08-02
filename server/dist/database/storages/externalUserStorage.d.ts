import { ExternalUser } from "../../types";
import { Query } from "mysql";
export declare class ExternalUserStorage {
    getAll(uuid: string): Promise<Query>;
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
    getExternalUser(uuid: string | string[]): Promise<ExternalUser | ExternalUser[]>;
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
    getScrapeExternalUser(): Promise<ExternalUser[]>;
    /**
     * Updates an external user.
     */
    updateExternalUser(externalUser: ExternalUser): Promise<boolean>;
}
