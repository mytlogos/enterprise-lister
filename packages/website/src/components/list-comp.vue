<template>
  <template v-if="displayedData.length">
    <ul class="list-group list">
      <li
        v-for="(item, i) in displayedData"
        :key="item.id"
        :class="{
          marked: markClassId === item.id && (item.external == null || markClassExternal === item.external),
        }"
        class="list-group-item list-group-item-action btn"
        @click="select(item.id, item.external, i, $event)"
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
import { StoreInternalList as List } from "../siteTypes";
import { defineComponent, PropType } from "vue";

interface Data {
  marked: { external: boolean; id: null | number; index: null | number };
  markClassId: number | null;
  markClassExternal: boolean;
  keyListener: (evt: KeyboardEvent) => void;
}

export interface SelectItemEvent {
  id: number;
  external: boolean;
  multiSelect: boolean;
}

export default defineComponent({
  name: "ListUl",
  props: {
    data: { type: Array as PropType<List[]>, required: true },
    filter: { type: String, required: true },
    focused: { type: Boolean, required: true },
    multi: { type: Boolean, required: true },
  },
  emits: ["select"],
  data(): Data {
    return {
      marked: {
        external: false,
        id: null,
        index: null,
      },
      markClassId: null,
      markClassExternal: false,
      keyListener: (evt) => {
        if (!this.focused) {
          return;
        }
        // FIXME: vue recognize data properties as Function type only here
        const marked = this.marked as unknown as Data["marked"];

        if (evt.key === "ArrowDown") {
          this.moveList(false);
        } else if (evt.key === "ArrowUp") {
          this.moveList(true);
        } else if (evt.key === "Enter") {
          if (marked.id && marked.index) {
            this.select(marked.id, marked.external, marked.index, evt);
          }
        }
      },
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
            return { value, match: regFilter.exec(value.name) };
          })
          .filter((value) => value.match)
          .map((value) => value.value);
      }

      return lists;
    },
  },
  mounted(): void {
    document.addEventListener("keydown", this.keyListener);
  },
  unmounted() {
    document.removeEventListener("keydown", this.keyListener);
  },
  methods: {
    select(id: number, external: boolean, index: number, evt: KeyboardEvent | MouseEvent): void {
      const event: SelectItemEvent = {
        id,
        external,
        multiSelect: this.multi && evt.ctrlKey,
      };
      this.$emit("select", event);

      this.markClassId = this.markClassId === id ? null : id;
      // TODO: check if this is correct
      this.markClassExternal = external;
      this.marked.id = id;
      this.marked.index = index;
      this.marked.external = external;
    },

    moveList(up: boolean): void {
      if (this.marked.id == null || this.marked.index == null) {
        if (!this.displayedData.length) {
          return;
        }
        // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
        const currentDisplayedDatum = this.displayedData[0];
        this.marked.id = currentDisplayedDatum.id;
        this.marked.index = 0;
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
        if (this.marked.index + 1 === this.displayedData.length) {
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
  },
});
</script>
