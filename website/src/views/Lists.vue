<template>
  <div class="lists-page">
    <reading-list
      :lists="lists"
      class=""
    />
    <app-table
      id="content"
      class="container-fluid"
      :columns="columns"
      :data="media"
    />
  </div>
</template>

<script>
import readingList from "../components/reading-list";
import appTable from "../components/app-table";

export default {
    name: "Lists",
    components: {
        readingList,
        appTable,
    },
    props: {
        lists: Array,
        columns: Array,
        media: Array
    },
    mounted(): void {
        console.log("hey");
    },
};
</script>
<style scoped>
    .lists-page {
        display: flex;
        height: 100%;
        width: 100%;
    }
</style>
