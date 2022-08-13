<template>
  <div
    class="card mt-3"
    role="button"
    data-bs-toggle="collapse"
    :data-bs-target="'#' + idPrefix + id"
    aria-expanded="true"
    :aria-controls="idPrefix + id"
  >
    <div class="card-body">Toggle Download Config</div>
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
            <regex-map v-model="data.regexes" id-prefix="download" />
          </div>
        </div>
        <button class="btn btn-primary mt-3" role="button" @click="addSchema">Add Config</button>
        <div v-for="(item, index) in modelValue.data" :key="index" class="row mb-3">
          <div class="d-flex">
            <i
              aria-hidden="true"
              title="Delete Item"
              class="fas fa-trash btn btn-sm btn-danger text-light ms-auto"
              @click="removeSchema(index)"
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
            <label for="hookBase" class="form-label">Medium Title</label>
            <input
              id="hookBase"
              v-model="item.mediumTitle"
              type="text"
              class="form-control"
              placeholder="Medium Title"
            />
          </div>
          <div>
            <label for="hookBase" class="form-label">Episode Title</label>
            <input
              id="hookBase"
              v-model="item.episodeTitle"
              type="text"
              class="form-control"
              placeholder="Episode Title"
            />
          </div>
          <div>
            <label for="hookBase" class="form-label">Index</label>
            <input id="hookBase" v-model="item.index" type="text" class="form-control" placeholder="Index" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Content</label>
            <input id="hookBase" v-model="item.content" type="text" class="form-control" placeholder="Content" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { PropType, ref, toRef, watch } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../../init";
import RequestConfig from "../request-config.vue";
import RegexMap from "./regex-map.vue";
import { DownloadSingle, DownloadConfig } from "enterprise-scraper/dist/externals/customv2/types";

const nextId = idGenerator();
</script>
<script lang="ts" setup>
function defaultSingle(): DownloadSingle {
  return {
    _$: "",
    _request: undefined,
    content: "",
    episodeTitle: "",
    mediumTitle: "",
    index: "",
    locked: "",
  };
}

const props = defineProps({
  idPrefix: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Object as PropType<DownloadConfig>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "delete"]);
const id = nextId();
const data = ref<DownloadConfig>({
  data: [],
  regexes: {},
});
const logger = new Logger("download-config-" + id);

watch(
  data,
  (newValue) => {
    if (deepEqual(newValue, props.modelValue)) {
      logger.info("Did not update download-config");
    } else {
      logger.info("Updated download-config");
      emits("update:modelValue", newValue);
    }
  },
  { deep: true },
);
watch(
  toRef(props, "modelValue"),
  (newValue) => {
    if (!deepEqual(newValue, data.value)) {
      data.value = clone(newValue);
    }
  },
  { deep: true, immediate: true },
);

function toggleCustomRequest(item: DownloadConfig["data"][0]) {
  if (item._request) {
    item._request = undefined;
  } else {
    item._request = {};
  }
}

function update(value: DownloadConfig) {
  emits("update:modelValue", value);
}

function removeSchema(index: number) {
  const value = { ...props.modelValue, data: [...props.modelValue.data] };
  value.data.splice(index, 1);
  update(value);
}

function addSchema() {
  const value = { ...props.modelValue, data: [...props.modelValue.data, defaultSingle()] };
  update(value);
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
