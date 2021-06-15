<template>
  <div>
    <div class="m-3 d-flex">
      <input
        v-model="title"
        type="search"
        placeholder="Title"
        class="form-control me-2"
        style="max-width: 20em"
        @keyup.enter="search"
      />
      <button class="btn btn-dark me-2" @click.left="search">Search</button>
      <media-filter :state="type" @update:state="type = $event" />
    </div>
    <div class="d-flex flex-wrap">
      <div v-for="item of result" :key="item.link" class="card mb-3 tile me-3 bg-light">
        <div class="row no-gutters h-100">
          <div class="col-md-4">
            <img :src="item.coverUrl" class="card-img" alt="Cover Image" />
          </div>
          <div class="col-md-8">
            <div class="card-body h-100">
              <a
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
                style="overflow: hidden; max-height: 40%"
                class="d-block text-body card-title h5"
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                :title="item.title"
              >
                {{ item.title }}
              </a>
              <type-icon :type="item.medium" />
              <small class="text-muted">{{ item.author || "N/A" }}</small>
              <div class="d-flex" style="bottom: 1em; position: absolute">
                <button
                  class="btn btn-dark me-2"
                  data-bs-toggle="modal"
                  data-bs-target="#add-modal"
                  @click.left="select(item)"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
}

export default defineComponent({
  name: "Search",
  components: {
    mediaFilter: mediaFilter,
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
    };
  },
  computed: {
    lists() {
      return this.$store.state.lists.lists;
    },
  },
  mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
    this.addModal = new Modal("#add-modal");
  },
  methods: {
    search() {
      HttpClient.search(this.title, this.type).then((result) => (this.result = result.flat()));
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
            HttpClient.addListItem(this.selectedList, result.id),
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
</style>
