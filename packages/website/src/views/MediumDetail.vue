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
      <thead class="table-dark">
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Host</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="toc of tocs" :key="toc.id">
          <td>
            <a :href="toc.link" target="_blank" rel="noopener noreferrer">
              {{ toc.title || details.title }}
            </a>
            <i
              v-if="toc.medium != details.medium"
              class="fas fa-exclamation-triangle text-warning ms-1"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
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
    <div>
      <input v-model="addTocUrl" type="url" @keyup.enter="addToc" />
      <button class="btn btn-primary" type="button" @click="addToc">Add Toc</button>
    </div>
    <p>
      <button
        class="btn btn-primary"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#collapseChart"
        aria-expanded="false"
        aria-controls="collapseChart"
      >
        Show Release Chart
      </button>
    </p>
    <div id="collapseChart" class="collapse">
      <div class="chart-container w-75">
        <canvas ref="chart" />
      </div>
    </div>
    <h1 id="medium-releases-title">Releases</h1>
    <toast
      id="mark-toast"
      title="Marked read"
      :message="markToast.message"
      :error="!markToast.success"
      :success="markToast.success"
      :show="markToast.show"
      data-bs-autohide="false"
      style="position: absolute; margin-top: -7em"
    />
    <div class="d-flex">
      <button class="btn btn-dark" @click.left="addEpisodesModal = details">Add Episodes</button>
      <button class="btn btn-dark" @click.left="markAll(true)">Mark all read</button>
      <div class="form-check form-switch">
        <input id="collapseToEpisode" v-model="episodesOnly" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="collapseToEpisode">Display Episodes only</label>
      </div>
    </div>
    <table class="table table-striped table-hover table-sm" aria-describedby="medium-releases-title">
      <thead class="table-dark">
        <tr>
          <th scope="col">#</th>
          <th scope="col">Date</th>
          <th scope="col">Chapter</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry of computedReleases" :key="episodesOnly ? entry.episodeId : entry.episodeId + entry.link">
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
            <template v-if="entry.others && entry.others.length">
              <span :title="entry.others.length + ' other Releases available'"> + {{ entry.others.length }} </span>
            </template>
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
    <toast
      id="progress-toast"
      title="Error"
      :message="'Could not update Progress'"
      :show="progressToast"
      @close="closeProgressToast"
    />
    <add-episode-modal :medium="addEpisodesModal" />
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent, reactive } from "vue";
import { SimpleMedium, MediumRelease, FullMediumToc, MediaType } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import toast from "../components/toast.vue";
import ToolTip from "bootstrap/js/dist/tooltip";
import { batch, formatDate, mergeMediaToc, hexToRgbA } from "../init";
// @ts-ignore
import { Chart, LineController, LineElement, PointElement, LinearScale, Title } from "chart.js";
import AddEpisodeModal from "../components/modal/add-episode-modal.vue";

// @ts-ignore
Chart.register(LineController, LineElement, PointElement, LinearScale, Title);

interface EpisodeRelease extends MediumRelease {
  others: MediumRelease[];
}

interface Data {
  releases: MediumRelease[] | EpisodeRelease[];
  details: SimpleMedium;
  tocs: FullMediumToc[];
  markToast: { message: string; success: boolean; show: boolean };
  dirty: boolean;
  addTocUrl: string;
  addEpisodesModal: SimpleMedium | null;
  tooltips: ToolTip[];
  progressToast: boolean;
}

const domainReg = /(https?:\/\/([^/]+))/;

const colorPalette = ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600"];

const bgColorPalette = colorPalette.map((color) => hexToRgbA(color, 0.5));
let chart: Chart;

export default defineComponent({
  name: "MediumDetail",
  components: {
    releaseState,
    typeIcon,
    toast,
    AddEpisodeModal,
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
        show: false,
      },
      dirty: false,
      addTocUrl: "",
      addEpisodesModal: null,
      tooltips: [],
      progressToast: false,
    };
  },

  computed: {
    computedReleases(): MediumRelease[] | EpisodeRelease[] {
      const sorted = [...this.releases].sort((first, second) => second.combiIndex - first.combiIndex);

      if (this.episodesOnly) {
        const episodes = [] as EpisodeRelease[];

        for (let i = 1; i < sorted.length; i++) {
          const previous = sorted[i - 1];

          const others = [] as MediumRelease[];
          const episode: EpisodeRelease = {
            others,
            ...previous,
          };

          for (; i < sorted.length && sorted[i].episodeId === previous.episodeId; i++) {
            const element = sorted[i];

            if (!element.locked) {
              episode.locked = false;
            }
            if (element.date < episode.date) {
              episode.date = element.date;
              episode.link = element.link;
            }
            others.push(element);
          }
          episodes.push(episode);
        }
        return episodes;
      }
      return sorted;
    },
    computedMedium(): SimpleMedium {
      // merge tocs to a single display result
      return mergeMediaToc({ ...this.details }, this.tocs);
    },
    episodesOnly: {
      get(): boolean {
        return this.$store.state.media.episodesOnly;
      },
      set(value: boolean) {
        this.$store.commit("episodesOnly", value);
      },
    },
  },

  watch: {
    releases: {
      handler() {
        this.startUpdate();
      },
      deep: true,
    },
    addEpisodeModal(newValue: SimpleMedium | null) {
      if (!newValue) {
        this.loadReleases();
      }
    },
  },

  mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));

      //chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
      //type: "line",
      //data: {
      //  datasets: [],
      //},
      //options: {
      //  scales: {
      //    // @ts-ignore
      //    x: {
      //      // @ts-ignore
      //      type: "time",
      //      distribution: "linear",
      //      time: {
      //        unit: "hour",
      //        displayFormats: {
      //          hour: "DD.MM.YYYY",
      //        },
      //      },
      //    },
      //    y: {
      //      display: true,
      //      // @ts-ignore
      //      type: "linear",
      //      position: "left",
      //      // @ts-ignore
      //      title: "Number of Releases",
      //    },
      //  },
      //},
    //});
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
    this.loadReleases();
  },
  methods: {
    loadReleases() {
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
    addToc() {
      HttpClient.addToc(this.addTocUrl, this.id);
      this.addTocUrl = "";
    },
    startUpdate() {
      if (this.dirty) {
        return;
      }
      this.dirty = true;
      // update next event tick
      setTimeout(() => this.update());
    },
    update() {
      const to = new Date().getTime();
      const from = to - 1000 * 60 * 60 * 24 * 30;

      const count = new Map<number, number>();

      const timePoints = this.releases.map((value: MediumRelease) => {
        const key = value.date.getTime();
        count.set(key, (count.get(key) || 0) + 1);
        return key;
      });

      const points = [...new Set(timePoints)].sort((a, b) => a - b);

      // remove the points which are not in datetime range
      for (let index = 0; index < points.length; index++) {
        const point = points[index];

        if (point < from || point > to) {
          points.splice(index, 1);
          index--;
        }
      }

      const yValues = points.map((value) => count.get(value));
      const xValues = points.map((value) => new Date(value));

      const newDataSet = [];

      // @ts-expect-error
      //chart.options.scales.y.scaleLabel.labelString = "Release Count";

      newDataSet.push({
        label: "All",
        data: yValues,
        backgroundColor: bgColorPalette[newDataSet.length],
        borderWidth: 1,
        borderColor: colorPalette[newDataSet.length],
        // This binds the dataset to the left y axis
        yAxisID: "left-y-axis",
      });

      //chart.data.labels = xValues;
      // @ts-ignore
      //chart.data.datasets = newDataSet;
      //chart.update();

      // no longer dirty as it is "tidied up" now
      this.dirty = false;
    },
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
        .catch(() => (this.progressToast = true));
    },

    /**
     * Hide progress error toast.
     */
    closeProgressToast() {
      this.progressToast = false;
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
          this.markToast.show = true;
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
