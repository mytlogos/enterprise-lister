<template>
  <div class="container-fluid p-0">
    <h1 id="releases-title">Releases</h1>
    <div class="p-1 btn-toolbar">
      <p-button :loading="isRefreshing" label="Refresh" @click.left="refresh" />
      <p-button :loading="isFetching" label="Fetch new Releases" @click.left="fetchNew" />
      <SelectButton v-model="readFilter" class="d-inline-block" :options="readFilterValues" data-key="value">
        <template #option="slotProps">
          <i class="fas fa-check" :class="{ 'text-success': slotProps.option.value }" aria-hidden="true" />
        </template>
      </SelectButton>
      <SelectButton
        v-model="typeFilter"
        class="d-inline-block"
        :options="typeFilterValues"
        data-key="value"
        option-value="value"
      >
        <template #option="slotProps">
          <i
            v-badge="slotProps.option.count"
            v-tooltip.top="slotProps.option.tooltip"
            :class="slotProps.option.icon"
            aria-hidden="true"
          />
        </template>
      </SelectButton>
      <span class="p-float-label me-2">
        <AutoComplete
          id="ignoremedium-input"
          v-model="mediumSuggestion"
          force-selection
          :suggestions="mediumSuggestions"
          field="title"
          @item-select="ignoreMedium($event.value)"
          @complete="searchMedium($event)"
        />
        <label for="ignoremedium-input">Ignore Medium Title</label>
      </span>
      <span class="p-float-label me-2">
        <AutoComplete
          id="ignorelist-input"
          v-model="listSuggestion"
          force-selection
          :suggestions="listSuggestions"
          field="name"
          @item-select="ignoreList($event.value)"
          @complete="searchList($event)"
        />
        <label for="ignorelist-input">Ignore List Title</label>
      </span>
    </div>
    <div v-if="onlyMedia.length">
      <div class="px-1">Required Media:</div>
      <Chip
        v-for="medium in onlyMedia"
        :key="medium.id"
        class="m-1 bg-success text-bg-success"
        :label="medium.title"
        removable
        @remove="unrequireMedium(medium)"
      />
    </div>
    <div v-if="ignoreMedia.length">
      <div class="px-1">Ignored Media:</div>
      <Chip
        v-for="medium in ignoreMedia"
        :key="medium.id"
        class="m-1 bg-danger text-bg-danger"
        :label="medium.title"
        removable
        @remove="unignoreMedium(medium)"
      />
    </div>
    <div v-if="onlyLists.length">
      <div class="px-1">Required Lists:</div>
      <Chip
        v-for="list in onlyLists"
        :key="list.id"
        class="m-1 bg-success text-bg-success"
        :label="list.name"
        removable
        @remove="unrequireList(list)"
      />
    </div>
    <div v-if="ignoreLists.length">
      <div class="px-1">Ignored Lists:</div>
      <Chip
        v-for="list in ignoreLists"
        :key="list.id"
        :label="list.name"
        class="m-1 bg-danger text-bg-danger"
        removable
        @remove="unignoreList(list)"
      />
    </div>
    <DataTable
      :value="computedReleases"
      scrollable
      scroll-height="800px"
      :virtual-scroller-options="{ itemSize: 50 }"
      :loading="fetching"
      striped-rows
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="date" header="Date">
        <template #body="slotProps">
          {{ slotProps.data.date }}
        </template>
      </Column>
      <Column field="title" header="Chapter">
        <template #body="slotProps">
          <i v-if="slotProps.data.locked" class="fas fa-lock" aria-hidden="true" />
          <a :href="slotProps.data.link" target="_blank" rel="noopener noreferrer">
            {{ slotProps.data.title }}
          </a>
        </template>
      </Column>
      <Column field="mediumId" header="Medium">
        <template #body="slotProps">
          <router-link
            :to="{
              name: 'medium',
              params: { id: slotProps.data.mediumId },
            }"
          >
            {{ slotProps.data.mediumTitle }}
          </router-link>
        </template>
      </Column>
      <Column header="Action" autolayout>
        <template #body="slotProps">
          <p-button
            v-tooltip.top="slotProps.data.read ? 'Mark unread' : 'Mark read'"
            class="p-button-text"
            :class="{
              'p-button-success': slotProps.data.read,
              'p-button-plain': !slotProps.data.read,
            }"
            icon="pi pi-check"
            style="margin: -0.5rem 0"
            @click.left="changeReadStatus(slotProps.data)"
          />
          <p-button
            v-tooltip.top="'Ignore Medium'"
            icon="pi pi-ban"
            class="p-button-text p-button-warning"
            style="margin: -0.5rem 0"
            @click.left="ignoreMedium(getMedium(slotProps.data.mediumId))"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
<script lang="ts">
import { DisplayRelease, List, MediaType, MinMedium, SimpleMedium } from "../siteTypes";
import { defineComponent, reactive } from "vue";
import { HttpClient } from "../Httpclient";
import { formatDate } from "../init";
import ToolTip from "bootstrap/js/dist/tooltip";
import { PrimeIcons } from "primevue/api";

interface Value<T> {
  value: T;
}

interface SearchEvent {
  query: string;
}

interface DisplayReleaseItem {
  episodeId: number;
  title: string;
  link: string;
  mediumId: number;
  medium: number;
  mediumTitle: string;
  locked?: boolean;
  date: string;
  time: number;
  read: boolean;
  key: string;
}

interface Data {
  releases: DisplayReleaseItem[];
  currentDate: Date;
  fetching: boolean;
  unmounted: boolean;
  /**
   * Signal Variable for fetchReleases to replace all current ones
   */
  replace: boolean;
  typeReleases: Record<MediaType | number, number>;
  currentReleases: Set<string>;
  tooltips: ToolTip[];
  latest: Date;
  until: Date;
  pages: Array<{ latest: Date; until: Date }>;
  isFetching: boolean;
  isRefreshing: boolean;
  lastFetch?: { args: string; date: number };
  readFilterValues: [Value<true>, Value<false>];
  typeFilterValues: Array<{
    tooltip: string;
    count: number;
    icon: string;
    value: number;
  }>;
  mediumSuggestion?: SimpleMedium;
  mediumSuggestions: SimpleMedium[];
  listSuggestions: List[];
  listSuggestion?: List;
}

function defaultLatest(): Date {
  // some releases have dates in the future, so get them at most one year in the future
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() + 1);
  return latest;
}

function defaultEarliest(): Date {
  // this is more of a hotfix to speedup the queries
  // view only the last month on the first full request
  const until = new Date();
  until.setMonth(until.getMonth() - 1);
  return until;
}

export default defineComponent({
  name: "Releases",
  data(): Data {
    const latest = new Date();
    latest.setFullYear(latest.getFullYear() + 1);

    const until = new Date();
    until.setMonth(until.getMonth() - 1);

    return {
      releases: [],
      currentDate: new Date(),
      fetching: false, // for the method
      isFetching: false, // for the button
      isRefreshing: false, // for the button
      unmounted: false,
      replace: false,
      typeReleases: {
        [MediaType.TEXT]: 0,
        [MediaType.IMAGE]: 0,
        [MediaType.VIDEO]: 0,
        [MediaType.AUDIO]: 0,
      },
      currentReleases: new Set(),
      tooltips: [],
      latest: defaultLatest(),
      until: defaultEarliest(),
      pages: [{ latest, until }],
      readFilterValues: [{ value: true }, { value: false }],
      typeFilterValues: [
        {
          tooltip: "Search Text Media",
          count: 0,
          icon: PrimeIcons.BOOK,
          value: MediaType.TEXT,
        },
        {
          tooltip: "Search Image Media",
          count: 0,
          icon: PrimeIcons.IMAGE,
          value: MediaType.IMAGE,
        },
        {
          tooltip: "Search Video Media",
          count: 0,
          icon: PrimeIcons.YOUTUBE,
          value: MediaType.VIDEO,
        },
        {
          tooltip: "Search Audio Media",
          count: 0,
          icon: PrimeIcons.VOLUME_OFF,
          value: MediaType.AUDIO,
        },
      ],
      mediumSuggestions: [],
      listSuggestions: [],
      mediumSuggestion: undefined,
      listSuggestion: undefined,
    };
  },
  computed: {
    onlyMedia(): SimpleMedium[] {
      return [];
    },
    onlyLists(): List[] {
      return [];
    },
    ignoreMedia(): SimpleMedium[] {
      return this.$store.state.releases.ignoreMedia.map((id) => {
        return this.$store.state.media.media[id] || { id, title: "Unknown" };
      });
    },
    ignoreLists(): List[] {
      return this.$store.state.releases.ignoreLists.map((id) => {
        return (
          this.$store.state.lists.lists.find((list) => list.id === id) || {
            id,
            name: "Unknown",
            external: false,
            show: false,
            items: [],
          }
        );
      });
    },
    media(): SimpleMedium[] {
      return Object.values(this.$store.state.media.media);
    },
    lists(): List[] {
      return this.$store.state.lists.lists;
    },
    computedReleases(): DisplayReleaseItem[] {
      if (this.typeFilter) {
        return this.releases.filter((value) => value.medium & this.typeFilter);
      } else {
        return this.releases;
      }
    },
    readFilter: {
      get(): Value<boolean> {
        return { value: !!this.$store.state.releases.readFilter };
      },
      set(read?: Value<boolean>) {
        this.$store.commit("releases/readFilter", read?.value);
      },
    },
    typeFilter: {
      get(): number {
        return this.$store.state.releases.typeFilter;
      },
      set(type: number) {
        this.$store.commit("releases/typeFilter", type);
      },
    },
  },
  watch: {
    readFilter() {
      // when release filter changed, set replace current items flag and fetch anew
      this.fetchReleases(true);
    },
    onlyMedia: {
      handler() {
        this.fetchReleases(true);
      },
      deep: true,
    },
    onlyLists: {
      handler() {
        this.fetchReleases(true);
      },
      deep: true,
    },
    ignoreMedia: {
      handler() {
        this.fetchReleases(true);
      },
      deep: true,
    },
    ignoreLists: {
      handler() {
        this.fetchReleases(true);
      },
      deep: true,
    },
    releases() {
      const newCount = {
        [MediaType.TEXT]: 0,
        [MediaType.IMAGE]: 0,
        [MediaType.VIDEO]: 0,
        [MediaType.AUDIO]: 0,
      };

      this.releases.forEach((value) => {
        if (value.medium) {
          newCount[value.medium as MediaType]++;
        }
      });

      Object.assign(this.typeReleases, newCount);
      this.typeFilterValues.forEach((item) => {
        item.count = newCount[item.value as MediaType];
      });
    },
  },
  mounted() {
    this.unmounted = false;
    this.fetchReleases().catch(console.error);
  },
  unmounted() {
    this.unmounted = true;
  },
  methods: {
    paginate(event: { previous: number; current: number }) {
      const diff = event.current - event.previous;

      // TODO: support page difference of more than 1 page
      if (Math.abs(diff) !== 1) {
        return;
      }

      if (diff < 0) {
        const page = this.pages[event.current - 1];

        if (!page) {
          console.warn("Previous Page not found: " + page);
          return;
        }
        this.until = page.until;
        this.latest = page.latest;
      } else {
        const newIndex = event.current - 1;
        const page = this.pages[newIndex];

        if (page) {
          this.until = page.until;
          this.latest = page.latest;
        } else {
          const lastRelease = this.releases[this.releases.length - 1];

          if (!lastRelease) {
            console.warn("No Releases left");
            return;
          }
          this.until = (this.until && new Date(this.until)) || defaultEarliest();
          this.until.setMonth(this.until.getMonth() - 1);

          this.latest = new Date(lastRelease.date);
          // do not miss releases which have the same time, but were not included in this page
          this.latest.setSeconds(this.latest.getSeconds() - 1);

          if (newIndex !== this.pages.length) {
            console.warn(
              "Cannot append Page at the current end, does not match end: ",
              event.current,
              this.pages.length,
            );
            return;
          }
          this.pages.push({ latest: this.latest, until: this.until });
        }
      }
      this.fetchReleases(true);
    },
    searchMedium(event: SearchEvent) {
      const query = event.query.toLowerCase();

      if (!query.trim()) {
        this.mediumSuggestions = Object.values(this.$store.state.media.media);
        return;
      }
      this.mediumSuggestions = Object.values(this.$store.state.media.media).filter((medium) => {
        return medium.title.toLowerCase().includes(query);
      });
    },
    searchList(event: SearchEvent) {
      const query = event.query.toLowerCase();

      if (!query.trim()) {
        this.listSuggestions = Object.values(this.$store.state.lists.lists);
        return;
      }
      this.listSuggestions = Object.values(this.$store.state.lists.lists).filter((list) => {
        return list.name.toLowerCase().includes(query);
      });
    },
    requireMedium(item: SimpleMedium): void {
      if (item) {
        this.$store.commit("releases/requireMedium", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    requireList(item: List): void {
      if (item) {
        this.$store.commit("releases/requireList", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    ignoreMedium(item: SimpleMedium): void {
      if (item) {
        this.mediumSuggestion = undefined;
        this.$store.commit("releases/ignoreMedium", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    ignoreList(item: List): void {
      if (item) {
        this.listSuggestion = undefined;
        this.$store.commit("releases/ignoreList", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    unrequireMedium(item: SimpleMedium): void {
      if (item) {
        this.$store.commit("releases/unrequireMedium", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    unrequireList(item: List): void {
      if (item) {
        this.$store.commit("releases/unrequireList", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    unignoreMedium(item: SimpleMedium): void {
      if (item) {
        this.$store.commit("releases/unignoreMedium", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    unignoreList(item: List): void {
      if (item) {
        this.$store.commit("releases/unignoreList", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    getMedium(id: number): SimpleMedium {
      return this.$store.getters.getMedium(id);
    },
    async fetchReleases(replace = false) {
      // do not fetch if already fetching or this component is already unmounted
      if (this.fetching || this.unmounted) {
        return;
      }
      const args: Parameters<typeof HttpClient.getDisplayReleases> = [
        this.latest,
        this.until,
        this.readFilter.value,
        this.onlyLists.map((item) => item.id),
        this.onlyMedia.map((item) => item.id) as number[],
        this.ignoreLists.map((item) => item.id),
        this.ignoreMedia.map((item) => item.id) as number[],
      ];

      const currentFetch = JSON.stringify(args);
      const nowMillis = Date.now();

      // do not try to get releases with the same args twice in less than a minute
      if (this.lastFetch && nowMillis - this.lastFetch.date < 1000 * 60 && currentFetch === this.lastFetch.args) {
        return;
      }
      this.lastFetch = { args: currentFetch, date: nowMillis };
      this.fetching = true;

      if (replace) {
        this.isRefreshing = true;
      }
      try {
        const response = await HttpClient.getDisplayReleases(...args);

        if (replace) {
          this.currentReleases.clear();
        } else {
          response.releases = response.releases.filter((value) => {
            return !this.currentReleases.has(value.episodeId + value.link);
          });
        }
        this.currentDate = new Date();
        // replace previous releases if necessary
        const releases: DisplayReleaseItem[] = replace ? [] : [...this.releases];
        this.replace = false;
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
            this.currentReleases.add(key);

            let medium: SimpleMedium | undefined = this.$store.getters.getMedium(item.mediumId);

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
        this.releases = reactive(releases);
      } catch (error) {
        this.$toast.add({
          severity: "error",
          summary: "Could not load Releases",
          detail: error + "",
          // life: 1000,
        });
        console.error(error);
      } finally {
        this.fetching = false;

        if (replace) {
          this.isRefreshing = false;
        }
      }
    },

    /**
     * Update the progress of the episode of the release to either 0 or 1.
     * Shows an error toast if it could not update the progress.
     */
    changeReadStatus(release: DisplayReleaseItem): void {
      const newProgress = release.read ? 0 : 1;
      HttpClient.updateProgress([release.episodeId], newProgress)
        .then((success) => {
          if (success) {
            // update progress of all releases for the same episode
            this.releases.forEach((element: DisplayReleaseItem) => {
              if (release.episodeId === element.episodeId) {
                element.read = !!newProgress;
              }
            });
          } else {
            return Promise.reject(new Error("progress update not successfull"));
          }
        })
        .catch((error) => {
          this.$toast.add({
            severity: "error",
            summary: "Could not update Progress",
            detail: error + "",
          });
        });
    },
    refresh() {
      this.isRefreshing = true;
      this.fetchReleases(true).finally(() => (this.isRefreshing = false));
    },
    fetchNew() {
      this.isFetching = true;
      this.fetchReleases(false).finally(() => (this.isFetching = false));
    },
  },
});
</script>
<style scoped>
.btn-toolbar :deep(.p-button) {
  height: 100% !important;
}
.btn-toolbar > * {
  margin-top: 0.25rem !important;
  margin-left: 0.25rem !important;
}
</style>
