<template>
  <div class="container-fluid p-0 d-flex">
    <reading-list :lists="lists" />
    <app-table
      id="content"
      class="container-fluid"
    />
  </div>
</template>

<script lang="ts">
import readingList from "../components/reading-list.vue";
import appTable from "../components/app-table.vue";

import { defineComponent } from "vue";

export default defineComponent({
    name: "Lists",
    components: {
        readingList,
        appTable,
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
