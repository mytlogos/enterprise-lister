<template>
  <div class="container-fluid p-0">
    <h1 id="media-title">MediaInWait</h1>
    <Toolbar>
      <template #start>
        <div class="me-sm-2">
          <input v-model="data.titleSearch" class="form-control" placeholder="Search in Title" type="text" />
        </div>
        <media-filter v-model:state="data.typeFilter" class="me-2 w-auto" />
        <template v-if="data.lastFetched < data.currentFetchId"> Loading... </template>
        <span v-else class="w-auto"> {{ data.media.length }} Results</span>
      </template>
    </Toolbar>
    <table class="table table-striped table-hover" aria-describedby="media-title">
      <thead class="table-dark">
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Type</th>
          <th scope="col">Domain</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="medium of data.media" :key="medium.link" role="button" @click="selectItem($event, medium)">
          <td>
            <a :href="medium.link" target="_blank" rel="noopener noreferrer">
              {{ medium.title }}
            </a>
          </td>
          <td><type-icon :type="medium.medium" /></td>
          <td>{{ getDomain(medium) }}</td>
        </tr>
      </tbody>
    </table>
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

interface Data {
  titleSearch: string;
  media: MediumInWait[];
  typeFilter: number | MediaType;
  fetching: boolean;
  lastFetched: number;
  currentFetchId: number;
  selectedItem?: MediumInWait;
  similarItems: MediumInWait[];
}

const data = reactive<Data>({
  titleSearch: "",
  media: [],
  typeFilter: 0,
  fetching: false,
  lastFetched: 0,
  currentFetchId: 0,
  selectedItem: undefined,
  similarItems: [],
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

function selectItem(event: Event, item: MediumInWait): void {
  // do not select when clicking on a link
  if (event.target && (event.target as Element).hasAttribute("href")) {
    return;
  }
  data.selectedItem = item;
}
async function fetch() {
  const fetchId = ++data.currentFetchId;
  try {
    const result = await HttpClient.getAllMediaInWaits({
      title: data.titleSearch || undefined,
      medium: data.typeFilter || undefined,
      limit: 100,
    });

    if (data.lastFetched > fetchId) {
      return;
    }

    data.lastFetched = fetchId;
    data.media = result;
  } catch (error) {
    console.error(error);
  }
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
