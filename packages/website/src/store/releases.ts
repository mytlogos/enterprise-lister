import { DisplayReleaseItem, MediaType, SimpleMedium } from "../siteTypes";
import { formatDate, remove } from "../init";
import { HttpClient } from "../Httpclient";
import { DisplayRelease, Id, List, MinMedium } from "enterprise-core/dist/types";
import { defineStore } from "pinia";
import { useMediaStore } from "./media";
import { useListStore } from "./lists";

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

interface LastFetch {
  args: string;
  date: number;
}

export const useReleaseStore = defineStore("releases", {
  persist: {
    afterRestore(context) {
      // parse the stringified dates back into an object
      context.store.$state.latest = new Date(context.store.$state.latest);
      context.store.$state.until = new Date(context.store.$state.until);
    },
  },
  state: () => ({
    scrollable: false,
    readFilter: false,
    typeFilter: 0 as 0 | MediaType,
    onlyMedia: [] as Id[],
    onlyLists: [] as Id[],
    ignoreMedia: [] as Id[],
    ignoreLists: [] as Id[],
    latest: defaultLatest(),
    until: defaultEarliest(),
    releases: [] as DisplayReleaseItem[],
    lastFetch: undefined as LastFetch | undefined,
    fetching: false,
  }),
  getters: {
    getIgnoreMedia(): SimpleMedium[] {
      const mediaStore = useMediaStore();
      return this.ignoreMedia.map((id) => {
        return mediaStore.media[id] || { id, title: "Unknown" };
      });
    },
    getIgnoreLists(): List[] {
      const listStore = useListStore();
      return this.ignoreLists.map((id) => {
        return (
          listStore.lists.find((list) => list.id === id) || {
            id,
            name: "Unknown",
            external: false,
            medium: 0,
            userUuid: "",
            items: [],
          }
        );
      });
    },
  },
  actions: {
    ignoreMedium(id: number) {
      this.ignoreMedia.push(id);
    },
    ignoreList(id: number) {
      this.ignoreLists.push(id);
    },
    requireMedium(id: number) {
      this.onlyMedia.push(id);
    },
    requireList(id: number) {
      this.onlyLists.push(id);
    },
    unignoreMedium(id: number) {
      remove(this.ignoreMedia, id);
    },
    unignoreList(id: number) {
      remove(this.ignoreLists, id);
    },
    unrequireMedium(id: number) {
      remove(this.onlyMedia, id);
    },
    unrequireList(id: number) {
      remove(this.onlyLists, id);
    },
    resetDates() {
      this.until = defaultEarliest();
      this.latest = defaultLatest();
    },
    updateStoreProgress(update: { episodeId: Id; read: boolean }) {
      this.releases.forEach((element: DisplayReleaseItem) => {
        if (update.episodeId === element.episodeId) {
          element.read = update.read;
        }
      });
    },
    async loadDisplayReleases(force: boolean) {
      if (fetchingReleases) {
        return;
      }
      const args: Parameters<typeof HttpClient.getDisplayReleases> = [
        this.latest,
        this.until,
        this.readFilter,
        this.onlyLists,
        this.onlyMedia,
        this.ignoreLists,
        this.ignoreMedia,
      ];

      const currentFetch = JSON.stringify(args);
      const nowMillis = Date.now();

      // do not try to get releases with the same args twice in less than a minute
      if (
        !force &&
        this.lastFetch &&
        nowMillis - this.lastFetch.date < 1000 * 60 &&
        currentFetch === this.lastFetch.args
      ) {
        return;
      }
      this.lastFetch = { args: currentFetch, date: nowMillis };
      fetchingReleases = true;
      this.fetching = true;

      try {
        const response = await HttpClient.getDisplayReleases(...args);

        const mediumIdMap = new Map<number, MinMedium>();
        const mediaStore = useMediaStore();

        // insert fetched releases at the corresponding place
        this.releases = response.releases.map((item: DisplayRelease): DisplayReleaseItem => {
          if (!(item.date instanceof Date)) {
            item.date = new Date(item.date);
          }
          const key = item.episodeId + item.link;

          let medium: SimpleMedium | undefined = mediaStore.media[item.mediumId];

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
        });
      } catch (error) {
        console.error(error);
      } finally {
        fetchingReleases = false;
        this.fetching = false;
      }
    },
  },
});
