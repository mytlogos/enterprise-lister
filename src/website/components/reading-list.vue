<template>
  <div ref="root">
    <div class="d-flex flex-column dropdown-container">
      <div
        class="select-container"
        :class="{ open: selectOpen }"
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
        :class="{ hidden: !showSearch }"
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
      @select="selectList"
    />
  </div>
</template>

<script lang="ts">
import listComp, { SelectItemEvent } from "./list-comp.vue";

interface Data {
    selectOpen: boolean;
    showSearch: boolean;
    filter: string;
    sorter: Array<{ name: string; value: number; sort: (a: any, b: any) => number }>;
    selectedSorter: number;
    listFocused: boolean;
}

import { defineComponent, PropType } from "vue";
import { List } from "../siteTypes";

export default defineComponent({
    name: "ReadingList",
    components: { listComp },
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
        displayedData(): List[] {
            const lists = [...this.lists];
            const sorter = this.selectedSorter;

            if (sorter) {
                const sortFunction = this.sorter.find((value) => value.value === sorter)?.sort;
                if (sortFunction) {
                    lists.sort((a, b) => sortFunction(a.name, b.name));
                } else {
                    console.error("Expected a Sortfunction, but did not find any for value: " + sorter);
                }
            }
            return lists;
        }
    },
    watch: {
        showSearch(newValue: boolean): void {
            if (newValue) {
                setTimeout(() => {
                    const input = (this.$refs.root as HTMLElement).querySelector(".dropdown input") as HTMLInputElement;
                    input.focus();
                }, 200);
            } else {
                this.filter = "";
            }
        },
    },
    mounted(): void {
        console.log("read", this);
        const element = (this.$refs.root as HTMLElement).querySelector(".select-container") as HTMLElement;
        document.addEventListener("click", (evt) => this.listFocused = (this.$refs.root as HTMLElement).contains(evt.target as Node | null), { capture: true });

        window.addEventListener("click", (evt) => {
            if (!element.contains(evt.target as Node | null)) {
                this.selectOpen = false;
            }
        });
    },
    methods: {
        selectList({ id, external, multiSelect }: SelectItemEvent): void {
            if (multiSelect) {
                const list = this.$store.getters.allLists.find((value: List) => value.id === id && value.external === external);

                if (external) {
                    this.$store.commit("updateExternalList", {...list, show: !list.show});
                } else {
                    this.$store.commit("updateList", {...list, show: !list.show});
                }
            } else {
                for (const list of this.$store.getters.allLists) {
                    const show = list.id === id && list.external === external && !list.show;

                    if (list.show === show) {
                        continue;
                    }

                    if (list.external) {
                        this.$store.commit("updateExternalList", {...list, show: show});
                    } else {
                        this.$store.commit("updateList", {...list, show: show});
                    }
                }
            }
        },
    }
});
</script>
