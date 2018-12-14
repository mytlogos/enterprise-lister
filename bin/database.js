const mySql = require("promise-mysql");
const crypt = require("crypto");
const bcrypt = require("bcrypt-nodejs");
const userUuid = require('uuid/v1');
const randomUuid = require('uuid/v4');


const ShaHash = {
    tag: "sha512",

    /**
     *
     * @param {number} saltLength
     * @param {string} text
     * @return {{salt: string, hash: string}}
     */
    hash(text, saltLength = 20) {
        let salt = crypt.randomBytes(Math.ceil(saltLength / 2))
            .toString('hex') // convert to hexadecimal format
            .slice(0, saltLength); // return required number of characters */
        return {salt: salt, hash: this.innerHash(text, salt)}
    },

    innerHash(text, salt) {
        let hash = crypt.createHash("sha512");
        hash.update(salt + text);
        return hash.digest("hex");
    },


    /**
     * Checks whether the text hashes to the same hash.
     *
     * @param {string} text
     * @param {string} hash
     * @param {string} salt
     * @return boolean
     */
    equals(text, hash, salt) {
        return this.innerHash(text, salt) === hash;
    }
};
const BcryptHash = {
    tag: "bcrypt",

    /**
     *
     * @param {string} text
     * @return {{salt: undefined, hash: string}}
     */
    hash(text) {
        return {salt: undefined, hash: bcrypt.hashSync(text)};
    },

    /**
     * Checks whether the text hashes to the same hash.
     *
     * @param {string} text
     * @param {string} hash
     * @return boolean
     */
    equals(text, hash) {
        return bcrypt.compareSync(text, hash);
    }
};
const Hashes = [ShaHash, BcryptHash];

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
const _verifyPassword = function (password, hash, alg, salt) {
    let hashAlgorithm = Hashes.find(value => value.tag === alg);

    if (!hashAlgorithm) {
        throw Error("no such algorithm " + alg);
    }

    return hashAlgorithm.equals(password, hash, salt);
};

// noinspection JSValidateTypes
/**
 *
 * @type {{
 * tag: string,
 * hash(text: string, saltLength?: number): {salt?: string, hash: string},
 * equals(text: string, hash: text, salt?: text): boolean
 * }}
 */
const StandardHash = BcryptHash;

const database = "enterprise";

const Errors = {
    USER_EXISTS_ALREADY: 0x1,
    INVALID_INPUT: 0x2,
    INVALID_DATA: 0x4,
    USER_DOES_NOT_EXIST: 0x8,
    CORRUPT_DATA: 0x10,
    UNKNOWN: 0x20,
    INVALID_MESSAGE: 0x40,
    INVALID_SESSION: 0x80,
    DOES_NOT_EXIST: 0x100,
    UNSUCCESSFUL: 0x200,
};

/**
 * @typedef {Object} Medium
 *
 * @property {number} id identifier for medium
 * @property {string|undefined} countryOfOrigin
 * @property {string|undefined} languageOfOrigin
 * @property {string|undefined} author
 * @property {string} title
 * @property {number} medium
 * @property {string|undefined} author
 * @property {string|undefined} artist
 * @property {string|undefined} lang
 * @property {number|undefined} stateOrigin
 * @property {number|undefined} stateTL
 * @property {string|undefined} series
 * @property {string|undefined} universe
 * @property {Array<Part>} parts
 */

/**
 * @typedef {Object} Part
 *
 * @property {number} id
 * @property {string| undefined} title
 * @property {number} totalIndex
 * @property {number| undefined} partialIndex
 * @property {Array<Episode>} episodes
 */

/**
 * @typedef {Object} Episode
 *
 * @property {number} id
 * @property {string|undefined} title
 * @property {number} totalIndex
 * @property {number|undefined} partialIndex
 * @property {string} url
 * @property {string} releaseDate
 */

/**
 * @typedef {Object} List
 *
 * @property {number} id
 * @property {string} name
 * @property {number} medium
 * @property {Array<Medium>} items
 */

/**
 * @typedef {Object} User
 *
 * @property {string} uuid
 * @property {string} name
 * @property {string} session
 * @property {Array<ExternalUser>} external_user
 * @property {Array<List>} lists
 */

/**
 * @typedef {Object} ExternalList
 *
 * @property {number} id
 * @property {string} name
 * @property {number} medium
 * @property {string} url
 * @property {Array<Medium>} items
 */

/**
 * @typedef {Object} ExternalUser
 *
 * @property {string} uuid
 * @property {string} name
 * @property {number} service
 * @property {string|undefined| null} cookies
 * @property {Array<ExternalList>} lists
 */

/**
 * @callback contextExecutor
 * @template T
 * @param {QueryContext} context
 * @return {Promise<T>}
 */


/**
 * Creates the context for QueryContext, to
 * query a single connection sequentially.
 *
 * @template T
 * @param {boolean} transaction
 * @param {contextExecutor} callback
 * @param {boolean?} allowDatabase
 * @return {Promise<T>}
 */
function inContext(transaction, callback, allowDatabase = true) {
    return Promise.resolve(pool.getConnection())
        .then(con => {
            let context = new QueryContext();
            context.con = con;
            //don't use database if it is explicitly disallowed
            let start = allowDatabase ? context.useDatabase() : Promise.resolve();
            return start
            //if transaction, start it
                .then(() => transaction && context.startTransaction())
                //let callback run with context
                .then(() => callback(context))
                //if transaction and no error till now, commit it and return result
                .then(result => transaction ? context.commit() && result : result)
                //if it could not be commit due to error, roll back and rethrow error
                .catch(error => {
                    //if there is a transaction first rollback and then throw error
                    if (transaction) {
                        return context.rollback().then(() => {
                            throw error;
                        });
                    }
                    //else rethrow error immediately
                    //todo check if i can simply rethrow an error and if the trace is still the same?
                    throw error;
                })
                //release connection into the pool
                .finally(() => pool.releaseConnection(con));
        });
}

let pool = mySql.createPool({
    connectionLimit: 10,
    host: "localhost",
    user: "root",
    password: "matheprofi",
    bigNumberStrings: true,
});

const Tables = {
    user:
        "name VARCHAR(200) NOT NULL UNIQUE," +
        "uuid VARCHAR(200) NOT NULL," +
        "salt VARCHAR(200)," +
        "password VARCHAR(200) NOT NULL," +
        "alg VARCHAR(100) NOT NULL," +
        "PRIMARY KEY(uuid)",
    external_user:
        "name VARCHAR(200) NOT NULL," +
        "uuid VARCHAR(200) NOT NULL," +
        "local_uuid VARCHAR(200) NOT NULL," +
        "service INT NOT NULL," +
        "cookies TEXT," +
        "PRIMARY KEY(uuid)," +
        "FOREIGN KEY(local_uuid) REFERENCES user(uuid)",
    user_log:
        "user_uuid VARCHAR(255) NOT NULL," +
        "ip VARCHAR(255)," +
        "session_key VARCHAR(255)," +
        "acquisition_date VARCHAR(40)," +
        "PRIMARY KEY(session_key)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)",
    external_reading_list:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "name VARCHAR(200) NOT NULL," +
        "user_uuid VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "url VARCHAR(200)," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(user_uuid) REFERENCES external_user(uuid)",
    medium:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "countryOfOrigin VARCHAR(200)," +
        "languageOfOrigin VARCHAR(200)," +
        "author VARCHAR(200)," +
        "artist VARCHAR(200)," +
        "title VARCHAR(200) NOT NULL," +
        "medium INT NOT NULL," +
        "lang VARCHAR(200)," +
        "stateOrigin INT," +
        "stateTL INT," +
        "series VARCHAR(200)," +
        "universe VARCHAR(200)," +
        "PRIMARY KEY(id)",
    list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    external_list_medium:
        "list_id INT UNSIGNED NOT NULL," +
        "medium_id INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(list_id, medium_id)," +
        "FOREIGN KEY(list_id) REFERENCES external_reading_list(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    part:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT, " +
        "medium_id INT UNSIGNED NOT NULL, " +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(medium_id) REFERENCES medium(id)",
    episode:
        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
        "part_id INT UNSIGNED NOT NULL," +
        "title VARCHAR(200)," +
        "totalIndex INT NOT NULL," +
        "partialIndex INT," +
        "url TEXT NOT NULL," +
        "releaseDate VARCHAR(200) NOT NULL," +
        "PRIMARY KEY(id)," +
        "FOREIGN KEY(part_id) REFERENCES part(id)",
    user_episode:
        "user_uuid VARCHAR(200) NOT NULL," +
        "episode_id INT UNSIGNED NOT NULL," +
        "progress INT UNSIGNED NOT NULL," +
        "PRIMARY KEY(user_uuid, episode_id)," +
        "FOREIGN KEY(user_uuid) REFERENCES user(uuid)," +
        "FOREIGN KEY(episode_id) REFERENCES episode(id)"
};

const Storage = {

    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     *
     * @return {Promise<void>}
     */
    start() {
        return inContext(true, context => context.start(), false);
    },

    /**
     * Closes the Storage.
     *
     * @return {Promise<void>}
     */
    stop() {
        return pool.end();
    },

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
     * @param {string} userName
     * @param {string} password
     * @param {string} ip
     * @return {Promise<{session: string, uuid: string}>}
     */
    register(userName, password, ip) {
        return inContext(true, context => context.register(userName, password, ip));
    },

    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @param {string} userName
     * @param {string} password
     * @param {string} ip
     * @return {Promise<User>}
     */
    loginUser(userName, password, ip) {
        return inContext(true, context => context.loginUser(userName, password, ip));
    },

    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @param {string} ip
     * @return {Promise<User|boolean>}
     */
    userLoginStatus(ip) {
        return inContext(true, context => context.userLoginStatus(ip));
    },

    /**
     * Logs a user out.
     *
     * @param {string} uuid
     * @param {string} ip
     * @return {Promise<boolean>}
     */
    logoutUser(uuid, ip) {
        return inContext(true, context => context.logoutUser(uuid, ip));
    },

    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     *
     * @param {string} uuid
     * @return {Promise<boolean>}
     */
    deleteUser(uuid) {
        return inContext(true, context => context.deleteUser(uuid));
    },

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * @param {string} uuid
     * @param {{name?: string, newPassword?: string, password?: string}} user
     * @return {Promise<boolean>}
     */
    updateUser(uuid, user) {
        return inContext(true, context => context.updateUser(uuid, user));
    },

    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @param {string} uuid - id of the user
     * @param {Object} list - list to add
     * @param {string} list.name - name of the list
     * @param {number} list.medium - media flags for the list
     * @return {Promise<List>}
     */
    addList(uuid, list) {
        return inContext(true, context => context.addList(uuid, list));
    },

    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @param {number} list_id
     * @return {Promise<List>}
     */
    getList(list_id) {
        return inContext(true, context => context.getList(list_id));
    },

    /**
     * Updates the properties of a list.
     *
     * @param {List} list
     */
    updateList(list) {
        return inContext(true, context => context.updateList(list));
    },

    /**
     * Deletes a list irreversibly.
     *
     * @param {number} list_id
     * @param {string} uuid
     * @return {Promise<boolean>}
     */
    deleteList(list_id, uuid) {
        return inContext(true, context => context.deleteList(list_id, uuid));
    },

    /**
     * Returns all available lists for the given user.
     *
     * @param {string} uuid
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid) {
        return inContext(true, context => context.getUserLists(uuid));
    },

    /**
     * Adds a medium to the storage.
     *
     * @param {number} medium
     * @param {string} title
     * @return {Promise<Medium>}
     */
    addMedium(title, medium) {
        return inContext(true, context => context.addMedium(title, medium));
    },

    /**
     * Gets a medium from the storage.
     *
     * @param {number} id
     * @return {Promise<Medium>}
     */
    getMedium(id) {
        return inContext(true, context => context.getMedium(id));
    },

    /**
     * Updates a medium from the storage.
     *
     * @param {Medium} medium
     * @return {Promise<boolean>}
     */
    updateMedium(medium) {
        return inContext(true, context => context.updateMedium(medium));
    },

    /**
     * Returns all parts of an medium.
     *
     * @param {number} medium_id
     * @return {Promise<Array<Part>>}
     */
    getParts(medium_id) {
        return inContext(true, context => context.getParts(medium_id));
    },

    /**
     * Adds a part of an medium to the storage.
     *
     * @param {number} medium_id
     * @param {Part} part
     * @return {Promise<Part>}
     */
    addPart(medium_id, part) {
        return inContext(true, context => context.addPart(medium_id, part));
    },

    /**
     * Updates a part.
     *
     * @param {Part} part
     * @return {Promise<boolean>}
     */
    updatePart(part) {
        return inContext(true, context => context.updatePart(part));
    },

    /**
     * Deletes a part from the storage.
     *
     * @param {number} id
     * @return {Promise<boolean>}
     */
    deletePart(id) {
        return inContext(true, context => context.deletePart(id));
    },

    /**
     * Adds a episode of a part to the storage.
     *
     * @param {number} part_id
     * @param {Episode} episode
     * @return {Promise<Episode>}
     */
    addEpisode(part_id, episode) {
        return inContext(true, context => context.addEpisode(part_id, episode));
    },

    /**
     * Updates an episode from the storage.
     *
     * @param {Episode} episode
     * @return {Promise<boolean>}
     */
    updateEpisode(episode) {
        return inContext(true, context => context.updateEpisode(episode));
    },

    /**
     * Gets an episode from the storage.
     *
     * @param {number} id
     * @return {Promise<Episode>}
     */
    getEpisode(id) {
        return inContext(true, context => context.getEpisode(id));
    },

    /**
     * Deletes an episode from the storage irreversibly.
     *
     * @param {number} id
     * @return {Promise<boolean>}
     */
    deleteEpisode(id) {
        return inContext(true, context => context.deleteEpisode(id));
    },

    /**
     * Adds a medium to a list.
     *
     * @param {number} list_id
     * @param {number} medium_id
     * @return {Promise<boolean>}
     */
    addItemToList(list_id, medium_id) {
        return inContext(true, context => context.addItemToList(false, list_id, medium_id));
    },

    /**
     * Moves a medium from an old list to a new list.
     *
     * @param {number} new_list_id
     * @param {number} medium_id
     * @param {number} old_list_id
     * @return {Promise<boolean>}
     */
    moveMedium(old_list_id, new_list_id, medium_id) {
        return inContext(true, context => context.moveMedium(new_list_id, medium_id, old_list_id));
    },

    /**
     * Removes an item from a list.
     *
     * @param {number} list_id
     * @param {number} medium_id
     * @return {Promise<boolean>}
     */
    removeMedium(list_id, medium_id) {
        return inContext(true, context => context.removeMedium(list_id, medium_id));
    },

    /**
     * Adds an external user of an user to the storage.
     *
     * @param {string} local_uuid
     * @param {ExternalUser} externalUser
     * @return {Promise<ExternalUser>}
     */
    addExternalUser(local_uuid, externalUser) {
        return inContext(true, context => context.addExternalUser(local_uuid, externalUser));
    },

    /**
     * Deletes an external user from the storage.
     *
     * @param {string} external_uuid
     * @return {Promise<boolean>}
     */
    deleteExternalUser(external_uuid) {
        return inContext(true, context => context.deleteExternalUser(external_uuid));

    },

    /**
     * Gets an external user.
     *
     * @param {string} uuid
     * @return {Promise<ExternalUser>}
     */
    getExternalUser(uuid) {
        return inContext(true, context => context.getExternalUser(uuid));

    },

    /**
     * Updates an external user.
     *
     * @param {ExternalUser} externalUser
     * @return {Promise<boolean>}
     */
    updateExternalUser(externalUser) {
        return inContext(true, context => context.updateExternalUser(externalUser));

    },

    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    addExternalList(userUuid, externalList) {
        return inContext(true, context => context.addExternalList(userUuid, externalList));
    },

    /**
     * Updates an external list.
     *
     * @param {ExternalList} externalList
     * @return {Promise<boolean>}
     */
    updateExternalList(externalList) {
        return inContext(true, context => context.updateExternalList(externalList));
    },

    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    getExternalList(id) {
        return inContext(true, context => context.getExternalList(id));
    },

    /**
     * Adds a medium to an external list in the storage.
     *
     * @param {number} list_id
     * @param {number} medium
     * @return {Promise<boolean>}
     */
    addItemToExternalList(list_id, medium) {
        return inContext(true, context => context.addItemToList(true, list_id, medium));
    },

    /**
     * Add progress of an user in regard to an episode to the storage.
     *
     * @param {string} uuid
     * @param {number} episode_id
     * @param {number} progress
     * @return {Promise<boolean>}
     */
    addProgress(uuid, episode_id, progress) {
        return inContext(true, context => context.addProgress(uuid, episode_id, progress));
    },

    /**
     * Removes progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} episodeId
     * @return {Promise<boolean>}
     */
    removeProgress(uuid, episodeId) {
        return inContext(true, context => context.removeProgress(uuid, episodeId));
    },

    /**
     * Get the progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} episode_id
     * @return {Promise<boolean>}
     */
    getProgress(uuid, episode_id) {
        return inContext(true, context => context.getProgress(uuid, episode_id));
    },

    /**
     * Updates the progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} mediumId
     * @param {number} progress
     * @return {Promise<boolean>}
     */
    updateProgress(uuid, mediumId, progress) {
        return inContext(true, context => context.updateProgress(uuid, mediumId, progress));
    },

    showUser() {
        return inContext(true, context => context.showUser());
    },

    clear() {
        return inContext(false, context => context.clearAll(), false);
    }
};

/**
 * A Class for consecutive queries on the same connection.
 */
class QueryContext {

    constructor() {
        /**
         *
         * @type {null|Connection}
         */
        this.con = null;
    }

    /**
     *
     * @param query
     * @param parameter
     * @return {Promise<*>}
     * @private
     */
    _query(query, parameter) {
        return Promise.resolve(this.con.query(query, parameter));
    }

    useDatabase() {
        return this._query(`USE ${database};`);
    }

    startTransaction() {
        return this._query("START TRANSACTION;")
    }

    commit() {
        return this._query("COMMIT;")
    }

    rollback() {
        return this._query("ROLLBACK;")
    }


    /**
     * Checks the database for incorrect structure
     * and tries to correct these.
     *
     * @return {Promise<void>}
     */
    start() {
        return this.databaseExists()
            .then(exists => !exists && this._query(`CREATE DATABASE ${database};`))
            //set database as current database
            .then(() => this.useDatabase())
            //display all current tables
            .then(() => this._query("SHOW TABLES;"))
            //create tables which do not exist
            .then(result => Promise.all(
                Object.keys(Tables)
                    .filter(table => !result.find(value => value[`Tables_in_${database}`] === table))
                    .map(table => this._query(`CREATE TABLE ${table}(${Tables[table]});`))
                )
            )
            .then(() => undefined);
    }

    /**
     * Checks whether the main database exists currently.
     *
     * @return {Promise<boolean>}
     */
    databaseExists() {
        return this
            ._query("SHOW DATABASES;")
            .then(result => result.find(data => data.Database === database) !== undefined)
    }

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
     * @param {string} userName
     * @param {string} password
     * @param {string} ip
     * @return {Promise<User>}
     */
    register(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        return this._query(`SELECT * FROM user WHERE name = ?;`, userName)
            .then(result => {
                //if there is a result in array, userName is not new, so abort
                if (result.length) {
                    return Promise.reject(Errors.USER_EXISTS_ALREADY)
                }
            })
            //if userName is new, proceed to register
            .then(() => {
                let id = userUuid();
                let {salt, hash} = StandardHash.hash(password);

                //insert the full user and loginUser right after
                return this._query(
                    "INSERT INTO user (name, uuid, salt, alg, password) VALUES (?,?,?,?,?);",
                    [userName, id, salt, StandardHash.tag, hash]
                );
            })
            .then(() => this.loginUser(userName, password, ip));
    }

    /**
     * Logs a user in.
     *
     * Returns the uuid of the user
     * and the session key for the ip.
     *
     * @param {string} userName
     * @param {string} password
     * @param {string} ip
     * @return {Promise<User>}
     */
    loginUser(userName, password, ip) {
        if (!userName || !password) {
            return Promise.reject(Errors.INVALID_INPUT);
        }

        return this
            ._query("SELECT * FROM user WHERE name = ?;", userName)
            .then(result => {
                if (!result.length) {
                    return Promise.reject(Errors.USER_DOES_NOT_EXIST);
                } else if (result.length !== 1) {
                    return Promise.reject(Errors.CORRUPT_DATA);
                }

                let user = result[0];
                let uuid = user.uuid;

                if (!_verifyPassword(password, user.password, user.alg, user.salt)) {
                    return Promise.reject(Errors.INVALID_INPUT);
                }

                return this
                //if there exists a session already for that device, remove it
                    ._query("DELETE FROM user_log WHERE ip = ?;", [uuid, ip])
                    .then(() => {
                        //generate session key
                        const session = randomUuid();
                        let date = new Date().toISOString();

                        return this
                            ._query(
                                "INSERT INTO user_log (user_uuid, ip, session_key, acquisition_date) VALUES (?,?,?,?);",
                                [uuid, ip, session, date]
                            )
                            .then(() => this.getUser(uuid))
                            .then(user => {
                                user.session = session;
                                return user;
                            });
                    });
            });
    }


    /**
     * Checks if for the given ip any user is logged in.
     *
     * Returns the uuid of the logged in user and
     * the session key of the user for the ip.
     *
     * @param {string} ip
     * @return {Promise<User|boolean>}
     */
    userLoginStatus(ip) {
        return this
            ._query("SELECT * FROM user_log WHERE ip = ?;", ip)
            .then(result => {
                let sessionRecord = result[0];

                if (!sessionRecord) {
                    return false;
                }

                let session = sessionRecord.session_key;
                if (session) {
                    return this.getUser(sessionRecord.user_uuid).then(user => {
                        user.session = session;
                        return user;
                    })
                }
                return false;
            });
    }

    /**
     * Logs a user out.
     *
     * @param {string} uuid
     * @param {string} ip
     * @return {Promise<boolean>}
     */
    logoutUser(uuid, ip) {
        return this
            ._query("DELETE FROM user_log WHERE user_uuid = ? AND ip = ?", [uuid, ip])
            .then(result => result.affectedRows >= 1);
    }

    /**
     * Deletes the whole account of an user
     * with all associated data.
     *
     * Is irreversible.
     *
     * @param {string} uuid
     * @return {Promise<boolean>}
     */
    deleteUser(uuid) {
        //todo delete all associated data
        //remove in sequence:
        //user_log => list_medium => reading_list
        //=> external_list_medium => external_reading_list
        //=> external_user => user_episode
        return this._delete("user_log", "user_uuid", uuid)
            .then(() => this._query(
                "DELETE FROM list_medium " +
                "WHERE list_id in " +
                "(SELECT id FROM reading_list " +
                "WHERE user_uuid = ?);"
                , uuid))
            .then(() => this._query(
                "DELETE FROM reading_list " +
                "WHERE user_uuid = ?;"
                , uuid))
            .then(() => this._query(
                "DELETE FROM external_list_medium " +
                "WHERE list_id " +
                "IN (SELECT id FROM external_reading_list " +
                "WHERE user_uuid " +
                "IN (SELECT uuid FROM external_user " +
                "WHERE local_uuid = ?));"
                , uuid))
            .then(() => this._query(
                "DELETE FROM external_reading_list " +
                "WHERE user_uuid " +
                "IN (SELECT uuid FROM external_user WHERE local_uuid = ?);"
                , uuid))
            .then(() => this._query(
                "DELETE FROM external_user " +
                "WHERE local_uuid = ?;"
                , uuid))
            .then(() => this._query(
                "DELETE FROM user_episode " +
                "WHERE user_uuid = ?"
                , uuid))
            .then(() => this._delete("user", "uuid", uuid))
            .then(affected => affected >= 1);
    }

    /**
     * Updates the direct data of an user,
     * like name or password.
     *
     * Returns a boolean whether data was updated or not.
     *
     * @param {string} uuid
     * @param {{name?: string, newPassword?: string, password?: string}} user
     * @return {Promise<boolean>}
     */
    updateUser(uuid, user) {
        return Promise
            .resolve(user.newPassword && user.password && this.verifyPassword(uuid, user.password))
            .then(() =>
                this._update("user", "uuid", uuid, (updates, values) => {
                    if (user.name) {
                        updates.push("name = ?");
                        values.push(user.name);
                    }

                    if (user.newPassword) {
                        if (!user.password) {
                            return Promise.reject(Errors.INVALID_INPUT);
                        }
                        let {salt, hash} = StandardHash.hash(user.newPassword);

                        updates.push("alg = ?");
                        values.push(StandardHash.tag);

                        updates.push("salt = ?");
                        values.push(salt);

                        updates.push("password = ?");
                        values.push(hash);
                    }
                }));
    }

    /**
     * Verifies the password the user of
     * the given uuid.
     *
     * @param {string} uuid
     * @param {string} password
     * @return {Promise<boolean>}
     */
    verifyPassword(uuid, password) {
        return this
            ._query("SELECT password, alg, salt FROM user WHERE uuid = ?", uuid)
            .then(result => {
                let user = result[0];
                return _verifyPassword(password, user.password, user.alg, user.salt);
            });
    }

    /**
     * Returns a user with their associated lists and external user from the storage.
     *
     * @param uuid
     * @return {Promise<User>}
     */
    getUser(uuid) {
        let user = {
            external_user: [],
            lists: []
        };
        return this
        //query for user
            ._query("SELECT * FROM user WHERE uuid = ?;", uuid)
            //add user metadata
            .then(result => {
                result = result[0];
                user.name = result.name;
                user.uuid = uuid;


                if (!user.name) {
                    throw Error(Errors.CORRUPT_DATA)
                }
            })
            //query for user reading lists
            .then(() => this.getUserLists(uuid))
            //add local user reading lists
            .then(lists => user.lists.push(...lists))
            //select external user of user
            .then(() => this._query("SELECT * FROM external_user WHERE local_uuid = ?;", uuid))
            //add external_user and add their respective external reading lists
            .then(result => Promise.all(result.map(value => this
                .createShallowExternalUser(value)
                .then(external_user => user.external_user.push(external_user)))))
            //return user result
            .then(() => user);
    }

    /**
     * Adds a list to the storage and
     * links it to the user of the uuid.
     *
     * @param {string} uuid - id of the user
     * @param {Object} list - list to add
     * @param {string} list.name - name of the list
     * @param {number} list.medium - media flags for the list
     * @return {Promise<List>}
     */
    addList(uuid, {name, medium}) {
        return this
            ._query("INSERT INTO reading_list (user_uuid, name, medium) VALUES (?,?,?)", [uuid, name, medium])
            .then(result => {
                if (!Number.isInteger(result.insertId)) {
                    throw Error(`invalid ID: ${result.insertId}`)
                }
                return {
                    id: result.insertId,
                    items: [],
                    name,
                    medium
                };
            });
    }

    /**
     * Returns all mediums of a list with
     * the list_id.
     *
     * @param {number} list_id
     * @return {Promise<Array<Medium>>}
     */
    getList(list_id) {
        return this
            ._query("SELECT * FROM reading_list WHERE id = ?;", list_id)
            .then(result => this.createShallowList(result[0]))
            //todo this seems really inefficient
            .then(list => Promise.all(list.items.map(value => this.getMedium(value))));
    }


    /**
     * Recreates a list from storage.
     *
     * @param {{id: number, name: string, medium: number}} storage_list
     * @return {Promise<List>}
     */
    createShallowList(storage_list) {
        let list = {
            items: []
        };
        list.name = storage_list.name;
        list.medium = storage_list.medium;
        list.id = storage_list.id;

        return this._query("SELECT medium_id FROM list_medium WHERE list_id = ?", storage_list.id)
            .then(result => list.items.push(...result.map(value => value.medium_id)))
            .then(() => {
                if (!list.name) {
                    throw Error(Errors.CORRUPT_DATA);
                }
                return list;
            })
    }

    /**
     * Updates the properties of a list.
     *
     * @param {List} list
     */
    updateList(list) {
        return this._update("reading_list", "id", list.id, (updates, values) => {
            if (list.name) {
                updates.push("name = ?");
                values.push(list.name);
            }

            if (list.medium) {
                updates.push("medium = ?");
                values.push(list.medium);
            }
        });
    }

    /**
     * Deletes a list irreversibly.
     *
     * @param {number} list_id
     * @param {string} uuid
     * @return {Promise<boolean>}
     */
    deleteList(list_id, uuid) {
        return this
            ._query("SELECT id FROM reading_list WHERE id = ? AND user_uuid = ?", [list_id, uuid])
            //first check if such a list does exist for the given user
            .then(result => {
                if (!result.length) {
                    return Promise.reject(Errors.DOES_NOT_EXIST);
                }
            })
            //first remove all links between a list and their media
            ._delete("list_medium", "list_id", list_id)
            //lastly delete the list itself
            .then(() => this._delete("reading_list", "id", list_id));
    }

    /**
     * Returns all available lists for the given user.
     *
     * @param {string} uuid
     * @return {Promise<Array<List>>}
     */
    getUserLists(uuid) {
        return this
        //query all available lists for user
            ._query("SELECT * FROM reading_list WHERE reading_list.user_uuid = ?;", [uuid, uuid])
            //query a shallow list, so that only the id´s of their media is contained
            .then(result => Promise.all(result.map(value => this.createShallowList(value))));
    }

    /**
     * Adds a medium to the storage.
     *
     * @param {number} medium
     * @param {string} title
     * @return {Promise<Medium>}
     */
    addMedium(title, medium) {
        if (!medium || !title) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        return this
            ._query("INSERT INTO medium (medium, title) VALUES (?,?);", [medium, title])
            .then(result => {
                if (!Number.isInteger(result.insertId)) {
                    throw Error(`invalid ID: ${result.insertId}`)
                }

                return {
                    title,
                    medium,
                    id: result.insertId
                }
            });
    }

    /**
     * Gets a medium from the storage.
     *
     * @param {number} id
     * @return {Promise<Medium>}
     */
    getMedium(id) {
        return this
            ._query(`SELECT * FROM medium WHERE medium.id =?;`, id)
            .then(result => result.length && result[0]);
    }

    /**
     * Updates a medium from the storage.
     *
     * @param {Medium} medium
     * @return {Promise<boolean>}
     */
    updateMedium(medium) {
        return this._update("medium", "id", medium.id, (updates, values) => {
            for (let key of medium) {
                if (key === "synonyms" || key === "id") {
                    continue;
                }
                let value = medium[key];

                if (value === null) {
                    updates.push(`${key} = NULL`);
                } else if (value != null) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        });
    }

    /**
     * Returns all parts of an medium.
     *
     * @param {number} medium_id
     * @return {Promise<Array<Part>>}
     */
    getParts(medium_id) {
        return this
        //select all parts from a medium
            ._query("SELECT * FROM medium_part WHERE medium_id =?;", medium_id)
            //recreate shallow parts
            .then(result => Promise.all(result.map(value => this
                ._query("SELECT * FROM part WHERE id = ?", value.part_id)
                //query episodes of part and return part
                .then(part => this
                    ._query("SELECT id FROM episode WHERE part_id = ?", part.id)
                    .then(episodes => part.episodes = [...episodes.map(episode => episode.id)])
                    .then(() => part)
                )))
            );
    }

    /**
     * Adds a part of an medium to the storage.
     *
     * @param {number} medium_id
     * @param {Part} part
     * @return {Promise<Part>}
     */
    addPart(medium_id, part) {
        return this
            ._query("INSERT INTO part " +
                "(medium_id, title, totalIndex, partialIndex) " +
                "VALUES (?,?,?,?);",
                [medium_id, part.title, part.totalIndex, part.partialIndex])
            .then(result => {
                if (!Number.isInteger(result.insertId)) {
                    throw Error(`invalid ID ${result.insertId}`);
                }
                return {
                    id: result.insertId,
                    title: part.title,
                    partialIndex: part.partialIndex,
                    totalIndex: part.totalIndex,
                };
            });
    }

    /**
     * Updates a part.
     *
     * @param {Part} part
     * @return {Promise<boolean>}
     */
    updatePart(part) {
        return this._update("part", "id", part.id, (updates, values) => {
            if (part.title) {
                updates.push("title = ?");
                values.push(part.title);
            } else { // noinspection JSValidateTypes
                if (part.title === null) {
                    updates.push("title = NULL");
                }
            }

            if (part.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(part.partialIndex);
            }

            if (part.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(part.totalIndex);
            }
        });
    }

    /**
     * Deletes a part from the storage.
     *
     * @param {number} id
     * @return {Promise<boolean>}
     */
    deletePart(id) {
        //todo delete all episode in this part or just transfer them to the "all" part?
        return Promise.resolve(false);
    }

    /**
     * Adds a episode of a part to the storage.
     *
     * @param {number} part_id
     * @param {Episode} episode
     * @return {Promise<Episode>}
     */
    addEpisode(part_id, episode) {
        return this
            ._query("INSERT INTO episode " +
                "(part_id, totalIndex, partialIndex, url, releaseDate) " +
                "VALUES (?,?,?,?,?);")
            .then(result => {
                if (!Number.isInteger(result.insertId)) {
                    throw Error(`invalid ID ${result.insertId}`);
                }

                return {
                    id: result.insertId,
                    part_id: part_id,
                    title: episode.title,
                    partialIndex: episode.partialIndex,
                    totalIndex: episode.totalIndex,
                    url: episode.url,
                    releaseDate: episode.releaseDate,
                }
            });
    }

    /**
     * Gets an episode from the storage.
     *
     * @param {number} id
     * @return {Promise<Episode>}
     */
    getEpisode(id) {
        return this
            ._query("SELECT * FROM episode WHERE id = ?;", id)
            .then(result => result[0]);
    }

    /**
     * Updates an episode from the storage.
     *
     * @param {Episode} episode
     * @return {Promise<boolean>}
     */
    updateEpisode(episode) {
        return this._update("episode", "id", episode.id, (updates, values) => {
            if (episode.part_id) {
                updates.push("part_id = ?");
                values.push(episode.part_id);
            }

            if (episode.title) {
                updates.push("title = ?");
                values.push(episode.title);
            } else { // noinspection JSValidateTypes
                if (episode.title === null) {
                    updates.push("title = NULL");
                }
            }

            if (episode.partialIndex) {
                updates.push("partialIndex = ?");
                values.push(episode.partialIndex);
            }

            if (episode.totalIndex) {
                updates.push("totalIndex = ?");
                values.push(episode.totalIndex);
            }
        });
    }

    /**
     * Deletes an episode from the storage irreversibly.
     *
     * @param {number} id
     * @return {Promise<boolean>}
     */
    deleteEpisode(id) {
        return this
        //remove episode from progress first
            ._delete("user_episode", "episode_id", id)
            //lastly remove episode itself
            .then(() => this._delete("episode", "id", id));
    }

    /**
     * Adds a medium to a list.
     *
     * @param {boolean} external
     * @param {number} list_id
     * @param {number} id
     * @param {number} medium
     * @param {string} title
     * @return {Promise<boolean>}
     */
    addItemToList(external, list_id, {id, medium, title}) {
        let table = external ? "external_list_medium" : "list_medium";
        let promise;

        if (id == null) {
            promise = this.addMedium(title, medium).then(insertId => id = insertId.id);
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => this
            ._query(`INSERT INTO ${table} (list_id, medium_id) VALUES(?,?);`, [list_id, id])
            .then(result => result.affectedRows > 0));
    }

    /**
     * Moves a medium from an old list to a new list.
     *
     * @param {number} new_list_id
     * @param {number} medium_id
     * @param {number} old_list_id
     * @return {Promise<boolean>}
     */
    moveMedium(old_list_id, new_list_id, medium_id) {
        return this
        //first remove medium from old list
            .removeMedium(old_list_id, medium_id)
            //add item to new list
            .then(() => this.addItemToList(false, new_list_id, {id: medium_id}));
    }

    /**
     * Removes an item from a list.
     *
     * @param {number} list_id
     * @param {number} medium_id
     * @param {boolean} external
     * @return {Promise<boolean>}
     */
    removeMedium(list_id, medium_id, external = true) {
        let table = external ? "external_list_medium" : "list_medium";
        return this._query(
            `DELETE FROM ${table} WHERE list_id = ? AND medium_id = ?`,
            [list_id, medium_id]
        )
    }

    /**
     * Adds an external user of an user to the storage.
     *
     * @param {string} local_uuid
     * @param {ExternalUser} externalUser
     * @return {Promise<ExternalUser>}
     */
    addExternalUser(local_uuid, externalUser) {
        return this
            ._query("SELECT * FROM external_user " +
                "WHERE name = ? " +
                "AND local_uuid = ? " +
                "AND service = ?",
                [externalUser.name, local_uuid, externalUser.service])
            .then(result => {
                if (!result.length) {
                    throw Error(Errors.USER_EXISTS_ALREADY);
                }
                let uuid = userUuid();

                return this._query("INSERT INTO external_user " +
                    "(name, uuid, local_uuid, service) " +
                    "VALUES (?,?,?,?);",
                    [externalUser.name, uuid, local_uuid, externalUser.service]);
            });
    }

    /**
     * Deletes an external user from the storage.
     *
     * @param {string} external_uuid
     * @return {Promise<boolean>}
     */
    deleteExternalUser(external_uuid) {
        //We need a bottom-up approach to delete,
        //because deleting top-down
        //would violate the foreign keys restraints
        return this
        //first delete list - medium links
            ._query(
                "DELETE FROM external_list_medium " +
                "WHERE list_id " +
                "IN (SELECT id FROM external_reading_list " +
                "WHERE user_uuid =?);"
                , external_uuid)
            .then(() => this
            //proceed to delete lists of external user
                ._query(
                    "DELETE FROM external_reading_list " +
                    "WHERE user_uuid " +
                    "IN (SELECT uuid FROM external_user " +
                    "WHERE local_uuid = ?);"))
            .then(() => this
            //finish by deleting external user itself
                ._delete("external_user", "uuid", external_uuid));
    }

    /**
     * Gets an external user.
     *
     * @param {string} uuid
     * @return {Promise<ExternalUser>}
     */
    getExternalUser(uuid) {
        return this
            ._query("SELECT * FROM external_user WHERE uuid = ?;", uuid)
            .then(value => this.createShallowExternalUser(value[0]));
    }

    /**
     *  Creates a ExternalUser with
     *  shallow lists.
     *
     * @param storage_user
     * @return {Promise<ExternalUser>}
     */
    createShallowExternalUser(storage_user) {
        let external_user = {
            name: storage_user.name,
            uuid: storage_user.uuid,
            service: storage_user.service,
            lists: []
        };
        return this
            .getExternalUserLists(external_user.uuid)
            .then(external_lists => external_user.lists.push(...external_lists))
            .then(() => external_user);
    }

    /**
     * Updates an external user.
     *
     * @param {ExternalUser} externalUser
     * @return {Promise<boolean>}
     */
    updateExternalUser(externalUser) {
        return this._update("external_user", "uuid", externalUser.uuid, (updates, values) => {
            if (externalUser.name) {
                updates.push("name = ?");
                values.push(externalUser.name);
            }

            if (externalUser.cookies) {
                updates.push("cookies = ?");
                values.push(externalUser.cookies);
            } else if (externalUser.cookies === null) {
                updates.push("cookies = NULL");
            }
        });
    }

    /**
     * Adds an external list of an user to the storage.
     *
     * @param {string} userUuid
     * @param {ExternalList} externalList
     * @return {Promise<ExternalList>}
     */
    addExternalList(userUuid, externalList) {
        return this
            ._query(
                "INSERT INTO external_reading_list " +
                "(name, user_uuid, medium, url) " +
                "VALUES(?,?,?,?);",
                [externalList.name, userUuid, externalList.medium, externalList.url]
            )
            .then(result => {
                let insertId = result.insertId;

                if (!Number.isInteger(insertId)) {
                    throw Error(`invalid ID ${insertId}`)
                }

                return {
                    id: insertId,
                    name: externalList.name,
                    medium: externalList.medium,
                    url: externalList.url,
                }
            });
    }

    /**
     * Updates an external list.
     *
     * @param {ExternalList} externalList
     * @return {Promise<boolean>}
     */
    updateExternalList(externalList) {
        return this._update(
            "external_reading_list",
            "user_uuid",
            externalList.id,
            (updates, values) => {
                if (externalList.medium) {
                    updates.push("medium = ?");
                    values.push(externalList.medium)
                }

                if (externalList.name) {
                    updates.push("name = ?");
                    values.push(externalList.name)
                }
            }
        );
    }

    /**
     * Gets an external list from the storage.
     *
     * @param {number} id
     * @return {Promise<ExternalList>}
     */
    getExternalList(id) {
        return this
            ._query("SELECT * FROM external_reading_list WHERE id = ?", id)
            .then(result => this.createShallowExternalList(result[0]));
    }

    /**
     * Creates a shallow external List with only the id´s of their items
     * as list.
     *
     * @param {ExternalList} storage_list
     * @return {Promise<ExternalList>}
     */
    createShallowExternalList(storage_list) {
        return this
            ._query("SELECT * FROM external_list_medium WHERE list_id = ?;", storage_list.id)
            .then(result => storage_list.items = result.map(value => value.medium_id))
            .then(() => storage_list);
    }

    /**
     * Gets an array of all lists of an user.
     *
     * @param {string} uuid
     * @return {Promise<Array<ExternalList>>}
     */
    getExternalUserLists(uuid) {
        return this
            ._query("SELECT * FROM external_reading_list WHERE user_uuid = ?;", uuid)
            .then(result => Promise.all(result.map(value => this.createShallowExternalList(value))));
    }

    /**
     * Adds a medium to an external list in the storage.
     *
     * @param {number} list_id
     * @param {number} medium_id
     * @return {Promise<boolean>}
     */
    addItemToExternalList(list_id, medium_id) {
        return this
            ._query(
                "INSERT INTO external_list_medium " +
                "(list_id, medium_id) " +
                "VALUES (?,?)",
                [list_id, medium_id]
            )
            .then(result => result.affectedRows > 0);
    }

    /**
     * Add progress of an user in regard to an episode to the storage.
     *
     * @param {string} uuid
     * @param {number} episode_id
     * @param {number} progress
     * @return {Promise<boolean>}
     */
    addProgress(uuid, episode_id, progress) {
        if (!Number.isInteger(progress + episode_id)) {
            return Promise.reject(Errors.INVALID_INPUT);
        }
        return this
            .removeProgress(uuid, episode_id)
            .then(() => this._query(
                "INSERT INTO user_episode " +
                "(user_uuid, episode_id, progress) " +
                "VALUES (?,?,?);",
                [uuid, episode_id, progress])
            )
            .then(result => result.affectedRows > 0);
    }

    /**
     * Removes progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} episodeId
     * @return {Promise<boolean>}
     */
    removeProgress(uuid, episodeId) {
        return this
            ._query(
                "DELETE FROM user_episode " +
                "WHERE user_uuid = ? " +
                "AND episode_id = ?",
                [uuid, episodeId]
            )
            .then(result => result.affectedRows > 0);
    }

    /**
     * Get the progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} episodeId
     * @return {Promise<number>}
     */
    getProgress(uuid, episodeId) {
        return this
            ._query(
                "SELECT * FROM user_episode " +
                "WHERE user_uuid = ? " +
                "AND episode_id = ?",
                [uuid, episodeId]
            )
            .then(result => result[0].progress)
    }

    /**
     * Updates the progress of an user in regard to an episode.
     *
     * @param {string} uuid
     * @param {number} episodeId
     * @param {number} progress
     * @return {Promise<boolean>}
     */
    updateProgress(uuid, episodeId, progress) {
        //todo for now its the same as calling addProgress, but somehow do it better maybe?
        return this.addProgress(uuid, episodeId, progress);
    }

    /**
     * Deletes one or multiple entries from one specific table,
     * with only one conditional.
     *
     * @param {string} table
     * @param {string} column
     * @param {*} value
     * @return {Promise<*>}
     * @private
     */
    _delete(table, column, value) {
        return this
            ._query(`DELETE FROM ${mySql.escapeId(table)} WHERE ${mySql.escapeId(column)} = ?;`, value)
            .then(result => result.affectedRows >= 0);
    }

    /**
     * Updates data from the storage.
     *
     * @param {string} table
     * @param {string} column - the conditional column
     * @param {*} idValue - the conditional value
     * @param {updateCallback} cb
     * @return {Promise<boolean>}
     * @private
     */
    _update(table, column, idValue, cb) {
        let updates = [];
        let values = [];

        cb(updates, values);

        if (!updates.length) {
            return Promise.resolve(false);
        }
        values.push(idValue);
        return this
            ._query(
                `UPDATE ${mySql.escapeId(table)} 
                SET ${updates.join(", ")} 
                WHERE ${mySql.escapeId(column)} = ?;`,
                values
            )
            .then(result => result.affectedRows > 0);
    }

    /**
     * Returns all user stored in storage.
     * @return {Promise<*>}
     */
    showUser() {
        return this._query("SELECT * FROM user;");
    }

    /**
     * Deletes the whole storage.
     *
     * @return {Promise<boolean>}
     */
    clearAll() {
        return this.databaseExists().then(exists => exists && this._query(`DROP DATABASE ${database};`));
    }
}

/**
 * @callback updateCallback
 * @param {Array<string>} updates
 * @param {Array<*>} values
 */

module.exports.Storage = Storage;
module.exports.Errors = Errors;

module.exports.isError = function (error) {
    for (let key of Object.keys(Errors)) {
        if (Errors[key] === error) {
            return true;
        }
    }
    return false;
};

Storage.inContext = inContext;