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
      Failed at saved CustomHook {{ value.name }}
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
        <button class="btn btn-primary" :disabled="!value['news']" @click="testHook('news')">Test News</button>
        <button class="btn btn-primary" :disabled="!value['toc']" @click="testHook('toc')">Test ToC</button>
        <button class="btn btn-primary" :disabled="!value['search']" @click="testHook('search')">Test Search</button>
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
      <template v-else-if="result">{{ result }}</template>
    </div>
    <div v-if="invalid" class="alert alert-danger" role="alert">Invalid JSON: {{ invalid }}</div>
    <prism-editor v-model="code" class="my-editor" :highlight="highlighter" line-numbers></prism-editor>
  </div>
</template>

<script lang="ts">
// import Prism Editor
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
// @ts-expect-error
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-twilight.css"; // import syntax highlighting styles
import type { HookConfig } from "enterprise-scraper/dist/externals/custom/types";
import { HttpClient } from "../Httpclient";
import { defineComponent } from "@vue/runtime-core";
import { HookState } from "../siteTypes";
import { CustomHook } from "enterprise-core/dist/types";

interface Data {
  code: string;
  invalid: string;
  param: string;
  result: string;
  loading: boolean;
  createResult?: "success" | "failed";
  value: Partial<HookConfig>;
  hook: Partial<CustomHook>;
}

export default defineComponent({
  components: {
    PrismEditor,
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
      code: "",
      invalid: "",
      param: "",
      result: "",
      value: {},
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
  watch: {
    code(newValue: string) {
      try {
        // TODO: debounce this
        this.value = JSON.parse(newValue);
        this.invalid = "";
      } catch (e) {
        if (e && typeof e === "object" && "message" in e) {
          this.invalid = (e as Record<string, any>).message;
        } else {
          this.invalid = e + "";
        }
      }
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    highlighter(code: string) {
      return highlight(code, languages.json); // languages.<insert language> to return html with markup
    },

    testHook(hookKey: keyof HookConfig) {
      if (this.loading) {
        return;
      }
      this.loading = true;

      HttpClient.testHook({
        config: this.value as any,
        key: hookKey,
        param: this.param,
      })
        .then((value) => (this.result = JSON.stringify(value)))
        .catch((value) => (this.result = JSON.stringify(value)))
        .finally(() => (this.loading = false));
    },

    load() {
      if (this.id) {
        this.hook = { ...this.$store.state.hooks.hooks[this.id] };
        this.code = this.hook.state || "";
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

      this.hook.state = this.code;

      const action = this.hook.id ? "updateHook" : "createHook";

      this.$store
        .dispatch(action, this.hook)
        .then((value: CustomHook) => {
          console.log(value);
          this.hook = value;
          this.code = value.state;
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

<style>
/* required class */
.my-editor {
  /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
  background: #2d2d2d;
  color: #ccc;

  /* you must provide font-family font-size line-height. Example: */
  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px;
  max-height: 800px;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
  outline: none;
}
</style>