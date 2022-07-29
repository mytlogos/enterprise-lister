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
        <button class="btn btn-primary me-1" role="button" :disabled="!!searchConfig" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!newsConfig" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="!!downloadConfig" @click="addDownload">
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
import { HookConfig, Selector as SelectorType, JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import ScraperConfig from "./scraper-config.vue";
import Regex from "./regex.vue";
import "bootstrap/js/dist/collapse";
import { toArray, deepEqual, Logger } from "../../init";
import { MediaType } from "../../siteTypes";

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
      name: this.hook.name,
      enabled: this.hook.hookState ? this.hook.hookState === HookState.ENABLED : true,
      comment: this.hook.comment,
      baseUrl: this.config.base,
      medium: MediaType.TEXT,
      domain: this.config.domain || ({ pattern: "", flags: "" } as JsonRegex),
      tocConfig: toArray(this.config.toc),
      searchConfig: this.config.search && { ...this.config.search },
      newsConfig: this.config.news && { ...this.config.news },
      downloadConfig: this.config.download && { ...this.config.download },
      logger: new Logger("custom-hook-form"),
    };
  },
  computed: {
    hookModel(): CustomHook {
      return {
        ...this.hook,
        name: this.name,
        comment: this.comment,
        hookState: this.enabled ? HookState.ENABLED : HookState.DISABLED,
      };
    },
    configModel(): HookConfig {
      return {
        version: 1,
        name: this.name,
        domain: this.domain,
        base: this.baseUrl,
        medium: Number(this.medium),
        download: this.downloadConfig,
        news: this.newsConfig,
        toc: this.tocConfig,
        search: this.searchConfig,
      };
    },
  },
  watch: {
    hookModel: {
      handler(newValue: CustomHook) {
        if (deepEqual(newValue, this.hook)) {
          this.logger.info("Did not update hook");
        } else {
          this.logger.info("Updated hook");
          this.$emit("update:hook", newValue);
        }
      },
      deep: true,
    },
    configModel: {
      handler(newValue: HookConfig) {
        if (deepEqual(newValue, this.hook)) {
          this.logger.info("Did not update config");
        } else {
          this.logger.info("Updated config");
          this.$emit("update:config", newValue);
        }
      },
      deep: true,
    },
    hook: {
      handler(newValue: CustomHook) {
        if (newValue.comment !== this.comment) {
          this.comment = newValue.comment;
        }
        const enabled = newValue.hookState === HookState.ENABLED;
        if (enabled !== this.enabled) {
          this.enabled = enabled;
        }
        if (newValue.name !== this.name) {
          this.name = newValue.name;
        }
      },
      deep: true,
    },
    config: {
      handler(newValue: HookConfig) {
        if (newValue.base !== this.baseUrl) {
          this.baseUrl = newValue.base;
        }
        if (newValue.medium !== this.medium) {
          this.medium = newValue.medium;
        }
        if (newValue.name !== this.name) {
          this.name = newValue.name;
        }
        if (!deepEqual(newValue.domain, this.domain)) {
          this.domain = newValue.domain;
        }
        if (!deepEqual(newValue.news, this.newsConfig)) {
          this.newsConfig = newValue.news;
        }
        if (!deepEqual(newValue.toc, this.tocConfig)) {
          this.tocConfig = toArray(newValue.toc);
        }
        if (!deepEqual(newValue.download, this.downloadConfig)) {
          this.downloadConfig = newValue.download;
        }
        if (!deepEqual(newValue.search, this.searchConfig)) {
          this.searchConfig = newValue.search;
        }
      },
      deep: true,
    },
  },
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    removeConfig(prop: "searchConfig" | "newsConfig" | "downloadConfig") {
      this[prop] = undefined;
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
    addSelector(config: any) {
      if (!Array.isArray(config.selector)) {
        config.selector = toArray(config.selector);
      }
      config.selector.push({
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
