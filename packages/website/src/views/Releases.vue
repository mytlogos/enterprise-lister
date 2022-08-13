<template>
  <div class="container-fluid p-0">
    <h1 id="releases-title">Releases</h1>
    <div class="p-1 btn-toolbar">
      <p-button :loading="isRefreshing" label="Refresh" @click.left="refresh" />
      <SelectButton v-model="readFilter" class="d-inline-block" :options="readFilterValues" data-key="value">
        <template #option="slotProps">
          <i class="fas fa-check" :class="{ 'text-success': slotProps.option.value }" aria-hidden="true" />
        </template>
      </SelectButton>
      <SelectButton
        v-model="releaseStore.typeFilter"
        class="d-inline-block"
        :options="typeFilterValues"
        data-key="value"
        option-value="value"
      >
        <template #option="slotProps">
          <i
            v-badge="slotProps.option.count"
            v-tooltip.top="slotProps.option.tooltip"
            :class="slotProps.option.icon"
            aria-hidden="true"
          />
        </template>
      </SelectButton>
      <span class="p-float-label me-2">
        <AutoComplete
          id="ignoremedium-input"
          v-model="mediumSuggestion"
          force-selection
          :suggestions="mediumSuggestions"
          field="title"
          @item-select="ignoreMedium($event.value)"
          @complete="searchMedium($event)"
        />
        <label for="ignoremedium-input">Ignore Medium Title</label>
      </span>
      <span class="p-float-label me-2">
        <AutoComplete
          id="ignorelist-input"
          v-model="listSuggestion"
          force-selection
          :suggestions="listSuggestions"
          field="name"
          @item-select="ignoreList($event.value)"
          @complete="searchList($event)"
        />
        <label for="ignorelist-input">Ignore List Title</label>
      </span>
    </div>
    <div v-if="onlyMedia.length">
      <div class="px-1">Required Media:</div>
      <Chip
        v-for="medium in onlyMedia"
        :key="medium.id"
        class="m-1 bg-success text-bg-success"
        :label="medium.title"
        removable
        @remove="releaseStore.unrequireMedium(medium.id)"
      />
    </div>
    <div v-if="releaseStore.ignoreMedia.length">
      <div class="px-1">Ignored Media:</div>
      <Chip
        v-for="medium in releaseStore.getIgnoreMedia"
        :key="medium.id"
        class="m-1 bg-danger text-bg-danger"
        :label="medium.title"
        removable
        @remove="releaseStore.unignoreMedium(medium.id)"
      />
    </div>
    <div v-if="onlyLists.length">
      <div class="px-1">Required Lists:</div>
      <Chip
        v-for="list in onlyLists"
        :key="list.id"
        class="m-1 bg-success text-bg-success"
        :label="list.name"
        removable
        @remove="releaseStore.unrequireList(list.id)"
      />
    </div>
    <div v-if="releaseStore.getIgnoreLists.length">
      <div class="px-1">Ignored Lists:</div>
      <Chip
        v-for="list in releaseStore.getIgnoreLists"
        :key="list.id"
        :label="list.name"
        class="m-1 bg-danger text-bg-danger"
        removable
        @remove="releaseStore.unignoreList(list.id)"
      />
    </div>
    <DataTable
      :value="computedReleases"
      scrollable
      scroll-height="800px"
      :virtual-scroller-options="{ itemSize: 50 }"
      :loading="releaseStore.fetching"
      striped-rows
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="date" header="Date">
        <template #body="slotProps">
          {{ slotProps.data.date }}
        </template>
      </Column>
      <Column field="title" header="Chapter">
        <template #body="slotProps">
          <i v-if="slotProps.data.locked" class="fas fa-lock" aria-hidden="true" />
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
            {{ slotProps.data.mediumTitle }}
          </router-link>
        </template>
      </Column>
      <Column header="Action" autolayout>
        <template #body="slotProps">
          <p-button
            v-tooltip.top="slotProps.data.read ? 'Mark unread' : 'Mark read'"
            class="p-button-text"
            :class="{
              'p-button-success': slotProps.data.read,
              'p-button-plain': !slotProps.data.read,
            }"
            icon="pi pi-check"
            style="margin: -0.5rem 0"
            @click.left="changeReadStatus(slotProps.data)"
          />
          <p-button
            v-tooltip.top="'Ignore Medium'"
            icon="pi pi-ban"
            class="p-button-text p-button-warning"
            style="margin: -0.5rem 0"
            @click.left="releaseStore.ignoreMedium(slotProps.data.mediumId)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
<script lang="ts" setup>
import { StoreList as List, MediaType, SimpleMedium, DisplayReleaseItem } from "../siteTypes";
import { watchEffect, computed, ref } from "vue";
import { HttpClient } from "../Httpclient";
import { PrimeIcons } from "primevue/api";
import { useReleaseStore } from "../store/releases";
import { useMediaStore } from "../store/media";
import { useToast } from "primevue/usetoast";
import { useListStore } from "../store/lists";

// TYPES
interface Value<T> {
  value: T;
}

interface SearchEvent {
  query: string;
}

// MODIFIABLE VALUES
const isRefreshing = ref(false); // for the button
const pages: Array<{ latest: Date; until: Date }> = [{ latest: defaultLatest(), until: defaultEarliest() }];
const readFilterValues = [{ value: true }, { value: false }];
const typeFilterValues = ref([
  {
    tooltip: "Search Text Media",
    count: 0,
    icon: PrimeIcons.BOOK,
    value: MediaType.TEXT,
  },
  {
    tooltip: "Search Image Media",
    count: 0,
    icon: PrimeIcons.IMAGE,
    value: MediaType.IMAGE,
  },
  {
    tooltip: "Search Video Media",
    count: 0,
    icon: PrimeIcons.YOUTUBE,
    value: MediaType.VIDEO,
  },
  {
    tooltip: "Search Audio Media",
    count: 0,
    icon: PrimeIcons.VOLUME_OFF,
    value: MediaType.AUDIO,
  },
]);
const mediumSuggestions = ref([] as SimpleMedium[]);
const listSuggestions = ref([] as List[]);
const mediumSuggestion = ref<SimpleMedium | null>(null);
const listSuggestion = ref<List | null>(null);

// STORES
const releaseStore = useReleaseStore();
const mediaStore = useMediaStore();
const listStore = useListStore();

releaseStore.resetDates();

// COMPUTED VALUES
const onlyMedia: SimpleMedium[] = [];
const onlyLists: List[] = [];
const computedReleases = computed((): DisplayReleaseItem[] => {
  if (releaseStore.typeFilter) {
    return releaseStore.releases.filter((value) => value.medium & releaseStore.typeFilter);
  } else {
    return releaseStore.releases;
  }
});
const readFilter = computed({
  get(): Value<boolean> {
    return { value: releaseStore.readFilter };
  },
  set(value: Value<boolean>) {
    releaseStore.readFilter = value.value;
  },
});

// WATCHES
watchEffect(() => releaseStore.loadDisplayReleases(false));
watchEffect(() => {
  const newCount = {
    [MediaType.TEXT]: 0,
    [MediaType.IMAGE]: 0,
    [MediaType.VIDEO]: 0,
    [MediaType.AUDIO]: 0,
  };

  releaseStore.releases.forEach((value) => {
    if (value.medium) {
      newCount[value.medium as MediaType]++;
    }
  });

  typeFilterValues.value.forEach((item) => {
    item.count = newCount[item.value];
  });
});

// FUNCTIONS
function defaultLatest(): Date {
  // some releases have dates in the future, so get them at most one year in the future
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() + 1);
  return latest;
}

function defaultEarliest(): Date {
  // this is more of a hotfix to speedup the queries
  // view only the last month on the first full request
  const until = new Date();
  until.setMonth(until.getMonth() - 1);
  return until;
}

// TODO: reimplement pagination again
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function paginate(event: { previous: number; current: number }) {
  const diff = event.current - event.previous;

  // TODO: support page difference of more than 1 page
  if (Math.abs(diff) !== 1) {
    return;
  }

  if (diff < 0) {
    const page = pages[event.current - 1];

    if (!page) {
      console.warn("Previous Page not found: " + page);
      return;
    }
    releaseStore.until = page.until;
    releaseStore.latest = page.latest;
  } else {
    const newIndex = event.current - 1;
    const page = pages[newIndex];

    if (page) {
      releaseStore.until = page.until;
      releaseStore.latest = page.latest;
    } else {
      const lastRelease = releaseStore.releases[releaseStore.releases.length - 1];

      if (!lastRelease) {
        console.warn("No Releases left");
        return;
      }
      const until = new Date(releaseStore.until);
      until.setMonth(until.getMonth() - 1);
      releaseStore.until = until;

      releaseStore.latest = new Date(lastRelease.date);
      // do not miss releases which have the same time, but were not included in this page
      releaseStore.latest.setSeconds(releaseStore.latest.getSeconds() - 1);

      if (newIndex !== pages.length) {
        console.warn("Cannot append Page at the current end, does not match end: ", event.current, pages.length);
        return;
      }
      pages.push({ latest: releaseStore.latest, until: releaseStore.until });
    }
  }
  releaseStore.loadDisplayReleases(true);
}

function searchMedium(event: SearchEvent) {
  const query = event.query.toLowerCase();

  if (!query.trim()) {
    mediumSuggestions.value = mediaStore.mediaList;
    return;
  }
  mediumSuggestions.value = mediaStore.mediaList.filter((medium) => {
    return medium.title.toLowerCase().includes(query);
  });
}

function ignoreList(value: List) {
  listSuggestion.value = null;
  releaseStore.ignoreList(value.id);
}

function ignoreMedium(value: SimpleMedium) {
  mediumSuggestion.value = null;
  releaseStore.ignoreMedium(value.id);
}

function searchList(event: SearchEvent) {
  const query = event.query.toLowerCase();

  if (!query.trim()) {
    listSuggestions.value = listStore.lists;
    return;
  }
  listSuggestions.value = listStore.lists.filter((list) => {
    return list.name.toLowerCase().includes(query);
  });
}

/**
 * Update the progress of the episode of the release to either 0 or 1.
 * Shows an error toast if it could not update the progress.
 */
function changeReadStatus(release: DisplayReleaseItem): void {
  const newProgress = release.read ? 0 : 1;
  HttpClient.updateProgress([release.episodeId], newProgress)
    .then((success) => {
      if (success) {
        // update progress of all releases for the same episode
        releaseStore.updateStoreProgress({ episodeId: release.episodeId, read: !!newProgress });
      } else {
        return Promise.reject(new Error("progress update not successfull"));
      }
    })
    .catch((error) => {
      useToast().add({
        severity: "error",
        summary: "Could not update Progress",
        detail: error + "",
      });
    });
}

function refresh() {
  isRefreshing.value = true;
  releaseStore.loadDisplayReleases(true).finally(() => (isRefreshing.value = false));
}
</script>
<style scoped>
.btn-toolbar :deep(.p-button) {
  height: 100% !important;
}
.btn-toolbar > * {
  margin-top: 0.25rem !important;
  margin-left: 0.25rem !important;
}
</style>
