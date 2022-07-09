<template>
  <div ref="root" class="container-fluid p-0 d-flex">
    <reading-list :lists="lists" />
    <app-table id="content" class="container-fluid" :items="items" :columns="columns" filter-key="" />
  </div>
</template>

<script lang="ts">
import readingList from "../components/reading-list.vue";
import appTable from "../components/app-table.vue";
import { HttpClient } from "../Httpclient";
import { List, Medium, SimpleMedium } from "../siteTypes";
import { defineComponent } from "vue";

interface Data {
  loadingMedia: number[][];
}

export default defineComponent({
  name: "Lists",
  components: {
    readingList,
    appTable,
  },
  data(): Data {
    return {
      loadingMedia: [],
    };
  },
  computed: {
    lists(): List[] {
      return this.$store.getters.allLists;
    },
    items(): Medium[] {
      const multiKeys: number[] = this.lists.filter((value) => value.show).flatMap((value) => value.items);
      let missingMedia: number[] = [];
      const uniqueMedia: Medium[] = [...new Set(multiKeys)]
        .map((id) => {
          const medium = this.$store.getters.getMedium(id);

          if (!medium) {
            missingMedia.push(id);
          }
          return medium;
        })
        .filter((value) => value != null);
      // filter any missing media which are already being queried
      missingMedia = missingMedia.filter(
        (value) => !this.loadingMedia.some((batch: number[]) => batch.includes(value)),
      );

      if (missingMedia.length) {
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        this.loadingMedia.push(missingMedia);
      }
      return uniqueMedia;
    },
    columns() {
      return this.$store.state.user.columns;
    },
  },
  watch: {
    loadingMedia(newValue: number[][], oldValue: number[][]) {
      console.log("New:", newValue, "Old", oldValue);
      const missingBatches = newValue.filter((batch) => !oldValue.includes(batch));

      for (const missingBatch of missingBatches) {
        // load missing media
        HttpClient.getMedia(missingBatch)
          .then((media: SimpleMedium | SimpleMedium[]) => this.$store.commit("addMedium", media))
          .catch((error) => {
            this.$store.commit("errorModalError", String(error));
            console.log(error);
          })
          .finally(() => {
            // remove batch so it will be regarded as loaded, regardless whether it failed or not
            const index = this.loadingMedia.indexOf(missingBatch);

            if (index > 0) {
              this.loadingMedia.splice(index, 1);
            }
          });
      }
    },
  },
  mounted(): void {
    console.log("Lists: hey");
  },
});
</script>
<style scoped>
.lists-page {
  display: flex;
  height: 100%;
  width: 100%;
}
</style>
