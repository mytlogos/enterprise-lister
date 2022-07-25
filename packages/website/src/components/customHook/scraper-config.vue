<template>
  <div
    class="card mt-3"
    role="button"
    data-bs-toggle="collapse"
    :data-bs-target="'#' + idPrefix + id"
    aria-expanded="true"
    :aria-controls="idPrefix + id"
  >
    <div class="card-body">Toggle {{ name }} Config</div>
  </div>
  <div :id="idPrefix + id" class="collapse show">
    <div class="card card-body">
      <div class="d-flex">
        <i
          aria-hidden="true"
          title="Delete Item"
          class="fas fa-trash btn btn-sm btn-danger text-light ms-auto"
          @click="$emit('delete')"
        ></i>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="hookBase" class="form-label">Base URL for Links</label>
          <input id="hookBase" v-model="base" type="text" class="form-control" placeholder="Base URL for Links" />
        </div>
        <div class="col">
          <label for="newsUrl" class="form-label">Prefix</label>
          <input id="newsUrl" v-model="prefix" type="text" class="form-control" placeholder="Prefix" />
        </div>
      </div>
      <slot></slot>
      <div>
        <button class="btn btn-primary mt-3" role="button" @click="toggleCustomRequest">
          {{ request ? "Remove" : "Use" }} Custom Request Configuration
        </button>
        <request-config v-if="request" v-model="request" />
      </div>
      <div class="mt-3">
        <button class="btn btn-primary" role="button" @click="addSelector">Add Selector</button>
        <selector
          v-for="(item, index) in selector"
          :key="index"
          v-model="selector[index]"
          :selector-types="selectorTypes"
          class="mt-3"
          @delete="remove(selector, index)"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { BasicScraperConfig, Selector as SelectorTsType } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { createComputedProperty, idGenerator } from "../../init";
import Selector from "./selector.vue";
import RequestConfig from "./request-config.vue";
import { SelectorType } from "../../siteTypes";

const nextId = idGenerator();

export default defineComponent({
  name: "ScraperConfig",
  components: {
    Selector,
    RequestConfig,
  },
  props: {
    name: {
      type: String,
      required: true,
    },
    idPrefix: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Object as PropType<BasicScraperConfig<any> & Record<string, any>>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data: () => ({ id: nextId() }),
  computed: {
    selector(): any[] {
      return this.modelValue.selector || [];
    },
    selectorTypes(): SelectorType {
      return this.modelValue.request?.jsonResponse ? ["json"] : ["regex", "text"];
    },
    prefix: createComputedProperty("modelValue", "prefix"),
    base: createComputedProperty("modelValue", "base"),
    request: createComputedProperty("modelValue", "request"),
  },
  created() {
    let newValue;

    if (!this.modelValue.selector) {
      newValue = { ...this.modelValue, selector: [] };
    } else if (!Array.isArray(this.modelValue.selector)) {
      newValue = { ...this.modelValue, selector: [this.modelValue.selector] };
    }
    if (newValue) {
      this.$emit("update:modelValue", newValue);
    }
  },
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    toggleCustomRequest() {
      const tmp = { ...this.modelValue, request: {} };

      if (this.modelValue.request) {
        // @ts-expect-error
        delete tmp.request;
      }
      this.$emit("update:modelValue", tmp);
    },
    addSelector() {
      this.$emit("update:modelValue", {
        ...this.modelValue,
        selector: [
          ...this.modelValue.selector,
          {
            selector: "",
          } as SelectorTsType<any>,
        ],
      });
    },
  },
});
</script>
<style scoped>
.card[aria-expanded="true"] {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.card + * > .card {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
}
</style>
