<template>
  <div>
    <Toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <input-text id="title" v-model="title" type="text" @keyup.enter="search" />
          <label for="title">Title</label>
        </span>
        <p-button class="btn btn-dark me-2" :loading="isSearching" label="Search" @click.left="search" />
        <media-filter :state="type" @update:state="type = $event" />
      </template>
    </Toolbar>
    <data-view :value="result" layout="grid" :paginator="true" :rows="35" data-key="link">
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
                v-model="medium.title"
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
              <type-icon :type="medium.medium" class="form-control-plaintext" />
            </div>
            <div class="row mx-3">
              <label>Add Medium to List</label>
              <select v-model="selectedList" class="form-select" title="Select list to add medium to:">
                <option disabled selected value="">Select list to add medium to</option>
                <option v-for="list in lists" :key="list.id" :value="list.id">
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

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { MediaType, SearchResult } from "../siteTypes";
import ToolTip from "bootstrap/js/dist/tooltip";
import Modal from "bootstrap/js/dist/modal";
import TypeIcon from "../components/type-icon.vue";
import mediaFilter from "../components/media-filter.vue";
import { useListStore } from "../store/lists";
import { mapState } from "pinia";

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

export default defineComponent({
  name: "Search",
  components: {
    mediaFilter,
    typeIcon: TypeIcon,
  },
  data(): Data {
    return {
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
    };
  },
  computed: {
    ...mapState(useListStore, ["lists"]),
  },
  mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
    this.addModal = new Modal("#add-modal");
  },
  methods: {
    search() {
      if (this.isSearching) {
        return;
      }
      this.isSearching = true;
      HttpClient.search(this.title, this.type)
        .then((result) => (this.result = result.flat()))
        .finally(() => (this.isSearching = false));
    },
    select(result: SearchResult) {
      this.medium.title = result.title;
      this.medium.url = result.link;
      this.medium.medium = result.medium;
    },
    add() {
      HttpClient.createMedium({
        title: this.medium.title,
        medium: this.medium.medium,
      })
        .then((result) => {
          return Promise.all([
            HttpClient.addToc(this.medium.url, result.id),
            HttpClient.addListItem({ listId: this.selectedList, mediumId: [result.id] }),
          ]);
        })
        .then(() => {
          const index = this.result.findIndex((value) => value.link === this.medium.url);

          if (index >= 0) {
            this.result.splice(index, 1);
          }

          this.medium.title = "";
          this.medium.url = "";
          this.medium.medium = 0;
          this.addModal?.hide();
        })
        .catch((reason) => {
          console.error(reason);
        });
    },
  },
});
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
