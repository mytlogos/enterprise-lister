<template>
  <div>
    <Toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <input-text id="title" v-model="data.title" type="text" @keyup.enter="search" />
          <label for="title">Title</label>
        </span>
        <p-button class="btn btn-dark me-2" :loading="data.isSearching" label="Search" @click.left="search" />
        <media-filter :state="data.type" @update:state="data.type = $event" />
      </template>
    </Toolbar>
    <data-view :value="data.result" layout="grid" :paginator="true" :rows="35" data-key="link">
      <template #empty>
        <div class="text-center my-5">No records found.</div>
      </template>
      <template #grid="slotProps">
        <Card>
          <template #title>
            <a
              v-tooltip.top="slotProps.data.title"
              :href="slotProps.data.link"
              target="_blank"
              rel="noopener noreferrer"
              style="overflow: hidden; max-height: 40%"
              class="d-block text-body card-title h5"
            >
              {{ slotProps.data.title }}
            </a>
          </template>
          <template #subtitle>
            <type-icon :type="slotProps.data.medium" />
            <small class="text-muted">{{ slotProps.data.author || "N/A" }}</small>
          </template>
          <template #content>
            <img :src="slotProps.data.coverUrl" class="card-img" alt="Cover Image" />
          </template>
          <template #footer>
            <p-button
              class="pi pi-plus"
              label="Add"
              data-bs-toggle="modal"
              data-bs-target="#add-modal"
              @click.left="select(slotProps.data)"
            />
          </template>
        </Card>
      </template>
    </data-view>
    <!-- Modal -->
    <div id="add-modal" class="modal fade" tabindex="-1" aria-labelledby="add-modal-label" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="add-modal-label" class="modal-title">Add Medium</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="row" style="padding: 0 15px">
              <label> Title </label>
              <input
                v-model="data.medium.title"
                class="form-control w-100"
                name="title"
                required
                title="Title"
                type="text"
                placeholder="Title of the Medium"
              />
            </div>
            <div class="row" style="padding: 0 15px">
              <label>Medium</label>
              <type-icon :type="data.medium.medium" class="form-control-plaintext" />
            </div>
            <div class="row mx-3">
              <label>Add Medium to List</label>
              <select v-model="data.selectedList" class="form-select" title="Select list to add medium to:">
                <option disabled selected value="">Select list to add medium to</option>
                <option v-for="list in listStore.lists" :key="list.id" :value="list.id">
                  {{ list.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" @click.left="add">Add</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { onMounted, reactive } from "vue";
import { MediaType, SearchResult } from "../siteTypes";
import ToolTip from "bootstrap/js/dist/tooltip";
import Modal from "bootstrap/js/dist/modal";
import TypeIcon from "../components/type-icon.vue";
import mediaFilter from "../components/media-filter.vue";
import { useListStore } from "../store/lists";

interface Data {
  title: string;
  type: MediaType;
  result: SearchResult[];
  medium: {
    title: string;
    url: string;
    medium: MediaType;
  };
  selectedList: number;
  tooltips: ToolTip[];
  addModal: null | Modal;
  isSearching: boolean;
}

const listStore = useListStore();
const data = reactive<Data>({
  title: "",
  type: MediaType.TEXT,
  result: [],
  medium: {
    title: "",
    url: "",
    medium: 0,
  },
  selectedList: 0,
  tooltips: [],
  addModal: null,
  isSearching: false,
});

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/quotes
  data.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
  data.addModal = new Modal("#add-modal");
});

function search() {
  if (data.isSearching) {
    return;
  }
  data.isSearching = true;
  HttpClient.search(data.title, data.type)
    .then((result) => (data.result = result.flat()))
    .finally(() => (data.isSearching = false));
}

function select(result: SearchResult) {
  data.medium.title = result.title;
  data.medium.url = result.link;
  data.medium.medium = result.medium;
}
function add() {
  HttpClient.createMedium({
    title: data.medium.title,
    medium: data.medium.medium,
  })
    .then((result) => {
      return Promise.all([
        HttpClient.addToc(data.medium.url, result.id),
        HttpClient.addListItem({ listId: data.selectedList, mediumId: [result.id] }),
      ]);
    })
    .then(() => {
      const index = data.result.findIndex((value) => value.link === data.medium.url);

      if (index >= 0) {
        data.result.splice(index, 1);
      }

      data.medium.title = "";
      data.medium.url = "";
      data.medium.medium = 0;
      data.addModal?.hide();
    })
    .catch((reason) => {
      console.error(reason);
    });
}
</script>

<style scoped>
.tile {
  width: 20vw;
  max-width: 100vw;
}
.p-toolbar :deep(.p-button) {
  height: 2.6em !important;
}
</style>
