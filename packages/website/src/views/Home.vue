<template>
  <div class="container">
    <div class="row">
      <div class="col-2">Nr. of Media</div>
      <div class="col">{{ mediaCount.total }}</div>
    </div>
    <div class="row">
      <div class="col-2">Nr. of Authors</div>
      <div class="col">{{ mediaCount.authors }}</div>
    </div>
    <h5>Counts by MediaType</h5>
    <div v-for="count in mediaCount.counts" :key="count.name" class="row">
      <div class="col-2">{{ count.name }}</div>
      <div class="col">{{ count.value }}</div>
    </div>
    <h5>Counts by TranslatorState</h5>
    <div v-for="count in mediaCount.states" :key="count.name" class="row">
      <div class="col-2">{{ count.name }}</div>
      <div class="col">{{ count.value }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MediaType, ReleaseState } from "../siteTypes";

export default defineComponent({
  name: "Home",
  computed: {
    mediaCount() {
      const mediaCounts = {
        [MediaType.TEXT]: { name: "Text", value: 0 },
        [MediaType.IMAGE]: { name: "Image", value: 0 },
        [MediaType.VIDEO]: { name: "Video", value: 0 },
        [MediaType.AUDIO]: { name: "Audio", value: 0 },
      };
      const stateTlCounts = {
        [ReleaseState.Complete]: { name: "Complete", value: 0 },
        [ReleaseState.Discontinued]: { name: "Discontinued", value: 0 },
        [ReleaseState.Dropped]: { name: "Dropped", value: 0 },
        [ReleaseState.Hiatus]: { name: "Hiatus", value: 0 },
        [ReleaseState.Ongoing]: { name: "Ongoing", value: 0 },
        [ReleaseState.Unknown]: { name: "Unknown", value: 0 },
      };
      const authors = new Set();
      let total = 0;

      for (const medium of Object.values(this.$store.state.media.media)) {
        mediaCounts[medium.medium as MediaType].value++;
        total++;
        authors.add(medium.author);

        if (medium.stateTL) {
          stateTlCounts[medium.stateTL].value++;
        }
      }

      return {
        total,
        counts: Object.values(mediaCounts),
        authors: authors.size,
        states: Object.values(stateTlCounts),
      };
    },
  },
});
</script>
