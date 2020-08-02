import {SimpleUser, User} from "../../types";
import {ContextCallback, queryContextProvider} from "./storageTools";
import {UserContext} from "../contexts/userContext";
import {ChangeUser} from "../databaseTypes";
import {storageInContext} from "./storage";

function inContext<T>(callback: ContextCallback<T, UserContext>, transaction = true) {
    return storageInContext(callback, transaction, (con) => queryContextProvider(con).userContext);
}

export class UserStorage {
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
    public register(userName: string, password: string, ip: string): Promise<User> {
        return inContext((context) => context.register(userName, password, ip));
    }

    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @return {Promise<User>}
     */
    public loginUser(userName: string, password: string, ip: string): Promise<User> {
        return inContext((context) => context.loginUser(userName, password, ip));
    }

    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @return {Promise<User|null>}
     */
    // @ts-ignore
    public userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean> {
        return inContext((context) => context.userLoginStatus(ip, uuid, session));
    }

    /**
     * Get the user for the given uuid.
     *
     * @return {Promise<SimpleUser>}
     */
    // @ts-ignore
    public getUser(uuid: string, ip: string): Promise<User> {
        return inContext((context) => context.getUser(uuid, ip));
    }

    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @return {Promise<User|null>}
     */
    // @ts-ignore
    public loggedInUser(ip: string): Promise<SimpleUser | null> {
        return inContext((context) => context.loggedInUser(ip));
    }

    /**
     * Logs a user out.
     *
     * @return {Promise<boolean>}
     */
    public logoutUser(uuid: string, ip: string): Promise<boolean> {
        return inContext((context) => context.logoutUser(uuid, ip));
    }

    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     *
     * @return {Promise<boolean>}
     */
    public deleteUser(uuid: string): Promise<boolean> {
        return inContext((context) => context.deleteUser(uuid));
    }

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @return {Promise<boolean>}
     */
    public updateUser(uuid: string, user: ChangeUser): Promise<boolean> {
        return inContext((context) => context.updateUser(uuid, user));
    }

}
