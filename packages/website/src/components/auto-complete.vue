<template>
  <div class="autocomplete">
    <input
      v-model="search"
      type="text"
      :class="inputClass"
      :placeholder="placeholder"
      @input="onChange"
      @keydown.down="onArrowDown"
      @keydown.up="onArrowUp"
      @keydown.enter="onEnter"
    />
    <ul v-show="isOpen" id="autocomplete-results" class="autocomplete-results">
      <li v-if="isLoading" class="loading">Loading results...</li>
      <li
        v-for="(item, i) in results"
        v-else
        :key="i"
        class="autocomplete-result"
        :class="{ 'is-active': i === arrowCounter }"
        @click="setResult(item)"
      >
        {{ toItemTitle(item) }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

interface Data {
  isOpen: boolean;
  results: any[];
  search: string;
  isLoading: boolean;
  arrowCounter: number;
  result?: any;
}

/**
 * Autocomplete modified from: https://www.digitalocean.com/community/tutorials/vuejs-vue-autocomplete-component
 */
export default defineComponent({
  name: "SearchAutocomplete",
  props: {
    items: {
      type: Array as PropType<any[]>,
      required: true,
    },
    inputClass: {
      type: String,
      required: false,
      default: "",
    },
    titleKey: {
      type: String,
      required: false,
      default: "",
    },
    thingKey: {
      type: String,
      required: false,
      default: "",
    },
    isAsync: {
      type: Boolean,
      required: false,
      default: false,
    },
    placeholder: {
      type: String,
      required: false,
      default: "",
    },
  },
  emits: ["input", "text"],
  data(): Data {
    return {
      isOpen: false,
      results: [] as any[],
      search: "",
      result: undefined,
      isLoading: false,
      arrowCounter: -1,
    };
  },
  watch: {
    items(value: any[], oldValue: any[]): void {
      if (value.length !== oldValue.length) {
        this.results = value;
        this.isLoading = false;
      }
    },
  },
  mounted(): void {
    document.addEventListener("click", this.handleClickOutside);
  },
  unmounted(): void {
    document.removeEventListener("click", this.handleClickOutside);
  },
  methods: {
    setResult(result: any): void {
      this.result = result;
      this.search = this.toItemTitle(result);
      this.isOpen = false;
    },
    filterResults(): void {
      const loweredSeach = this.search.toLowerCase();
      this.results = this.items.filter((item) => {
        return this.toItemTitle(item).toLowerCase().indexOf(loweredSeach) > -1;
      });
    },
    onChange(): void {
      if (this.isAsync) {
        this.isLoading = true;
      } else {
        this.$emit("text", this.search);
        this.filterResults();
        this.isOpen = true;
      }
    },
    handleClickOutside(event: Event): void {
      if (!this.$el.contains(event.target)) {
        this.isOpen = false;
        this.arrowCounter = -1;
      }
    },
    onArrowDown(): void {
      if (this.arrowCounter < this.results.length) {
        this.arrowCounter = this.arrowCounter + 1;
      }
    },
    onArrowUp(): void {
      if (this.arrowCounter > 0) {
        this.arrowCounter = this.arrowCounter - 1;
      }
    },
    onEnter(): void {
      this.$emit("input", this.result);
      this.result = this.results[this.arrowCounter];
      this.search = this.result ? this.toItemTitle(this.result) : "";
      this.isOpen = false;
      this.arrowCounter = -1;
    },
    toItemTitle(item: any): string {
      return this.titleKey ? item[this.titleKey] : String(item);
    },
  },
});
</script>

<style>
.autocomplete {
  position: relative;
}

.autocomplete-results {
  padding: 0;
  margin: 0;
  border: 1px solid #eeeeee;
  height: 120px;
  overflow: auto;
  left: 0;
  position: absolute;
  background: white;
}

.autocomplete-result {
  list-style: none;
  text-align: left;
  padding: 4px 2px;
  cursor: pointer;
}

.autocomplete-result.is-active,
.autocomplete-result:hover {
  background-color: #4aae9b;
  color: white;
}
</style>
