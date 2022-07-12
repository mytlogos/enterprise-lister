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
      <template v-for="(item, index) in tocConfig" :key="index"> </template>
      <toc-config v-if="tocConfig" v-model="tocConfig" id-prefix="'tocConfig'" @delete="removeConfig('tocConfig')" />
      <search-config
        v-if="searchConfig"
        v-model="searchConfig"
        id-prefix="searchConfig"
        @delete="removeConfig('searchConfig')"
      />
      <news-config v-if="newsConfig" v-model="newsConfig" id-prefix="newsConfig" @delete="removeConfig('newsConfig')" />
      <download-config
        v-if="downloadConfig"
        v-model="downloadConfig"
        id-prefix="downloadConfig"
        @delete="removeConfig('downloadConfig')"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { CustomHook, HookState } from "enterprise-core/dist/types";
import { HookConfig, NewsConfig, TocConfig } from "enterprise-scraper/dist/externals/customv2/types";
import { defineComponent, PropType } from "vue";
import "bootstrap/js/dist/collapse";
import { deepEqual, Logger } from "../../../init";
import { MediaType } from "../../../siteTypes";
import NewsConfigComp from "./news-config.vue";
import TocConfigComp from "./toc-config.vue";
import SearchConfigComp from "./search-config.vue";
import DownloadConfigComp from "./download-config.vue";

export default defineComponent({
  name: "CustomHookForm",
  components: {
    SearchConfig: SearchConfigComp,
    DownloadConfig: DownloadConfigComp,
    TocConfig: TocConfigComp,
    NewsConfig: NewsConfigComp,
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
      tocConfig: undefined as undefined | TocConfig,
      searchConfig: this.config.search && { ...this.config.search },
      newsConfig: undefined as undefined | NewsConfig,
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
    configModel(): any {
      return {
        name: this.name,
        domain: {},
        base: this.baseUrl,
        medium: Number(this.medium),
        download: this.downloadConfig,
        news: {},
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
        if (newValue.medium != this.medium) {
          this.medium = newValue.medium;
        }
        if (newValue.name !== this.name) {
          this.name = newValue.name;
        }
        if (!deepEqual(newValue.news, this.newsConfig)) {
          this.newsConfig = newValue.news as any;
        }
        if (!deepEqual(newValue.toc, this.tocConfig)) {
          this.tocConfig = newValue.toc as any;
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
    removeConfig(prop: "searchConfig" | "newsConfig" | "downloadConfig" | "tocConfig") {
      this[prop] = undefined;
    },
    addToc() {
      this.tocConfig = {
        data: [],
        regexes: {},
      };
    },
    addNews() {
      this.newsConfig = {
        newsUrl: "",
        regexes: {},
        data: [],
      };
    },
    addSearch() {
      this.searchConfig = {
        searchUrl: "",
        regexes: {},
      };
    },
    addDownload() {
      this.downloadConfig = {
        regexes: {},
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
