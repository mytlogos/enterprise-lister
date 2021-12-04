<template>
  <div class="container p-4">
    <div class="row mb-3 align-items-center">
      <label for="validationCustom01" class="form-label" style="flex: 0.12 0 0%">Hook name</label>
      <input id="validationCustom01" type="text" class="col form-control" placeholder="Name required" required />
      <div class="col-3 form-check form-switch ms-2">
        <input id="flexSwitchCheckChecked" class="form-check-input" type="checkbox" role="switch" checked />
        <label class="form-check-label" for="flexSwitchCheckChecked">Hook Enabled</label>
      </div>
    </div>
    <div class="form-floating mb-3">
      <textarea id="floatingTextarea" class="form-control" placeholder="Leave a comment here"></textarea>
      <label for="floatingTextarea">Comments</label>
    </div>
    <select class="form-select mb-3" aria-label="Selct Hook Medium">
      <option selected>Select Medium</option>
      <option value="1">Text</option>
      <option value="2">Audio</option>
      <option value="4">Video</option>
      <option value="8">Image</option>
    </select>
    <div class="row mb-3 align-items-center">
      <div class="col">
        <label for="hookBase" class="form-label">Base URL</label>
        <input id="hookBase" type="text" class="form-control" placeholder="Base URL for Links" required />
      </div>
      <div class="col">
        <label for="hookDomain" class="form-label">Valid Domain</label>
        <input id="hookDomain" type="text" class="form-control" placeholder="https://iamavaliddomain.com/" required />
      </div>
    </div>
    <div>
      <div>
        <button class="btn btn-primary" role="button" @click="addToc">Create Toc Scraper</button>
        <button class="btn btn-primary" role="button" :disabled="searchConfig" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="newsConfig" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="downloadConfig" @click="addDownload">
          Create Download Scraper
        </button>
      </div>
      <template v-for="(item, index) in tocConfig" :key="index">
        <div
          class="card mt-3"
          role="button"
          data-bs-toggle="collapse"
          aria-expanded="true"
          :data-bs-target="'#collapseToc' + index"
          :aria-controls="'#collapseToc' + index"
        >
          <div class="card-body">Toggle ToC Config {{ index }}</div>
        </div>
        <div :id="'collapseToc' + index" class="collapse show">
          <div class="card card-body">
            <div class="row mb-3">
              <div class="col">
                <label for="hookBase" class="form-label">Base URL for Search</label>
                <input
                  id="hookBase"
                  v-model="item.base"
                  type="text"
                  class="form-control"
                  placeholder="Base URL for Links"
                />
              </div>
              <div class="col">
                <label for="tocPrefix" class="form-label">Prefix</label>
                <input
                  id="tocPrefix"
                  v-model="item.prefix"
                  type="text"
                  class="form-control"
                  placeholder="Prefix"
                  required
                />
              </div>
            </div>
            <div>
              <button class="btn btn-primary" role="button" :disabled="item.request" @click="setCustomRequest(item)">
                Use Custom Request Configuration
              </button>
              <request-config v-if="item.request" v-model="item.request" />
            </div>
            <selector v-model="item.selector" :selector-types="['regex', 'string']" />
          </div>
        </div>
      </template>
      <template v-if="searchConfig">
        <div
          class="card mt-3"
          role="button"
          data-bs-toggle="collapse"
          data-bs-target="#searchConfig"
          aria-expanded="true"
          aria-controls="searchConfig"
        >
          <div class="card-body">Toggle Search Config</div>
        </div>
        <div id="searchConfig" class="collapse show">
          <div class="card card-body">
            <div class="row mb-3">
              <div class="col">
                <label for="hookBase" class="form-label">Base URL for Search</label>
                <input
                  id="hookBase"
                  v-model="searchConfig.base"
                  type="text"
                  class="form-control"
                  placeholder="Base URL for Links"
                />
              </div>
              <div class="col">
                <label for="newsUrl" class="form-label">Search URL</label>
                <input
                  id="newsUrl"
                  v-model="searchConfig.searchUrl"
                  type="text"
                  class="form-control"
                  placeholder="https://iamanewspage.com/"
                  required
                />
              </div>
            </div>
            <div>
              <button
                class="btn btn-primary"
                role="button"
                :disabled="searchConfig.request"
                @click="setCustomRequest(item)"
              >
                Use Custom Request Configuration
              </button>
              <request-config v-if="searchConfig.request" v-model="searchConfig.request" />
            </div>
            <selector v-model="searchConfig.selector" :selector-types="['json']" />
          </div>
        </div>
      </template>
      <template v-if="newsConfig">
        <div
          class="card mt-3"
          role="button"
          data-bs-toggle="collapse"
          data-bs-target="#newsConfig"
          aria-expanded="true"
          aria-controls="newsConfig"
        >
          <div class="card-body">Toggle News Config</div>
        </div>
        <div id="newsConfig" class="collapse">
          <div class="card card-body">
            <div class="row mb-3">
              <div class="col">
                <label for="hookBase" class="form-label">Base URL for Links</label>
                <input
                  id="hookBase"
                  v-model="newsConfig.base"
                  type="text"
                  class="form-control"
                  placeholder="Base URL for Links"
                />
              </div>
              <div class="col">
                <label for="newsUrl" class="form-label">News URL</label>
                <input
                  id="newsUrl"
                  v-model="newsConfig.newsUrl"
                  type="text"
                  class="form-control"
                  placeholder="https://iamanewspage.com/"
                  required
                />
              </div>
            </div>
            <selector v-model="newsConfig.container" :selector-types="['regex', 'string']" />
          </div>
        </div>
      </template>
      <template v-if="downloadConfig">
        <div
          class="card mt-3"
          role="button"
          data-bs-toggle="collapse"
          data-bs-target="#downloadConfig"
          aria-expanded="true"
          aria-controls="downloadConfig"
        >
          <div class="card-body">Toggle Download Config</div>
        </div>
        <div id="downloadConfig" class="collapse">
          <div class="card card-body">
            <div class="row mb-3">
              <div class="col">
                <label for="hookBase" class="form-label">Base URL for Links</label>
                <input
                  id="hookBase"
                  v-model="downloadConfig.base"
                  type="text"
                  class="form-control"
                  placeholder="Base URL for Links"
                />
              </div>
              <div class="col">
                <label for="newsUrl" class="form-label">Prefix</label>
                <input
                  id="newsUrl"
                  v-model="downloadConfig.prefix"
                  type="text"
                  class="form-control"
                  placeholder="Prefix"
                  required
                />
              </div>
            </div>
            <div>
              <button
                class="btn btn-primary"
                role="button"
                :disabled="downloadConfig.request"
                @click="setCustomRequest(item)"
              >
                Use Custom Request Configuration
              </button>
              <request-config v-if="downloadConfig.request" v-model="downloadConfig.request" />
            </div>
            <selector v-model="downloadConfig.selector" :selector-types="['regex', 'string']" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { CustomHook } from "enterprise-core/dist/types";
import {
  DownloadConfig,
  NewsConfig,
  RequestConfig as RequestConfiguration,
  SearchConfig,
  TocConfig,
} from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import Selector from "./selector.vue";
import RequestConfig from "./request-config.vue";
import "bootstrap/js/dist/collapse";

export default defineComponent({
  name: "CustomHookForm",
  components: {
    Selector,
    RequestConfig,
  },
  props: {
    value: {
      type: Object as PropType<CustomHook>,
      required: true,
    },
  },
  emits: ["update:value"],
  data() {
    return {
      tocConfig: [] as TocConfig[],
      searchConfig: null as null | SearchConfig,
      newsConfig: null as null | NewsConfig,
      downloadConfig: null as null | DownloadConfig,
    };
  },
  methods: {
    setCustomRequest(item: any) {
      item.request = {} as RequestConfiguration;
    },
    addToc() {
      this.tocConfig.push({
        selector: { selector: "" },
        prefix: undefined,
        base: undefined,
        request: undefined,
      });
    },
    addNews() {
      this.newsConfig = {
        newsUrl: "",
        container: { selector: "" },
      };
    },
    addSearch() {
      this.searchConfig = {
        searchUrl: "",
        base: undefined,
        request: undefined,
        selector: { selector: "" },
      };
    },
    addDownload() {
      this.downloadConfig = {
        prefix: undefined,
        base: undefined,
        request: undefined,
        selector: { selector: "" },
      };
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
