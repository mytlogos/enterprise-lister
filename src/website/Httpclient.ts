import {
    ExternalUser,
    List,
    Medium,
    News,
    User,
    DisplayReleasesResponse,
    SimpleMedium,
    MediumRelease,
    Job,
    Toc,
    AddMedium,
    SecondaryMedium,
    FullMediumToc,
    JobStats,
    AllJobStats,
    JobDetails,
    TimeJobStats,
    TimeBucket
} from "./siteTypes";

/**
 * Allowed Methods for the API.
 */
const Methods: { post: string; get: string; put: string; delete: string } = {
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
            jobs: {
                get: true,
                stats: {
                    all: {
                        get: true,
                    },
                    grouped: {
                        get: true,
                    },
                    detail: {
                        get: true,
                    },
                    timed: {
                        get: true,
                    },
                },
            },
            searchtoc: {
                get: true,
            },
            toc: {
                get: true,
                post: true,
                delete: true,
            },
            medium: {
                get: true,
                post: true,
                put: true,
                all: {
                    get: true
                },
                allFull: {
                    get: true
                },
                allSecondary: {
                    get: true
                },
                releases: {
                    get: true
                },

                progress: {
                    get: true,
                    post: true,
                    put: true,
                    delete: true,
                },

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

                        releases: {
                            display: {
                                get: true,
                            }
                        }
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
 * @typedef {Object} pathObject
 * @property {string} path,
 * @property {string} method
 */

interface KeyObj {
    [key: string]: KeyObj | boolean;
}

interface MethodObject {
    readonly method: string;
    readonly path: string;
}

interface ApiPath {
    readonly get: MethodObject;
}

interface LoginPath {
    readonly post: MethodObject;
}

interface RegisterPath {
    readonly post: MethodObject;
}

interface UserPath {
    readonly post: MethodObject;
}

interface LogoutPath {
    readonly post: MethodObject;
}

interface ListsPath {
    readonly get: MethodObject;
}

interface GetPath {
    readonly get: MethodObject;
}

interface MediumPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly delete: MethodObject;
    readonly all: AllMediumPath;
    readonly allFull: AllFullMediumPath;
    readonly allSecondary: GetPath;
    readonly releases: MediumReleasesPath;
}

interface MediumReleasesPath {
    readonly get: MethodObject;
}

interface AllMediumPath {
    readonly get: MethodObject;
}

interface AllFullMediumPath {
    readonly get: MethodObject;
}

interface PartPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly put: MethodObject;
    readonly delete: MethodObject;
}

interface EpisodePath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly put: MethodObject;
    readonly delete: MethodObject;
}

interface ReleasePath {
    readonly get: MethodObject;
}

interface ProgressPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly put: MethodObject;
    readonly delete: MethodObject;
}

interface NewsPath {
    readonly get: MethodObject;
}

interface ListPath {
    readonly medium: ListMediumPath;
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly put: MethodObject;
    readonly delete: MethodObject;
}

interface ListMediumPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly put: MethodObject;
    readonly delete: MethodObject;
}

interface ExternalUserPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly delete: MethodObject;
}

interface TocPath {
    readonly get: MethodObject;
    readonly post: MethodObject;
    readonly delete: MethodObject;
}

interface JobPath {
    readonly get: MethodObject;
    readonly stats: {
        all: GetPath;
        grouped: GetPath;
        detail: GetPath;
        timed: GetPath;
    };
}

interface Api {
    readonly api: ApiPath;
    readonly externalUser: ExternalUserPath;
    readonly jobs: JobPath;
    readonly list: ListPath;
    readonly news: NewsPath;
    readonly toc: TocPath;
    readonly searchtoc: { get: MethodObject };
    readonly progress: ProgressPath;
    readonly episode: EpisodePath;
    readonly release: ReleasePath;
    readonly part: PartPath;
    readonly medium: MediumPath;
    readonly lists: ListsPath;
    readonly logout: LogoutPath;
    readonly login: LoginPath;
    readonly register: RegisterPath;
    readonly user: UserPath;
}

const api: Api = (function pathGenerator() {
    const abbreviations: { [key: string]: string[] } = {};
    const allowedPreviousStates: { [key: string]: string[] } = {};
    const paths: { [key: string]: string[][] } = {};
    const methods: { [key: string]: boolean } = {};

    (function run(previous?: string, path: string[] = [], object: KeyObj = restApi, depth = 0): void {

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
            } else {
                methods[key] = true;
            }
        }
        path.pop();
    })();

    function generateAbbrev(state: string) {
        const allowedStates = allowedPreviousStates[state];

        for (const allowed of allowedStates) {
            const smallestPath = paths[allowed].reduce(
                (previous, current) =>
                    current.length > previous.length ? previous : current,
            );
            if (smallestPath.length) {
                abbreviations[allowed] = smallestPath;
            }
        }
    }

    for (const method of Object.keys(methods)) {
        generateAbbrev(method);
    }
    const currentPath: string[] = [];
    let currentState: string | null;

    return new Proxy(
        {},
        {
            get(target: any, p: string, receiver) {
                const allowed = allowedPreviousStates[p];

                if (!currentState) {
                    const abbreviatedPath = abbreviations[p];

                    if (abbreviatedPath) {
                        currentPath.push(...abbreviatedPath);
                    } else if (allowed.length) {
                        throw Error(`path section '${p}' is not part of the rest api`);
                    }
                } else if (allowed.includes(currentState)) {
                    currentPath.push(currentState);
                } else {
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

                    return new Proxy(
                        {
                            path,
                            method,
                        },
                        {
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
                        },
                    );
                }
                currentState = p;
                return receiver;
            },
        },
    );
})();

export const HttpClient = {
    _user: null,
    _init: false,


    get userPromise(): Promise<any> {
        return new Promise((resolve) => {
            if (this._init) {
                resolve(this._user);
                return;
            }
            const intervalId = setInterval(() => {
                if (this._init) {
                    clearInterval(intervalId);
                    resolve(this._user);
                }
            }, 500);
        });
    },

    set user(user: any) {
        this._user = user;
        this._init = true;
    },

    get loggedIn(): boolean {
        // @ts-ignore
        return this.user && Boolean(this.user.uuid);
    },

    /**
     * Checks whether a user is currently logged in on this device.
     */
    isLoggedIn(): Promise<User> {
        return this.queryServer(api.api.get);
    },

    login(userName: string, psw: string): Promise<User> {
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

    register(userName: string, psw: string, pswRepeat: string): Promise<User> {
        // need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject();
        }
        if (psw !== pswRepeat) {
            // TODO show incorrect password
            return Promise.reject();
        }

        return this.queryServer(api.register.post, {
            userName,
            pw: psw,
        });
    },

    logout(): Promise<boolean> {
        return this.queryServer(api.logout.post).then((result) => result.loggedOut);
    },

    addExternalUser(externalUser: { identifier: string; pwd: string }): Promise<ExternalUser> {
        return this.queryServer(api.externalUser.post, { externalUser });
    },

    deleteExternalUser(uuid: string): Promise<any> {
        return this.queryServer(api.externalUser.delete, { externalUuid: uuid });
    },

    createList(list: { name: string; type: number }): Promise<List> {
        return this.queryServer(api.list.post, { list }).then((newList) =>
            Object.assign(list, newList),
        );
    },

    updateList(list: List): Promise<boolean> {
        return this.queryServer(api.list.put, { list });
    },

    deleteList(listId: number): Promise<boolean> {
        return this.queryServer(api.list.delete, { listId }).then(
            (result) => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            },
        );
    },

    /**
     * Creates an medium server side.
     * Returns a fully valid Medium if successful.
     * 
     * @param medium medium to create
     */
    createMedium(medium: AddMedium): Promise<SimpleMedium & { id: number }> {
        return this.queryServer(api.medium.post, { medium });
    },

    getAllMedia(): Promise<SimpleMedium[]> {
        return this.queryServer(api.medium.allFull.get);
    },

    getAllSecondaryMedia(): Promise<SecondaryMedium[]> {
        return this.queryServer(api.medium.allSecondary.get);
    },

    getMedia(media: number | number[]): Promise<Medium | Medium[]> {
        if (Array.isArray(media) && !media.length) {
            return Promise.reject();
        }
        return this.queryServer(api.medium.get, { mediumId: media });
    },

    updateMedium(data: { id: number; prop: string }): Promise<void> {
        // TODO
        return Promise.resolve();
    },

    deleteMedium(id: number): Promise<void> {
        // TODO
        return Promise.resolve();
    },

    getNews(from: Date | undefined, to: Date | undefined): Promise<News[]> {
        return this.queryServer(api.news.get, { from, to });
    },

    /**
     * Get a certain number of DisplayReleases including and after the <i>latest</i> parameter
     * at most until the <i>until</i> parameter if available.
     * 
     * @param latest the date to get all releases after (including)
     */
    getDisplayReleases(latest: Date, until?: Date, readFilter?: boolean): Promise<DisplayReleasesResponse> {
        const parameter: { latest: Date; until?: Date; read?: boolean } = { latest };
        if (until) {
            parameter.until = until;
        }
        if (readFilter != null) {
            parameter.read = readFilter;
        }
        return this.queryServer({ path: "api/user/medium/part/episode/releases/display", method: "GET" }, parameter);
    },

    /**
     * Get all Releases from the given medium id.
     * 
     * @param mediumId the medium to get all their releases from
     */
    getReleases(mediumId: number): Promise<MediumRelease[]> {
        return this.queryServer(api.medium.releases.get, { id: mediumId });
    },

    getLists(): Promise<List[]> {
        return this.queryServer(api.lists.get);
    },

    /**
     * Add progress of the user in regard to an episode.
     * Returns always true if it succeeded (no error).
     * 
     * @param episodeId the episode/s to set the progress to
     * @param progress the new progress value
     */
    updateProgress(episodeId: number | number[], progress: number): Promise<boolean> {
        return this.queryServer(api.progress.post, { episodeId, progress });
    },

    getJobs(): Promise<Job[]> {
        return this.queryServer(api.jobs.get);
    },

    getJobsStats(): Promise<AllJobStats> {
        return this.queryServer(api.jobs.stats.all.get);
    },

    getJobsStatsGrouped(): Promise<JobStats[]> {
        return this.queryServer(api.jobs.stats.grouped.get);
    },

    getJobsStatsTimed(bucket: TimeBucket, groupByDomain: boolean): Promise<TimeJobStats[]> {
        return this.queryServer(api.jobs.stats.timed.get, { bucket, groupByDomain });
    },

    /**
     * Get the Job Details of a single Job.
     * @param id id of the Job
     */
    getJobDetails(id: number): Promise<JobDetails> {
        return this.queryServer(api.jobs.stats.detail.get, { id });
    },

    getToc(link: string): Promise<Toc[]> {
        link = encodeURIComponent(link);
        return this.queryServer(api.searchtoc.get, { link });
    },

    getTocs(mediumId: number | number[]): Promise<FullMediumToc[]> {
        return this.queryServer(api.toc.get, { mediumId });
    },

    addToc(link: string, id: number): Promise<boolean> {
        return this.queryServer(api.toc.post, { toc: link, mediumId: id });
    },

    async queryServer({ path, method }: { path: string; method?: string }, query?: any): Promise<any> {
        // if path includes user, it needs to be authenticated
        if (path.includes("user")) {
            const user = await this.userPromise;
            // @ts-ignore
            if (!user || !user.uuid) {
                throw Error("cannot send user message if no user is logged in");
            }
            if (!query) {
                query = {};
            }
            // @ts-ignore
            query.uuid = user.uuid;
            // @ts-ignore
            query.session = user.session;
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
                Object.keys(query).forEach((key) =>
                    url.searchParams.append(key, query[key]),
                );
            } else {
                // @ts-ignore
                init.body = JSON.stringify(query);
            }
        }
        const response = await fetch(url.toString(), init);
        const result = await response.json();
        if (result.error) {
            return Promise.reject(result.error);
        }
        return result;
    },
};
