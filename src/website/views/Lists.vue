<template>
  <div class="container-fluid p-0 d-flex">
    <reading-list :lists="lists" />
    <app-table
      id="content"
      class="container-fluid"
      :columns="columns"
      :data="media"
    />
  </div>
</template>

<script lang="ts">
import readingList from "../components/reading-list.vue";
import appTable from "../components/app-table.vue";

import { defineComponent, PropType } from "vue";
import { Column, List, Medium } from "../siteTypes";

export default defineComponent({
    name: "Lists",
    components: {
        readingList,
        appTable,
    },
    props: {
        lists: { type: Array as PropType<List[]>, required: true },
        columns: { type: Array as PropType<Column[]>, required: true },
        media: { type: Array as PropType<Medium[]>, required: true }
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
