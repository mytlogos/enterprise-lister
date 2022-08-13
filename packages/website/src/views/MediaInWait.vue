<template>
  <div class="container-fluid p-0">
    <h1 id="media-title" class="ms-3">MediaInWait</h1>
    <Toolbar>
      <template #start>
        <div class="me-sm-2">
          <input-text v-model="data.titleSearch" placeholder="Search in Title" type="text" />
        </div>
        <media-filter v-model:state="data.typeFilter" class="me-2 w-auto" />
        <span class="p-float-label me-2">
          <label for="resultLimit" style="margin-left: 5em">Limit</label>
          <input-number
            id="resultLimit"
            v-model="data.resultLimit"
            show-buttons
            button-layout="horizontal"
            decrement-button-class="p-button-danger"
            increment-button-class="p-button-success"
            increment-button-icon="pi pi-plus"
            decrement-button-icon="pi pi-minus"
            :min="50"
            :max="500"
            :step="50"
          />
        </span>
        <div class="me-2">
          <checkbox id="show-links" v-model="data.showLinks" class="align-middle" :binary="true" />
          <label class="ms-1" for="show-links">Show Links</label>
        </div>
        <template v-if="data.lastFetched < data.currentFetchId"> Loading... </template>
        <span v-else class="w-auto">
          {{ data.media.length }}{{ data.media.length === data.resultLimit ? "+" : "" }} Results</span
        >
      </template>
    </Toolbar>
    <data-table
      class="p-datatable-sm"
      :value="data.media"
      striped-rows
      sort-field="title"
      :sort-order="1"
      :loading="data.fetching"
      :row-class="() => 'clickable'"
      @row-click="selectItem"
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="title" header="Title" sortable>
        <template #body="slotProps">
          <a :href="slotProps.data.link" target="_blank" rel="noopener noreferrer">
            {{ slotProps.data.title }}
          </a>
        </template>
      </Column>
      <Column field="medium" header="Type" sortable>
        <template #body="slotProps"><type-icon :type="slotProps.data.medium" /></template>
      </Column>
      <Column v-if="data.showLinks" field="link" header="Link" sortable />
      <Column header="Domain">
        <template #body="slotProps">{{ getDomain(slotProps.data) }}</template>
      </Column>
    </data-table>
  </div>
  <add-unused-modal v-model:item="data.selectedItem" :similar-items="data.similarItems" />
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { MediaType, MediumInWait } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import MediaFilter from "../components/media-filter.vue";
import AddUnusedModal from "../components/modal/add-unused-modal.vue";
import { computed, reactive, watchEffect } from "vue";
import { DataTableRowEditCancelEvent } from "primevue/datatable";

interface Data {
  titleSearch: string;
  media: MediumInWait[];
  typeFilter: number | MediaType;
  fetching: boolean;
  lastFetched: number;
  currentFetchId: number;
  selectedItem?: MediumInWait;
  similarItems: MediumInWait[];
  resultLimit: number;
  showLinks: boolean;
}

const data = reactive<Data>({
  titleSearch: "",
  resultLimit: 100,
  media: [],
  typeFilter: 0,
  fetching: false,
  lastFetched: 0,
  currentFetchId: 0,
  selectedItem: undefined,
  similarItems: [],
  showLinks: false,
});

const filteredMedia = computed((): MediumInWait[] => {
  const lowerTitleSearch = data.titleSearch.toLowerCase();

  return data.media.filter((medium) => {
    return (
      (!lowerTitleSearch || medium.title.toLowerCase().includes(lowerTitleSearch)) &&
      (!data.typeFilter || medium.medium & data.typeFilter)
    );
  });
});

// WATCHES
watchEffect(() => {
  fetch();
});

watchEffect(() => {
  if (!data.selectedItem) {
    data.similarItems = [];
    return;
  }
  data.similarItems = filteredMedia.value.filter((value) => {
    return value.title === data.selectedItem?.title;
  });
});

function selectItem(event: DataTableRowEditCancelEvent): void {
  // do not select when clicking on a link
  if (event.originalEvent.target && (event.originalEvent.target as Element).hasAttribute("href")) {
    return;
  }
  data.selectedItem = event.data;
}
async function fetch() {
  data.fetching = true;
  const fetchId = ++data.currentFetchId;
  try {
    const result = await HttpClient.getAllMediaInWaits({
      title: data.titleSearch || undefined,
      medium: data.typeFilter || undefined,
      limit: data.resultLimit,
    });

    if (data.lastFetched > fetchId) {
      return;
    }

    data.lastFetched = fetchId;
    data.media = result;
  } catch (error) {
    console.error(error);
  }
  data.fetching = false;
}

function getDomain(item: MediumInWait): string {
  let link = item.link;
  const protocolIndex = link.indexOf("//");

  if (protocolIndex < 0) {
    return "Invalid Link";
  }
  link = link.slice(protocolIndex + 2);
  const pathSeparator = link.indexOf("/");

  if (pathSeparator >= 0) {
    link = link.slice(0, pathSeparator);
  }
  const lastPoint = link.lastIndexOf(".");

  if (lastPoint < 0) {
    return "Invalid Link";
  }
  link = link.slice(0, lastPoint);
  const firstPoint = link.indexOf(".");

  if (firstPoint >= 0) {
    link = link.slice(firstPoint + 1);
  }

  return link;
}
</script>
<style>
.clickable {
  cursor: pointer;
}
</style>
