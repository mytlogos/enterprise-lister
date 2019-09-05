import { SimpleUser, User } from "../../types";
import { ChangeUser } from "../databaseTypes";
export declare class UserStorage {
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
     *
     * @return {Promise<{session: string, uuid: string}>}
     */
    register(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @return {Promise<User>}
     */
    loginUser(userName: string, password: string, ip: string): Promise<User>;
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @return {Promise<User|null>}
     */
    userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean>;
    /**
     * Get the user for the given uuid.
     *
     * @return {Promise<SimpleUser>}
     */
    getUser(uuid: string, ip: string): Promise<User>;
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @return {Promise<User|null>}
     */
    loggedInUser(ip: string): Promise<SimpleUser | null>;
    /**
     * Logs a user out.
     *
     * @return {Promise<boolean>}
     */
    logoutUser(uuid: string, ip: string): Promise<boolean>;
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     *
     * @return {Promise<boolean>}
     */
    deleteUser(uuid: string): Promise<boolean>;
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @return {Promise<boolean>}
     */
    updateUser(uuid: string, user: ChangeUser): Promise<boolean>;
}
