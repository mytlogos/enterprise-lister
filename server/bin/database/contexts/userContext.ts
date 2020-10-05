import {SubContext} from "./subContext";
import {SimpleUser, User} from "../../types";
import {allTypes, BcryptHash, Errors, Hasher, Hashes} from "../../tools";
import {v1 as uuidGenerator, v4 as sessionGenerator} from "uuid";

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
const verifyPassword = (password: string, hash: string, alg: string, salt: string): Promise<boolean> => {
    const hashAlgorithm = Hashes.find((value) => value.tag === alg);

    if (!hashAlgorithm) {
        throw Error("no such algorithm " + alg);
    }

    return hashAlgorithm.equals(password, hash, salt);
};

const StandardHash: Hasher = BcryptHash;
const standardListName = "Standard";

export class UserContext extends SubContext {
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
    public async register(userName: string, password: string, ip: string): Promise<User> {
        if (!userName || !password) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const user = await this.query("SELECT * FROM user WHERE name = ?;", userName);
        // if there is a result in array, userName is not new, so abort
        if (user.length) {
            return Promise.reject(new Error(Errors.USER_EXISTS_ALREADY));
        }
        // if userName is new, proceed to register
        const id = uuidGenerator();
        const {salt, hash} = await StandardHash.hash(password);

        // insert the full user and loginUser right after
        await this.query(
            "INSERT INTO user (name, uuid, salt, alg, password) VALUES (?,?,?,?,?);",
            [userName, id, salt, StandardHash.tag, hash],
        );

        // every user gets a standard list for everything that got no list assigned
        // this standard list name 'Standard' is reserved for this purpose
        await this.parentContext.internalListContext.addList(id, {name: standardListName, medium: allTypes()});

        return this.loginUser(userName, password, ip);
    }

    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     */
    public async loginUser(userName: string, password: string, ip: string): Promise<User> {
        if (!userName || !password) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const result = await this.query("SELECT * FROM user WHERE name = ?;", userName);

        if (!result.length) {
            return Promise.reject(new Error(Errors.USER_DOES_NOT_EXIST));
        } else if (result.length !== 1) {
            return Promise.reject(new Error(Errors.CORRUPT_DATA));
        }

        const user = result[0];
        const uuid = user.uuid;

        if (!await verifyPassword(password, user.password, user.alg, user.salt)) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        // if there exists a session already for that device, remove it
        await this.delete("user_log", {column: "ip", value: ip});

        // generate session key
        const session = sessionGenerator();
        const date = new Date().toISOString();

        await this.query(
            "INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (?,?,?,?);",
            [uuid, ip, session, date],
        );

        return this._getUser(uuid, session);
    }

    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     */
    public async userLoginStatus(ip: string, uuid?: string, session?: string): Promise<boolean> {
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

    public async loggedInUser(ip: string): Promise<SimpleUser | null> {
        if (!ip) {
            return null;
        }
        const result = await this.query(
            "SELECT name, uuid, session_key FROM user_log " +
            "INNER JOIN user ON user.uuid=user_log.user_uuid WHERE ip = ?;",
            ip
        );

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

    public async getUser(uuid: string, ip: string): Promise<User> {
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
    public logoutUser(uuid: string, ip: string): Promise<boolean> {
        return this.delete("user_log", {column: "ip", value: ip});
    }


    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     */
    public async deleteUser(uuid: string): Promise<boolean> {
        // todo delete all associated data
        // remove in sequence:
        // user_log => list_medium => reading_list
        // => external_list_medium => external_reading_list
        // => external_user => user_episode
        // delete sessions
        await this.delete("user_log", {column: "user_uuid", value: uuid});

        // delete reading lists contents
        await this.query(
            "DELETE FROM list_medium " +
            "WHERE list_id in " +
            "(SELECT id FROM reading_list " +
            "WHERE user_uuid = ?);"
            , uuid,
        );
        // delete lists
        await this.delete("reading_list", {column: "user_uuid", value: uuid});
        // delete external reading lists contents
        await this.query(
            "DELETE FROM external_list_medium " +
            "WHERE list_id " +
            "IN (SELECT id FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user " +
            "WHERE local_uuid = ?));",
            uuid,
        );

        // delete external lists
        await this.query(
            "DELETE FROM external_reading_list " +
            "WHERE user_uuid " +
            "IN (SELECT uuid FROM external_user WHERE local_uuid = ?);",
            uuid,
        );
        // delete external user
        await this.delete("external_user", {column: "local_uuid", value: uuid});

        // delete progress track?
        await this.delete("user_episode", {column: "user_uuid", value: uuid});

        // delete user itself
        // todo check if delete was successful, what if not?
        //  in case the deletion was unsuccessful, just 'ban' any further access to that account
        //  and delete it manually?
        return this.delete("user", {column: "uuid", value: uuid});
    }

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     */
    public async updateUser(uuid: string,
        user: { name?: string; newPassword?: string; password?: string }): Promise<boolean> {

        if (user.newPassword && user.password) {
            await this.verifyPassword(uuid, user.password);
        }
        return this.update("user", async (updates, values) => {
            if (user.name) {
                updates.push("name = ?");
                values.push(user.name);
            }

            if (user.newPassword) {
                if (!user.password) {
                    return Promise.reject(new Error(Errors.INVALID_INPUT));
                }
                const {salt, hash} = await StandardHash.hash(user.newPassword);

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
    public async verifyPassword(uuid: string, password: string): Promise<boolean> {
        const result = await this.query("SELECT password, alg, salt FROM user WHERE uuid = ?", uuid);
        const user = result[0];
        return verifyPassword(password, user.password, user.alg, user.salt);
    }

    /**
     * Returns a user with their associated lists and external user from the storage.
     */
    private _getUser(uuid: string, session: string): Promise<User> {
        if (!uuid) {
            return Promise.reject(new Error(Errors.INVALID_INPUT));
        }
        const user: User = {
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
            .then((value: any[]) => {
                // add user metadata
                user.name = value[0].name;
                user.uuid = uuid;
            });

        // query for user reading lists
        const listsPromise = this.parentContext.internalListContext
            .getUserLists(uuid)
            .then((value: any[]) => {
                // add local user reading lists
                user.lists.push(...value);
            });

        // select external user of user
        const allExternalUserPromise = this
            .query("SELECT * FROM external_user WHERE local_uuid = ?;", uuid)
            .then((allExternalUser: any[]) => {
                // add external_user and add their respective external reading lists
                return Promise.all(allExternalUser.map((value: any) => this.parentContext.externalUserContext
                    .createShallowExternalUser(value)
                    .then((externalUser) => user.externalUser.push(externalUser))));
            });

        const unReadNewsPromise = this.parentContext.newsContext
            .checkUnreadNews(uuid)
            .then((value) => user.unreadNews.push(...value));

        const unReadChapterPromise = this.parentContext.episodeContext
            .getUnreadChapter(uuid)
            .then((value) => user.unreadChapter.push(...value));

        const readTodayPromise = this.parentContext.episodeContext
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
