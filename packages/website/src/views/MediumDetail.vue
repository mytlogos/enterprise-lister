<template>
  <div>
    <h1>MediumDetail</h1>
    <div class="container-fluid details">
      <div>
        <type-icon style="font-size: 2em" :type="computedMedium.medium" />
        <h2 class="d-inline mx-2">{{ computedMedium.title }}</h2>
        <p-button label="Save" :loading="editItemLoading" @click="onSave" />
      </div>
      <div class="row">
        <div class="col-2">Release State of TL:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              <release-state :state="computedMedium.stateTL" />
            </template>
            <template #content>
              <dropdown v-model="details.stateTL" :options="statesOptions">
                <template #value="slotProps">
                  <release-state :state="slotProps.value" />
                </template>
                <template #option="slotProps">
                  <release-state :state="slotProps.option" />
                </template>
              </dropdown>
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Release State in COO:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              <release-state :state="computedMedium.stateOrigin" />
            </template>
            <template #content>
              <dropdown v-model="details.stateOrigin" :options="statesOptions">
                <template #value="slotProps">
                  <release-state :state="slotProps.value" />
                </template>
                <template #option="slotProps">
                  <release-state :state="slotProps.option" />
                </template>
              </dropdown>
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Series:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.series || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.series" auto-focus />
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Universe:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.universe || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.universe" auto-focus />
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Author:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.author || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.author" auto-focus />
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Artist:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.artist || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.artist" auto-focus />
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Language:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.lang || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.lang" auto-focus />
            </template>
          </Inplace>
        </div>
      </div>
      <div class="row">
        <div class="col-2">Language in COO:</div>
        <div class="col">
          <Inplace :closable="true">
            <template #display>
              {{ computedMedium.languageOfOrigin || "Click to Edit" }}
            </template>
            <template #content>
              <InputText v-model="details.languageOfOrigin" auto-focus />
            </template>
          </Inplace>
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
      <Column>
        <template #body="slotProps">
          <p-button
            icon="pi pi-trash"
            class="p-button-rounded p-button-warning"
            :loading="deleteTocLoading"
            @click="confirmDeleteToc(slotProps.data)"
          />
        </template>
      </Column>
    </data-table>
    <div class="my-2">
      <input-text v-model="addTocUrl" class="me-2" type="url" @keyup.enter="addToc" />
      <p-button label="Add Toc" @click="addToc" />
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
          <input id="collapseToEpisode" v-model="mediaStore.episodesOnly" type="checkbox" class="form-check-input" />
          <label class="form-check-label" for="collapseToEpisode">Display Episodes only</label>
        </div>
        <div class="d-flex align-items-center mx-2">
          <tri-state-checkbox v-model="readFilter" />
          <label class="mx-1">Filter by Progress</label>
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
          {{ formatDate(slotProps.data.date) }}
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

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { onMounted, computed, ref, watch } from "vue";
import { SimpleMedium, MediumRelease, FullMediumToc, MediaType } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import { batch, formatDate, mergeMediaToc } from "../init";
import AddEpisodeModal from "../components/modal/add-episode-modal.vue";
import { ReleaseState } from "enterprise-core/dist/types";
import { useMediaStore } from "../store/media";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

// TYPES
interface EpisodeRelease extends MediumRelease {
  others: MediumRelease[];
}

const domainReg = /(https?:\/\/([^/]+))/;

// PROPS
const props = defineProps<{
  id: number;
}>();

// STORES
const mediaStore = useMediaStore();

// DATA
const deleteTocLoading = ref(false);
const editItemLoading = ref(false);
const statesOptions = [
  ReleaseState.Unknown,
  ReleaseState.Ongoing,
  ReleaseState.Hiatus,
  ReleaseState.Discontinued,
  ReleaseState.Dropped,
  ReleaseState.Complete,
];
const releases = ref<MediumRelease[] | EpisodeRelease[]>([]);
const details = ref<SimpleMedium>({
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
});
const tocs = ref<FullMediumToc[]>([]);
const addTocUrl = ref("");
const addEpisodesModal = ref<SimpleMedium | undefined>();
const loadingTocs = ref(false);
const loadingReleases = ref(false);
const readFilter = ref<null | boolean>(null);
const selectedRows = ref<MediumRelease[] | EpisodeRelease[]>([]);

// COMPUTED
const computedReleases = computed((): MediumRelease[] | EpisodeRelease[] => {
  let filtered;

  if (readFilter.value != null) {
    filtered = releases.value.filter((item) => {
      if (readFilter.value) {
        return item.progress >= 1;
      } else {
        return item.progress < 1;
      }
    });
  } else {
    filtered = [...releases.value];
  }

  if (mediaStore.episodesOnly) {
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
});

const computedMedium = computed((): SimpleMedium => {
  // merge tocs to a single display result
  return mergeMediaToc({ ...details.value }, tocs.value);
});

watch(addEpisodesModal, (newValue: SimpleMedium | undefined) => {
  if (!newValue) {
    loadReleases();
  }
});

// LIFECYCLE EVENTS
onMounted(() => {
  loadLocalData();
  loadMedium();
  loadTocs();
  loadReleases();
});

// FUNCTIONS
const toast = useToast();

function actionOnMarked(action: "delete" | "read" | "unread") {
  if (action === "delete") {
    toast.add({
      summary: "Not implemented",
      severity: "warn",
      life: 3000,
    });
  } else if (action === "read") {
    markRead(true, selectedRows.value);
    selectedRows.value.length = 0;
  } else if (action === "unread") {
    markRead(false, selectedRows.value);
    selectedRows.value.length = 0;
  }
}

function markBetween() {
  let lowest: MediumRelease | EpisodeRelease | undefined;
  let highest: MediumRelease | EpisodeRelease | undefined;

  selectedRows.value.forEach((item) => {
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
  selectedRows.value = releases.value.filter(
    (item) => item.combiIndex <= highestIndex && item.combiIndex >= lowestIndex,
  );
}

function loadLocalData() {
  const medium = mediaStore.media[props.id];

  if (medium) {
    details.value = { ...medium };
  }
  const secondaryMedium = mediaStore.secondaryMedia[props.id];

  if (secondaryMedium) {
    tocs.value = [...secondaryMedium.tocs];
  }
}

function loadMedium() {
  HttpClient.getMedia([props.id])
    .then((medium) => {
      if (medium.length !== 1) {
        toast.add({
          summary: "Error while loading Details",
          detail: "Please contact the developer",
          severity: "error",
        });
        console.error("Expected a single Medium Item but got an Array");
        return;
      }
      details.value = medium[0];
    })
    .catch((error) => {
      toast.add({
        summary: "Unknown Error",
        detail: JSON.stringify(error),
        severity: "error",
      });
      console.log(error);
    });
}

function loadTocs() {
  loadingTocs.value = true;
  HttpClient.getTocs(props.id)
    .then((value) => (tocs.value = value))
    .catch((error) => {
      toast.add({
        summary: "Error while loading Tocs",
        detail: error + "",
        severity: "error",
      });
      console.log(error);
    })
    .finally(() => (loadingTocs.value = false));
}

function loadReleases() {
  if (loadingReleases.value) {
    return;
  }
  loadingReleases.value = true;
  HttpClient.getReleases(props.id)
    .then((result) => {
      // ensure that date is a 'Date' object
      for (const release of result) {
        release.date = new Date(release.date);
      }
      releases.value = result;
    })
    .catch((error) => {
      toast.add({
        summary: "Error while loading Releases",
        detail: error + "",
        severity: "error",
      });
      console.log(error);
    })
    .finally(() => {
      loadingReleases.value = false;
    });
}

function addToc() {
  HttpClient.addToc(addTocUrl.value, props.id)
    .then(() => {
      toast.add({
        summary: "Successfully added the TocRequest",
        severity: "success",
        life: 3000,
      });
    })
    .catch((error) => {
      toast.add({
        summary: "Error while adding the Toc",
        detail: error + "",
        severity: "error",
      });
      console.log(error);
    });
  addTocUrl.value = "";
}

/**
 * Extracts the Domain name of a web link.
 *
 * @param link the link to inspect
 */
function getDomain(link: string): string {
  const match = domainReg.exec(link);
  if (!match) {
    console.warn("invalid link: " + link);
    return "";
  }
  return match[2];
}

/**
 * Extracts the Part up to the first slash (/).
 *
 * @param link the link to inspect
 */
function getHome(link: string): string {
  const match = domainReg.exec(link);
  if (!match) {
    console.warn("invalid link: " + link);
    return "";
  }
  return match[1];
}

/**
 * Returns a String representation to the medium.
 *
 * @param medium medium to represent
 */
function mediumToString(medium?: number): string {
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
}

/**
 * Update the progress of the episode of the release to either 0 or 1.
 * Shows an error toast if it could not update the progress.
 */
function changeReadStatus(release: MediumRelease): void {
  const newProgress = release.progress < 1 ? 1 : 0;
  HttpClient.updateProgress([release.episodeId], newProgress)
    .then((success) => {
      if (success) {
        // update progress of all releases for the same episode
        releases.value.forEach((element: MediumRelease) => {
          if (release.episodeId === element.episodeId) {
            element.progress = newProgress;
          }
        });
      } else {
        return Promise.reject(new Error("progress update was not successfull"));
      }
    })
    .catch((error) => {
      toast.add({
        summary: "Error updating Progress",
        detail: error + "",
        severity: "error",
      });
      console.log(error);
    });
}

function markAll(read: boolean) {
  markRead(read, releases.value);
}

function markRead(read: boolean, readReleases: MediumRelease[] | EpisodeRelease[]) {
  const newProgress = read ? 1 : 0;
  const batchSize = 50;

  let updateReleases = [];

  if (read) {
    updateReleases = readReleases.filter((value) => value.progress < 1);
  } else {
    updateReleases = readReleases.filter((value) => value.progress >= 1);
  }

  if (!updateReleases.length) {
    toast.add({
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
    toast.add({
      summary: "Mark all",
      detail: `Marking as read succeeded for ${succeeded} and failed for ${failed}`,
      severity: failed ? "error" : "success",
      life: failed ? undefined : 3000,
    });
    console.log(`succeeded=${succeeded}, failed=${failed}`);
  });
}

function onSave() {
  editItemLoading.value = true;

  HttpClient.updateMedium(details.value)
    .then(() => {
      mediaStore.updateMediumLocal(details.value);
      toast.add({ severity: "success", summary: "Medium updated", life: 3000 });
    })
    .catch((reason) => {
      toast.add({
        severity: "error",
        summary: "Save failed",
        detail: JSON.stringify(reason),
        life: 3000,
      });
    })
    .finally(() => (editItemLoading.value = false));
}

function confirmDeleteToc(data: FullMediumToc) {
  useConfirm().require({
    message: `Remove ToC '${data.link}' on '${getDomain(data.link)}'?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => {
      deleteTocLoading.value = true;

      HttpClient.deleteToc({ link: data.link, mediumId: data.mediumId })
        .then(() => {
          mediaStore.deleteTocLocal({ link: data.link, mediumId: data.mediumId });
          toast.add({ severity: "info", summary: "Confirmed", detail: "Toc deleted", life: 3000 });
        })
        .catch((reason) => {
          toast.add({
            severity: "error",
            summary: "Deleting Toc failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => (deleteTocLoading.value = false));
    },
  });
}
</script>

<style scoped>
.details .col-2 {
  text-align: right;
}
</style>
