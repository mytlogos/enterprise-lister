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
    <data-table :loading="loadingTocs" :value="tocs" striped-rows>
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="title" header="Title">
        <template #body="slotProps">
          <a :href="slotProps.data.link" target="_blank" rel="noopener noreferrer">
            {{ slotProps.data.title || "Unknown" }}
          </a>
          <i
            v-if="slotProps.data.medium != details.medium"
            v-tooltip.top="
              `Expected ${mediumToString(details.medium)} but got ${mediumToString(slotProps.data.medium)}`
            "
            class="fas fa-exclamation-triangle text-warning ms-1"
            aria-hidden="true"
          />
        </template>
      </Column>
      <Column field="host" header="Host">
        <template #body="slotProps">
          <a :href="getHome(slotProps.data.link)" target="_blank" rel="noopener noreferrer">{{
            getDomain(slotProps.data.link)
          }}</a>
        </template>
      </Column>
    </data-table>
    <div class="my-2">
      <input-text v-model="addTocUrl" class="me-2" type="url" @keyup.enter="addToc" />
      <p-button label="Add Toc" @click="addToc" />
    </div>
    <p>
      <p-button
        data-bs-toggle="collapse"
        data-bs-target="#collapseChart"
        aria-expanded="false"
        aria-controls="collapseChart"
      >
        Show Release Chart
      </p-button>
    </p>
    <div id="collapseChart" class="collapse">
      <div class="chart-container w-75">
        <canvas ref="chart" />
      </div>
    </div>
    <h1 id="medium-releases-title">Releases</h1>
    <toolbar>
      <template #start>
        <p-button label="Add Episodes" class="me-2" @click.left="addEpisodesModal = details" />
        <p-button label="Mark all read" class="me-2" @click.left="markAll(true)" />
        <p-button label="Mark between" class="me-2" @click.left="markBetween" />
        <p-button label="Delete marked" class="me-2" @click.left="actionOnMarked('delete')" />
        <p-button label="Set marked read" class="me-2" @click.left="actionOnMarked('read')" />
        <p-button label="Set marked unread" class="me-2" @click.left="actionOnMarked('unread')" />
        <div class="form-check form-switch">
          <input id="collapseToEpisode" v-model="episodesOnly" type="checkbox" class="form-check-input" />
          <label class="form-check-label" for="collapseToEpisode">Display Episodes only</label>
        </div>
        <div class="field-checkbox m-0">
          <tri-state-checkbox v-model="readFilter" />
          <label>Filter by Progress</label>
        </div>
      </template>
    </toolbar>
    <data-table
      v-model:selection="selectedRows"
      class="p-datatable-sm"
      selection-mode="multiple"
      :meta-key-selection="false"
      paginator-position="both"
      :paginator="true"
      :rows="100"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rows-per-page-options="[100, 200, 500]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      :loading="loadingReleases"
      :value="computedReleases"
      sort-field="combiIndex"
      :sort-order="-1"
      striped-rows
    >
      <column field="combiIndex" header="#" sortable />
      <column field="date" header="Date" sortable>
        <template #body="slotProps">
          {{ dateToString(slotProps.data.date) }}
        </template>
      </column>
      <column header="Chapter">
        <template #body="slotProps">
          <i v-if="slotProps.data.locked" class="fas fa-lock" aria-hidden="true" />
          <a :href="slotProps.data.link" target="_blank" rel="noopener noreferrer">
            {{ slotProps.data.title }}
          </a>
          <template v-if="slotProps.data.others && slotProps.data.others.length">
            <span :title="slotProps.data.others.length + ' other Releases available'">
              + {{ slotProps.data.others.length }}
            </span>
          </template>
        </template>
      </column>
      <column field="progress" header="Actions" sortable>
        <template #body="slotProps">
          <button
            v-tooltip.top="slotProps.data.progress < 1 ? 'Mark read' : 'Mark unread'"
            class="btn"
            @click.left="changeReadStatus(slotProps.data)"
          >
            <i
              class="fas fa-check"
              :class="{
                'text-success': slotProps.data.progress === 1,
              }"
              aria-hidden="true"
            />
          </button>
        </template>
      </column>
    </data-table>
    <add-episode-modal v-model:medium="addEpisodesModal" />
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent, reactive } from "vue";
import { SimpleMedium, MediumRelease, FullMediumToc, MediaType } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import { batch, formatDate, mergeMediaToc, hexToRgbA } from "../init";
import AddEpisodeModal from "../components/modal/add-episode-modal.vue";

interface EpisodeRelease extends MediumRelease {
  others: MediumRelease[];
}

interface Data {
  releases: MediumRelease[] | EpisodeRelease[];
  details: SimpleMedium;
  tocs: FullMediumToc[];
  dirty: boolean;
  addTocUrl: string;
  addEpisodesModal?: SimpleMedium;
  loadingTocs: boolean;
  loadingReleases: boolean;
  readFilter: boolean | null;
  selectedRows: MediumRelease[] | EpisodeRelease[];
}

const domainReg = /(https?:\/\/([^/]+))/;

const colorPalette = ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600"];

const bgColorPalette = colorPalette.map((color) => hexToRgbA(color, 0.5));

export default defineComponent({
  name: "MediumDetail",
  components: {
    releaseState,
    typeIcon,
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
      dirty: false,
      addTocUrl: "",
      addEpisodesModal: undefined,
      loadingTocs: false,
      loadingReleases: false,
      readFilter: null,
      selectedRows: [],
    };
  },

  computed: {
    computedReleases(): MediumRelease[] | EpisodeRelease[] {
      let filtered;

      if (this.readFilter != null) {
        filtered = this.releases.filter((item) => {
          if (this.readFilter) {
            return item.progress >= 1;
          } else {
            return item.progress < 1;
          }
        });
      } else {
        filtered = [...this.releases];
      }

      if (this.episodesOnly) {
        const episodes = [] as EpisodeRelease[];

        for (let i = 1; i < filtered.length; i++) {
          const previous = filtered[i - 1];

          const others = [] as MediumRelease[];
          const episode: EpisodeRelease = {
            others,
            ...previous,
          };

          for (; i < filtered.length && filtered[i].episodeId === previous.episodeId; i++) {
            const element = filtered[i];

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
      return filtered;
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
    // TODO: use chart
    // chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
    // type: "line",
    // data: {
    //  datasets: [],
    // },
    // options: {
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
    // },
    // });
    this.loadLocalData();
    this.loadMedium();
    this.loadTocs();
    this.loadReleases();
  },
  methods: {
    actionOnMarked(action: "delete" | "read" | "unread") {
      if (action === "delete") {
        this.$toast.add({
          summary: "Not implemented",
          severity: "warn",
          life: 3000,
        });
      } else if (action === "read") {
        this.markRead(true, this.selectedRows);
        this.selectedRows.length = 0;
      } else if (action === "unread") {
        this.markRead(false, this.selectedRows);
        this.selectedRows.length = 0;
      }
    },
    markBetween() {
      let lowest: MediumRelease | EpisodeRelease | undefined;
      let highest: MediumRelease | EpisodeRelease | undefined;

      this.selectedRows.forEach((item) => {
        if (!lowest || lowest.combiIndex > item.combiIndex) {
          lowest = item;
        }
        if (!highest || highest.combiIndex < item.combiIndex) {
          highest = item;
        }
      });
      if (!lowest || !highest) {
        return;
      }
      const highestIndex = (highest as MediumRelease | EpisodeRelease | undefined)?.combiIndex || 0;
      const lowestIndex = (lowest as MediumRelease | EpisodeRelease | undefined)?.combiIndex || 0;
      this.selectedRows = this.releases.filter(
        (item) => item.combiIndex <= highestIndex && item.combiIndex >= lowestIndex,
      );
    },
    loadLocalData() {
      const medium = this.$store.state.media.media[this.id];

      if (medium) {
        this.details = reactive({ ...medium });
      }
      const secondaryMedium = this.$store.state.media.secondaryMedia[this.id];

      if (secondaryMedium) {
        this.tocs = [...secondaryMedium.tocs];
      }
    },
    loadMedium() {
      HttpClient.getMedia(this.id)
        .then((medium) => {
          if (Array.isArray(medium)) {
            this.$toast.add({
              summary: "Error while loading Details",
              detail: "Please contact the developer",
              severity: "error",
            });
            console.error("Expected a single Medium Item but got an Array");
            return;
          }
          this.details = reactive(medium);
        })
        .catch((error) => {
          this.$toast.add({
            summary: "Unknown Error",
            detail: error + "",
            severity: "error",
          });
          console.log(error);
        });
    },
    loadTocs() {
      this.loadingTocs = true;
      HttpClient.getTocs(this.id)
        .then((tocs) => (this.tocs = tocs))
        .catch((error) => {
          this.$toast.add({
            summary: "Error while loading Tocs",
            detail: error + "",
            severity: "error",
          });
          console.log(error);
        })
        .finally(() => (this.loadingTocs = false));
    },
    loadReleases() {
      if (this.loadingReleases) {
        return;
      }
      this.loadingReleases = true;
      HttpClient.getReleases(this.id)
        .then((releases) => {
          // ensure that date is a 'Date' object
          for (const release of releases) {
            release.date = new Date(release.date);
          }
          this.releases = reactive(releases);
        })
        .catch((error) => {
          this.$toast.add({
            summary: "Error while loading Releases",
            detail: error + "",
            severity: "error",
          });
          console.log(error);
        })
        .finally(() => {
          this.loadingReleases = false;
        });
    },
    addToc() {
      HttpClient.addToc(this.addTocUrl, this.id)
        .then(() => {
          this.$toast.add({
            summary: "Successfully added the TocRequest",
            severity: "success",
            life: 3000,
          });
        })
        .catch((error) => {
          this.$toast.add({
            summary: "Error while adding the Toc",
            detail: error + "",
            severity: "error",
          });
          console.log(error);
        });
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
      // const xValues = points.map((value) => new Date(value));

      const newDataSet = [];

      // chart.options.scales.y.scaleLabel.labelString = "Release Count";

      newDataSet.push({
        label: "All",
        data: yValues,
        backgroundColor: bgColorPalette[newDataSet.length],
        borderWidth: 1,
        borderColor: colorPalette[newDataSet.length],
        // This binds the dataset to the left y axis
        yAxisID: "left-y-axis",
      });

      // chart.data.labels = xValues;
      // chart.data.datasets = newDataSet;
      // chart.update();

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
            return Promise.reject(new Error("progress update was not successfull"));
          }
        })
        .catch((error) => {
          this.$toast.add({
            summary: "Error updating Progress",
            detail: error + "",
            severity: "error",
          });
          console.log(error);
        });
    },

    markAll(read: boolean) {
      this.markRead(read, this.releases);
    },
    markRead(read: boolean, readReleases: MediumRelease[] | EpisodeRelease[]) {
      const newProgress = read ? 1 : 0;
      const batchSize = 50;

      let updateReleases = [];

      if (read) {
        updateReleases = readReleases.filter((value) => value.progress < 1);
      } else {
        updateReleases = readReleases.filter((value) => value.progress >= 1);
      }

      if (!updateReleases.length) {
        this.$toast.add({
          summary: "No Releases available for marking.",
          severity: "warn",
        });
        return;
      }

      Promise.allSettled(
        batch(updateReleases, batchSize).map((releases: MediumRelease[]) => {
          const episodeIds: number[] = releases.map((value) => value.episodeId);
          return HttpClient.updateProgress(episodeIds, newProgress);
        }),
      ).then((settled: Array<PromiseSettledResult<boolean>>) => {
        let failed = 0;
        let succeeded = 0;

        settled.forEach((result, index) => {
          const releaseStart = index * batchSize;
          const releaseEnd = releaseStart + (index >= settled.length - 1 ? readReleases.length % batchSize : batchSize);

          if (result.status === "rejected" || !result.value) {
            failed += releaseEnd - releaseStart;
          } else {
            succeeded += releaseEnd - releaseStart;
            // set new progress for all releases in this batch result
            for (let i = releaseStart; i < releaseEnd && i < readReleases.length; i++) {
              const element = readReleases[i];

              if (element) {
                element.progress = newProgress;
              }
            }
          }
        });
        this.$toast.add({
          summary: "Mark all",
          detail: `Marking as read succeeded for ${succeeded} and failed for ${failed}`,
          severity: failed ? "error" : "success",
          life: failed ? undefined : 3000,
        });
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
