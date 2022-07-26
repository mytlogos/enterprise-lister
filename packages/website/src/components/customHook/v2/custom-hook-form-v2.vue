<template>
  <div class="container p-4">
    <div class="row mb-3 align-items-center">
      <p-button label="Show Hook Model" @click="showHookModel = true" />
      <p-button class="mt-1" label="Show Config Model" @click="showConfigModel = true" />
      <label for="validationCustom01" class="form-label" style="flex: 0.12 0 0%">Hook name</label>
      <input
        id="validationCustom01"
        v-model="hookModel.name"
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
        v-model="hookModel.comment"
        class="form-control"
        placeholder="Leave a comment here"
      ></textarea>
      <label for="floatingTextarea">Comments</label>
    </div>
    <select v-model.number="configModel.medium" class="form-select mb-3" aria-label="Select Hook Medium">
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
          v-model="configModel.base"
          type="text"
          class="form-control"
          placeholder="Base URL for Links"
          required
        />
      </div>
      <regex v-model="configModel.domain" regex-name="Valid domain regex" />
    </div>
    <div>
      <div>
        <button class="btn btn-primary me-1" role="button" :disabled="!!configModel.toc" @click="addToc">
          Create Toc Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!configModel.search" @click="addSearch">
          Create Search Scraper
        </button>
        <button class="btn btn-primary me-1" role="button" :disabled="!!configModel.news" @click="addNews">
          Create News Scraper
        </button>
        <button class="btn btn-primary" role="button" :disabled="!!configModel.download" @click="addDownload">
          Create Download Scraper
        </button>
      </div>
      <toc-config v-if="configModel.toc" v-model="configModel.toc" id-prefix="'toc'" @delete="removeConfig('toc')" />
      <search-config
        v-if="configModel.search"
        v-model="configModel.search"
        id-prefix="search"
        @delete="removeConfig('search')"
      />
      <news-config v-if="configModel.news" v-model="configModel.news" id-prefix="news" @delete="removeConfig('news')" />
      <download-config
        v-if="configModel.download"
        v-model="configModel.download"
        id-prefix="download"
        @delete="removeConfig('download')"
      />
    </div>
  </div>
  <p-dialog v-model:visible="showHookModel" class="container-fluid" header="Hook Model" @hide="showHookModel = false">
    <div>
      <p-button label="Save" @click="saveHookStringModel" />
      <textarea v-model="hookModelString" class="w-100" style="min-height: 500px"></textarea>
    </div>
  </p-dialog>
  <p-dialog
    v-model:visible="showConfigModel"
    class="container-fluid"
    header="Config Model"
    @hide="showConfigModel = false"
  >
    <div>
      <p-button label="Save" @click="saveConfigStringModel" />
      <div>
        <p v-for="line in dialogError" :key="line">{{ line }}</p>
      </div>
      <textarea v-model="configModelString" class="w-100" style="min-height: 500px"></textarea>
    </div>
  </p-dialog>
</template>
<script lang="ts">
import { CustomHook, HookState } from "enterprise-core/dist/types";
import { validateHookConfig, ValidationError } from "enterprise-scraper/dist/externals/customv2/validation";
import { HookConfig } from "enterprise-scraper/dist/externals/customv2/types";
import { defineComponent, PropType } from "vue";
import "bootstrap/js/dist/collapse";
import { deepEqual, Logger } from "../../../init";
import NewsConfigComp from "./news-config.vue";
import TocConfigComp from "./toc-config.vue";
import SearchConfigComp from "./search-config.vue";
import DownloadConfigComp from "./download-config.vue";
import Regex from "../regex.vue";

export default defineComponent({
  name: "CustomHookForm",
  components: {
    SearchConfig: SearchConfigComp,
    DownloadConfig: DownloadConfigComp,
    TocConfig: TocConfigComp,
    NewsConfig: NewsConfigComp,
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
      hookModel: { ...this.hook },
      configModel: { ...this.config },
      logger: new Logger("custom-hook-form"),
      showHookModel: false,
      showConfigModel: false,
      configModelString: "",
      hookModelString: "",
      dialogError: [] as string[],
    };
  },
  computed: {
    enabled: {
      get() {
        return this.hookModel.hookState ? this.hook.hookState === HookState.ENABLED : true;
      },
      set(value: boolean) {
        this.hookModel.hookState = value ? HookState.ENABLED : HookState.DISABLED;
      },
    },
  },
  watch: {
    showHookModel() {
      if (this.showHookModel) {
        this.dialogError = [];
        this.hookModelString = JSON.stringify(this.hook, undefined, 2);
      }
    },
    showConfigModel() {
      if (this.showConfigModel) {
        this.dialogError = [];
        this.configModelString = JSON.stringify(this.config, undefined, 2);
      }
    },
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
        if (!deepEqual(newValue, this.hookModel)) {
          this.hookModel = { ...newValue };
        }
      },
      deep: true,
    },
    config: {
      handler(newValue: HookConfig) {
        if (!deepEqual(newValue, this.configModel)) {
          this.configModel = { ...newValue };
        }
      },
      deep: true,
    },
  },
  methods: {
    saveHookStringModel() {
      try {
        const value = JSON.parse(this.hookModelString);
        this.$emit("update:hook", value);
      } catch (error) {
        this.logger.error(error);
      }
    },
    saveConfigStringModel() {
      try {
        const value = JSON.parse(this.configModelString);
        const validated = validateHookConfig(value);

        if (validated.errors.length) {
          this.dialogError = validated.errors.map((v) => {
            if (v instanceof ValidationError) {
              return v.stack;
            } else {
              return v.message;
            }
          });
        } else {
          this.dialogError = [];
          this.$emit("update:config", value);
        }
      } catch (error) {
        this.dialogError = [error + ""];
        this.logger.error(error);
      }
    },
    removeConfig(prop: "search" | "news" | "download" | "toc") {
      this.configModel[prop] = undefined;
    },
    addToc() {
      this.configModel.toc = {
        data: [],
        regexes: {},
      };
    },
    addNews() {
      this.configModel.news = {
        newsUrl: "",
        regexes: {},
        data: [],
      };
    },
    addSearch() {
      this.configModel.search = {
        searchUrl: "",
        regexes: {},
        data: [],
      };
    },
    addDownload() {
      this.configModel.download = {
        regexes: {},
        data: [],
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
