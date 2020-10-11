<template>
  <div>
    <h1>MediumDetail</h1>
    <h1>Releases</h1>
    <table class="table table-striped table-hover table-sm">
      <thead class="thead-dark">
        <th>#</th>
        <th>Date</th>
        <th>Chapter</th>
        <th>Actions</th>
      </thead>
      <tbody>
        <tr
          v-for="entry of computedReleases"
          :key="entry.episodeId"
        >
          <td class="">
            {{ entry.combiIndex }}
          </td>
          <td class="">
            {{ dateToString(entry.date) }}
          </td>
          <td>
            <template v-if="entry.locked">
              <i class="fas fa-lock" />
            </template>
            <a :href="entry.link">
              {{ entry.title }}
            </a>
          </td>
          <td>
            N/A
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent, reactive } from "vue";
import { MediumRelease } from "../siteTypes";

interface Data {
  releases: any[];
  details: null | any;
}

export default defineComponent({
    name: "MediumDetail",
    props: {
        id: {
            type: Number,
            required: true
        }
    },

    data(): Data {
        return {
            releases: [],
            details: null,
        };
    },

    computed: {
        computedReleases(): MediumRelease[] {
            return [...this.releases].sort((first, second) => second.combiIndex - first.combiIndex);
        }
    },

    mounted() {
        HttpClient.getMedia(this.id).then(medium => this.details = reactive(medium)).catch(console.error);
        HttpClient.getReleases(this.id).then(releases => this.releases = reactive(releases)).catch(console.error);
    },

    methods: {
        /**
         * Format a given Date to a german locale string.
         */
        dateToString(date: Date): string {
            return date.toLocaleString("de-DE");
        },
    }
});
</script>

<style scoped>

</style>
