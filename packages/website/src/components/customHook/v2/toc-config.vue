<template>
  <div
    class="card mt-3"
    role="button"
    data-bs-toggle="collapse"
    :data-bs-target="'#' + idPrefix + id"
    aria-expanded="true"
    :aria-controls="idPrefix + id"
  >
    <div class="card-body">Toggle Toc Config</div>
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
            <regex-map v-model="data.regexes" id-prefix="toc" />
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
          <context-selectors v-model="item._contextSelectors" />
          <select-button
            :model-value="getType(item)"
            :options="types"
            @update:model-value="convertConfig($event, data.data, index)"
          />
          <div>
            <label for="hookBase" class="form-label">Root Selector</label>
            <input id="hookBase" v-model="item._$" type="text" class="form-control" placeholder="Selector" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Title</label>
            <input id="hookBase" v-model="item.title" type="text" class="form-control" placeholder="Title" />
          </div>
          <div>
            <label for="hookBase" class="form-label">ToC Link</label>
            <input id="hookBase" v-model="item.link" type="text" class="form-control" placeholder="ToC Link" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Synonyms</label>
            <input id="hookBase" v-model="item.synonyms" type="text" class="form-control" placeholder="Synonyms" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Language COO</label>
            <input id="hookBase" v-model="item.langCOO" type="text" class="form-control" placeholder="Lang COO" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Language TL</label>
            <input id="hookBase" v-model="item.langTL" type="text" class="form-control" placeholder="Lang TL" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Status COO</label>
            <input id="hookBase" v-model="item.statusCOO" type="text" class="form-control" placeholder="Status COO" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Status TL</label>
            <input id="hookBase" v-model="item.statusTl" type="text" class="form-control" placeholder="Status TL" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Authors</label>
            <input id="hookBase" v-model="item.authors" type="text" class="form-control" placeholder="Authors" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Status TL</label>
            <input id="hookBase" v-model="item.artists" type="text" class="form-control" placeholder="Artists" />
          </div>
          <div v-if="isGenerator(item)" class="mt-2">
            <h6>Generator</h6>
            <span class="mt-4 p-float-label">
              <input-text v-model="item._generator.maxIndex" class="w-100" type="text" />
              <label class="form-label">Max Index Selector</label>
            </span>
            <regex v-model="item._generator.urlRegex" />
            <span class="mt-4 p-float-label">
              <input-text v-model="item._generator.urlTemplate" class="w-100" type="text" />
              <label class="form-label">Url Template</label>
            </span>
            <span class="mt-4 p-float-label">
              <input-text v-model="item._generator.titleTemplate" class="w-100" type="text" />
              <label class="form-label">Title Template</label>
            </span>
          </div>
          <div v-else>
            <h6>Content</h6>
            <div>
              <label for="hookBase" class="form-label">Content Base Selector</label>
              <input
                id="hookBase"
                v-model="item.content._$"
                type="text"
                class="form-control"
                placeholder="Base Selector"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Release Title</label>
              <input
                id="hookBase"
                v-model="item.content.title"
                type="text"
                class="form-control"
                placeholder="Release Title"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Release Index</label>
              <input
                id="hookBase"
                v-model="item.content.combiIndex"
                type="text"
                class="form-control"
                placeholder="Release Index"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Release TotalIndex</label>
              <input
                id="hookBase"
                v-model="item.content.totalIndex"
                type="text"
                class="form-control"
                placeholder="Release TotalIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Release PartialIndex</label>
              <input
                id="hookBase"
                v-model="item.content.partialIndex"
                type="text"
                class="form-control"
                placeholder="Release PartialIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Release Url</label>
              <input
                id="hookBase"
                v-model="item.content.url"
                type="text"
                class="form-control"
                placeholder="Release Url"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Releasedate</label>
              <input
                id="hookBase"
                v-model="item.content.releaseDate"
                type="text"
                class="form-control"
                placeholder="Releasedate"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Locked</label>
              <input
                id="hookBase"
                v-model="item.content.locked"
                type="text"
                class="form-control"
                placeholder="Locked"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ref, toRef, PropType } from "vue";
import { customHookHelper, idGenerator, Logger } from "../../../init";
import RequestConfig from "../request-config.vue";
import RegexMap from "./regex-map.vue";
import Regex from "../regex.vue";
import ContextSelectors from "./context-selectors.vue";
import { TocSingle, TocConfig, TocGenerator } from "enterprise-scraper/dist/externals/customv2/types";

const nextId = idGenerator();
</script>
<script lang="ts" setup>
const props = defineProps({
  idPrefix: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Object as PropType<TocConfig>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "delete"]);
const id = nextId();
const data = ref<TocConfig>({
  data: [],
  regexes: {},
});
const logger = new Logger("toc-config-" + id);
const types: Array<"Single" | "Generator"> = ["Single", "Generator"];

const { toggleCustomRequest, addSchema } = customHookHelper(
  data,
  toRef(props, "modelValue"),
  defaultSingle,
  logger,
  emits,
);

type DataItem = TocSingle | TocGenerator;

function isGenerator(value: DataItem): value is TocGenerator {
  return "_generator" in value;
}

function getType(value: DataItem): typeof types[0] {
  if ("_generator" in value) {
    return "Generator";
  } else {
    return "Single";
  }
}

function convertConfig(newType: typeof types[0], data: DataItem[], index: number) {
  if (newType === "Single") {
    data[index] = convertGeneratorToSingle(data[index] as TocGenerator);
  } else {
    data[index] = convertSingleToGenerator(data[index] as TocSingle);
  }
}

function convertSingleToGenerator(value: TocSingle): TocGenerator {
  return {
    _$: "",
    _request: value._request,
    _contextSelectors: value._contextSelectors,
    _generator: {
      maxIndex: "",
      urlRegex: { flags: "", pattern: "" },
      urlTemplate: "",
      titleTemplate: "",
    },
    title: value.title,
    synonyms: value.synonyms,
    link: value.link,
    langCOO: value.langCOO,
    langTL: value.langTL,
    statusCOO: value.statusCOO,
    statusTl: value.statusTl,
    authors: value.authors,
    artists: value.artists,
  };
}

function convertGeneratorToSingle(value: TocGenerator): TocSingle {
  return {
    _$: "",
    _request: value._request,
    _contextSelectors: value._contextSelectors,
    title: value.title,
    content: {
      _$: "",
      title: "",
      combiIndex: "",
      totalIndex: "",
      partialIndex: "",
      url: "",
      releaseDate: "",
      noTime: "",
      locked: "",
      tocId: "",
    },
    synonyms: value.synonyms,
    link: value.link,
    langCOO: value.langCOO,
    langTL: value.langTL,
    statusCOO: value.statusCOO,
    statusTl: value.statusTl,
    authors: value.authors,
    artists: value.artists,
  };
}

function defaultSingle(): TocSingle {
  return {
    _$: "",
    _request: undefined,
    _contextSelectors: {},
    title: "",
    content: {
      _$: "",
      title: "",
      combiIndex: "",
      totalIndex: "",
      partialIndex: "",
      url: "",
      releaseDate: "",
      noTime: "",
      locked: "",
      tocId: "",
    },
    synonyms: "",
    link: "",
    langCOO: "",
    langTL: "",
    statusCOO: "",
    statusTl: "",
    authors: "",
    artists: "",
  };
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
