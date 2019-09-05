"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const subStorage_1 = require("./subStorage");
const tools_1 = require("../../tools");
const v1_1 = tslib_1.__importDefault(require("uuid/v1"));
const v4_1 = tslib_1.__importDefault(require("uuid/v4"));
/**
 * Checks whether the password equals to the given hash
 * of the specified algorithm.
 *
 * Return true if it does, else false.
 *
 * @param {string} password
 * @param {string} hash
 * @param {string} alg
 * @param {string} salt
 * @return {boolean}
 * @private
 */
const verifyPassword = (password, hash, alg, salt) => {
    const hashAlgorithm = tools_1.Hashes.find((value) => value.tag === alg);
    if (!hashAlgorithm) {
        throw Error("no such algorithm " + alg);
    }
    return hashAlgorithm.equals(password, hash, salt);
};
const StandardHash = tools_1.BcryptHash;
const standardListName = "Standard";
class UserContext extends subStorage_1.SubStorage {
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
    async register(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const user = await this.query(`SELECT * FROM user WHERE name = ?;`, userName);
        // if there is a result in array, userName is not new, so abort
        if (user.length) {
            return Promise.reject(new Error(tools_1.Errors.USER_EXISTS_ALREADY));
        }
        // if userName is new, proceed to register
        const id = v1_1.default();
        const { salt, hash } = StandardHash.hash(password);
        // insert the full user and loginUser right after
        await this.query("INSERT INTO user (name, uuid, salt, alg, password) VALUES (?,?,?,?,?);", [userName, id, salt, StandardHash.tag, hash]);
        // every user gets a standard list for everything that got no list assigned
        // this standard list name 'Standard' is reserved for this purpose
        await this.addList(id, { name: standardListName, medium: tools_1.allTypes() });
        return this.loginUser(userName, password, ip);
    }
    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    async loginUser(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const result = await this.query("SELECT * FROM user WHERE name = ?;", userName);
        if (!result.length) {
            return Promise.reject(new Error(tools_1.Errors.USER_DOES_NOT_EXIST));
        }
        else if (result.length !== 1) {
            return Promise.reject(new Error(tools_1.Errors.CORRUPT_DATA));
        }
        const user = result[0];
        const uuid = user.uuid;
        if (!verifyPassword(password, user.password, user.alg, user.salt)) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        // if there exists a session already for that device, remove it
        await this.delete("user_log", { column: "ip", value: ip });
        // generate session key
        const session = v4_1.default();
        const date = new Date().toISOString();
        await this.query("INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (?,?,?,?);", [uuid, ip, session, date]);
        return this._getUser(uuid, session);
    }
    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    async userLoginStatus(ip, uuid, session) {
        const result = await this.query("SELECT * FROM user_log WHERE ip = ?;", ip);
        const sessionRecord = result[0];
        if (!sessionRecord) {
            return false;
        }
        const currentSession = sessionRecord.session_key;
        if (session) {
            return session === currentSession && uuid === sessionRecord.user_uuid;
        }
        return !!currentSession;
    }
    async loggedInUser(ip) {
        if (!ip) {
            return null;
        }
        const result = await this.query("SELECT name, uuid, session_key FROM user_log " +
            "INNER JOIN user ON user.uuid=user_log.user_uuid WHERE ip = ?;", ip);
        const userRecord = result[0];
        if (!userRecord || !ip || !userRecord.session_key || !userRecord.name || !userRecord.uuid) {
            return null;
        }
        return {
            name: userRecord.name,
            session: userRecord.session_key,
            uuid: userRecord.uuid
        };
    }
    async getUser(uuid, ip) {
        const result = await this.query("SELECT * FROM user_log WHERE user_uuid = ? AND ip = ?;", [uuid, ip]);
        const sessionRecord = result[0];
        if (!sessionRecord || !sessionRecord.session_key) {
            throw Error("user has no session");
        }
        return this._getUser(uuid, sessionRecord.session_key);
    }
    /**
     * Logs a user out.
     */
    logoutUser(uuid, ip) {
        return this.delete("user_log", { column: "ip", value: ip });
    }
    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    async deleteUser(uuid) {
        // todo delete all associated data
        // remove in sequence:
        // user_log => list_medium => reading_list
        // => external_list_medium => external_reading_list
        // => external_user => user_episode
        // delete sessions
        await this.delete("user_log", { column: "user_uuid", value: uuid });
        // delete reading lists contents
        await this.query("DELETE FROM list_medium " +
            "WHERE list_id in " +
            "(SELECT id FROM reading_list " +
            "WHERE user_uuid = ?);", uuid);
        // delete lists
        await this.delete("reading_list", { column: "user_uuid", value: uuid });
        // delete external reading lists contents
        await this.query("DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user " +
            "WHERE local_uuid = ?));", uuid);
        // delete external lists
        await this.query("DELETE FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user WHERE local_uuid = ?);", uuid);
        // delete external user
        await this.delete("external_user", { column: "local_uuid", value: uuid });
        // delete progress track?
        await this.delete("user_episode", { column: "user_uuid", value: uuid });
        // delete user itself
        // todo check if delete was successful, what if not?
        //  in case the deletion was unsuccessful, just 'ban' any further access to that account
        //  and delete it manually?
        return this.delete("user", { column: "uuid", value: uuid });
    }
    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    async updateUser(uuid, user) {
        if (user.newPassword && user.password) {
            await this.verifyPassword(uuid, user.password);
        }
        return this.update("user", (updates, values) => {
            if (user.name) {
                updates.push("name = ?");
                values.push(user.name);
            }
            if (user.newPassword) {
                if (!user.password) {
                    return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
                }
                const { salt, hash } = StandardHash.hash(user.newPassword);
                updates.push("alg = ?");
                values.push(StandardHash.tag);
                updates.push("salt = ?");
                values.push(salt);
                updates.push("password = ?");
                values.push(hash);
            }
        }, {
            column: "uuid",
            value: uuid
        });
    }
    /**
     * Verifies the password the user of
     * the given uuid.
     *
     * @param {string} uuid
     * @param {string} password
     * @return {Promise<boolean>}
     */
    async verifyPassword(uuid, password) {
        const result = await this.query("SELECT password, alg, salt FROM user WHERE uuid = ?", uuid);
        const user = result[0];
        return verifyPassword(password, user.password, user.alg, user.salt);
    }
    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    _getUser(uuid, session) {
        if (!uuid) {
            return Promise.reject(new Error(tools_1.Errors.INVALID_INPUT));
        }
        const user = {
            externalUser: [],
            lists: [],
            name: "",
            uuid: "",
            readToday: [],
            unreadChapter: [],
            unreadNews: [],
            session,
        };
        // query for user
        const userPromise = this.query("SELECT * FROM user WHERE uuid = ?;", uuid)
            .then((value) => {
            // add user metadata
            user.name = value[0].name;
            user.uuid = uuid;
        });
        // query for user reading lists
        const listsPromise = this
            .getUserLists(uuid)
            .then((value) => {
            // add local user reading lists
            user.lists.push(...value);
        });
        // select external user of user
        const allExternalUserPromise = this
            .query("SELECT * FROM external_user WHERE local_uuid = ?;", uuid)
            .then((allExternalUser) => {
            // add external_user and add their respective external reading lists
            return Promise.all(allExternalUser.map((value) => this
                .createShallowExternalUser(value)
                .then((externalUser) => user.externalUser.push(externalUser))));
        });
        const unReadNewsPromise = this
            .checkUnreadNews(uuid)
            .then((value) => user.unreadNews.push(...value));
        const unReadChapterPromise = this
            .getUnreadChapter(uuid)
            .then((value) => user.unreadChapter.push(...value));
        const readTodayPromise = this
            .getReadToday(uuid)
            .then((value) => user.readToday.push(...value));
        // return user result
        return Promise
            .all([
            userPromise, listsPromise, allExternalUserPromise,
            unReadNewsPromise, unReadChapterPromise, readTodayPromise
        ])
            .then(() => user);
    }
}
exports.UserContext = UserContext;
//# sourceMappingURL=userContext.js.map