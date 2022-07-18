<template>
  <div
    class="card mt-3"
    role="button"
    data-bs-toggle="collapse"
    :data-bs-target="'#' + idPrefix + id"
    aria-expanded="true"
    :aria-controls="idPrefix + id"
  >
    <div class="card-body">Toggle News Config</div>
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
            <label for="hookBase" class="form-label">News URL</label>
            <input id="hookBase" v-model="data.newsUrl" type="text" class="form-control" placeholder="News URL" />
          </div>
        </div>
        <div class="row mb-3">
          <div class="col">
            <regex-map v-model="data.regexes" id-prefix="news" />
          </div>
        </div>
        <button class="btn btn-primary mt-3" role="button" @click="addSchema">Add Config</button>
        <div v-for="(item, index) in data.data" :key="index" class="row mb-3">
          <div class="d-flex">
            <i
              aria-hidden="true"
              title="Delete Item"
              class="fas fa-trash btn btn-sm btn-danger text-light ms-auto"
              @click="remove(data.data, index)"
            ></i>
          </div>
          <div class="row">Config #{{ index }}</div>
          <div>
            <button class="btn btn-primary mt-3" role="button" @click="toggleCustomRequest(item)">
              {{ item._request ? "Remove" : "Use" }} Custom Request Configuration
            </button>
            <request-config v-if="item._request" v-model="item._request" />
          </div>
          <select-button
            :model-value="item.type"
            :options="types"
            @update:model-value="convertConfig($event, data.data, index)"
          />
          <div>
            <label for="hookBase" class="form-label">Root Selector</label>
            <input id="hookBase" v-model="item._$" type="text" class="form-control" placeholder="Selector" />
          </div>
          <div>
            <label for="hookBase" class="form-label">Title</label>
            <input id="hookBase" v-model="item.mediumTitle" type="text" class="form-control" placeholder="Title" />
          </div>
          <div>
            <label for="hookBase" class="form-label">ToC Link</label>
            <input id="hookBase" v-model="item.mediumTocLink" type="text" class="form-control" placeholder="ToC Link" />
          </div>
          <template v-if="item.type === 'single'">
            <div>
              <label for="hookBase" class="form-label">Part Index</label>
              <input id="hookBase" v-model="item.partIndex" type="text" class="form-control" placeholder="Part Index" />
            </div>
            <div>
              <label for="hookBase" class="form-label">Part TotalIndex</label>
              <input
                id="hookBase"
                v-model="item.partTotalIndex"
                type="text"
                class="form-control"
                placeholder="Part TotalIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Part PartialIndex</label>
              <input
                id="hookBase"
                v-model="item.partPartialIndex"
                type="text"
                class="form-control"
                placeholder="Part PartialIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Index</label>
              <input
                id="hookBase"
                v-model="item.episodeIndex"
                type="text"
                class="form-control"
                placeholder="Episode Index"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode TotalIndex</label>
              <input
                id="hookBase"
                v-model="item.episodeTotalIndex"
                type="text"
                class="form-control"
                placeholder="Episode TotalIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode PartialIndex</label>
              <input
                id="hookBase"
                v-model="item.episodePartialIndex"
                type="text"
                class="form-control"
                placeholder="Episode PartialIndex"
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
              <label for="hookBase" class="form-label">Episode Link</label>
              <input id="hookBase" v-model="item.link" type="text" class="form-control" placeholder="Episode Link" />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Release Date</label>
              <input id="hookBase" v-model="item.date" type="text" class="form-control" placeholder="ReleaseDate" />
            </div>
          </template>
          <template v-else>
            <div>
              <label for="hookBase" class="form-label">Release Base Selector</label>
              <input
                id="hookBase"
                v-model="item.releases._$"
                type="text"
                class="form-control"
                placeholder="Base Selector"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Part Index</label>
              <input
                id="hookBase"
                v-model="item.releases.partIndex"
                type="text"
                class="form-control"
                placeholder="Part Index"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Part TotalIndex</label>
              <input
                id="hookBase"
                v-model="item.releases.partTotalIndex"
                type="text"
                class="form-control"
                placeholder="Part TotalIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Part PartialIndex</label>
              <input
                id="hookBase"
                v-model="item.releases.partPartialIndex"
                type="text"
                class="form-control"
                placeholder="Part PartialIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Index</label>
              <input
                id="hookBase"
                v-model="item.releases.episodeIndex"
                type="text"
                class="form-control"
                placeholder="Episode Index"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode TotalIndex</label>
              <input
                id="hookBase"
                v-model="item.releases.episodeTotalIndex"
                type="text"
                class="form-control"
                placeholder="Episode TotalIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode PartialIndex</label>
              <input
                id="hookBase"
                v-model="item.releases.episodePartialIndex"
                type="text"
                class="form-control"
                placeholder="Episode PartialIndex"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Title</label>
              <input
                id="hookBase"
                v-model="item.releases.episodeTitle"
                type="text"
                class="form-control"
                placeholder="Episode Title"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Link</label>
              <input
                id="hookBase"
                v-model="item.releases.link"
                type="text"
                class="form-control"
                placeholder="Episode Link"
              />
            </div>
            <div>
              <label for="hookBase" class="form-label">Episode Release Date</label>
              <input
                id="hookBase"
                v-model="item.releases.date"
                type="text"
                class="form-control"
                placeholder="ReleaseDate"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../../init";
import RequestConfig from "../request-config.vue";
import RegexMap from "./regex-map.vue";
import { NewsConfig, NewsNested, NewsSingle } from "enterprise-scraper/dist/externals/customv2/types";

const nextId = idGenerator();

function defaultSingle(): NewsSingle {
  return {
    type: "single",
    _$: "",
    _request: undefined,
    mediumTitle: "",
    mediumTocLink: "",
    partIndex: "",
    partTotalIndex: "",
    partPartialIndex: "",
    episodeTotalIndex: "",
    episodePartialIndex: "",
    episodeIndex: "",
    episodeTitle: "",
    link: "",
    date: "",
  };
}

function nestedToSingle(config: NewsNested) {
  return {
    type: "single",
    _$: config._$,
    _request: config._request,
    mediumTitle: config.mediumTitle,
    mediumTocLink: config.mediumTocLink,
    partIndex: config.releases.partIndex,
    partTotalIndex: config.releases.partTotalIndex,
    partPartialIndex: config.releases.partPartialIndex,
    episodeTotalIndex: config.releases.episodeTotalIndex,
    episodePartialIndex: config.releases.episodePartialIndex,
    episodeIndex: config.releases.episodeIndex,
    episodeTitle: config.releases.episodeTitle,
    link: config.releases.link,
    date: config.releases.date,
  };
}

function singleToNested(config: NewsSingle) {
  return {
    type: "nested",
    _$: config._$,
    _request: config._request,
    mediumTitle: config.mediumTitle,
    mediumTocLink: config.mediumTocLink,
    releases: {
      _$: "",
      partIndex: config.partIndex,
      partTotalIndex: config.partTotalIndex,
      partPartialIndex: config.partPartialIndex,
      episodeTotalIndex: config.episodeTotalIndex,
      episodePartialIndex: config.episodePartialIndex,
      episodeIndex: config.episodeIndex,
      episodeTitle: config.episodeTitle,
      link: config.link,
      date: config.date,
    },
  };
}

export default defineComponent({
  name: "NewsConfig",
  components: {
    RequestConfig,
    RegexMap,
  },
  props: {
    idPrefix: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Object as PropType<NewsConfig>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data: () => ({
    id: nextId(),
    types: ["nested", "single"] as Array<NewsConfig["data"][0]["type"]>,
    data: {} as NewsConfig,
    logger: new Logger("news-config"),
  }),
  watch: {
    data: {
      handler(newValue: NewsConfig) {
        if (deepEqual(newValue, this.modelValue)) {
          this.logger.info("Did not update news-config");
        } else {
          this.logger.info("Updated news-config");
          this.$emit("update:modelValue", newValue);
        }
      },
      deep: true,
    },
    modelValue: {
      handler(newValue: NewsConfig) {
        if (!deepEqual(newValue, this.data)) {
          this.data = clone(newValue);
        }
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    toggleCustomRequest(item: NewsConfig["data"][0]) {
      if (item._request) {
        item._request = undefined;
      } else {
        item._request = {};
      }
    },
    addSchema() {
      this.data.data.push(defaultSingle());
    },
    convertConfig(type: NewsConfig["data"][0]["type"], data: any[], index: number) {
      if (type === "nested") {
        data[index] = singleToNested(data[index]);
      } else {
        data[index] = nestedToSingle(data[index]);
      }
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
