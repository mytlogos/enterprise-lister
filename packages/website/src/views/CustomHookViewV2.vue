<template>
  <div class="container">
    <div class="row px-4">
      <div class="col text-end">
        <button class="btn btn-success" @click="save">Save</button>
      </div>
    </div>
    <div v-if="data.createResult === 'success'" class="alert alert-success px-4" role="alert">
      Successfully saved CustomHook {{ data.value.name }}
    </div>
    <div v-else-if="data.createResult === 'failed'" class="alert alert-danger px-4" role="alert">
      Failed saving CustomHook {{ data.value.name }}
    </div>
    <div v-if="data.invalid.length" class="alert alert-danger px-4" role="alert">
      <p v-for="line in data.invalid" :key="line">{{ line }}</p>
    </div>
    <div class="row px-4">
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
        <button class="btn btn-primary me-1 mb-1" :disabled="!data.value['news']" @click="testHook('news')">
          Test News
        </button>
        <button
          class="btn btn-primary me-1 mb-1"
          :disabled="!data.value['toc'] || (Array.isArray(data.value.toc) && !data.value.toc.length)"
          @click="testHook('toc')"
        >
          Test ToC
        </button>
        <button class="btn btn-primary me-1 mb-1" :disabled="!data.value['search']" @click="testHook('search')">
          Test Search
        </button>
        <button class="btn btn-primary mb-1" :disabled="!data.value['download']" @click="testHook('download')">
          Test Download
        </button>
      </div>
    </div>
    <p-dialog v-model:visible="data.showResult" class="container-fluid" header="Result" @hide="data.result = ''">
      <div>
        <div v-if="data.loading" class="d-flex align-items-center alert alert-info" role="alert">
          <strong>Processing...</strong>
          <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
        </div>
        <textarea v-model="data.result" class="w-100" style="min-height: 500px; white-space: pre"></textarea>
      </div>
    </p-dialog>
    <custom-hook-form v-model:hook="data.hook" v-model:config="data.value" />
  </div>
</template>

<script lang="ts" setup>
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
import "prismjs/components/prism-core";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-twilight.css"; // import syntax highlighting styles
import type { HookConfig } from "enterprise-scraper/dist/externals/customv2/types";
import type { CustomHook } from "enterprise-core/src/database/databaseTypes";
import { HttpClient } from "../Httpclient";
import { reactive, watchEffect } from "vue";
import CustomHookForm from "../components/customHook/v2/custom-hook-form-v2.vue";
import { clone, Logger } from "../init";
import { validateHookConfig } from "enterprise-scraper/dist/externals/customv2/validation";
import { useHookStore } from "../store/hooks";

interface Data {
  showResult: boolean;
  invalid: string[];
  param: string;
  result: string;
  loading: boolean;
  createResult?: "success" | "failed";
  value: HookConfig;
  hook: CustomHook;
}
const props = defineProps({
  id: {
    type: Number,
    default: 0,
  },
});

const logger = new Logger("CustomHookViewV2");

const data = reactive<Data>({
  showResult: false,
  loading: false,
  invalid: [],
  param: "",
  result: "",
  value: {
    version: 2,
    name: "",
    base: "",
    medium: 0,
    domain: {
      flags: "",
      pattern: "",
    },
  },
  hook: {
    id: 0,
    name: "",
    comment: "",
    enabled: true,
    state: "",
  },
  createResult: undefined,
});

watchEffect(() => {
  data.showResult = !!data.loading || !!data.result;
});

load();

function testHook(hookKey: keyof HookConfig) {
  const hookConfig = clone(data.value);

  cleanEmptySelectors(hookConfig.download?.data, ["flags"]);
  cleanEmptySelectors(hookConfig.news?.data, ["flags"]);
  cleanEmptySelectors(hookConfig.toc?.data, ["flags"]);
  cleanEmptySelectors(hookConfig.search?.data, ["flags"]);

  // only set value if it is a valid config
  try {
    const result = validateHookConfig(hookConfig);

    if (result.valid) {
      data.value = hookConfig;
      data.invalid = [];
    } else {
      data.invalid = result.errors.map((v) => v.message);
      return;
    }
  } catch (error) {
    data.invalid = [error + ""];
    logger.error(error);
    return;
  }
  if (data.loading) {
    return;
  }
  data.loading = true;
  HttpClient.testHookV2({
    config: hookConfig,
    key: hookKey,
    param: data.param,
  })
    .then((value) => (data.result = JSON.stringify(value, undefined, 2)))
    .catch((value) => {
      data.result = (value.message ? value.message + "\n" : "") + JSON.stringify(value, undefined, 2);
    })
    .finally(() => (data.loading = false));
}

function load() {
  if (props.id) {
    const hookStore = useHookStore();
    // simple but stupid way to clone the hook, firefox went off alone in 94 and introduced "structuredClone" (with Node 17 support at data time)
    // when there is wider support, maybe use that, else if lodash is ever used use that cloneDeep
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    data.hook = clone(hookStore.hooks[props.id]) as CustomHook;

    // only set value if it is a valid config
    try {
      const hookConfig = data.hook.state as any;
      const result = validateHookConfig(hookConfig);

      if (result.valid) {
        data.value = hookConfig;
        data.invalid = [];
      } else {
        data.invalid = result.errors.map((v) => v.message);
      }
    } catch (error) {
      data.invalid = [error + ""];
      logger.error(error);
    }
  }
}

function cleanEmptySelectors(record: Record<string, any> | undefined, ignore: string[]) {
  if (!record) {
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && !value.trim() && !ignore.includes(key)) {
      record[key] = undefined;
    } else if (typeof value === "object") {
      cleanEmptySelectors(value, ignore);
    }
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

  const cloned = clone(data.value);
  cleanEmptySelectors(cloned.download?.data, ["flags"]);
  cleanEmptySelectors(cloned.news?.data, ["flags"]);
  cleanEmptySelectors(cloned.toc?.data, ["flags"]);
  cleanEmptySelectors(cloned.search?.data, ["flags"]);

  // only set value if it is a valid config
  try {
    const result = validateHookConfig(cloned);

    if (result.valid) {
      data.hook.state = cloned as any;
      data.invalid = [];
    } else {
      data.invalid = result.errors.map((v) => v.message);
      return;
    }
  } catch (error) {
    data.invalid = [error + ""];
    logger.error(error);
    return;
  }

  const hookStore = useHookStore();
  const action = data.hook.id ? hookStore.updateHook : hookStore.createHook;

  action(data.hook)
    .then((value: CustomHook) => {
      logger.info(value);
      data.hook = value;
      data.createResult = "success";
    })
    .catch((value: any) => {
      logger.info(value);
      data.createResult = "failed";
    });
}
</script>
