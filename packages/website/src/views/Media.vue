<template>
  <div class="container-fluid p-0">
    <h1 id="media-title">Media</h1>
    <Toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <input-text id="title" v-model="titleSearch" type="text" />
          <label for="title">Title</label>
        </span>
        <SelectButton
          v-model="showStatesTL"
          class="me-2"
          :options="showStatesTLOptions"
          option-value="value"
          option-label="name"
          multiple
        />
        <div>
          <checkbox id="hide-completed" v-model="hideCompleted" class="align-middle" :binary="true" />
          <label for="hide-completed ms-1">Hide Completed Media</label>
        </div>
      </template>
    </Toolbar>
    <data-table
      class="p-datatable-sm"
      :value="filteredMedia"
      striped-rows
      :paginator="true"
      :rows="10"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rows-per-page-options="[10, 20, 50]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column field="title" header="Title">
        <template #body="slotProps">
          <router-link :to="{ name: 'medium', params: { id: slotProps.data.id } }">
            {{ slotProps.data.title }}
          </router-link>
        </template>
      </Column>
      <Column field="type" header="Type">
        <template #body="slotProps">
          <type-icon :type="slotProps.data.medium" />
        </template>
      </Column>
      <Column field="progress" header="Progress">
        <template #body="slotProps">
          {{ slotProps.data.readEpisodes || 0 }}/{{ slotProps.data.totalEpisodes || 0 }}
        </template>
      </Column>
      <Column field="stateCOO" header="State in COO">
        <template #body="slotProps">
          <release-state :state="slotProps.data.stateOrigin" />
        </template>
      </Column>
      <Column field="stateTL" header="State from TL">
        <template #body="slotProps">
          <release-state :state="slotProps.data.stateTL" />
        </template>
      </Column>
      <Column field="author" header="Author" />
    </data-table>
  </div>
</template>

<script lang="ts">
import { SimpleMedium, ReleaseState, SecondaryMedium } from "../siteTypes";
import releaseState from "../components/release-state.vue";
import typeIcon from "../components/type-icon.vue";
import { defineComponent } from "vue";
import { mergeMediaToc } from "../init";

interface Medium extends SimpleMedium {
  readEpisodes: number;
  totalEpisodes: number;
}

interface Data {
  titleSearch: string;
  showStatesTL: ReleaseState[];
  showStatesTLOptions: Array<{ name: string; value: ReleaseState }>;
  media: SimpleMedium[];
  hideCompleted: boolean;
}

export default defineComponent({
  name: "Media",
  components: {
    releaseState,
    typeIcon,
  },

  data(): Data {
    return {
      titleSearch: "",
      showStatesTLOptions: [
        {
          name: "Unknown",
          value: ReleaseState.Unknown,
        },
        {
          name: "Ongoing",
          value: ReleaseState.Ongoing,
        },
        {
          name: "Hiatus",
          value: ReleaseState.Hiatus,
        },
        {
          name: "Discontinued",
          value: ReleaseState.Discontinued,
        },
        {
          name: "Dropped",
          value: ReleaseState.Dropped,
        },
        {
          name: "Complete",
          value: ReleaseState.Complete,
        },
      ],
      showStatesTL: [
        ReleaseState.Unknown,
        ReleaseState.Ongoing,
        ReleaseState.Hiatus,
        ReleaseState.Discontinued,
        ReleaseState.Dropped,
        ReleaseState.Complete,
      ],
      // create a one time copy of the elements of media
      media: this.$store.getters.media.map((value: SimpleMedium) => ({
        ...value,
      })),
      hideCompleted: false,
    };
  },

  computed: {
    sortedMedia(): Medium[] {
      // sort alphabetically from A-Za-z case sensitive
      return ([...this.media] as Medium[]).sort((first, second) => first.title.localeCompare(second.title));
    },
    /**
     * Filter simplistic by title at first.
     */
    filteredMedia(): Medium[] {
      const lowerTitleSearch = this.titleSearch.toLowerCase();
      return this.sortedMedia.filter((medium) => {
        if (lowerTitleSearch && !medium.title.toLowerCase().includes(lowerTitleSearch)) {
          return false;
        }
        if (medium.stateTL == null) {
          return this.showStatesTL.includes(ReleaseState.Unknown);
        }
        if (!this.showStatesTL.includes(medium.stateTL)) {
          return false;
        }
        return this.hideCompleted
          ? medium.stateTL === ReleaseState.Complete && medium.readEpisodes !== medium.totalEpisodes
          : true;
      });
    },
  },

  watch: {
    "$store.state.media.secondaryMedia"() {
      this.mergeMedia();
    },
  },

  /**
   * Load all media once when mounted.
   */
  mounted() {
    console.log("Media: Mounted");
    this.mergeMedia();
  },

  methods: {
    toggleReleaseStateTL(state: ReleaseState) {
      const index = this.showStatesTL.indexOf(state);
      if (index < 0) {
        this.showStatesTL.push(state);
      } else {
        this.showStatesTL.splice(index, 1);
      }
    },
    mergeMedia() {
      for (const medium of this.media) {
        const secondary: SecondaryMedium | undefined = this.$store.state.media.secondaryMedia[medium.id as number];

        if (!secondary) {
          continue;
        }

        medium.totalEpisodes = secondary.totalEpisodes;
        medium.readEpisodes = secondary.readEpisodes;

        mergeMediaToc(medium, secondary.tocs);
      }
    },
  },
});
</script>
