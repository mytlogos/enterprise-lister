<template>
  <div class="container-fluid p-0">
    <h1 id="releases-title">Releases</h1>
    <div class="p-1">
      <button class="btn btn-dark" @click.left="fetchReleases(true)">Refresh</button>
      <button class="btn btn-dark ml-1" @click.left="fetchReleases">Fetch new Releases</button>
      <triple-filter v-model:state="readFilter" class="ml-1" />
      <media-filter :state="typeFilter" class="ml-1" @update:state="typeFilter = $event" />
    </div>
    <table class="table table-striped table-hover table-sm" aria-describedby="releases-title">
      <thead class="thead-dark">
        <th scope="col">#</th>
        <th scope="col">Date</th>
        <th scope="col">Chapter</th>
        <th scope="col">Medium</th>
        <th scope="col">Actions</th>
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
              data-toggle="tooltip"
              data-placement="top"
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
          </td>
        </tr>
      </tbody>
    </table>
    <!-- TODO: make bootstrap toast to a vue component with message (toast) queue -->
    <div id="progress-toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="fas fa-exclamation-circle rounded mr-2 text-danger" aria-hidden="true" />
        <strong class="mr-auto">Error</strong>
        <button
          type="button"
          class="ml-2 mb-1 close"
          data-dismiss="toast"
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
import { DisplayRelease, SimpleMedium } from "../siteTypes";
import { defineComponent, reactive } from "vue";
import { HttpClient } from "../Httpclient";
import { formatDate, timeDifference } from "../init";
import TripleFilter from "../components/triple-filter.vue";
import MediaFilter from "../components/media-filter.vue";
import $ from "jquery";

interface Data {
  releases: DisplayRelease[];
  currentDate: Date;
  fetching: boolean;
  unmounted: boolean;
  /**
   * Signal Variable for fetchReleases to replace all current ones
   */
  replace: boolean;
}

// initialize all tooltips on this page
$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

// initialize all toasts
$(".toast").toast();

export default defineComponent({
  name: "Releases",
  components: { TripleFilter, MediaFilter },

  props: {
    read: Boolean,
    type: {
      type: Number,
      default: 0,
    },
  },

  data(): Data {
    return {
      releases: [],
      currentDate: new Date(),
      fetching: false,
      unmounted: false,
      replace: false,
    };
  },
  computed: {
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
  },
  async mounted() {
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
      let until: Date | undefined;

      if (this.releases.length && !replace) {
        until = this.computedReleases[0].date;
      } else {
        // this is more of a hotfix to speedup the queries
        // view only the last month on the first full request
        until = new Date();
        until.setMonth(until.getMonth() - 1);
      }
      try {
        // some releases have dates in the future, so get them at most one year in the future
        const latest = new Date();
        latest.setFullYear(latest.getFullYear() + 1);
        const response = await HttpClient.getDisplayReleases(latest, until, this.read);

        response.releases.forEach((value) => {
          if (!(value.date instanceof Date)) {
            value.date = new Date(value.date);
          }
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
        // response.releases.forEach(release => {
        //     const insertIndex = binarySearch(this.releases, (value: DisplayRelease) => value.date < release.date);

        //     if (insertIndex >= 0) {
        //         releases.splice(insertIndex, 0, release);
        //     } else {
        //         console.warn("No Insertindex found for Release: ", release);
        //     }
        // });
      } catch (error) {
        console.error(error);
      } finally {
        this.fetching = false;
        // fetch again in a minute
        setTimeout(() => this.fetchReleases(), 60000);
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
        .catch(() => $("#progress-toast").toast("show"));
    },

    /**
     * Hide progress error toast.
     */
    closeProgressToast() {
      $("#progress-toast").toast("hide");
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
