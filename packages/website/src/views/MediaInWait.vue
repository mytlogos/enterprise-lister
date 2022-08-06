<template>
  <div class="container-fluid p-0">
    <h1 id="media-title">MediaInWait</h1>
    <Toolbar>
      <template #start>
        <div class="me-sm-2">
          <input v-model="titleSearch" class="form-control" placeholder="Search in Title" type="text" />
        </div>
        <media-filter v-model:state="typeFilter" class="me-2 w-auto" />
        <template v-if="lastFetched < currentFetchId"> Loading... </template>
        <span v-else class="w-auto"> {{ media.length }} Results</span>
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
        <tr v-for="medium of media" :key="medium.link" role="button" @click="selectItem($event, medium)">
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
  <add-unused-modal v-model:item="selectedItem" :similar-items="similarItems" />
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { MediaType, MediumInWait } from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import MediaFilter from "../components/media-filter.vue";
import AddUnusedModal from "../components/modal/add-unused-modal.vue";
import { defineComponent } from "vue";

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

export default defineComponent({
  name: "MediaInWait",
  components: {
    typeIcon,
    MediaFilter,
    AddUnusedModal,
  },

  data(): Data {
    return {
      titleSearch: "",
      media: [],
      typeFilter: 0,
      fetching: false,
      lastFetched: 0,
      currentFetchId: 0,
      selectedItem: undefined,
      similarItems: [],
    };
  },

  computed: {
    /**
     * Filter simplistic by title at first.
     */
    filteredMedia(): MediumInWait[] {
      const lowerTitleSearch = this.titleSearch.toLowerCase();

      return this.media.filter((medium) => {
        return (
          (!lowerTitleSearch || medium.title.toLowerCase().includes(lowerTitleSearch)) &&
          (!this.typeFilter || medium.medium & this.typeFilter)
        );
      });
    },
  },

  watch: {
    titleSearch() {
      this.fetch();
    },
    typeFilter() {
      this.fetch();
    },
    selectedItem() {
      if (!this.selectedItem) {
        this.similarItems = [];
        return;
      }
      this.similarItems = this.filteredMedia.filter((value) => {
        return value.title === this.selectedItem?.title;
      });
    },
  },

  /**
   * Load all media once when mounted.
   */
  mounted() {
    console.log("Media: Mounted");
    this.fetch();
  },

  methods: {
    selectItem(event: Event, item: MediumInWait): void {
      // do not select when clicking on a link
      if (event.target && (event.target as Element).hasAttribute("href")) {
        return;
      }
      this.selectedItem = item;
    },
    async fetch() {
      const fetchId = ++this.currentFetchId;
      try {
        const result = await HttpClient.getAllMediaInWaits({
          title: this.titleSearch || undefined,
          medium: this.typeFilter || undefined,
          limit: 100,
        });

        if (this.lastFetched > fetchId) {
          return;
        }

        this.lastFetched = fetchId;
        this.media = result;
      } catch (error) {
        console.error(error);
      }
    },
    getDomain(item: MediumInWait): string {
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
    },
  },
});
</script>
