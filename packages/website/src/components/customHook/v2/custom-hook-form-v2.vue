<template>
  <div class="container p-4">
    <div class="row mb-3 align-items-center">
      <p-button label="Show Hook Model" @click="data.showHookModel = true" />
      <p-button class="mt-1" label="Show Config Model" @click="data.showConfigModel = true" />
      <label for="validationCustom01" class="form-label" style="flex: 0.12 0 0%">Hook name</label>
      <input
        id="validationCustom01"
        v-model="data.name"
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
        v-model="data.hookModel.comment"
        class="form-control"
        placeholder="Leave a comment here"
      ></textarea>
      <label for="floatingTextarea">Comments</label>
    </div>
    <select v-model.number="data.configModel.medium" class="form-select mb-3" aria-label="Select Hook Medium">
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
          v-model="data.configModel.base"
          type="text"
          class="form-control"
          placeholder="Base URL for Links"
          required
        />
      </div>
      <regex v-model="data.configModel.domain" regex-name="Valid domain regex" />
    </div>
    <div>
      <div>
        <button class="btn btn-primary me-1" role="button" :disabled="!!data.configModel.toc" @click="addToc">
          Create Toc Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!data.configModel.search" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!data.configModel.news" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="!!data.configModel.download" @click="addDownload">
          Create Download Scraper
        </button>
      </div>
      <toc-config
        v-if="data.configModel.toc"
        v-model="data.configModel.toc"
        id-prefix="'toc'"
        @delete="removeConfig('toc')"
      />
      <search-config
        v-if="data.configModel.search"
        v-model="data.configModel.search"
        id-prefix="search"
        @delete="removeConfig('search')"
      />
      <news-config
        v-if="data.configModel.news"
        v-model="data.configModel.news"
        id-prefix="news"
        @delete="removeConfig('news')"
      />
      <download-config
        v-if="data.configModel.download"
        v-model="data.configModel.download"
        id-prefix="download"
        @delete="removeConfig('download')"
      />
    </div>
  </div>
  <p-dialog
    v-model:visible="data.showHookModel"
    class="container-fluid"
    header="Hook Model"
    @hide="data.showHookModel = false"
  >
    <div>
      <p-button label="Save" @click="saveHookStringModel" />
      <textarea v-model="data.hookModelString" class="w-100" style="min-height: 500px"></textarea>
    </div>
  </p-dialog>
  <p-dialog
    v-model:visible="data.showConfigModel"
    class="container-fluid"
    header="Config Model"
    @hide="data.showConfigModel = false"
  >
    <div>
      <p-button label="Save" @click="saveConfigStringModel" />
      <div>
        <p v-for="line in data.dialogError" :key="line">{{ line }}</p>
      </div>
      <textarea v-model="data.configModelString" class="w-100" style="min-height: 500px"></textarea>
    </div>
  </p-dialog>
</template>
<script lang="ts" setup>
import { CustomHook, HookState } from "enterprise-core/dist/types";
import { validateHookConfig } from "enterprise-scraper/dist/externals/customv2/validation";
import { HookConfig } from "enterprise-scraper/dist/externals/customv2/types";
import { computed, PropType, reactive, toRef, watch, watchEffect } from "vue";
import "bootstrap/js/dist/collapse";
import { deepEqual, Logger } from "../../../init";
import NewsConfig from "./news-config.vue";
import TocConfig from "./toc-config.vue";
import SearchConfig from "./search-config.vue";
import DownloadConfig from "./download-config.vue";
import Regex from "../regex.vue";

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
  name: "",
  hookModel: { ...props.hook },
  configModel: { ...props.config },
  showHookModel: false,
  showConfigModel: false,
  configModelString: "",
  hookModelString: "",
  dialogError: [] as string[],
});
const enabled = computed({
  get() {
    return data.hookModel.hookState ? props.hook.hookState === HookState.ENABLED : true;
  },
  set(value: boolean) {
    data.hookModel.hookState = value ? HookState.ENABLED : HookState.DISABLED;
  },
});

watchEffect(() => {
  data.hookModel.name = data.name;
  data.configModel.name = data.name;
});

watchEffect(() => {
  if (data.showHookModel) {
    data.dialogError = [];
    data.hookModelString = JSON.stringify(props.hook, undefined, 2);
  }
});

watchEffect(() => {
  if (data.showConfigModel) {
    data.dialogError = [];
    data.configModelString = JSON.stringify(props.config, undefined, 2);
  }
});

watch(
  toRef(data, "hookModel"),
  (newValue) => {
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
  toRef(data, "configModel"),
  (newValue) => {
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
  (newValue) => {
    if (!deepEqual(newValue, data.hookModel)) {
      data.hookModel = { ...newValue };
    }
  },
  { deep: true },
);
watch(
  toRef(props, "config"),
  (newValue) => {
    if (!deepEqual(newValue, data.configModel)) {
      data.configModel = { ...newValue };
    }
  },
  { deep: true },
);

function saveHookStringModel() {
  try {
    const value = JSON.parse(data.hookModelString);
    emits("update:hook", value);
  } catch (error) {
    logger.error(error);
  }
}

function saveConfigStringModel() {
  try {
    const value = JSON.parse(data.configModelString);
    const validated = validateHookConfig(value);

    if (validated.errors.length) {
      data.dialogError = validated.errors.map((v) => v.message);
    } else {
      data.dialogError = [];
      emits("update:config", value);
    }
  } catch (error) {
    data.dialogError = [error + ""];
    logger.error(error);
  }
}

function removeConfig(prop: "search" | "news" | "download" | "toc") {
  data.configModel[prop] = undefined;
}

function addToc() {
  data.configModel.toc = {
    data: [],
    regexes: {},
  };
}

function addNews() {
  data.configModel.news = {
    newsUrl: "",
    regexes: {},
    data: [],
  };
}

function addSearch() {
  data.configModel.search = {
    searchUrl: "",
    regexes: {},
    data: [],
  };
}

function addDownload() {
  data.configModel.download = {
    regexes: {},
    data: [],
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
