<template>
  <div class="card mt-3" role="button" data-bs-toggle="collapse" :data-bs-target="'#request' + id" aria-expanded="true">
    <div class="card-body">Request Configuration</div>
  </div>
  <div :id="'request' + id" ref="collapse" class="collapse show">
    <div class="card card-body">
      <regex v-model="model.regexUrl" class="mb-3" />
      <div class="row mb-3">
        <div class="col">
          <label for="transformUrl" class="form-label">Regex Replace Value</label>
          <input
            id="transformUrl"
            v-model="model.transformUrl"
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
            v-model="model.templateUrl"
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
            v-model="model.templateBody"
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
              v-model="model.jsonResponse"
              class="form-check-input"
              type="checkbox"
              role="switch"
              :checked="model.jsonResponse"
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
              v-model="model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="GET"
              :checked="model.options.method === 'GET'"
            />
            <label class="btn btn-outline-primary" :for="'get' + id">Get</label>
            <input
              :id="'post' + id"
              v-model="model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="POST"
              :checked="model.options.method === 'POST'"
            />
            <label class="btn btn-outline-primary" :for="'post' + id">Post</label>
            <input
              :id="'head' + id"
              v-model="model.options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="HEAD"
              :checked="model.options.method === 'HEAD'"
            />
            <label class="btn btn-outline-primary" :for="'head' + id">Head</label>
          </div>
        </div>
      </div>
      <div>Headers</div>
      <div v-for="entry in model.headers" :key="entry[0]" class="row align-items-center mb-3">
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
            v-model="nextHeaderName"
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
            v-model="nextHeaderValue"
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
<script lang="ts">
import { RequestConfig } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../init";
import Regex from "./regex.vue";

const nextId = idGenerator();

function model(prop: RequestConfig) {
  return {
    options: Object.assign({}, prop.options || {}, { method: "GET" }),
    headers: Object.entries(prop.options?.headers || {}) as Array<[string, string]>,
    regexUrl: prop.regexUrl || { flags: "", pattern: "" },
    transformUrl: prop.transformUrl || "",
    templateUrl: prop.templateUrl || "",
    templateBody: prop.templateBody || "",
    jsonResponse: prop.jsonResponse || false,
  };
}

export default defineComponent({
  name: "RequestConfig",
  components: {
    Regex,
  },
  props: {
    modelValue: {
      type: Object as PropType<RequestConfig>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data() {
    const id = nextId();
    return {
      id,
      logger: new Logger("request-config-" + id),
      model: model(this.modelValue),
      nextHeaderName: "",
      nextHeaderValue: "",
    };
  },
  watch: {
    model: {
      handler(newValue: ReturnType<typeof model>) {
        const result = clone(this.modelValue);

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
        result.options.headers = Object.fromEntries(newValue.headers);

        if (deepEqual(result, this.modelValue)) {
          this.logger.info("Did not update modelValue");
        } else {
          this.logger.info("Updated modelValue");
          this.$emit("update:modelValue", result);
        }
      },
      deep: true,
    },
    modelValue: {
      handler(newValue: RequestConfig) {
        const result = clone(this.model);

        result.jsonResponse = newValue.jsonResponse || false;
        result.templateBody = newValue.templateBody || "";
        result.templateUrl = newValue.templateUrl || "";
        result.regexUrl = newValue.regexUrl || { pattern: "", flags: "" };
        result.transformUrl = newValue.transformUrl || "";

        result.options = Object.assign({ method: "GET" }, newValue.options || {});

        // remove it as it is managed separately
        delete result.options.headers;

        result.headers = Object.entries(newValue.options?.headers || {});

        if (deepEqual(result, this.model)) {
          this.logger.info("Did not update model from prop");
        } else {
          this.logger.info("Updated model from prop");
          this.model = result;
        }
      },
      deep: true,
    },
  },
  methods: {
    createHeaderEntry() {
      this.model.headers.push([this.nextHeaderName, this.nextHeaderValue]);
      this.nextHeaderName = "";
      this.nextHeaderValue = "";
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
