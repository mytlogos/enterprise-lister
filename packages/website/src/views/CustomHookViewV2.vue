<template>
  <div class="w-100">
    <div class="row">
      <div class="col text-end">
        <button class="btn btn-success" @click="save">Save</button>
      </div>
    </div>
    <div v-if="createResult === 'success'" class="alert alert-success" role="alert">
      Successfully saved CustomHook {{ value.name }}
    </div>
    <div v-else-if="createResult === 'failed'" class="alert alert-danger" role="alert">
      Failed saving CustomHook {{ value.name }}
    </div>
    <div class="row">
      <div class="col">
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <label for="param" class="form-label">Parameter</label>
          </div>
          <div class="col-auto">
            <input id="param" v-model="param" class="form-control" name="param" type="text" />
          </div>
        </div>
      </div>
      <div class="col text-end">
        <button class="btn btn-primary me-1" :disabled="!value['news']" @click="testHook('news')">Test News</button>
        <button
          class="btn btn-primary me-1"
          :disabled="!value['toc'] || (Array.isArray(value.toc) && !value.toc.length)"
          @click="testHook('toc')"
        >
          Test ToC
        </button>
        <button class="btn btn-primary me-1" :disabled="!value['search']" @click="testHook('search')">
          Test Search
        </button>
        <button class="btn btn-primary" :disabled="!value['download']" @click="testHook('download')">
          Test Download
        </button>
      </div>
    </div>
    <div>Result:</div>
    <div v-if="loading || result" class="alert alert-info" role="alert">
      <div v-if="loading" class="d-flex align-items-center">
        <strong>Processing...</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
      </div>
      <span v-else-if="result" style="white-space: pre">{{ result }}</span>
    </div>
    <custom-hook-form v-model:hook="hook" v-model:config="value" />
  </div>
</template>

<script lang="ts">
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
// @ts-expect-error
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-twilight.css"; // import syntax highlighting styles
import type { HookConfig } from "enterprise-scraper/dist/externals/customv2/types";
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { HookState } from "../siteTypes";
import { CustomHook } from "enterprise-core/dist/types";
import CustomHookForm from "../components/customHook/v2/custom-hook-form-v2.vue";
import { clone, deepEqual, Logger } from "../init";

interface Data {
  invalid: string;
  param: string;
  result: string;
  loading: boolean;
  createResult?: "success" | "failed";
  value: HookConfig;
  hook: CustomHook;
  logger: Logger;
}

export default defineComponent({
  components: {
    CustomHookForm,
  },
  props: {
    id: {
      type: Number,
      default: 0,
    },
  },
  data(): Data {
    return {
      loading: false,
      logger: new Logger("CustomHookView"),
      invalid: "",
      param: "",
      result: "",
      value: {
        name: "",
        base: "",
        medium: 0,
      },
      hook: {
        id: 0,
        name: "",
        comment: "",
        hookState: HookState.ENABLED,
        state: "",
      },
      createResult: undefined,
    };
  },
  created() {
    this.load();
  },
  methods: {
    setConfig(value: HookConfig) {
      if (deepEqual(value, this.value)) {
        this.logger.info("No config update required");
        return;
      }
      this.logger.info("Updated HookConfig");
      this.value = value;
    },
    highlighter(code: string) {
      return highlight(code, languages.json); // languages.<insert language> to return html with markup
    },
    testHook(hookKey: keyof HookConfig) {
      if (this.loading) {
        return;
      }
      this.loading = true;

      const hookConfig = clone(this.value);

      HttpClient.testHook({
        config: hookConfig as any,
        key: hookKey,
        param: this.param,
      })
        .then((value) => (this.result = JSON.stringify(value)))
        .catch((value) => {
          this.result = (value.message ? value.message + "\n" : "") + JSON.stringify(value);
        })
        .finally(() => (this.loading = false));
    },

    load() {
      if (this.id) {
        // simple but stupid way to clone the hook, firefox went off alone in 94 and introduced "structuredClone" (with Node 17 support at this time)
        // when there is wider support, maybe use that, else if lodash is ever used use that cloneDeep
        this.hook = clone(this.$store.state.hooks.hooks[this.id]);
      }
    },

    save() {
      if (this.value.name && !this.hook.name) {
        this.hook.name = this.value.name;
      }

      if (!this.hook.name) {
        console.error("No name defined!");
        return;
      }

      this.hook.state = "this.code";

      const action = this.hook.id ? "updateHook" : "createHook";

      this.$store
        .dispatch(action, this.hook)
        .then((value: CustomHook) => {
          console.log(value);
          this.hook = value;
          this.createResult = "success";
        })
        .catch((value: any) => {
          console.log(value);
          this.createResult = "failed";
        });
    },
  },
});
</script>
