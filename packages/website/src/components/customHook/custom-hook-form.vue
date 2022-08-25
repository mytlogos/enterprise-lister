<template>
  <div class="container p-4">
    <div class="row mb-3 align-items-center">
      <label for="validationCustom01" class="form-label" style="flex: 0.12 0 0%">Hook name</label>
      <input
        id="validationCustom01"
        v-model="data.name"
        type="text"
        class="col form-control"
        placeholder="Name required"
        required
      />
      <div class="col-3 form-check form-switch ms-5">
        <input
          id="hookEnabled"
          v-model="data.enabled"
          class="form-check-input"
          type="checkbox"
          role="switch"
          :checked="data.enabled"
        />
        <label class="form-check-label" for="hookEnabled">Hook Enabled</label>
      </div>
    </div>
    <div class="form-floating mb-3">
      <textarea
        id="floatingTextarea"
        v-model="data.comment"
        class="form-control"
        placeholder="Leave a comment here"
      ></textarea>
      <label for="floatingTextarea">Comments</label>
    </div>
    <select v-model="data.medium" class="form-select mb-3" aria-label="Select Hook Medium">
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
          v-model="data.baseUrl"
          type="text"
          class="form-control"
          placeholder="Base URL for Links"
          required
        />
      </div>
      <regex v-model="data.domain" regex-name="Valid domain regex" />
    </div>
    <div>
      <div>
        <button class="btn btn-primary me-1" role="button" @click="addToc">Create Toc Scraper</button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!data.searchConfig" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!data.newsConfig" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="!!data.downloadConfig" @click="addDownload">
          Create Download Scraper
        </button>
      </div>
      <template v-for="(item, index) in data.tocConfig" :key="index">
        <scraper-config
          v-model="data.tocConfig[index]"
          :id-prefix="'tocConfig' + index + '-'"
          :name="'TocConfig ' + index"
          @delete="remove(data.tocConfig, index)"
        />
      </template>
      <template v-if="data.searchConfig">
        <scraper-config
          v-model="data.searchConfig"
          id-prefix="searchConfig"
          name="SearchConfig"
          @delete="removeConfig('searchConfig')"
        >
          <div class="col">
            <label for="newsUrl" class="form-label">Search URL</label>
            <input
              id="newsUrl"
              v-model="data.searchConfig.searchUrl"
              type="text"
              class="form-control"
              placeholder="https://iamanewspage.com/"
              required
            />
          </div>
        </scraper-config>
      </template>
      <template v-if="data.newsConfig">
        <scraper-config
          v-model="data.newsConfig"
          id-prefix="newsConfig"
          name="NewsConfig"
          @delete="removeConfig('newsConfig')"
        >
          <div class="col">
            <label for="newsUrl" class="form-label">News URL</label>
            <input
              id="newsUrl"
              v-model="data.newsConfig.newsUrl"
              type="text"
              class="form-control"
              placeholder="https://iamanewspage.com/"
              required
            />
          </div>
        </scraper-config>
      </template>
      <template v-if="data.downloadConfig">
        <scraper-config
          v-model="data.downloadConfig"
          id-prefix="downloadConfig"
          name="DownloadConfig"
          @delete="removeConfig('downloadConfig')"
        />
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { CustomHook, HookState } from "enterprise-core/dist/types";
import { HookConfig } from "enterprise-scraper/dist/externals/custom/types";
import { computed, PropType, reactive, toRef, watch } from "vue";
import ScraperConfig from "./scraper-config.vue";
import Regex from "./regex.vue";
import "bootstrap/js/dist/collapse";
import { toArray, deepEqual, Logger } from "../../init";
import { MediaType } from "../../siteTypes";

const props = defineProps({
  hook: {
    type: Object as PropType<CustomHook>,
    required: true,
  },
  config: {
    type: Object as PropType<HookConfig>,
    required: true,
  },
});
const emits = defineEmits(["update:hook", "update:config"]);
const logger = new Logger("custom-hook-form");

const data = reactive({
  name: props.hook.name,
  enabled: props.hook.hookState ? props.hook.hookState === HookState.ENABLED : true,
  comment: props.hook.comment,
  baseUrl: props.config.base,
  medium: MediaType.TEXT,
  domain: props.config.domain || { pattern: "", flags: "" },
  tocConfig: toArray(props.config.toc),
  searchConfig: props.config.search && { ...props.config.search },
  newsConfig: props.config.news && { ...props.config.news },
  downloadConfig: props.config.download && { ...props.config.download },
});

const hookModel = computed((): CustomHook => {
  return {
    ...props.hook,
    name: data.name,
    comment: data.comment,
    hookState: data.enabled ? HookState.ENABLED : HookState.DISABLED,
  };
});

const configModel = computed((): HookConfig => {
  return {
    version: 1,
    name: data.name,
    domain: data.domain,
    base: data.baseUrl,
    medium: Number(data.medium),
    download: data.downloadConfig,
    news: data.newsConfig,
    toc: data.tocConfig,
    search: data.searchConfig,
  };
});

watch(
  hookModel,
  (newValue: CustomHook) => {
    if (deepEqual(newValue, props.hook)) {
      logger.info("Did not update hook");
    } else {
      logger.info("Updated hook");
      emits("update:hook", newValue);
    }
  },
  { deep: true },
);
watch(
  configModel,
  (newValue: HookConfig) => {
    if (deepEqual(newValue, props.hook)) {
      logger.info("Did not update config");
    } else {
      logger.info("Updated config");
      emits("update:config", newValue);
    }
  },
  { deep: true },
);

watch(
  toRef(props, "hook"),
  (newValue: CustomHook) => {
    if (newValue.comment !== data.comment) {
      data.comment = newValue.comment;
    }
    const enabled = newValue.hookState === HookState.ENABLED;
    if (enabled !== data.enabled) {
      data.enabled = enabled;
    }
    if (newValue.name !== data.name) {
      data.name = newValue.name;
    }
  },
  { deep: true },
);

watch(
  toRef(props, "config"),
  (newValue: HookConfig) => {
    if (newValue.base !== data.baseUrl) {
      data.baseUrl = newValue.base;
    }
    if (newValue.medium !== data.medium) {
      data.medium = newValue.medium;
    }
    if (newValue.name !== data.name) {
      data.name = newValue.name;
    }
    if (!deepEqual(newValue.domain, data.domain)) {
      data.domain = newValue.domain;
    }
    if (!deepEqual(newValue.news, data.newsConfig)) {
      data.newsConfig = newValue.news;
    }
    if (!deepEqual(newValue.toc, data.tocConfig)) {
      data.tocConfig = toArray(newValue.toc);
    }
    if (!deepEqual(newValue.download, data.downloadConfig)) {
      data.downloadConfig = newValue.download;
    }
    if (!deepEqual(newValue.search, data.searchConfig)) {
      data.searchConfig = newValue.search;
    }
  },
  { deep: true },
);

function remove(array: any[], index: number) {
  array.splice(index, 1);
}

function removeConfig(prop: "searchConfig" | "newsConfig" | "downloadConfig") {
  data[prop] = undefined;
}

function addToc() {
  data.tocConfig.push({
    selector: [{ selector: "" }],
    prefix: undefined,
    base: undefined,
    request: undefined,
  });
}

function addNews() {
  data.newsConfig = {
    newsUrl: "",
    selector: [{ selector: "" }],
  };
}

function addSearch() {
  data.searchConfig = {
    searchUrl: "",
    base: undefined,
    request: undefined,
    selector: [{ selector: "" }],
  };
}

function addDownload() {
  data.downloadConfig = {
    prefix: undefined,
    base: undefined,
    request: undefined,
    selector: [{ selector: "" }],
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
