<template>
  <div>
    <h1>MediumDetail</h1>
    <div class="container-fluid details">
      <h2><type-icon :type="details.medium" /> {{ details.title }}</h2>
      <div class="row">
        <div class="col-2">
          Release State of TL:
        </div>
        <div class="col">
          <release-state :state="details.stateTL" />
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Release State in COO:
        </div>
        <div class="col">
          <release-state :state="details.stateOrigin" />
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Series:
        </div>
        <div class="col">
          {{ details.series }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Universe:
        </div>
        <div class="col">
          {{ details.universe }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Author:
        </div>
        <div class="col">
          {{ details.author }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Artist:
        </div>
        <div class="col">
          {{ details.artist }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">
          Language:
        </div>
        <div class="col">
          {{ details.lang }}
        </div>
      </div>
    </div>
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
import { SimpleMedium, MediumRelease } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import $ from "jquery";

interface Data {
  releases: any[];
  details: SimpleMedium;
}

// initialize all tooltips on this page
$(function () {
    $("[data-toggle=\"tooltip\"]").tooltip()
});

// initialize all toasts
$(".toast").toast();

export default defineComponent({
    name: "MediumDetail",
    components: {
        releaseState,
        typeIcon
    },
    props: {
        id: {
            type: Number,
            required: true
        }
    },

    data(): Data {
        return {
            releases: [],
            details: {
                id: 0,
                countryOfOrigin: "N/A",
                languageOfOrigin: "N/A",
                author: "N/A",
                title: "N/A",
                medium: 0,
                artist: "N/A",
                lang: "N/A",
                stateOrigin: 0,
                stateTL: 0,
                series: "N/A",
                universe: "N/A",
            },
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

<style scoped>
.details .col-2 {
  text-align: right;
}
</style>