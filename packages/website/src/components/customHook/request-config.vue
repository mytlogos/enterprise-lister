<template>
  <div class="card mt-3" role="button" data-bs-toggle="collapse" :data-bs-target="'#request' + id" aria-expanded="true">
    <div class="card-body">Request Configuration</div>
  </div>
  <div :id="'request' + id" ref="collapse" class="collapse show">
    <div class="card card-body">
      <regex v-model="data.model.regexUrl" class="mb-3" />
      <div class="row mb-3">
        <div class="col">
          <label for="transformUrl" class="form-label">Regex Replace Value</label>
          <input
            id="transformUrl"
            v-model="data.model.transformUrl"
            type="text"
            class="form-control"
            placeholder="Replace Pattern"
          />
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="templateUrl" class="form-label">Template URL</label>
          <input
            id="templateUrl"
            v-model="data.model.templateUrl"
            type="text"
            class="form-control"
            placeholder="Template String"
          />
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="templateBody" class="form-label">Template Body</label>
          <input
            id="templateBody"
            v-model="data.model.templateBody"
            type="text"
            class="form-control"
            placeholder="Template String"
          />
        </div>
      </div>
      <div class="row align-items-center mb-3">
        <div class="col">
          <div class="form-check form-switch">
            <input
              id="jsonResponse"
              v-model="data.model.jsonResponse"
              class="form-check-input"
              type="checkbox"
              role="switch"
              :checked="data.model.jsonResponse"
            />
            <label class="form-check-label" for="jsonResponse">Transform Response into JSON</label>
          </div>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="httpmethod" class="form-label me-3">Http Method</label>
          <div id="httpmethod" class="btn-group" role="group" aria-label="Select the HTTP Method">
            <input
              :id="'get' + id"
              v-model="data.model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="GET"
              :checked="data.model.options.method === 'GET'"
            />
            <label class="btn btn-outline-primary" :for="'get' + id">Get</label>
            <input
              :id="'post' + id"
              v-model="data.model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="POST"
              :checked="data.model.options.method === 'POST'"
            />
            <label class="btn btn-outline-primary" :for="'post' + id">Post</label>
            <input
              :id="'head' + id"
              v-model="data.model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="HEAD"
              :checked="data.model.options.method === 'HEAD'"
            />
            <label class="btn btn-outline-primary" :for="'head' + id">Head</label>
          </div>
        </div>
      </div>
      <div>Headers</div>
      <div v-for="entry in data.model.headers" :key="entry[0]" class="row align-items-center mb-3">
        <div class="col">
          <label for="headerName" class="form-label">Name</label>
          <input id="headerName" v-model="entry[0]" type="text" class="form-control" placeholder="Header Key" />
        </div>
        <div class="col">
          <label for="headerValue" class="form-label">Value</label>
          <input id="headerValue" v-model="entry[1]" type="text" class="form-control" placeholder="Header Value" />
        </div>
      </div>
      <div class="row align-items-center mb-3">
        <div class="col">
          <label for="headerName" class="form-label">Name</label>
          <input
            id="headerName"
            v-model="data.nextHeaderName"
            type="text"
            class="form-control"
            placeholder="Mapped from"
            @keyup.enter="createHeaderEntry"
          />
        </div>
        <div class="col">
          <label for="headerName" class="form-label">Value</label>
          <input
            id="headerName"
            v-model="data.nextHeaderValue"
            type="text"
            class="form-control"
            placeholder="Mapped to"
            @keyup.enter="createHeaderEntry"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { RequestConfig } from "enterprise-scraper/dist/externals/custom/types";
import { PropType, reactive, toRef, watch } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../init";
import Regex from "./regex.vue";

const nextId = idGenerator();

function model(prop: RequestConfig) {
  return {
    options: Object.assign({}, prop.options || {}, { method: "GET" }),
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore does not pick up cloudscraper typings..
    headers: Object.entries(prop.options?.headers || {}),
    regexUrl: prop.regexUrl || { flags: "", pattern: "" },
    transformUrl: prop.transformUrl || "",
    templateUrl: prop.templateUrl || "",
    templateBody: prop.templateBody || "",
    jsonResponse: prop.jsonResponse || false,
  };
}

const props = defineProps({
  modelValue: {
    type: Object as PropType<RequestConfig>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue"]);
const id = nextId();
const logger = new Logger("request-config-" + id);
const data = reactive({
  id,
  model: model(props.modelValue),
  nextHeaderName: "",
  nextHeaderValue: "",
});

watch(
  toRef(data, "model"),
  (newValue: ReturnType<typeof model>) => {
    const result = clone(props.modelValue);

    result.jsonResponse = newValue.jsonResponse;
    result.templateBody = newValue.templateBody;
    result.templateUrl = newValue.templateUrl;

    if (newValue.regexUrl.pattern || newValue.regexUrl.flags) {
      result.regexUrl = newValue.regexUrl;
    } else {
      delete result.regexUrl;
    }
    result.transformUrl = newValue.transformUrl || "";

    result.options = clone(newValue.options);
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore does not pick up cloudscraper typings..
    result.options.headers = Object.fromEntries(newValue.headers);

    if (deepEqual(result, props.modelValue)) {
      logger.info("Did not update modelValue");
    } else {
      logger.info("Updated modelValue");
      emits("update:modelValue", result);
    }
  },
  { deep: true },
);

watch(
  toRef(data, "model"),
  (newValue: RequestConfig) => {
    const result = clone(data.model);

    result.jsonResponse = newValue.jsonResponse || false;
    result.templateBody = newValue.templateBody || "";
    result.templateUrl = newValue.templateUrl || "";
    result.regexUrl = newValue.regexUrl || { pattern: "", flags: "" };
    result.transformUrl = newValue.transformUrl || "";

    result.options = Object.assign({ method: "GET" }, newValue.options || {});

    // remove it as it is managed separately
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore does not pick up cloudscraper typings..
    delete result.options.headers;

    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore does not pick up cloudscraper typings..
    result.headers = Object.entries(newValue.options?.headers || {});

    if (deepEqual(result, data.model)) {
      logger.info("Did not update model from prop");
    } else {
      logger.info("Updated model from prop");
      data.model = result;
    }
  },
  { deep: true },
);

function createHeaderEntry() {
  data.model.headers.push([data.nextHeaderName, data.nextHeaderValue]);
  data.nextHeaderName = "";
  data.nextHeaderValue = "";
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
