<template>
  <div class="container-fluid p-0">
    <h1>Releases</h1>
    <table class="table table-striped table-hover table-sm">
      <thead class="thead-dark">
        <th>#</th>
        <th>Date</th>
        <th>Chapter</th>
        <th>Medium</th>
        <th>Actions</th>
      </thead>
      <tbody>
        <tr
          v-for="(entry, index) in releases"
          :key="entry.episodeId"
        >
          <td class="">
            {{ index + 1 }}
          </td>
          <td class="">
            {{ entry.date.toLocaleString() }}
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
            {{ media[entry.mediumId] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script lang="ts">
import { DisplayRelease } from "src/siteTypes";
import { defineComponent } from "vue";
import { HttpClient as Client } from "../Httpclient";
import { timeDifference } from "../init";

interface Data {
    releases: DisplayRelease[];
    media: { [key: number]: string };
    currentDate: Date;
}

export default defineComponent({
    name: "Releases",

    data(): Data {
        return { releases: [], media: {}, currentDate: new Date() };
    },
    mounted() {
        this.fetchReleases();
    },
    methods: {
        timeDifference(date: Date): string {
            return timeDifference(this.currentDate, date);
        },

        fetchReleases() {
            Client.getDisplayReleases(new Date()).then((response) => {
                for (const key in response.media) {
                    this.media[key] = response.media[key];
                }
                response.releases.forEach((value) => {
                    if (!(value.date instanceof Date)) {
                        value.date = new Date(value.date);
                    }
                })
                this.currentDate = new Date();
                this.releases.push(...response.releases);
            }).catch(console.error);
        }
    }
})
</script>