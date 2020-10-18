<template>
  <div>
    <h1>MediumDetail</h1>
    <h1 id="medium-releases-title">
      Releases
    </h1>
    <table
      class="table table-striped table-hover table-sm"
      aria-describedby="medium-releases-title"
    >
      <thead class="thead-dark">
        <th scope="col">
          #
        </th>
        <th scope="col">
          Date
        </th>
        <th scope="col">
          Chapter
        </th>
        <th scope="col">
          Actions
        </th>
      </thead>
      <tbody>
        <tr
          v-for="entry of computedReleases"
          :key="entry.episodeId"
        >
          <td class="">
            {{ entry.combiIndex }}
          </td>
          <td class="">
            {{ dateToString(entry.date) }}
          </td>
          <td>
            <template v-if="entry.locked">
              <i
                class="fas fa-lock"
                aria-hidden="true"
              />
            </template>
            <a
              :href="entry.link"
              target="_blank"
            >
              {{ entry.title }}
            </a>
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
                aria-hidden="true"
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
        <i
          class="fas fa-exclamation-circle rounded mr-2 text-danger"
          aria-hidden="true"
        />
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
import { HttpClient } from "../Httpclient";
import { defineComponent, reactive } from "vue";
import { MediumRelease } from "../siteTypes";
import $ from "jquery";

interface Data {
  releases: any[];
  details: null | any;
}

// initialize all tooltips on this page
$(function () {
    $("[data-toggle=\"tooltip\"]").tooltip()
});

// initialize all toasts
$(".toast").toast();

export default defineComponent({
    name: "MediumDetail",
    props: {
        id: {
            type: Number,
            required: true
        }
    },

    data(): Data {
        return {
            releases: [],
            details: null,
        };
    },

    computed: {
        computedReleases(): MediumRelease[] {
            return [...this.releases].sort((first, second) => second.combiIndex - first.combiIndex);
        }
    },

    mounted() {
        HttpClient.getMedia(this.id).then(medium => this.details = reactive(medium)).catch(console.error);
        HttpClient.getReleases(this.id).then(releases => this.releases = reactive(releases)).catch(console.error);
    },

    methods: {
        /**
         * Format a given Date to a german locale string.
         */
        dateToString(date: Date): string {
            return date.toLocaleString("de-DE");
        },

        /**
         * Update the progress of the episode of the release to either 0 or 1.
         * Shows an error toast if it could not update the progress.
         */
        changeReadStatus(release: MediumRelease): void {
            const newProgress = release.progress < 1 ? 1 : 0;
            HttpClient.updateProgress(release.episodeId, newProgress)
                .then(success => {
                    if (success) {
                        // update progress of all releases for the same episode
                        this.releases.forEach((element: MediumRelease) => {
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
    }
});
</script>
