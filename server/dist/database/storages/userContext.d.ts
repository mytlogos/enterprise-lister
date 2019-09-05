import { SubStorage } from "./subStorage";
import { SimpleUser, User } from "../../types";
export declare class UserContext extends SubStorage {
    /**
     * Registers an User if the userName is free.
     * Returns a Error Code if userName is already
     * in use.
     *
     * If it succeeded, it tries to log the user in
     * immediately.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    register(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    loginUser(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean>;
    loggedInUser(ip: string): Promise<SimpleUser | null>;
    getUser(uuid: string, ip: string): Promise<User>;
    /**
     * Logs a user out.
     */
    logoutUser(uuid: string, ip: string): Promise<boolean>;
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    deleteUser(uuid: string): Promise<boolean>;
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    updateUser(uuid: string, user: {
        name?: string;
        newPassword?: string;
        password?: string;
    }): Promise<boolean>;
    /**
     * Verifies the password the user of
     * the given uuid.
     *
     * @param {string} uuid
     * @param {string} password
     * @return {Promise<boolean>}
     */
    verifyPassword(uuid: string, password: string): Promise<boolean>;
    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    private _getUser;
}
