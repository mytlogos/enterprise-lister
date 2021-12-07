<template>
  <div class="container p-4">
    <div class="row mb-3 align-items-center">
      <label for="validationCustom01" class="form-label" style="flex: 0.12 0 0%">Hook name</label>
      <input
        id="validationCustom01"
        v-model="name"
        type="text"
        class="col form-control"
        placeholder="Name required"
        required
      />
      <div class="col-3 form-check form-switch ms-2">
        <input
          id="hookEnabled"
          v-model="enabled"
          class="form-check-input"
          type="checkbox"
          role="switch"
          :checked="enabled"
        />
        <label class="form-check-label" for="hookEnabled">Hook Enabled</label>
      </div>
    </div>
    <div class="form-floating mb-3">
      <textarea
        id="floatingTextarea"
        v-model="comment"
        class="form-control"
        placeholder="Leave a comment here"
      ></textarea>
      <label for="floatingTextarea">Comments</label>
    </div>
    <select v-model="medium" class="form-select mb-3" aria-label="Select Hook Medium">
      <option value="" disabled selected>Select Medium</option>
      <option :value="1">Text</option>
      <option :value="2">Audio</option>
      <option :value="4">Video</option>
      <option :value="8">Image</option>
    </select>
    <div class="row mb-3 align-items-center">
      <div class="col">
        <label for="hookBase" class="form-label">Base URL</label>
        <input
          id="hookBase"
          v-model="baseUrl"
          type="text"
          class="form-control"
          placeholder="Base URL for Links"
          required
        />
      </div>
      <regex v-model="domain" regex-name="Valid domain regex" />
    </div>
    <div>
      <div>
        <button class="btn btn-primary me-1" role="button" @click="addToc">Create Toc Scraper</button>
        <button class="btn btn-primary me-1" role="button" :disabled="searchConfig" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="newsConfig" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="downloadConfig" @click="addDownload">
          Create Download Scraper
        </button>
      </div>
      <template v-for="(item, index) in tocConfig" :key="index">
        <scraper-config
          v-model="tocConfig[index]"
          :id-prefix="'tocConfig' + index + '-'"
          :name="'TocConfig ' + index"
          @delete="remove(tocConfig, index)"
        />
      </template>
      <template v-if="searchConfig">
        <scraper-config
          v-model="searchConfig"
          id-prefix="searchConfig"
          name="SearchConfig"
          @delete="removeConfig('searchConfig')"
        >
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
        </scraper-config>
      </template>
      <template v-if="newsConfig">
        <scraper-config
          v-model="newsConfig"
          id-prefix="newsConfig"
          name="NewsConfig"
          @delete="removeConfig('newsConfig')"
        >
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
        </scraper-config>
      </template>
      <template v-if="downloadConfig">
        <scraper-config
          v-model="downloadConfig"
          id-prefix="downloadConfig"
          name="DownloadConfig"
          @delete="removeConfig('downloadConfig')"
        />
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { CustomHook, HookState } from "enterprise-core/dist/types";
import {
  DownloadConfig,
  HookConfig,
  NewsConfig,
  SearchConfig,
  TocConfig,
  Selector as SelectorType,
} from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import ScraperConfig from "./scraper-config.vue";
import Regex from "./regex.vue";
import "bootstrap/js/dist/collapse";
import { createComputedProperty } from "../../init";

export default defineComponent({
  name: "CustomHookForm",
  components: {
    ScraperConfig,
    Regex,
  },
  props: {
    hook: {
      type: Object as PropType<CustomHook>,
      required: true,
    },
    config: {
      type: Object as PropType<HookConfig>,
      required: true,
    },
  },
  emits: ["update:hook", "update:config"],
  data() {
    return {
      tocConfig: [] as TocConfig[],
      searchConfig: null as null | SearchConfig,
      newsConfig: null as null | NewsConfig,
      downloadConfig: null as null | DownloadConfig,
    };
  },
  computed: {
    name: {
      get() {
        return this.hook.name;
      },
      set(value: string) {
        this.$emit("update:hook", { ...this.hook, name: value });
        this.$emit("update:config", { ...this.config, name: value });
      },
    },
    enabled: {
      get() {
        return this.hook.hookState === HookState.ENABLED;
      },
      set(value: boolean) {
        this.$emit("update:hook", { ...this.hook, hookState: value ? HookState.ENABLED : HookState.DISABLED });
      },
    },
    comment: createComputedProperty("hook", "comment"),
    medium: {
      get() {
        return this.config.medium;
      },
      set(value: number) {
        this.$emit("update:config", { ...this.config, medium: Number(value) });
      },
    },
    baseUrl: createComputedProperty("config", "base"),
    domain: createComputedProperty("config", "domain"),
  },
  watch: {
    tocConfig: {
      handler(newValue: any[]) {
        this.$emit("update:config", { ...this.config, toc: newValue });
      },
      deep: true,
    },
    newsConfig: {
      handler(newValue: any[]) {
        this.$emit("update:config", { ...this.config, news: newValue });
      },
      deep: true,
    },
    downloadConfig: {
      handler(newValue: any[]) {
        this.$emit("update:config", { ...this.config, download: newValue });
      },
      deep: true,
    },
    searchConfig: {
      handler(newValue: any[]) {
        this.$emit("update:config", { ...this.config, search: newValue });
      },
      deep: true,
    },
  },
  created() {
    if (this.config.toc) {
      this.tocConfig = Array.isArray(this.config.toc) ? [...this.config.toc] : [this.config.toc];
      this.tocConfig.forEach((value) => this.ensureArray(value, "selector"));
    }
    if (this.config.search) {
      this.searchConfig = { ...this.config.search };
      this.ensureArray(this.searchConfig, "selector");
    }
    if (this.config.news) {
      this.newsConfig = { ...this.config.news };
      this.ensureArray(this.newsConfig, "selector");
    }
    if (this.config.download) {
      this.downloadConfig = { ...this.config.download };
      this.ensureArray(this.downloadConfig, "selector");
    }
    // ensure that regex component binds to value of config
    if (!this.config.domain) {
      this.$emit("update:config", { ...this.config, domain: {} });
    }
  },
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    removeConfig(prop: "searchConfig" | "newsConfig" | "downloadConfig") {
      this[prop] = null;
    },
    addToc() {
      this.tocConfig.push({
        selector: [{ selector: "" }],
        prefix: undefined,
        base: undefined,
        request: undefined,
      });
    },
    addNews() {
      this.newsConfig = {
        newsUrl: "",
        selector: [{ selector: "" }],
      };
    },
    addSearch() {
      this.searchConfig = {
        searchUrl: "",
        base: undefined,
        request: undefined,
        selector: [{ selector: "" }],
      };
    },
    addDownload() {
      this.downloadConfig = {
        prefix: undefined,
        base: undefined,
        request: undefined,
        selector: [{ selector: "" }],
      };
    },
    ensureArray<T, K extends keyof T>(value: T, key: K) {
      if (!value[key]) {
        // @ts-expect-error
        value[key] = [];
      } else if (!Array.isArray(value[key])) {
        // @ts-expect-error
        value[key] = [value[key]];
      }
    },
    addSelector(config: any, key = "selector") {
      this.ensureArray(config, key);
      config[key].push({
        selector: "",
      } as SelectorType<any>);
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
