<template>
    <div class="lists-page">
        <reading-list :lists="lists" class="flex-small"></reading-list>
        <app-table id="content" class="overflow flex-big" :columns="columns" :data="media"></app-table>
    </div>
</template>

<script>
    import readingList from "../components/reading-list";
    import appTable from "../components/app-table";

    export default {
        components: {
            readingList,
            appTable,
        },
        props: {
            lists: Array,
            columns: Array,
            media: Array
        },
        mounted() {
            console.log("hey");
        },
        name: "lists",
    };
</script>
<style scoped>
    .lists-page {
        display: flex;
        height: 100%;
        width: 100%;
    }
</style>
