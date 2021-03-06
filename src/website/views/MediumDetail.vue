<template>
  <div>
    <h1>MediumDetail</h1>
    <div class="container-fluid details">
      <h2>
        <type-icon :type="computedMedium.medium" />
        {{ computedMedium.title }}
      </h2>
      <div class="row">
        <div class="col-2">Release State of TL:</div>
        <div class="col">
          <release-state :state="computedMedium.stateTL" />
        </div>
      </div>
      <div class="row">
        <div class="col-2">Release State in COO:</div>
        <div class="col">
          <release-state :state="computedMedium.stateOrigin" />
        </div>
      </div>
      <div class="row">
        <div class="col-2">Series:</div>
        <div class="col">
          {{ computedMedium.series }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">Universe:</div>
        <div class="col">
          {{ computedMedium.universe }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">Author:</div>
        <div class="col">
          {{ computedMedium.author }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">Artist:</div>
        <div class="col">
          {{ computedMedium.artist }}
        </div>
      </div>
      <div class="row">
        <div class="col-2">Language:</div>
        <div class="col">
          {{ computedMedium.lang }}
        </div>
      </div>
    </div>
    <h1 id="tocs-title">Tocs</h1>
    <table class="table table-striped table-hover table-sm" aria-describedby="tocs-title">
      <thead class="thead-dark">
        <th scope="col">Title</th>
        <th scope="col">Host</th>
      </thead>
      <tbody>
        <tr v-for="toc of tocs" :key="toc.id">
          <td>
            <a :href="toc.link" target="_blank" rel="noopener noreferrer">
              {{ toc.title || details.title }}
            </a>
            <i
              v-if="toc.medium != details.medium"
              class="fas fa-exclamation-triangle text-warning ml-1"
              data-toggle="tooltip"
              data-placement="top"
              :title="`Expected ${mediumToString(details.medium)} but got ${mediumToString(toc.medium)}`"
              aria-hidden="true"
            />
          </td>
          <td>
            <a :href="getHome(toc.link)" target="_blank" rel="noopener noreferrer">{{ getDomain(toc.link) }}</a>
          </td>
        </tr>
      </tbody>
    </table>
    <h1 id="medium-releases-title">Releases</h1>
    <toast
      id="mark-toast"
      title="Marked read"
      :message="markToast.message"
      :error="!markToast.success"
      :success="markToast.success"
      data-autohide="false"
      style="position: absolute; margin-top: -7em"
    />
    <button class="btn btn-dark" @click.left="markAll(true)">Mark all read</button>
    <table class="table table-striped table-hover table-sm" aria-describedby="medium-releases-title">
      <thead class="thead-dark">
        <th scope="col">#</th>
        <th scope="col">Date</th>
        <th scope="col">Chapter</th>
        <th scope="col">Actions</th>
      </thead>
      <tbody>
        <tr v-for="entry of computedReleases" :key="entry.episodeId">
          <td class="">
            {{ entry.combiIndex }}
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
            <button
              class="btn"
              data-toggle="tooltip"
              data-placement="top"
              :title="entry.progress < 1 ? 'Mark read' : 'Mark unread'"
              @click.left="changeReadStatus(entry)"
            >
              <i
                class="fas fa-check"
                :class="{
                  'text-success': entry.progress === 1,
                }"
                aria-hidden="true"
              />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- TODO: make bootstrap toast to a vue component with message (toast) queue -->
    <toast id="progress-toast" title="Error" :message="'Could not update Progress'" @close="closeProgressToast" />
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent, reactive } from "vue";
import { SimpleMedium, MediumRelease, FullMediumToc, MediaType } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import toast from "../components/toast.vue";
import $ from "jquery";
import { batch, formatDate, mergeMediaToc } from "../init";

interface Data {
  releases: any[];
  details: SimpleMedium;
  tocs: FullMediumToc[];
  markToast: { message: string; success: boolean };
}

// initialize all tooltips on this page
$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

const domainReg = /(https?:\/\/([^/]+))/;

export default defineComponent({
  name: "MediumDetail",
  components: {
    releaseState,
    typeIcon,
    toast,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
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
      tocs: [],
      markToast: {
        message: "",
        success: false,
      },
    };
  },

  computed: {
    computedReleases(): MediumRelease[] {
      return [...this.releases].sort((first, second) => second.combiIndex - first.combiIndex);
    },
    computedMedium(): SimpleMedium {
      // merge tocs to a single display result
      return mergeMediaToc({ ...this.details }, this.tocs);
    },
  },

  mounted() {
    HttpClient.getMedia(this.id)
      .then((medium) => {
        if (Array.isArray(medium)) {
          this.$store.commit("errorModalError", "Error while loading Details");
          console.error("Expected a single Medium Item but got an Array");
          return;
        }
        this.details = reactive(medium);
        return HttpClient.getTocs(medium.id)
          .then((tocs) => (this.tocs = tocs))
          .catch(console.error);
      })
      .catch(console.error);
    HttpClient.getReleases(this.id)
      .then((releases) => {
        // ensure that date is a 'Date' object
        for (const release of releases) {
          release.date = new Date(release.date);
        }
        this.releases = reactive(releases);
      })
      .catch(console.error);
  },

  methods: {
    /**
     * Format a given Date to a german locale string.
     */
    dateToString(date: Date): string {
      return formatDate(date);
    },

    /**
     * Extracts the Domain name of a web link.
     *
     * @param link the link to inspect
     */
    getDomain(link: string): string {
      const match = domainReg.exec(link);
      if (!match) {
        console.warn("invalid link: " + link);
        return "";
      }
      return match[2];
    },

    /**
     * Extracts the Part up to the first slash (/).
     *
     * @param link the link to inspect
     */
    getHome(link: string): string {
      const match = domainReg.exec(link);
      if (!match) {
        console.warn("invalid link: " + link);
        return "";
      }
      return match[1];
    },

    /**
     * Returns a String representation to the medium.
     *
     * @param medium medium to represent
     */
    mediumToString(medium?: number): string {
      switch (medium) {
        case MediaType.TEXT:
          return "Text";
        case MediaType.AUDIO:
          return "Audio";
        case MediaType.VIDEO:
          return "Video";
        case MediaType.IMAGE:
          return "Image";
        default:
          return "Unknown";
      }
    },

    /**
     * Update the progress of the episode of the release to either 0 or 1.
     * Shows an error toast if it could not update the progress.
     */
    changeReadStatus(release: MediumRelease): void {
      const newProgress = release.progress < 1 ? 1 : 0;
      HttpClient.updateProgress(release.episodeId, newProgress)
        .then((success) => {
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

    markAll(read: boolean) {
      const newProgress = read ? 1 : 0;
      const batchSize = 50;

      Promise.allSettled(
        batch(this.releases, batchSize).map((releases: MediumRelease[]) => {
          const episodeIds: number[] = releases.map((value) => value.episodeId);
          return HttpClient.updateProgress(episodeIds, newProgress);
        }),
      )
        // @ts-ignore
        .then((settled: Array<PromiseSettledResult<boolean>>) => {
          let failed = 0;
          let succeeded = 0;

          settled.forEach((result, index) => {
            const releaseStart = index * batchSize;
            const releaseEnd =
              releaseStart + (index >= settled.length - 1 ? this.releases.length % batchSize : batchSize);

            if (result.status === "rejected" || !result.value) {
              failed += releaseEnd - releaseStart;
            } else {
              succeeded += releaseEnd - releaseStart;
              // set new progress for all releases in this batch result
              for (let i = releaseStart; i < releaseEnd && i < this.releases.length; i++) {
                const element = this.releases[i];

                if (element) {
                  element.progress = newProgress;
                }
              }
            }
          });
          this.markToast.message = `Marking as read succeeded for ${succeeded} and failed for ${failed}`;
          this.markToast.success = failed === 0;
          $("#mark-toast").toast("show");
          console.log(`succeeded=${succeeded}, failed=${failed}`);
        });
    },
  },
});
</script>

<style scoped>
.details .col-2 {
  text-align: right;
}
</style>
