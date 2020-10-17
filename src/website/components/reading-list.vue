<template>
  <div>
    <div class="d-flex flex-column dropdown-container">
      <div
        class="select-container"
        :class="{open: selectOpen}"
        @click="selectOpen = !selectOpen"
      >
        <select
          id="sorter"
          v-model="selectedSorter"
          title="Sorting after"
        >
          <option
            v-for="sort in sorter"
            :key="sort"
            :value="sort.value"
          >
            {{ sort.name }}
          </option>
        </select>
      </div>
      <button
        class="btn search btn-dark btn-sm"
        type="submit"
        @click="showSearch = !showSearch"
      >
        <img
          alt="Search"
          src="../assets/search_icon.png"
        >
      </button>
      <div
        class="dropdown dropdown-btn"
        :class="{hidden: !showSearch}"
      >
        <input
          v-model="filter"
          placeholder="Type your Search..."
          type="text"
        >
      </div>
    </div>
    <list-comp
      :data="displayedData"
      :filter="filter"
      :focused="listFocused"
      :multi="true"
    />
  </div>
</template>

<script lang="ts">
import listComp from "./list-comp.vue";

interface Data {
  selectOpen: boolean;
  showSearch: boolean;
  filter: string;
  sorter: Array<{ name: string; value: number; sort: (a, b) => number }>;
  selectedSorter: number;
  listFocused: boolean;
}

import { defineComponent, PropType } from "vue";
import { List } from "../siteTypes";

export default defineComponent({
    name: "ReadingList",
    components: {listComp},
    props: {
        lists: { type: Array as PropType<List[]>, required: true },
    },
    data(): Data {
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
    computed: {
        displayedData() {
            const lists = [...this.lists];
            const sorter = this.selectedSorter;

            if (sorter) {
                const sortFunction = this.sorter.find((value) => value.value === sorter).sort;
                lists.sort((a, b) => sortFunction(a.name, b.name));
            }
            return lists;
        }
    },
    watch: {
        showSearch(newValue: boolean): void {
            if (newValue) {
                setTimeout(() => this.$el.querySelector(".dropdown input").focus(), 200);
            } else {
                this.filter = "";
            }
        },
    },
    mounted(): void {
        console.log("read", this);
        const element = this.$el.querySelector(".select-container");
        document.addEventListener("click", (evt) => this.listFocused = this.$el.contains(evt.target), {capture: true});

        window.addEventListener("click", (evt) => {
            if (!element.contains(evt.target)) {
                this.selectOpen = false;
            }
        });
    }
});
</script>