<template>
  <span ref="root" class="invisible" />
</template>

<script lang="ts">
// TODO implement this table component
import { onBusEvent } from "../bus";
import { defineComponent, PropType } from "vue";

interface Data {
  filter: string;
  currentLength: number;
  emptySpaceDirty: boolean;
  emptySpaceSpare: number;
}

export default defineComponent({
  name: "NewsPage",
  props: {
    data: { type: Array as PropType<any[]>, required: true },
  },
  data(): Data {
    return {
      filter: "",
      currentLength: 0,
      emptySpaceDirty: false,
      emptySpaceSpare: 0,
    };
  },
  computed: {
    displayLists(): any[] {
      const displayLists = this.data;

      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.currentLength = displayLists.length;
      // iterate for the number of emptySpaces and push an empty object as an empty row
      for (let i = 0; i < this.emptySpace(); i++) {
        displayLists.push({});
      }

      return displayLists;
    },
  },
  watch: {
    news(): void {
      this.emptySpaceDirty = true;
    },

    currentLength(): void {
      this.emptySpaceDirty = true;
    },
  },
  mounted(): void {
    onBusEvent("window:resize", () => (this.emptySpaceDirty = true));
  },
  methods: {
    emptySpace(): number {
      // $el is needed  to calculate the free space,
      // but computed property is called before being mounted
      if (!this.emptySpaceDirty) {
        return this.emptySpaceSpare;
      }
      const table = (this.$refs.root as HTMLElement).querySelector("table") as HTMLTableElement;
      const parent = table.parentElement as HTMLElement;
      const parentHeight = parseInt(window.getComputedStyle(parent).height, 10);
      let siblingsHeight = 0;

      // calculate the height of the siblings of the table
      for (let child = parent.firstElementChild; child != null; child = child.nextElementSibling) {
        const height = parseInt(window.getComputedStyle(child).height, 10);

        // if it is not table, add it to siblingsHeight,
        // else set it as tableHeight
        if (child !== table) {
          siblingsHeight += height;
        }
      }
      const theadHeight = parseInt(window.getComputedStyle(table.tHead as HTMLElement).height, 10);
      // calculate the empty space for table
      let remaining = parentHeight - theadHeight;
      remaining -= siblingsHeight;
      remaining -= this.currentLength * 40;

      if (remaining < 40) {
        remaining = 0;
      } else {
        remaining /= 40;
        remaining = Math.floor(remaining);
      }

      this.emptySpaceDirty = false;
      // remove the decimal places, so that at most one less row is build
      // (better than one too many, which would lead to a scrollbar)
      this.emptySpaceSpare = remaining;
      return this.emptySpaceSpare;
    },
  },
});
</script>
