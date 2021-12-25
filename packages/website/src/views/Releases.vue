<template>
  <div class="container-fluid p-0">
    <h1 id="releases-title">Releases</h1>
    <div class="p-1">
      <Button :loading="isRefreshing" label="Refresh" @click.left="refresh"></Button>
      <Button class="ms-1" :loading="isFetching" label="Fetch new Releases" @click.left="fetchNew"></Button>
      <SelectButton v-model="readFilter" class="d-inline-block ms-1" :options="readFilterValues" data-key="value">
        <template #option="slotProps">
          <i class="fas fa-check" :class="{ 'text-success': slotProps.option.value }" aria-hidden="true" />
        </template>
      </SelectButton>
      <media-filter :state="typeFilter" class="ms-1" :state-count="typeReleases" @update:state="typeFilter = $event" />
      <AutoComplete force-selection :suggestions="mediumSuggestions" field="title" @complete="searchMedium($event)" />
      <AutoComplete :suggestions="listSuggestions" field="name" @complete="searchList($event)" />
    </div>
    <div v-if="onlyMedia.length">
      <div class="px-1">Required Media:</div>
      <app-label
        v-for="medium in onlyMedia"
        :key="medium.id"
        :value="medium.title"
        class="m-1 bg-success"
        @delete="unrequireMedium(medium)"
      />
    </div>
    <div v-if="ignoreMedia.length">
      <div class="px-1">Ignored Media:</div>
      <app-label
        v-for="medium in ignoreMedia"
        :key="medium.id"
        :value="medium.title"
        class="m-1 bg-danger"
        @delete="unignoreMedium(medium)"
      />
    </div>
    <div v-if="onlyLists.length">
      <div class="px-1">Required Lists:</div>
      <app-label
        v-for="list in onlyLists"
        :key="list.id"
        :value="list.name"
        class="m-1 bg-success"
        @delete="unrequireList(list)"
      />
    </div>
    <div v-if="ignoreLists.length">
      <div class="px-1">Ignored Lists:</div>
      <app-label
        v-for="list in ignoreLists"
        :key="list.id"
        :value="list.name"
        class="m-1 bg-danger"
        @delete="unignoreList(list)"
      />
    </div>
    <DataTable :value="computedReleases" :loading="fetching" striped-rows>
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="date" header="Date">
        <template #body="slotProps">
          {{ dateToString(slotProps.data.date) }}
        </template>
      </Column>
      <Column field="title" header="Chapter">
        <template #body="slotProps">
          <template v-if="slotProps.data.locked">
            <i class="fas fa-lock" aria-hidden="true" />
          </template>
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
            {{ getMedium(slotProps.data.mediumId)?.title }}
          </router-link>
        </template>
      </Column>
      <Column header="Action" autolayout>
        <template #body="slotProps">
          <Button
            class="p-button-text"
            :class="{
              'p-button-success': slotProps.data.progress === 1,
              'p-button-plain': slotProps.data.progress !== 1,
            }"
            :icon="slotProps.data.progress === 1 ? 'pi pi-check' : 'pi pi-check'"
            style="margin: -0.5rem 0"
            @click.left="changeReadStatus(slotProps.data)"
          />
          <Button
            icon="pi pi-ban"
            class="p-button-text p-button-warning"
            style="margin: -0.5rem 0"
            @click.left="ignoreMedium(getMedium(slotProps.data.mediumId))"
          />
        </template>
      </Column>
    </DataTable>
    <!-- TODO: make bootstrap toast to a vue component with message (toast) queue -->
    <div id="progress-toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="fas fa-exclamation-circle rounded me-2 text-danger" aria-hidden="true" />
        <strong class="me-auto">Error</strong>
        <button
          type="button"
          class="ms-2 mb-1 btn-close"
          data-bs-dismiss="toast"
          aria-label="Close"
          @click.left="closeProgressToast"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="toast-body">Could not update Progress</div>
    </div>
    <Toast />
  </div>
</template>
<script lang="ts">
import { DisplayRelease, List, MediaType, SimpleMedium } from "../siteTypes";
import { defineComponent, reactive } from "vue";
import { HttpClient } from "../Httpclient";
import { formatDate, timeDifference } from "../init";
import MediaFilter from "../components/media-filter.vue";
import ToolTip from "bootstrap/js/dist/tooltip";
import Toast from "bootstrap/js/dist/toast";
import AppLabel from "../components/label.vue";

interface DisplayMediumRelease extends DisplayRelease {
  medium: MediaType;
}

interface Value<T> {
  value: T;
}

interface SearchEvent {
  query: string;
}

interface Data {
  releases: DisplayMediumRelease[];
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
  progressToast: null | Toast;
  latest: Date;
  until?: Date;
  pages: Array<{ latest: Date; until: Date }>;
  isFetching: boolean;
  isRefreshing: boolean;
  readFilterValues: [Value<true>, Value<false>];
  mediumSuggestions: SimpleMedium[];
  listSuggestions: List[];
}

export default defineComponent({
  name: "Releases",
  components: { MediaFilter, AppLabel },

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
      progressToast: null,
      latest: new Date(),
      until: undefined,
      pages: [{ latest, until }],
      readFilterValues: [{ value: true }, { value: false }],
      mediumSuggestions: [],
      listSuggestions: [],
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
    computedReleases(): DisplayMediumRelease[] {
      let copy = [...this.releases] as DisplayMediumRelease[];

      if (this.typeFilter) {
        copy = copy.filter((value) => value.medium & this.typeFilter);
      }
      return copy;
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
    computedReleases() {
      console.log("i am triggerin");
      const newCount = {
        [MediaType.TEXT]: 0,
        [MediaType.IMAGE]: 0,
        [MediaType.VIDEO]: 0,
        [MediaType.AUDIO]: 0,
      } as Record<number, number>;

      this.releases.forEach((value) => {
        const medium = value.medium;

        if (medium) {
          newCount[medium]++;
        }
      });

      Object.assign(this.typeReleases, newCount);
    },
  },
  async mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
    this.progressToast = new Toast("#progress-toast");

    this.unmounted = false;
    // FIXME: why does this property not exist?:
    // @ts-expect-error
    return this.fetchReleases();
  },
  unmounted() {
    this.unmounted = true;
  },
  methods: {
    defaultLatest(): Date {
      // some releases have dates in the future, so get them at most one year in the future
      const latest = new Date();
      latest.setFullYear(latest.getFullYear() + 1);
      return latest;
    },
    defaultUntil(): Date {
      // this is more of a hotfix to speedup the queries
      // view only the last month on the first full request
      const until = new Date();
      until.setMonth(until.getMonth() - 1);
      return until;
    },
    paginate(event: { previous: number; current: number }) {
      const diff = event.current - event.previous;

      // TODO: support page difference of more than 1 page
      if (Math.abs(diff) != 1) {
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
          this.until = (this.until && new Date(this.until)) || this.defaultUntil();
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
        this.$store.commit("releases/ignoreMedium", item.id);
      } else {
        console.trace("Got event without value!");
      }
    },
    ignoreList(item: List): void {
      if (item) {
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
    timeDifference(date: Date): string {
      return timeDifference(this.currentDate, date);
    },
    async fetchReleases(replace = false) {
      // do not fetch if already fetching or this component is already unmounted
      if (this.fetching || this.unmounted) {
        return;
      }
      this.fetching = true;

      if (replace) {
        this.until = this.until || this.defaultUntil();
        this.latest = this.latest || this.defaultLatest();
        this.isRefreshing = true;
      }
      try {
        const response = await HttpClient.getDisplayReleases(
          this.latest,
          this.until,
          this.readFilter.value,
          this.onlyLists.map((item) => item.id),
          this.onlyMedia.map((item) => item.id) as number[],
          this.ignoreLists.map((item) => item.id),
          this.ignoreMedia.map((item) => item.id) as number[],
        );

        if (replace) {
          this.currentReleases.clear();
        } else {
          response.releases = response.releases.filter((value) => {
            return !this.currentReleases.has(value.episodeId + value.link);
          });
        }
        response.releases.forEach((value) => {
          if (!(value.date instanceof Date)) {
            value.date = new Date(value.date);
          }
          const medium = this.getMedium(value.mediumId);
          // @ts-expect-error
          value.medium = medium?.medium || 0;
          this.currentReleases.add(value.episodeId + value.link);
        });
        this.currentDate = new Date();
        // replace previous releases if necessary
        const releases: DisplayMediumRelease[] = replace ? reactive([]) : this.releases;
        // when filter changed while a previous query is still running, it may lead to wrong results
        // should not happen because no two fetches should happen at the same time

        // insert fetched releases at the corresponding place
        releases.push(...(response.releases as DisplayMediumRelease[]));
        releases.sort((a: DisplayMediumRelease, b: DisplayMediumRelease) => b.date.getTime() - a.date.getTime());
        this.releases = releases;
        this.$toast.add({
          severity: "success",
          summary: "Loaded Releases",
          life: 1000,
        });
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
        // fetch again in a minute
        // setTimeout(() => this.fetchReleases(), 60000);
      }
    },

    /**
     * Update the progress of the episode of the release to either 0 or 1.
     * Shows an error toast if it could not update the progress.
     */
    changeReadStatus(release: DisplayMediumRelease): void {
      const newProgress = release.progress < 1 ? 1 : 0;
      HttpClient.updateProgress(release.episodeId, newProgress)
        .then((success) => {
          if (success) {
            // update progress of all releases for the same episode
            this.releases.forEach((element: DisplayMediumRelease) => {
              if (release.episodeId === element.episodeId) {
                element.progress = newProgress;
              }
            });
          } else {
            return Promise.reject();
          }
        })
        .catch(() => this.progressToast?.show());
    },

    /**
     * Hide progress error toast.
     */
    closeProgressToast() {
      this.progressToast?.hide();
    },

    /**
     * Format a given Date to a german locale string.
     */
    dateToString(date: Date): string {
      return formatDate(date);
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
