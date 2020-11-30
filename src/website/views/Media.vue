<template>
  <div class="container-fluid p-0">
    <h1 id="media-title">
      Media
    </h1>
    <div>
      <form class="form-inline">
        <div class="mr-sm-2 ml-sm-2">
          <input
            v-model="titleSearch"
            class="form-control"
            placeholder="Search in Media Title..."
            type="text"
          >
        </div>
        <div
          class="btn-group"
          aria-label="Select which Releasestate of TL to show"
        >
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(0)"
          >
            Unknown
          </button>
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(1)"
          >
            Ongoing
          </button>
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(5)"
          >
            Complete
          </button>
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(2)"
          >
            Hiatus
          </button>
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(3)"
          >
            Discontinued
          </button>
          <button
            class="btn btn-secondary active"
            type="button"
            data-toggle="button"
            aria-pressed="true"
            @click.left="toggleReleaseStateTL(4)"
          >
            Dropped
          </button>
        </div>
      </form>
    </div>
    <table
      class="table table-striped table-hover"
      aria-describedby="media-title"
    >
      <thead class="thead-dark">
        <th scope="col">
          Title
        </th>
        <th scope="col">
          Type
        </th>
        <th scope="col">
          Progress
        </th>
        <th scope="col">
          State in COO
        </th>
        <th scope="col">
          State from TL
        </th>
        <th scope="col">
          Author
        </th>
      </thead>
      <tbody>
        <tr
          v-for="medium of filteredMedia"
          :key="medium.id"
        >
          <td>
            <router-link
              :to="{ name: 'medium', params: { id: medium.id } }"
            >
              {{ medium.title }}
            </router-link>
          </td>
          <td><type-icon :type="medium.medium" /></td>
          <td>
            {{ medium.readEpisodes || 0 }}/{{
              medium.totalEpisodes || 0
            }}
          </td>
          <td><release-state :state="medium.stateOrigin" /></td>
          <td><release-state :state="medium.stateTL" /></td>
          <td>{{ medium.author }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { SimpleMedium, ReleaseState, SecondaryMedium } from "../siteTypes";
import releaseState from "../components/release-state.vue"
import typeIcon from "../components/type-icon.vue"
import { defineComponent } from "vue"
import { mergeMediaToc } from "../init";

interface Medium extends SimpleMedium {
    readEpisodes: number;
    totalEpisodes: number;
}

interface Data {
    media: Medium[];
    titleSearch: string;
    showStatesTL: ReleaseState[];
}

export default defineComponent({
    name: "Media",
    components: {
        releaseState,
        typeIcon
    },

    data(): Data {
        return {
            media: [],
            titleSearch: "",
            showStatesTL: [
                ReleaseState.Unknown,
                ReleaseState.Ongoing,
                ReleaseState.Hiatus,
                ReleaseState.Discontinued,
                ReleaseState.Dropped,
                ReleaseState.Complete,
            ]
        };
    },

    computed: {
        /**
         * Filter simplistic by title at first.
         */
        filteredMedia(): Medium[] {
            const lowerTitleSearch = this.titleSearch.toLowerCase();
            return this.media
                .filter(medium => {
                    if (!medium.title.toLowerCase().includes(lowerTitleSearch)) {
                        return false;
                    }
                    if (medium.stateTL == null) {
                        return this.showStatesTL.includes(ReleaseState.Unknown);
                    } else {
                        return this.showStatesTL.includes(medium.stateTL);
                    }
                })
                // sort alphabetically from A-Za-z case sensitive
                .sort((first, second) => first.title > second.title);
        }
    },

    /**
     * Load all media once when mounted.
     */
    mounted() {
        console.log("Media: Mounted");
        HttpClient.getAllMedia().then(media => {
            for (const medium of media) {
                medium.readEpisodes = 0;
                medium.totalEpisode = 0;
            }
            this.media = media as Medium[];
        }).catch(console.error);
        HttpClient.getAllSecondaryMedia().then(result => {
            const idMap = new Map();
            for (const medium of result) {
                idMap.set(medium.id, medium);
            }
            for (const medium of this.media) {
                const secondary: SecondaryMedium | undefined = idMap.get(medium.id);

                if (!secondary) {
                    continue;
                }

                medium.totalEpisodes = secondary.totalEpisodes;
                medium.readEpisodes = secondary.readEpisodes;

                mergeMediaToc(medium, secondary.tocs);
            }
        }).catch(console.error);
    },

    methods: {
        toggleReleaseStateTL(state: ReleaseState) {
            const index = this.showStatesTL.indexOf(state);
            if (index < 0) {
                this.showStatesTL.push(state);
            } else {
                this.showStatesTL.splice(index, 1);
            }
        }
    }
});
</script>
