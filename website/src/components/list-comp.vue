<template>
  <template v-if="displayedData.length">
    <ul class="list">
      <li
        v-for="(item, i) in displayedData"
        :key="item"
        :class="{
          active: item.show,
          marked: markClassId === item.id && (item.external == null || markClassExternal === item.external)
        }"
        @click="select(item.id,item.external,i, $event)"
      >
        {{ item.name }}
      </li>
    </ul>
  </template>
  <template v-else>
    <h2>No Items available</h2>
  </template>
</template>

<script lang="ts">
// FIXME do it better with marked list
// FIXME still is focused after being not shown
import {emitBusEvent} from "../bus";
import { List } from "../siteTypes"

interface Data {
    marked: { external: boolean; id: null | number; index: null | number };
    markClassId: number | null;
    markClassExternal: boolean;
}

import { defineComponent, PropType } from "vue";

export default defineComponent({
    name: "ListUl",
    props: {
        data: { type: Array as PropType<List[]>, required: true },
        filter: { type: String, required: true },
        focused: { type: Boolean, required: true },
        multi: { type: Boolean, required: true },
    },
    data(): Data {
        return {
            marked: {
                external: false,
                id: null,
                index: null,
            },
            markClassId: null,
            markClassExternal: false
        };
    },
    computed: {
        displayedData(): List[] {
            const filter = this.filter;
            let lists = [...this.data];

            if (filter) {
                const regFilter = new RegExp(filter, "i");
                // match with filter insensitive
                lists = lists
                    .map((value) => {
                        return {value, match: regFilter.exec(value.name)};
                    })
                    .filter((value) => value.match)
                    .map((value) => value.value);
            }

            return lists;
        }
    },
    mounted(): void {
        document.addEventListener("keydown", (evt) => {
            if (!this.focused) {
                return;
            }
            if (evt.key === "ArrowDown") {
                this.moveList(false);

            } else if (evt.key === "ArrowUp") {
                this.moveList(true);

            } else if (evt.key === "Enter") {
                this.select(this.marked.id, this.marked.external, this.marked.index, evt);
            }
        });
    },
    methods: {
        select(id: number, external: boolean, index: number, evt): void {
            emitBusEvent("select:list", id, external, this.multi && evt.ctrlKey);
            this.markClassId = this.markClassId === id ? null : id;
            this.markClassExternal = this.markClassExternal === id ? null : id;
            this.marked.id = id;
            this.marked.totalIndex = index;
            this.marked.external = external;
        },

        moveList(up: boolean): void {
            if (this.marked.id == null) {
                if (!this.displayedData.length) {
                    return;
                }
                // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
                const currentDisplayedDatum = this.displayedData[0];
                this.marked.id = currentDisplayedDatum.id;
                this.marked.totalIndex = 0;
                this.marked.external = currentDisplayedDatum.external;
                this.markClassId = this.marked.id;
                this.markClassExternal = this.marked.external;
                return;
            }
            if (up) {
                // zero is the earliest
                if (this.marked.index === 0) {
                    this.markClassId = this.marked.id;
                    this.markClassExternal = this.marked.external;
                    return;
                }
                this.marked.index--;
            } else {
                if ((this.marked.index + 1) === this.displayedData.length) {
                    this.markClassId = this.marked.id;
                    this.markClassExternal = this.marked.external;
                    return;
                }
                this.marked.index++;
            }
            const displayedDatum = this.displayedData[this.marked.index];
            this.marked.id = displayedDatum.id;
            this.marked.external = displayedDatum.external;
        },
    }
});
</script>
