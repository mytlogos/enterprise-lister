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
        <Selector
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
import { idGenerator } from "../../init";
import { BasicScraperConfig } from "enterprise-scraper/dist/externals/custom/types";
import { computed, PropType } from "vue";
import RequestConfig from "./request-config.vue";
import Selector from "./selector.vue";
import { SelectorType } from "../../siteTypes";

// set this outside of component setup
const nextId = idGenerator();
</script>
<script lang="ts" setup>
const props = defineProps({
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
});
const emits = defineEmits(["update:modelValue", "delete"]);
const id = nextId();

const selector = computed(() => props.modelValue.selector || []);
const selectorTypes = computed(
  (): SelectorType => (props.modelValue.request?.jsonResponse ? ["json"] : ["regex", "text"]),
);
const prefix = computed({
  get() {
    return props.modelValue.prefix;
  },
  set(value) {
    emits("update:modelValue", { ...props.modelValue, prefix: value });
  },
});
const base = computed({
  get() {
    return props.modelValue.base;
  },
  set(value) {
    emits("update:modelValue", { ...props.modelValue, base: value });
  },
});
const request = computed({
  get() {
    return props.modelValue.request;
  },
  set(value) {
    emits("update:modelValue", { ...props.modelValue, request: value });
  },
});

let newValue;

if (!props.modelValue.selector) {
  newValue = { ...props.modelValue, selector: [] };
} else if (!Array.isArray(props.modelValue.selector)) {
  newValue = { ...props.modelValue, selector: [props.modelValue.selector] };
}
if (newValue) {
  emits("update:modelValue", newValue);
}

function remove(array: any[], index: number) {
  array.splice(index, 1);
}

function toggleCustomRequest() {
  const tmp = { ...props.modelValue, request: {} };

  if (props.modelValue.request) {
    // @ts-expect-error
    delete tmp.request;
  }
  emits("update:modelValue", tmp);
}

function addSelector() {
  emits("update:modelValue", {
    ...props.modelValue,
    selector: [
      ...props.modelValue.selector,
      {
        selector: "",
      },
    ],
  });
}
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
