<template>
    <div class="overflow left-content" id="reading-list-container">
        <div class="flex dropdown-container">
            <div @click="selectOpen = !selectOpen" class="select-container" v-bind:class="{open: selectOpen}">
                <select id="sorter" title="Sorting after" v-model="selectedSorter">
                    <option v-bind:value="sort.value" v-for="sort in sorter">{{sort.name}}</option>
                </select>
            </div>
            <button @click="showSearch = !showSearch" class="btn search" type="submit">
                <img alt="Search" src="../assets/search_icon.png">
            </button>
            <div class="dropdown dropdown-btn" v-bind:class="{hidden: !showSearch}">
                <input placeholder="Type your Search..." type="text" v-model="filter">
            </div>
        </div>
        <list-comp :data="displayedData" :filter="filter" :focused="listFocused" :multi="true"></list-comp>
    </div>
</template>

<script>
    import listComp from "./list-comp";

    export default {
        components: {listComp},
        data() {
            return {
                selectOpen: false,
                showSearch: false,
                filter: "",
                sorter: [
                    {
                        name: "Alphabetical A-z",
                        sort: (a, b) => a === b ? 0 : a > b ? 1 : -1,
                        value: 1
                    },
                    {
                        name: "Alphabetical Z-a",
                        sort: (a, b) => a === b ? 0 : a > b ? -1 : 1,
                        value: 2
                    },
                ],
                selectedSorter: 1,
                listFocused: false,
            };
        },
        props: {
            lists: Array,
        },
        computed: {
            displayedData() {
                const lists = [...this.lists];
                const sorter = this.selectedSorter;

                if (sorter) {
                    const sortFunction = this.sorter.find((value) => value.values === sorter).sort;
                    lists.sort((a, b) => sortFunction(a.name, b.name));
                }
                return lists;
            }
        },
        mounted() {
            console.log("read", this);
            const element = this.$el.querySelector(".select-container");
            document.addEventListener("click", (evt) => this.listFocused = this.$el.contains(evt.target), {capture: true});

            window.addEventListener("click", (evt) => {
                if (!element.contains(evt.target)) {
                    this.selectOpen = false;
                }
            });
        },
        watch: {
            showSearch(newValue) {
                if (newValue) {
                    setTimeout(() => this.$el.querySelector(".dropdown input").focus(), 200);
                } else {
                    this.filter = "";
                }
            },
        },
        name: "reading-list"
    };
</script>

<style scoped>

</style>
