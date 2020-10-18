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
      </form>
    </div>
    <table
      class="table"
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
          Author
        </th>
      </thead>
      <tbody>
        <tr 
          v-for="medium of filteredMedia"
          :key="medium.id"
        >
          <td>
            <router-link :to="{ name: 'medium', params: { id: medium.id } }">
              {{ medium.title }}
            </router-link>
          </td>
          <td>{{ mediaTypeToString(medium.medium) }}</td>
          <td>{{ medium.author }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { SimpleMedium, MediaType } from "../siteTypes";
import { defineComponent, reactive } from "vue"

interface Data {
    media: SimpleMedium[];
    titleSearch: string;
}

export default defineComponent({
    name: "Media",

    data(): Data {
        return {
            media: [],
            titleSearch: ""
        };
    },

    computed: {
        /**
         * Filter simplistic by title at first.
         */
        filteredMedia(): SimpleMedium[] {
            const lowerTitleSearch = this.titleSearch.toLowerCase();
            return this.media.filter(medium => medium.title.toLowerCase().includes(lowerTitleSearch));
        }
    },

    /**
     * Load all media once when mounted.
     */
    mounted() {
        console.log("Media: Mounted");
        HttpClient.getAllMedia().then(media => this.media = reactive(media)).catch(console.error);
    },

    methods: {
        mediaTypeToString(mediumType: number): string {
            switch (mediumType) {
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
        },
    }
});
</script>
