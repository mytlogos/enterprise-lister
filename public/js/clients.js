/**
 *
 */
class WebSocketClient extends EventTarget {
    constructor() {
        super();
        //allow this client only in browser environment and only once
        if (window.WSClient) {
            throw Error("only one client instance is allowed");
        }
        this.offline = false;
    }

    /***
     *  Starts the WebSocket to the server of this
     *  Extension.
     *  Throws Error if client is offline.
     *
     * @return {Promise<void>}
     */
    startPush() {
        return new Promise(resolve => {
            if (this.offline) {
                throw Error("please verify that server is online")
            }
            //for now opens webSocket without tls
            this.socket = new WebSocket("ws://localhost:80/");
            this.socket.onmessage = this.pushed;
            this.socket.onopen = () => resolve();
        });
    }

    /***
     * Sends a JSON Request to the server of this extension.
     * If the server is unreachable, the client is marked as offline, else online.
     * Returns the JSON Response if status is ok or undefined.
     *
     * @param request object to stringify
     * @return {Promise<Object | void>}
     */
    request(request) {
        return fetch("http://localhost/api", {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        }).then(response => {
            this.offline = false;
            //http status should ever be only ok
            if (response.ok) {
                return response.json();
            }
            return undefined;
        }).catch(() => {
            this.offline = true;
            return undefined;
        });
    }

    /***
     * Pushes a Message to the Server after converting it to JSON.
     *
     * @param message message to be stringified to JSON
     * @return {void}
     */
    push(message) {
        if (!this.socket) {
            throw Error("webSocket is not active while trying to send message")
        }
        this.socket.send(JSON.stringify(message));
    }

    /***
     * Dispatches Events extracted from the message of the server.
     *
     * @param event
     * @return {void}
     */
    pushed(event) {
        let data;
        //todo only return if parsing failed or log an error msg
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if (!data) {
            return
        }

        for (let key of Object.keys(data)) {
            //emit events if it is any of the valid events
            if (events.any(key)) {
                let msg = {status: data.status};
                msg[key] = data[data];

                this.dispatchEvent(new CustomEvent(key, {detail: msg}));
            }
        }
    }

    /***
     * Closes the WebSocket and removes it from this client.
     *
     * @return {void}
     */
    close() {
        this.socket.close();
        this.socket = undefined;
    }
}

/**
 * Possible Events for this Clients.
 *
 * @type {{REGISTER: string, LOGIN: string, LOGGED: string, LOGOUT: string, DATA: string, UPDATE: string, any(string): boolean}}
 */
const events = {
    REGISTER: "register",
    LOGIN: "login",
    LOGGED: "logged",
    LOGOUT: "logout",
    DATA: "data",
    UPDATE: "update",

    /***
     *
     * @param {string} type
     * @return {boolean}
     */
    any(type) {
        for (let key in Object.keys(this)) {
            let event = this[key];

            if (event === type && typeof(event) !== "function") {
                return true;
            }
        }
        return false;
    }
};

/***
 * Message Codes for the client-server communication.
 *
 * @type {{OK: number, INVALID_SESSION: number, INVALID_REQUEST: number, SERVER_OUT_OF_REACH: number, OFFLINE: number}}
 */
const status = {
    OK: 0,
    INVALID_SESSION: 1,
    INVALID_REQUEST: 2,
    SERVER_OUT_OF_REACH: 3,
    OFFLINE: 4,
};

//the only instance of Clients in the window namespace
const WSClient = new WebSocketClient();

/**
 * Allowed Methods for the API.
 *
 * @type {{post: string, get: string, put: string, delete: string}}
 */
const Methods = {
    post: "POST",
    get: "GET",
    put: "PUT",
    delete: "DELETE"
};

const HttpClient = {

    get loggedIn() {
        return Boolean(user.uuid);
    },

    /**
     *
     * @param {string} uuid
     * @param {string} session
     * @param {string} name
     * @param {Array<ExternalUser>} external_user
     * @param {Array<List>} lists
     * @return {User}
     */
    setUser({uuid, session, name, external_user = [], lists = []}) {
        try {
            return user
                .clear()
                .setName(name)
                .setId(uuid)
                .setSession(session)
                .addList(...lists)
                .pushExternalUser(...external_user);
        } catch (e) {
            //in case some error happened while adding new data,
            //clear any rest data and rethrow error
            user.clear();
            throw e;
        }
    },

    /**
     * Checks whether a user is currently logged in on this device.
     *
     * @return {Promise<boolean>}
     */
    isLoggedIn() {
        return this
            .queryServer({auth: false})
            .then(result => {
                if (!result) {
                    return false;
                }
                this.setUser(result);
                return true;
            })
    },

    /**
     * @param {string} userName
     * @param {string} psw
     *
     * @return {Promise<boolean>}
     */
    login(userName, psw) {
        //need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject();
        }

        if (!userName || !psw) {
            return Promise.reject();
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "login",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.setUser(result);
                return true;
            });
    },

    /**
     * @param {string} userName
     * @param {string} psw
     * @param {string} psw_repeat
     *
     * @return {*}
     */
    register(userName, psw, psw_repeat) {
        //need to be logged out to login
        if (HttpClient.loggedIn) {
            return
        }
        if (psw !== psw_repeat) {
            //todo show incorrect password
            return Promise.reject();
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "register",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.setUser(result);
                return true;
            });
    },


    /**
     * @return {Promise<boolean>}
     */
    logout() {
        return this
            .queryServer({
                path: "logout",
                method: Methods.post,
            })
            .then(result => result.loggedOut)
            .then(loggedOut => {
                user.clear();

                if (!loggedOut) {
                    //todo show error msg, but still clear data?
                }
                return loggedOut;
            })
            .catch(error => console.log(error));
    },

    /**
     *
     * @param {List} list
     * @param {Array<number>} unknown_media
     */
    loadListItems(list, unknown_media) {
        if (!unknown_media.length) {
            return Promise.resolve([]);
        }
        return this
            .queryServer({
                query: {
                    listId: list.id,
                    media: unknown_media
                },
                path: "list/medium",
            })
            .then(media => list.items.push(...media));
    },

    /**
     *
     * @param {List} list
     * @return {Promise<List>}
     */
    createList(list) {
        return this
            .queryServer({
                query: {list: list},
                path: "list/",
                method: Methods.post,
            })
            .then(newList => Object.assign(list, newList));
    },

    /**
     *
     * @param {List} list
     * @return {Promise<boolean>}
     */
    updateList(list) {
        return this
            .queryServer({
                query: {list: list},
                path: "list/",
                method: Methods.put,
            });
    },

    /**
     *
     * @param {number} list_id
     * @return {Promise<boolean>}
     */
    deleteList(list_id) {
        return this
            .queryServer({
                query: {listId: list_id},
                path: "list/",
                method: Methods.delete,
            })
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            })
            .finally(() => {
                let index = user.lists.findIndex(value => value.id === list_id);

                if (index >= 0) {
                    user.lists.splice(index, 1);
                }
            });
    },

    /**
     *
     * @param {Medium} medium
     */
    createMedium(medium) {
        return this
            .queryServer({
                query: {medium},
                path: "medium/",
                method: Methods.post,
            })
            .then(newMedium => Object.assign(medium, newMedium));
    },

    getMedia() {

    },

    updateMedium() {

    },

    deleteMedium() {

    },

    /**
     * @return {Promise<*>}
     */
    queryExtension() {
        return new Promise(((resolve, reject) => {
            //todo implement extension query
            //one should not use this, because 'direct' communication
            //with the extension is only possible by sending message through
            //window or other elements, which can be listened to by everyone
        }));
    },

    /**
     *
     * @param {Object?} query
     * @param {string?} path
     * @param {string?} method
     * @param {boolean?} auth
     * @return {Promise<Object>}
     */
    queryServer({query, path = "", method = Methods.get, auth = true} = {}) {
        if (auth) {
            if (!user.uuid) {
                throw Error("cannot send user message if no user is logged in")
            }
            if (!query) {
                query = {};
            }
            query.uuid = user.uuid;
            query.session = user.session;
        }
        let init = {
            method: method,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        };
        //append json query if
        if (query) {
            init.body = JSON.stringify(query);
        }
        return fetch(`${window.location}api/user/${path}`, init)
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            });
    },
};
