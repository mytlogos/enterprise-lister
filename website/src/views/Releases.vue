<template>
  <div class="container-fluid p-0">
    <h1>Releases</h1>
    <div class="p-1">
      <button
        class="btn btn-dark"
        @click.left="fetchReleases"
      >
        Fetch new Releases
      </button>
    </div>
    <table class="table table-striped table-hover table-sm">
      <thead class="thead-dark">
        <th>#</th>
        <th>Date</th>
        <th>Chapter</th>
        <th>Medium</th>
        <th>Actions</th>
      </thead>
      <tbody>
        <tr
          v-for="(entry, index) in releases"
          :key="entry.episodeId"
        >
          <td class="">
            {{ index + 1 }}
          </td>
          <td class="">
            {{ dateToString(entry.date) }}
          </td>
          <td>
            <template v-if="entry.locked">
              <i class="fas fa-lock" />
            </template>
            <a :href="entry.link">
              {{ entry.title }}
            </a>
          </td>
          <td>
            {{ media[entry.mediumId] }}
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
                :class="{ 'text-success': entry.progress === 1 }"
              />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- TODO: make bootstrap toast to a vue component with message (toast) queue -->
    <div
      id="progress-toast"
      class="toast"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="toast-header">
        <i class="fas fa-exclamation-circle rounded mr-2 text-danger" />
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
      <div class="toast-body">
        Could not update Progress
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { DisplayRelease } from "src/siteTypes";
import { defineComponent } from "vue";
import { HttpClient as Client, HttpClient } from "../Httpclient";
import { binarySearch, timeDifference } from "../init";
import $ from "jquery";

interface Data {
    releases: DisplayRelease[];
    media: { [key: number]: string };
    currentDate: Date;
    fetching: boolean;
    unmounted: boolean;
}

// initialize all tooltips on this page
$(function () {
    $("[data-toggle=\"tooltip\"]").tooltip()
});

// initialize all toasts
$(".toast").toast();

export default defineComponent({
    name: "Releases",

    data(): Data {
        return {
            releases: [],
            media: {},
            currentDate: new Date(),
            fetching: false,
            unmounted: false,
        };
    },
    mounted() {
        this.unmounted = false;
        this.fetchReleases();
    },
    unmounted() {
        this.unmounted = true;
    },
    methods: {
        timeDifference(date: Date): string {
            return timeDifference(this.currentDate, date);
        },

        async fetchReleases() {
            // do not fetch if already fetching or this component is already unmounted
            if (this.fetching || this.unmounted) {
                return;
            }
            this.fetching = true;
            let until: Date | undefined;
            if (this.releases.length) {
                until = this.releases[0].date;
            }
            try {
                const response = await Client.getDisplayReleases(new Date(), until);
                for (const key in response.media) {
                    this.media[key] = response.media[key];
                }
                response.releases.forEach((value) => {
                    if (!(value.date instanceof Date)) {
                        value.date = new Date(value.date);
                    }
                })
                this.currentDate = new Date();

                // insert fetched releases at the corresponding place
                response.releases.forEach(release => {
                    const insertIndex = binarySearch(this.releases, (value: DisplayRelease) => value.date < release.date);

                    if (insertIndex >= 0) {
                        this.releases.splice(insertIndex, 0, release);
                    } else {
                        console.warn("No Insertindex found for Release: ", release);
                    }
                });
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
            console.log(release);
            const newProgress = release.progress < 1 ? 1 : 0;
            HttpClient.updateProgress(release.episodeId, newProgress)
                .then(success => {
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
            return date.toLocaleString("de");
        },
    }
})
</script>