import { store } from "./store/store";
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
  TimeBucket,
  MediaType,
  SearchResult,
  ScraperHook,
  MediumInWait,
  MediumInWaitSearch,
  Part,
  JobHistoryItem,
} from "./siteTypes";
import { AddPart, AppEvent, AppEventFilter, EmptyPromise, JobStatSummary } from "enterprise-core/src/types";

/**
 * Allowed Methods for the API.
 */
const Methods: { post: string; get: string; put: string; delete: string } = {
  post: "POST",
  get: "GET",
  put: "PUT",
  delete: "DELETE",
};

const restApi = createRestDefinition({
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
      events: {
        get: true,
      },
      jobs: {
        get: true,
        enable: {
          post: true,
        },
        history: {
          get: true,
        },
        stats: {
          summary: {
            get: true,
          },
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
      hook: {
        get: true,
        put: true,
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
          get: true,
        },
        allFull: {
          get: true,
        },
        allSecondary: {
          get: true,
        },
        releases: {
          get: true,
        },
        unused: {
          get: true,
          put: true,
        },
        create: {
          post: true,
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
              },
            },
          },
        },
      },
      externalUser: {
        get: true,
        post: true,
        delete: true,

        refresh: {
          get: true,
        },

        all: {
          get: true,
        },
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
      search: {
        get: true,
      },
      crawler: {
        jobs: {
          get: true,
        },
      },
    },
  },
});

type MethodName = keyof typeof Methods;

type Rest<T extends any = any> = {
  [key in Extract<keyof T, MethodName>]: true;
} &
  {
    [key in Exclude<keyof T, MethodName>]: Rest<T[key]>;
  };

function createRestDefinition<T extends any>(value: T): Rest<T> {
  return value as unknown as any;
}

function createRestApi<T extends typeof restApi>(value: T): RestAPI<T> {
  const api = {} as RestAPI<any>;
  const apis = [api];
  const values = [value];
  const paths = [""];

  while (values.length) {
    const last = values.pop();
    const path = paths.pop();
    const currentApi = apis.pop() as RestAPI<any>;

    for (const key in last) {
      if (key in Methods) {
        // @ts-expect-error
        currentApi[key] = {
          method: Methods[key as MethodName],
          path: path,
        } as MethodObject;
      } else {
        const subPath = path ? path + "/" + key : key;
        const subApi = {};
        currentApi[key] = subApi;
        apis.push(subApi);
        paths.push(subPath);
        // @ts-expect-error
        values.push(last[key]);
      }
    }
  }
  return api as any;
}

type RestAPI<T extends any> = {
  [key in Extract<keyof T, MethodName>]: MethodObject;
} &
  {
    [key in Exclude<keyof T, MethodName>]: RestAPI<T[key]>;
  };

const serverRestApi = createRestApi(restApi);

interface MethodObject {
  readonly method: string;
  readonly path: string;
}

export const HttpClient = {
  get loggedIn(): boolean {
    return store.getters.loggedIn;
  },

  _checkLogin: null as null | Promise<User>,

  /**
   * Checks whether a user is currently logged in on this device.
   */
  isLoggedIn(): Promise<User> {
    if (this._checkLogin) {
      return this._checkLogin;
    } else {
      const checkPromise = this.queryServer(serverRestApi.api.get).finally(() => (this._checkLogin = null));
      return (this._checkLogin = checkPromise);
    }
  },

  login(userName: string, psw: string): Promise<User> {
    // need to be logged out to login
    if (HttpClient.loggedIn) {
      return Promise.reject();
    }

    if (!userName || !psw) {
      return Promise.reject();
    }

    return this.queryServer(serverRestApi.api.login.post, {
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

    return this.queryServer(serverRestApi.api.register.post, {
      userName,
      pw: psw,
    });
  },

  logout(): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.logout.post).then((result) => result.loggedOut);
  },

  getExternalUser(): Promise<ExternalUser[]> {
    return this.queryServer(serverRestApi.api.user.externalUser.all.get);
  },

  addExternalUser(externalUser: { identifier: string; pwd: string }): Promise<ExternalUser> {
    return this.queryServer(serverRestApi.api.user.externalUser.post, { externalUser });
  },

  deleteExternalUser(uuid: string): Promise<any> {
    return this.queryServer(serverRestApi.api.user.externalUser.delete, { externalUuid: uuid });
  },

  createList(list: { name: string; type: number }): Promise<List> {
    return this.queryServer(serverRestApi.api.user.list.post, { list }).then((newList) => Object.assign(list, newList));
  },

  updateList(list: List): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.list.put, { list });
  },

  deleteList(listId: number): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.list.delete, { listId }).then((result) => {
      if (result.error) {
        return Promise.reject(result.error);
      }
      return result;
    });
  },

  /**
   * Creates an medium server side.
   * Returns a fully valid Medium if successful.
   *
   * @param medium medium to create
   */
  createMedium(medium: AddMedium): Promise<SimpleMedium & { id: number }> {
    return this.queryServer(serverRestApi.api.user.medium.post, { medium });
  },

  getAllMedia(): Promise<SimpleMedium[]> {
    return this.queryServer(serverRestApi.api.user.medium.allFull.get);
  },

  getAllSecondaryMedia(): Promise<SecondaryMedium[]> {
    return this.queryServer(serverRestApi.api.user.medium.allSecondary.get);
  },

  getMedia(media: number | number[]): Promise<Medium | Medium[]> {
    if (Array.isArray(media) && !media.length) {
      return Promise.reject();
    }
    return this.queryServer(serverRestApi.api.user.medium.get, { mediumId: media });
  },

  updateMedium(data: SimpleMedium): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.medium.post, { medium: data });
  },

  deleteMedium(id: number): Promise<void> {
    // TODO
    return Promise.resolve();
  },

  getNews(from: Date | undefined, to: Date | undefined): Promise<News[]> {
    return this.queryServer(serverRestApi.api.user.news.get, { from, to });
  },

  createPart(part: AddPart, mediumId: number): EmptyPromise {
    return this.queryServer(serverRestApi.api.user.medium.part.post, { part, mediumId });
  },

  getMediumParts(mediumId: number): Promise<Part[]> {
    return this.queryServer(serverRestApi.api.user.medium.part.get, { mediumId });
  },

  /**
   * Get a certain number of DisplayReleases including and after the <i>latest</i> parameter
   * at most until the <i>until</i> parameter if available.
   * The returned release are between latest >= release >= until.
   *
   * @param latest the date to get all releases after (including)
   */
  getDisplayReleases(
    latest: Date,
    until?: Date,
    readFilter?: boolean,
    onlyLists?: number[],
    onlyMedia?: number[],
    ignoreLists?: number[],
    ignoreMedia?: number[],
  ): Promise<DisplayReleasesResponse> {
    const parameter: any = { latest };
    if (until) {
      parameter.until = until;
    }
    if (readFilter != null) {
      parameter.read = readFilter;
    }
    if (onlyLists != null) {
      parameter.only_lists = onlyLists;
    }
    if (onlyMedia != null) {
      parameter.only_media = onlyMedia;
    }
    if (ignoreLists != null) {
      parameter.ignore_lists = ignoreLists;
    }
    if (ignoreMedia != null) {
      parameter.ignore_media = ignoreMedia;
    }
    return this.queryServer({ path: "api/user/medium/part/episode/releases/display", method: "GET" }, parameter);
  },

  /**
   * Get all Releases from the given medium id.
   *
   * @param mediumId the medium to get all their releases from
   */
  getReleases(mediumId: number): Promise<MediumRelease[]> {
    return this.queryServer(serverRestApi.api.user.medium.releases.get, { id: mediumId });
  },

  getLists(): Promise<List[]> {
    return this.queryServer(serverRestApi.api.user.lists.get);
  },

  /**
   * Add progress of the user in regard to an episode.
   * Returns always true if it succeeded (no error).
   *
   * @param episodeId the episode/s to set the progress to
   * @param progress the new progress value
   */
  updateProgress(episodeId: number | number[], progress: number): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.medium.progress.post, { episodeId, progress });
  },

  getJobs(): Promise<Job[]> {
    return this.queryServer(serverRestApi.api.user.jobs.get);
  },

  getJobHistory(since?: Date, limit?: number): Promise<JobHistoryItem[]> {
    return this.queryServer(serverRestApi.api.user.jobs.history.get, { since, limit });
  },

  postJobEnabled(id: number, enabled: boolean): Promise<Job[]> {
    return this.queryServer(serverRestApi.api.user.jobs.enable.post, { id, enabled });
  },

  getJobsStatsSummary(): Promise<JobStatSummary[]> {
    return this.queryServer(serverRestApi.api.user.jobs.stats.summary.get);
  },

  getJobsStats(): Promise<AllJobStats> {
    return this.queryServer(serverRestApi.api.user.jobs.stats.all.get);
  },

  getJobsStatsGrouped(): Promise<JobStats[]> {
    return this.queryServer(serverRestApi.api.user.jobs.stats.grouped.get);
  },

  getJobsStatsTimed(bucket: TimeBucket, groupByDomain: boolean): Promise<TimeJobStats[]> {
    return this.queryServer(serverRestApi.api.user.jobs.stats.timed.get, { bucket, groupByDomain });
  },

  getAppEvents(filter: AppEventFilter): Promise<AppEvent[]> {
    return this.queryServer(serverRestApi.api.user.events.get, filter);
  },

  /**
   * Get the Job Details of a single Job.
   * @param id id of the Job
   */
  getJobDetails(id: number): Promise<JobDetails> {
    return this.queryServer(serverRestApi.api.user.jobs.stats.detail.get, { id });
  },

  getToc(link: string): Promise<Toc[]> {
    link = encodeURIComponent(link);
    return this.queryServer(serverRestApi.api.user.searchtoc.get, { link });
  },

  getTocs(mediumId: number | number[]): Promise<FullMediumToc[]> {
    return this.queryServer(serverRestApi.api.user.toc.get, { mediumId });
  },

  addToc(link: string, id: number): Promise<boolean> {
    return this.queryServer(serverRestApi.api.user.toc.post, { toc: link, mediumId: id });
  },

  search(title: string, type: MediaType): Promise<SearchResult[]> {
    return this.queryServer(serverRestApi.api.user.search.get, { text: title, medium: type });
  },

  addListItem(listId: number, mediumId: number): Promise<void> {
    return this.queryServer(serverRestApi.api.user.list.medium.post, { listId, mediumId });
  },

  getHooks(): Promise<ScraperHook[]> {
    return this.queryServer(serverRestApi.api.user.hook.get);
  },

  updateHook(hook: ScraperHook): Promise<void> {
    return this.queryServer(serverRestApi.api.user.hook.put, { hook });
  },

  getAllMediaInWaits(search?: MediumInWaitSearch): Promise<MediumInWait[]> {
    return this.queryServer(serverRestApi.api.user.medium.unused.get, search);
  },

  postCreateMediumFromMediaInWaits(source: MediumInWait, others: MediumInWait[], listId: number): Promise<Medium> {
    return this.queryServer(serverRestApi.api.user.medium.create.post, {
      createMedium: source,
      tocsMedia: others,
      listId,
    });
  },

  getCrawlerJobs(): Promise<Record<number, any>> {
    return this.queryServer(serverRestApi.api.user.crawler.jobs.get);
  },

  async queryServer({ path, method }: { path: string; method?: string }, query?: any): Promise<any> {
    // if path includes user, it needs to be authenticated
    if (path.includes("user")) {
      if (this._checkLogin) {
        await this._checkLogin;
      }
      const uuid = store.state.uuid;

      if (!uuid) {
        throw Error("cannot send user message if no user is logged in");
      }
      if (!query) {
        query = {};
      }
      query.uuid = uuid;
      query.session = store.state.session;
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
        Object.keys(query).forEach((key) => {
          const value = query[key];
          if (Array.isArray(value)) {
            url.searchParams.append(key, `[${value.map((v) => (typeof v === "string" ? `"${v}"` : v)).join(",")}]`);
          } else {
            url.searchParams.append(key, value);
          }
        });
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