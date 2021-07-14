<template>
  <div class="container-fluid p-0">
    <h1 id="releases-title">Releases</h1>
    <div class="p-1">
      <button class="btn btn-dark" @click.left="fetchReleases(true)">Refresh</button>
      <button class="btn btn-dark ms-1" @click.left="fetchReleases">Fetch new Releases</button>
      <triple-filter v-model:state="readFilter" class="ms-1" />
      <media-filter :state="typeFilter" class="ms-1" @update:state="typeFilter = $event">
        <template #additional="{ value }">
          <span
            class="badge bg-primary rounded-pill"
            aria-hidden="true"
            style="bottom: 26px; position: absolute; top: -10px; right: -10px; z-index: 10"
          >
            {{ typeReleases[value] }}
          </span>
        </template>
      </media-filter>
      <div class="d-inline ms-1">
        <auto-complete
          key="id"
          class="d-inline"
          :items="media"
          title-key="title"
          placeholder="Ignore Medium"
          @input="ignoreMedium"
        />
      </div>
      <div class="d-inline ms-1">
        <auto-complete
          key="id"
          class="d-inline"
          :items="media"
          title-key="title"
          placeholder="Ignore List"
          @input="ignoreList"
        />
      </div>
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
    <pagination class="m-1" :pages="50" @page="paginate" />
    <table class="table table-striped table-hover table-sm align-middle" aria-describedby="releases-title">
      <thead class="table-dark">
        <tr>
          <th scope="col">#</th>
          <th scope="col">Date</th>
          <th scope="col">Chapter</th>
          <th scope="col">Medium</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, index) in computedReleases" :key="entry.episodeId + entry.link">
          <td class="">
            {{ index + 1 }}
          </td>
          <td class="">
            {{ dateToString(entry.date) }}
          </td>
          <td>
            <template v-if="entry.locked">
              <i class="fas fa-lock" aria-hidden="true" />
            </template>
            <a :href="entry.link" target="_blank" rel="noopener noreferrer">
              {{ entry.title }}
            </a>
          </td>
          <td>
            <router-link
              :to="{
                name: 'medium',
                params: { id: entry.mediumId },
              }"
            >
              {{ getMedium(entry.mediumId)?.title }}
            </router-link>
          </td>
          <td>
            <button
              class="btn"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              :title="entry.progress < 1 ? 'Mark read' : 'Mark unread'"
              @click.left="changeReadStatus(entry)"
            >
              <i
                class="fas fa-check"
                aria-hidden="true"
                :class="{
                  'text-success': entry.progress === 1,
                }"
              />
            </button>
            <button
              class="btn"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Ignore Medium"
              @click.left="ignoreMedium(getMedium(entry.mediumId))"
            >
              <i class="fas fa-ban text-warning" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
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
  </div>
</template>
<script lang="ts">
import { DisplayRelease, List, MediaType, SimpleMedium } from "../siteTypes";
import { defineComponent, reactive } from "vue";
import { HttpClient } from "../Httpclient";
import { formatDate, timeDifference } from "../init";
import TripleFilter from "../components/triple-filter.vue";
import MediaFilter from "../components/media-filter.vue";
import ToolTip from "bootstrap/js/dist/tooltip";
import Toast from "bootstrap/js/dist/toast";
import AutoComplete from "../components/auto-complete.vue";
import AppLabel from "../components/label.vue";
import Pagination from "../components/pagination.vue";

interface Data {
  releases: DisplayRelease[];
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
}

export default defineComponent({
  name: "Releases",
  components: { TripleFilter, MediaFilter, AutoComplete, AppLabel, Pagination },

  props: {
    read: Boolean,
    type: {
      type: Number,
      default: 0,
    },
  },

  data(): Data {
    const latest = new Date();
    latest.setFullYear(latest.getFullYear() + 1);

    const until = new Date();
    until.setMonth(until.getMonth() - 1);

    return {
      releases: [],
      currentDate: new Date(),
      fetching: false,
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
    computedReleases(): DisplayRelease[] {
      let copy = [...this.releases] as DisplayRelease[];

      if (this.typeFilter) {
        copy = copy.filter((value) => (this.$store.state.media.media[value.mediumId]?.medium || 0) & this.typeFilter);
      }
      return copy.sort((a: DisplayRelease, b: DisplayRelease) => b.date.getTime() - a.date.getTime());
    },
    readFilter: {
      get(): boolean | undefined {
        return this.$store.state.releases.readFilter;
      },
      set(read?: boolean) {
        this.$store.commit("releases/readFilter", read);
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
      this.$router.push({ query: { read: String(this.readFilter), type: this.typeFilter } });
    },
    typeFilter() {
      this.$router.push({ query: { read: String(this.readFilter), type: this.typeFilter } });
    },
    read() {
      // when release filter changed, set replace current items flag and fetch anew
      this.replace = true;
      this.fetchReleases();
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
        const medium = this.$store.getters.getMedium(value.mediumId) as SimpleMedium;

        if (medium) {
          newCount[medium.medium]++;
        }
      });

      Object.assign(this.typeReleases, newCount);
    },
  },
  async mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
    this.progressToast = new Toast("#progress-toast");

    await this.$router.push({ query: { read: String(this.readFilter), type: this.typeFilter } });
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
      replace = replace || this.replace;
      this.fetching = true;

      if (replace) {
        this.until = this.until || this.defaultUntil();
        this.latest = this.latest || this.defaultLatest();
      }
      // if (this.releases.length && !replace) {
      //   this.until = this.computedReleases[0].date;
      // }
      try {
        const response = await HttpClient.getDisplayReleases(
          this.latest,
          this.until,
          this.read,
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
          this.currentReleases.add(value.episodeId + value.link);
        });
        this.currentDate = new Date();
        // replace previous releases if necessary
        const releases: DisplayRelease[] = replace ? reactive([]) : this.releases;
        this.replace = false;
        // when filter changed while a previous query is still running, it may lead to wrong results
        // should not happen because no two fetches should happen at the same time

        // insert fetched releases at the corresponding place
        releases.push(...response.releases);
        this.releases = releases;
      } catch (error) {
        console.error(error);
      } finally {
        this.fetching = false;
        // fetch again in a minute
        // setTimeout(() => this.fetchReleases(), 60000);
      }
    },

    /**
     * Update the progress of the episode of the release to either 0 or 1.
     * Shows an error toast if it could not update the progress.
     */
    changeReadStatus(release: DisplayRelease): void {
      const newProgress = release.progress < 1 ? 1 : 0;
      HttpClient.updateProgress(release.episodeId, newProgress)
        .then((success) => {
          if (success) {
            // update progress of all releases for the same episode
            this.releases.forEach((element: DisplayRelease) => {
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
  },
});
</script>
