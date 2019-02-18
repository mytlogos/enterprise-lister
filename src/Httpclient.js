const Methods = {
    post: "POST",
    get: "GET",
    put: "PUT",
    delete: "DELETE",
};
const restApi = {
    api: {
        get: true,
        login: {
            post: true,
        },
        register: {
            post: true,
        },
        user: {
            put: true,
            delete: true,
            logout: {
                post: true,
            },
            lists: {
                get: true,
            },
            medium: {
                get: true,
                post: true,
                put: true,
                part: {
                    get: true,
                    post: true,
                    put: true,
                    delete: true,
                    episode: {
                        get: true,
                        post: true,
                        put: true,
                        delete: true,
                        progress: {
                            get: true,
                            post: true,
                            put: true,
                            delete: true,
                        },
                    },
                },
            },
            externalUser: {
                get: true,
                post: true,
                delete: true,
            },
            list: {
                get: true,
                post: true,
                put: true,
                delete: true,
                medium: {
                    get: true,
                    post: true,
                    put: true,
                    delete: true,
                },
            },
            news: {
                get: true,
            },
        },
    },
};
/**
 * @namespace
 * @property {pathObject} api.get
 * @property {pathObject} login.post
 * @property {pathObject} register.post
 * @property {pathObject} user.put
 * @property {pathObject} user.delete
 * @property {pathObject} logout.post
 * @property {pathObject} lists.get
 * @property {pathObject} medium.get
 * @property {pathObject} medium.post
 * @property {pathObject} medium.put
 * @property {pathObject} part.get
 * @property {pathObject} part.put
 * @property {pathObject} part.post
 * @property {pathObject} part.delete
 * @property {pathObject} episode.get
 * @property {pathObject} episode.put
 * @property {pathObject} episode.post
 * @property {pathObject} episode.delete
 * @property {pathObject} progress.get
 * @property {pathObject} progress.put
 * @property {pathObject} progress.post
 * @property {pathObject} progress.delete
 * @property {pathObject} news.get
 * @property {pathObject} list.put
 * @property {pathObject} list.get
 * @property {pathObject} list.post
 * @property {pathObject} list.delete
 * @property {pathObject} list.medium.get
 * @property {pathObject} list.medium.put
 * @property {pathObject} list.medium.post
 * @property {pathObject} list.medium.delete
 * @property {pathObject} externalUser.get
 * @property {pathObject} externalUser.post
 * @property {pathObject} externalUser.delete
 */
// @ts-ignore
const api = (function pathGenerator() {
    const abbreviations = {};
    const allowedPreviousStates = {};
    const paths = {};
    const methods = {};
    (function run(previous, path = [], object = restApi, depth = 0) {
        if (previous) {
            path.push(previous);
        }
        for (const key of Object.keys(object)) {
            const value = object[key];
            let keyPath = paths[key];
            if (!keyPath) {
                keyPath = paths[key] = [];
            }
            keyPath.push([...path]);
            if (!allowedPreviousStates[key]) {
                allowedPreviousStates[key] = [];
            }
            if (previous) {
                allowedPreviousStates[key].push(previous);
            }
            if (typeof value === "object") {
                run(key, path, value, depth++);
            }
            else {
                methods[key] = true;
            }
        }
        path.pop();
    })();
    function generateAbbrev(state) {
        const allowedStates = allowedPreviousStates[state];
        for (const allowed of allowedStates) {
            const smallestPath = paths[allowed].reduce((previous, current) => current.length > previous.length ? previous : current);
            if (smallestPath.length) {
                abbreviations[allowed] = smallestPath;
            }
        }
    }
    for (const method of Object.keys(methods)) {
        generateAbbrev(method);
    }
    const currentPath = [];
    let currentState;
    return new Proxy({}, {
        get(target, p, receiver) {
            const allowed = allowedPreviousStates[p];
            if (!currentState) {
                const abbreviatedPath = abbreviations[p];
                if (abbreviatedPath) {
                    currentPath.push(...abbreviatedPath);
                }
                else if (allowed.length) {
                    throw Error(`path section '${p}' is not part of the rest api`);
                }
            }
            else if (allowed.includes(currentState)) {
                currentPath.push(currentState);
            }
            else {
                throw Error(`path section '${p}' is not part of the rest api`);
            }
            if (p in methods) {
                const path = currentPath.join("/");
                // @ts-ignore
                const method = Methods[p];
                if (!method) {
                    throw Error(`unknown method: '${p}'`);
                }
                currentPath.length = 0;
                currentState = null;
                return new Proxy({
                    path,
                    method,
                }, {
                    get(targetObj, prop) {
                        // need to check if p is in paths, because the IDE inspector accesses the object too,
                        // which would throw an error here, if p is not 'valid', so check it if it is in paths
                        // (hopefully intellij inspector won't use these either)
                        // @ts-ignore
                        if ((prop !== "path" || prop !== "method") && prop in paths) {
                            throw Error(`'${String(prop)}' is not a property of object`);
                        }
                        // @ts-ignore
                        return targetObj[prop];
                    },
                });
            }
            currentState = p;
            return receiver;
        },
    });
})();
export const HttpClient = {
    user: null,
    get loggedIn() {
        // @ts-ignore
        return this.user && Boolean(this.user.uuid);
    },
    /**
     * Checks whether a user is currently logged in on this device.
     */
    isLoggedIn() {
        return this.queryServer(api.api.get);
    },
    login(userName, psw) {
        // need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject();
        }
        if (!userName || !psw) {
            return Promise.reject();
        }
        return this.queryServer(api.login.post, {
            userName,
            pw: psw,
        });
    },
    register(userName, psw, pswRepeat) {
        // need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject();
        }
        if (psw !== pswRepeat) {
            // todo show incorrect password
            return Promise.reject();
        }
        return this.queryServer(api.register.post, {
            userName,
            pw: psw,
        });
    },
    logout() {
        return this.queryServer(api.logout.post).then((result) => result.loggedOut);
    },
    addExternalUser(externalUser) {
        return this.queryServer(api.externalUser.post, { externalUser });
    },
    deleteExternalUser(uuid) {
        return this.queryServer(api.externalUser.delete, { externalUuid: uuid });
    },
    createList(list) {
        return this.queryServer(api.list.post, { list }).then((newList) => Object.assign(list, newList));
    },
    updateList(list) {
        return this.queryServer(api.list.put, { list });
    },
    deleteList(listId) {
        return this.queryServer(api.list.delete, { listId }).then((result) => {
            if (result.error) {
                return Promise.reject(result.error);
            }
            return result;
        });
    },
    createMedium(medium) {
        return this.queryServer(api.medium.post, { medium });
    },
    getMedia(media) {
        if (Array.isArray(media) && !media.length) {
            return Promise.reject();
        }
        return this.queryServer(api.medium.get, { mediumId: media });
    },
    updateMedium(data) {
        // todo
        return Promise.resolve();
    },
    deleteMedium(id) {
        // todo
        return Promise.resolve();
    },
    getNews(from, to) {
        return this.queryServer(api.news.get, { from, to });
    },
    queryServer({ path, method }, query) {
        // if path includes user, it needs to be authenticated
        if (path.includes("user")) {
            // @ts-ignore
            if (!this.user || !this.user.uuid) {
                throw Error("cannot send user message if no user is logged in");
            }
            if (!query) {
                query = {};
            }
            // @ts-ignore
            query.uuid = this.user.uuid;
            // @ts-ignore
            query.session = this.user.session;
        }
        const init = {
            method,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        };
        const url = new URL(`${window.location.origin}/${path}`);
        if (query) {
            if (method === Methods.get) {
                Object.keys(query).forEach((key) => url.searchParams.append(key, query[key]));
            }
            else {
                // @ts-ignore
                init.body = JSON.stringify(query);
            }
        }
        return fetch(url.toString(), init)
            .then((response) => response.json())
            .then((result) => {
            if (result.error) {
                return Promise.reject(result.error);
            }
            return result;
        });
    },
};
//# sourceMappingURL=Httpclient.js.map