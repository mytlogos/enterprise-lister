"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storageTools_1 = require("./storageTools");
const storage_1 = require("./storage");
function inContext(callback, transaction = true) {
    return storage_1.storageInContext(callback, transaction, (con) => storageTools_1.queryContextProvider(con).userContext);
}
class UserStorage {
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
    register(userName, password, ip) {
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
    loginUser(userName, password, ip) {
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
    userLoginStatus(ip, uuid, session) {
        return inContext((context) => context.userLoginStatus(ip, uuid, session));
    }
    /**
     * Get the user for the given uuid.
     *
     * @return {Promise<SimpleUser>}
     */
    // @ts-ignore
    getUser(uuid, ip) {
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
    loggedInUser(ip) {
        return inContext((context) => context.loggedInUser(ip));
    }
    /**
     * Logs a user out.
     *
     * @return {Promise<boolean>}
     */
    logoutUser(uuid, ip) {
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
    deleteUser(uuid) {
        return inContext((context) => context.deleteUser(uuid));
    }
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @return {Promise<boolean>}
     */
    updateUser(uuid, user) {
        return inContext((context) => context.updateUser(uuid, user));
    }
}
exports.UserStorage = UserStorage;
//# sourceMappingURL=userStorage.js.map