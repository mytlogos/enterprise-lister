<template>
  <nav aria-label="Page navigation example">
    <ul class="pagination">
      <li
        class="page-item"
        :class="{ disabled: firstActive }"
        :tabindex="firstActive ? -1 : undefined"
        @click="decrementCurrent"
      >
        <a class="page-link" href="#">Previous</a>
      </li>
      <li
        v-for="page in displayPages"
        :key="page.text"
        class="page-item"
        :class="{ disabled: page.disabled, active: page.active }"
        :tabindex="page.disabled ? -1 : undefined"
        @click="selectPage(page)"
      >
        <a class="page-link" href="#">{{ page.text }}</a>
      </li>
      <li
        class="page-item"
        :class="{ disabled: lastActive }"
        :tabindex="lastActive ? -1 : undefined"
        @click="incrementCurrent"
      >
        <a class="page-link" href="#">Next</a>
      </li>
    </ul>
  </nav>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { KeyboardListener } from "../siteTypes";

interface Page {
  text: string;
  disabled?: boolean;
  value?: number;
  active?: boolean;
}

export default defineComponent({
  name: "Pagination",
  props: {
    pages: { type: Number, required: true },
    keyNavigation: { type: Boolean, required: false, default: true },
  },
  emits: ["page"],
  data() {
    return {
      currentPage: 1,
      typeListener: null as null | KeyboardListener,
    };
  },
  computed: {
    firstActive(): boolean {
      return this.currentPage === 1;
    },
    lastActive(): boolean {
      return this.currentPage === this.pages;
    },
    displayPages(): Page[] {
      if (this.pages <= 0) {
        return [];
      }

      const pages: Page[] = [];

      const previousPage = this.currentPage - 1;
      const nextPage = this.currentPage + 1;
      const lastPage = this.pages;
      const validPages = [1, previousPage, this.currentPage, nextPage, lastPage];

      for (let page = 1; page <= this.pages; page++) {
        if (page === 2 && previousPage > 2) {
          pages.push({
            text: "..",
            disabled: true,
          });
          continue;
        }
        if (page === lastPage - 1 && nextPage < lastPage - 1) {
          pages.push({
            text: "..",
            disabled: true,
          });
          continue;
        }
        if (validPages.includes(page)) {
          pages.push({
            text: page + "",
            value: page,
            active: page === this.currentPage,
          });
        }
      }
      return pages;
    },
  },
  mounted() {
    this.typeListener = (event) => {
      if (!this.keyNavigation || event.altKey || event.ctrlKey) {
        return;
      }
      if (event.key === "ArrowRight") {
        this.incrementCurrent();
      } else if (event.key === "ArrowLeft") {
        this.decrementCurrent();
      }
    };
    document.addEventListener("keyup", this.typeListener);
  },
  unmounted() {
    if (this.typeListener) {
      document.removeEventListener("keyup", this.typeListener);
    }
  },
  methods: {
    incrementCurrent() {
      this.selectPageValue(this.currentPage + 1);
    },
    decrementCurrent() {
      this.selectPageValue(this.currentPage - 1);
    },
    selectPageValue(pageValue: number) {
      const foundPage = this.displayPages.find((page) => page.value === pageValue);

      if (!foundPage) {
        console.warn(`Could not find page: "${pageValue}" in`, this.displayPages);
      } else {
        this.selectPage(foundPage);
      }
    },
    selectPage(page: Page) {
      const pageValue = page.value;

      if (page.active || !pageValue) {
        return;
      }

      const previous = this.currentPage;
      this.currentPage = pageValue;
      this.$emit("page", { previous, current: pageValue });
    },
  },
});
</script>
