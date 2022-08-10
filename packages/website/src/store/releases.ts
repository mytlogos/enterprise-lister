import { DisplayReleaseItem, ReleaseStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { formatDate, remove } from "../init";
import { HttpClient } from "../Httpclient";
import { DisplayRelease, Id, MinMedium, SimpleMedium } from "enterprise-core/dist/types";

let fetchingReleases = false;

function defaultLatest(): Date {
  // some releases have dates in the future, so get them at most one year in the future
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() + 1);
  return latest;
}

function defaultEarliest(): Date {
  // state is more of a hotfix to speedup the queries
  // view only the last month on the first full request
  const until = new Date();
  until.setMonth(until.getMonth() - 1);
  return until;
}

const module: Module<ReleaseStore, VuexStore> = {
  namespaced: true,
  state: () => ({
    readFilter: undefined,
    typeFilter: 0,
    onlyMedia: [],
    onlyLists: [],
    ignoreMedia: [],
    ignoreLists: [],
    latest: defaultLatest(),
    until: defaultEarliest(),
    releases: [],
    lastFetch: undefined,
    fetching: false,
  }),
  mutations: {
    readFilter(state: ReleaseStore, read?: boolean): void {
      state.readFilter = read;
    },
    typeFilter(state: ReleaseStore, type: number): void {
      state.typeFilter = type;
    },
    ignoreMedium(state, id: number) {
      state.ignoreMedia.push(id);
    },
    ignoreList(state, id: number) {
      state.ignoreLists.push(id);
    },
    requireMedium(state, id: number) {
      state.onlyMedia.push(id);
    },
    requireList(state, id: number) {
      state.onlyLists.push(id);
    },
    unignoreMedium(state, id: number) {
      remove(state.ignoreMedia, id);
    },
    unignoreList(state, id: number) {
      remove(state.ignoreLists, id);
    },
    unrequireMedium(state, id: number) {
      remove(state.onlyMedia, id);
    },
    unrequireList(state, id: number) {
      remove(state.onlyLists, id);
    },
    latest(state, date: Date) {
      state.latest = date;
    },
    until(state, date: Date) {
      state.until = date;
    },
    resetDates(state) {
      state.until = defaultEarliest();
      state.latest = defaultLatest();
    },
    setFetching(state, fetching: boolean) {
      state.fetching = fetching;
    },
    updateProgress(state, update: { episodeId: Id; read: boolean }) {
      state.releases.forEach((element: DisplayReleaseItem) => {
        if (update.episodeId === element.episodeId) {
          element.read = update.read;
        }
      });
    },
    lastFetch(state, lastFetch: ReleaseStore["lastFetch"]) {
      state.lastFetch = lastFetch;
    },
    releases(state, releases: ReleaseStore["releases"]) {
      state.releases = releases;
    },
  },
  actions: {
    async loadDisplayReleases({ state, commit, rootGetters }, force: boolean) {
      if (fetchingReleases) {
        return;
      }
      const args: Parameters<typeof HttpClient.getDisplayReleases> = [
        state.latest,
        state.until,
        state.readFilter,
        state.onlyLists,
        state.onlyMedia,
        state.ignoreLists,
        state.ignoreMedia,
      ];

      const currentFetch = JSON.stringify(args);
      const nowMillis = Date.now();

      // do not try to get releases with the same args twice in less than a minute
      if (
        !force &&
        state.lastFetch &&
        nowMillis - state.lastFetch.date < 1000 * 60 &&
        currentFetch === state.lastFetch.args
      ) {
        return;
      }
      commit("lastFetch", { args: currentFetch, date: nowMillis });
      fetchingReleases = true;
      commit("setFetching", true);

      try {
        const response = await HttpClient.getDisplayReleases(...args);
        // replace previous releases if necessary
        const releases: DisplayReleaseItem[] = [];
        // when filter changed while a previous query is still running, it may lead to wrong results
        // should not happen because no two fetches should happen at the same time

        const mediumIdMap = new Map<number, MinMedium>();

        // insert fetched releases at the corresponding place
        releases.push(
          ...response.releases.map((item: DisplayRelease): DisplayReleaseItem => {
            if (!(item.date instanceof Date)) {
              item.date = new Date(item.date);
            }
            const key = item.episodeId + item.link;

            let medium: SimpleMedium | undefined = rootGetters.getMedium(item.mediumId);

            if (!medium) {
              // build map only if necessary and previously empty
              if (!mediumIdMap.size) {
                response.media.forEach((responseMedium) => {
                  mediumIdMap.set(responseMedium.id, responseMedium);
                });
              } else {
                medium = mediumIdMap.get(item.mediumId);
              }
            }
            return {
              key,
              date: formatDate(item.date),
              episodeId: item.episodeId,
              link: item.link,
              mediumId: item.mediumId,
              mediumTitle: medium?.title || "Unknown",
              medium: medium?.medium || 0,
              read: item.progress >= 1,
              time: item.date.getTime(),
              title: item.title,
              locked: item.locked,
            };
          }),
        );
        releases.sort((a: DisplayReleaseItem, b: DisplayReleaseItem) => b.time - a.time);
        commit("releases", releases);
      } catch (error) {
        console.error(error);
      } finally {
        fetchingReleases = false;
        commit("setFetching", false);
      }
    },
  },
};
export default module;
