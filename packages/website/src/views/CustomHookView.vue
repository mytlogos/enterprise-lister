<template>
  <div class="w-100">
    <div class="row">
      <div class="col text-end">
        <button class="btn btn-success" @click="save">Save</button>
      </div>
    </div>
    <div v-if="data.createResult === 'success'" class="alert alert-success" role="alert">
      Successfully saved CustomHook {{ data.value.name }}
    </div>
    <div v-else-if="data.createResult === 'failed'" class="alert alert-danger" role="alert">
      Failed saving CustomHook {{ data.value.name }}
    </div>
    <div class="row">
      <div class="col">
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <label for="param" class="form-label">Parameter</label>
          </div>
          <div class="col-auto">
            <input id="param" v-model="data.param" class="form-control" name="param" type="text" />
          </div>
        </div>
      </div>
      <div class="col text-end">
        <button class="btn btn-primary me-1" :disabled="!data.value['news']" @click="testHook('news')">
          Test News
        </button>
        <button
          class="btn btn-primary me-1"
          :disabled="!data.value['toc'] || (Array.isArray(data.value.toc) && !data.value.toc.length)"
          @click="testHook('toc')"
        >
          Test ToC
        </button>
        <button class="btn btn-primary me-1" :disabled="!data.value['search']" @click="testHook('search')">
          Test Search
        </button>
        <button class="btn btn-primary" :disabled="!data.value['download']" @click="testHook('download')">
          Test Download
        </button>
      </div>
    </div>
    <div>Result:</div>
    <div v-if="data.loading || data.result" class="alert alert-info" role="alert">
      <div v-if="data.loading" class="d-flex align-items-center">
        <strong>Processing...</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
      </div>
      <span v-else-if="data.result" style="white-space: pre">{{ data.result }}</span>
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
        <custom-hook-form v-model:hook="data.hook" v-model:config="data.value" />
      </div>
      <div id="hook-editor" class="tab-pane fade" role="tabpanel" :class="{ 'show active': isActiveTab('editor') }">
        <div v-if="data.invalid" class="alert alert-danger" role="alert">Invalid JSON: {{ data.invalid }}</div>
        <prism-editor v-model="data.code" class="my-editor" :highlight="highlighter" line-numbers></prism-editor>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
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
import { reactive, watchEffect } from "vue";
import { CustomHook } from "enterprise-core/dist/types";
import CustomHookForm from "../components/customHook/custom-hook-form.vue";
import { clone, deepEqual, Logger } from "../init";
import { useHookStore } from "../store/hooks";

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
}

const props = defineProps({
  id: {
    type: Number,
    default: 0,
  },
});

const logger = new Logger("CustomHookView");
const data = reactive<Data>({
  loading: false,
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
    enabled: true,
    state: "",
  },
  createResult: undefined,
  activeTab: "form",
});

// WATCHES
watchEffect(() => {
  try {
    // TODO: debounce data
    setConfig(JSON.parse(data.code));
    data.invalid = "";
  } catch (e) {
    if (e && typeof e === "object" && "message" in e) {
      data.invalid = (e as Record<string, any>).message;
    } else {
      data.invalid = e + "";
    }
  }
});

watchEffect(() => {
  data.code = JSON.stringify(data.value, undefined, 2);
});

load();

function setConfig(value: HookConfig) {
  if (deepEqual(value, data.value)) {
    logger.info("No config update required");
    return;
  }
  logger.info("Updated HookConfig");
  data.value = value;
}

function isActiveTab(tab: Data["activeTab"]) {
  return data.activeTab === tab;
}

function setActiveTab(tab: Data["activeTab"]) {
  data.activeTab = tab;
}

function highlighter(code: string) {
  return highlight(code, languages.json); // languages.<insert language> to return html with markup
}

function cleanSelector(value: any) {
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
    cleanSelector(child);
  }
}

function cleanEmptyObject(value: any) {
  if (typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const keyValue = value[index];

      if (typeof keyValue === "object" && keyValue) {
        cleanEmptyObject(keyValue);

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
      cleanEmptyObject(keyValue);

      if (!Object.keys(keyValue).length) {
        delete value[key];
      }
    } else if (typeof keyValue === "string" && !keyValue) {
      delete value[key];
    }
  }
}

function clean(value: any) {
  if (!value) {
    return;
  }
  if (Array.isArray(value.selector)) {
    value.selector.forEach((selector: any) => cleanSelector(selector));
  } else {
    cleanSelector(value.selector);
  }
  cleanEmptyObject(value);
}

function testHook(hookKey: keyof HookConfig) {
  if (data.loading) {
    return;
  }
  data.loading = true;

  const hookConfig = clone(data.value);
  clean(hookConfig.news);
  clean(hookConfig.toc);
  clean(hookConfig.download);
  clean(hookConfig.search);

  HttpClient.testHook({
    config: hookConfig,
    key: hookKey,
    param: data.param,
  })
    .then((value) => (data.result = JSON.stringify(value)))
    .catch((value) => {
      data.result = (value.message ? value.message + "\n" : "") + JSON.stringify(value);
    })
    .finally(() => (data.loading = false));
}

function load() {
  if (props.id) {
    const hookStore = useHookStore();
    // simple but stupid way to clone the hook, firefox went off alone in 94 and introduced "structuredClone" (with Node 17 support at data time)
    // when there is wider support, maybe use that, else if lodash is ever used use that cloneDeep
    data.hook = clone(hookStore.hooks[props.id]);
    data.code = data.hook.state || "";
  }
}

function save() {
  if (data.value.name && !data.hook.name) {
    data.hook.name = data.value.name;
  }

  if (!data.hook.name) {
    console.error("No name defined!");
    return;
  }

  data.hook.state = data.code;

  const hookStore = useHookStore();
  const action = data.hook.id ? hookStore.updateHook : hookStore.createHook;

  // @ts-expect-error
  action(data.hook)
    .then((value: CustomHook) => {
      console.log(value);
      data.hook = value;
      data.code = value.state;
      data.createResult = "success";
    })
    .catch((value: any) => {
      console.log(value);
      data.createResult = "failed";
    });
}
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
