<template>
  <div
    class="card mt-3"
    role="button"
    data-bs-toggle="collapse"
    :data-bs-target="'#' + idPrefix + id"
    aria-expanded="true"
    :aria-controls="idPrefix + id"
  >
    <div class="card-body">Toggle Search Config</div>
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
      <div class="mt-3">
        <div class="row mb-3">
          <div class="col">
            <label for="hookBase" class="form-label">Search URL</label>
            <input id="hookBase" v-model="data.searchUrl" type="text" class="form-control" placeholder="Search URL" />
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <regex-map v-model="data.regexes" id-prefix="search" />
          </div>
        </div>
        <button class="btn btn-primary mt-3" role="button" @click="addSchema">Add Config</button>
        <div v-for="(item, index) in data.data" :key="index" class="row mb-3">
          <div class="d-flex">
            <i
              aria-hidden="true"
              title="Delete Item"
              class="fas fa-trash btn btn-sm btn-danger text-light ms-auto"
              @click="data.data.splice(index, 1)"
            ></i>
          </div>
          <div class="row">Config #{{ index }}</div>
          <div>
            <button class="btn btn-primary mt-3" role="button" @click="toggleCustomRequest(item)">
              {{ item._request ? "Remove" : "Use" }} Custom Request Configuration
            </button>
            <request-config v-if="item._request" v-model="item._request" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Root Selector</label>
            <input id="hookBase" v-model="item._$" type="text" class="form-control" placeholder="Selector" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Title</label>
            <input id="hookBase" v-model="item.title" type="text" class="form-control" placeholder="Title" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Link</label>
            <input id="hookBase" v-model="item.link" type="text" class="form-control" placeholder="ToC Link" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Author</label>
            <input id="hookBase" v-model="item.author" type="text" class="form-control" placeholder="Author" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Cover Url</label>
            <input id="hookBase" v-model="item.coverUrl" type="text" class="form-control" placeholder="Cover Url" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { PropType, ref, toRef } from "vue";
import { customHookHelper, idGenerator, Logger } from "../../../init";
import RequestConfig from "../request-config.vue";
import RegexMap from "./regex-map.vue";
import { SearchSingle, SearchConfig } from "enterprise-scraper/dist/externals/customv2/types";

const nextId = idGenerator();
</script>
<script lang="ts" setup>
function defaultSingle(): SearchSingle {
  return {
    _$: "",
    _request: undefined,
    medium: "",
    title: "",
    author: "",
    coverUrl: "",
    link: "",
  };
}

const props = defineProps({
  idPrefix: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Object as PropType<SearchConfig>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "delete"]);
const id = nextId();
const data = ref<SearchConfig>({
  searchUrl: "",
  data: [],
  regexes: {},
});
const logger = new Logger("search-config-" + id);

const { toggleCustomRequest, addSchema } = customHookHelper(
  data,
  toRef(props, "modelValue"),
  defaultSingle,
  logger,
  emits,
);
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
