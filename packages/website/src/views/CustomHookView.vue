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
    <ul class="nav nav-tabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          data-bs-toggle="tab"
          class="nav-link"
          :class="{ active: isActiveTab('form') }"
          data-bs-target="#hook-form"
          type="button"
          role="tab"
          @click.prevent="setActiveTab('form')"
        >
          Form
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          data-bs-toggle="tab"
          class="nav-link"
          :class="{ active: isActiveTab('editor') }"
          data-bs-target="#hook-editor"
          type="button"
          role="tab"
          @click.prevent="setActiveTab('editor')"
        >
          JSON Editor
        </button>
      </li>
    </ul>
    <div class="tab-content container p-4">
      <div id="hook-form" class="tab-pane fade" role="tabpanel" :class="{ 'show active': isActiveTab('form') }">
        <custom-hook-form v-model:hook="hook" v-model:config="value" />
      </div>
      <div id="hook-editor" class="tab-pane fade" role="tabpanel" :class="{ 'show active': isActiveTab('editor') }">
        <div v-if="invalid" class="alert alert-danger" role="alert">Invalid JSON: {{ invalid }}</div>
        <prism-editor v-model="code" class="my-editor" :highlight="highlighter" line-numbers></prism-editor>
      </div>
    </div>
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
import type { HookConfig, JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { HookState } from "../siteTypes";
import { CustomHook } from "enterprise-core/dist/types";
import CustomHookForm from "../components/customHook/custom-hook-form.vue";
import { clone, deepEqual, Logger } from "../init";

interface Data {
  code: string;
  invalid: string;
  param: string;
  result: string;
  loading: boolean;
  createResult?: "success" | "failed";
  value: HookConfig;
  hook: Partial<CustomHook>;
  activeTab: "form" | "editor";
  logger: Logger;
}

interface BasicSelector {
  regex?: JsonRegex;
  children: BasicSelector[];
}

export default defineComponent({
  components: {
    PrismEditor,
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
      code: "",
      invalid: "",
      param: "",
      result: "",
      value: {
        version: 1,
        name: "",
        base: "",
        domain: {
          flags: "",
          pattern: "",
        },
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
      activeTab: "form",
    };
  },
  watch: {
    code(newValue: string) {
      try {
        // TODO: debounce this
        this.setConfig(JSON.parse(newValue));
        this.invalid = "";
      } catch (e) {
        if (e && typeof e === "object" && "message" in e) {
          this.invalid = (e as Record<string, any>).message;
        } else {
          this.invalid = e + "";
        }
      }
    },
    value(newValue: any) {
      this.code = JSON.stringify(newValue, undefined, 2);
    },
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
    validateSelector<T extends BasicSelector>(value: T) {
      if (!value.regex) {
        value.regex = { pattern: "", flags: "" };
      }
      if (value.children) {
        value.children.forEach((child: BasicSelector) => this.validateSelector(child));
      }
    },
    isActiveTab(tab: Data["activeTab"]) {
      return this.activeTab === tab;
    },
    setActiveTab(tab: Data["activeTab"]) {
      this.activeTab = tab;
    },
    highlighter(code: string) {
      return highlight(code, languages.json); // languages.<insert language> to return html with markup
    },
    cleanSelector(value: any) {
      if (!value) {
        return;
      }
      if (typeof value.regex === "object" && !value.regex.pattern && !value.regex.flags) {
        delete value.regex;

        for (const transfer of value.transfers || []) {
          if (!transfer.extract) {
            delete transfer.extract;
          }
        }
        for (const variable of value.variables || []) {
          if (!variable.value) {
            delete variable.value;
          }
        }
      }
      for (const child of value.children || []) {
        this.cleanSelector(child);
      }
    },
    cleanEmptyObject(value: any) {
      if (typeof value !== "object") {
        return;
      }
      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
          const keyValue = value[index];

          if (typeof keyValue === "object" && keyValue) {
            this.cleanEmptyObject(keyValue);

            if (!Object.keys(keyValue).length) {
              value.splice(index, 1);
              index--;
            }
          } else if (typeof keyValue === "string" && !keyValue) {
            value.splice(index, 1);
            index--;
          }
        }
        return;
      }
      for (const [key, keyValue] of Object.entries(value)) {
        if (typeof keyValue === "object" && keyValue) {
          this.cleanEmptyObject(keyValue);

          if (!Object.keys(keyValue).length) {
            delete value[key];
          }
        } else if (typeof keyValue === "string" && !keyValue) {
          delete value[key];
        }
      }
    },
    clean(value: any) {
      if (!value) {
        return;
      }
      if (Array.isArray(value.selector)) {
        value.selector.forEach((selector: any) => this.cleanSelector(selector));
      } else {
        this.cleanSelector(value.selector);
      }
      this.cleanEmptyObject(value);
    },
    testHook(hookKey: keyof HookConfig) {
      if (this.loading) {
        return;
      }
      this.loading = true;

      const hookConfig = clone(this.value);
      this.clean(hookConfig.news);
      this.clean(hookConfig.toc);
      this.clean(hookConfig.download);
      this.clean(hookConfig.search);

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
