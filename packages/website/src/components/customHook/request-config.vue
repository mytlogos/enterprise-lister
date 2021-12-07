<template>
  <div class="card mt-3" role="button" data-bs-toggle="collapse" :data-bs-target="'#request' + id" aria-expanded="true">
    <div class="card-body">Request Configuration</div>
  </div>
  <div :id="'request' + id" ref="collapse" class="collapse show">
    <div class="card card-body">
      <regex v-model="regexUrl" class="mb-3" />
      <div class="row mb-3">
        <div class="col">
          <label for="transformUrl" class="form-label">Regex Replace Value</label>
          <input
            id="transformUrl"
            v-model="transformUrl"
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
            v-model="templateUrl"
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
            v-model="templateBody"
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
              v-model="jsonResponse"
              class="form-check-input"
              type="checkbox"
              role="switch"
              :checked="jsonResponse"
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
              v-model="options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="GET"
              :checked="options.method === 'GET'"
            />
            <label class="btn btn-outline-primary" :for="'get' + id">Get</label>
            <input
              :id="'post' + id"
              v-model="options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="POST"
              :checked="options.method === 'POST'"
            />
            <label class="btn btn-outline-primary" :for="'post' + id">Post</label>
            <input
              :id="'head' + id"
              v-model="options.method"
              type="radio"
              class="btn-check"
              :name="'httpmethod' + id"
              autocomplete="off"
              value="HEAD"
              :checked="options.method === 'HEAD'"
            />
            <label class="btn btn-outline-primary" :for="'head' + id">Head</label>
          </div>
        </div>
      </div>
      <div>Headers</div>
      <div v-for="entry in headers" :key="entry[0]" class="row align-items-center mb-3">
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
import { Options } from "request";
import { defineComponent, PropType } from "vue";
import { createComputedProperty, idGenerator } from "../../init";
import Regex from "./regex.vue";

const nextId = idGenerator();

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
    return {
      id: nextId(),
      options: {
        method: "GET",
      } as Options & { headers: NonNullable<Options["headers"]> },
      headers: [] as Array<[string, string]>,
      nextHeaderName: "",
      nextHeaderValue: "",
    };
  },
  computed: {
    regexUrl: createComputedProperty("modelValue", "regexUrl"),
    transformUrl: createComputedProperty("modelValue", "transformUrl"),
    templateUrl: createComputedProperty("modelValue", "templateUrl"),
    templateBody: createComputedProperty("modelValue", "templateBody"),
    jsonResponse: createComputedProperty("modelValue", "jsonResponse"),
  },
  watch: {
    options: {
      handler(newValue: Options) {
        this.$emit("update:modelValue", { ...this.modelValue, options: newValue });
      },
      deep: true,
    },
    "modelValue.options": {
      handler(newValue: any) {
        this.options = newValue;
      },
      deep: true,
    },
    "modelValue.options.headers": {
      handler(newValue: any) {
        this.headers = Object.entries(newValue || {});
      },
      deep: true,
    },
    headers: {
      handler(newValue: any) {
        this.$emit("update:modelValue", { ...this.modelValue, headers: Object.fromEntries(newValue) });
      },
      deep: true,
    },
  },
  created() {
    const options = this.modelValue.options;
    if (options) {
      // set defaults from data() to options, if they do not have any value
      for (const [key, value] of Object.entries(this.options)) {
        // @ts-expect-error
        if (!options[key]) {
          // @ts-expect-error
          options[key] = value;
        }
      }
      // @ts-expect-error
      this.options = options;
    }
  },
  methods: {
    createHeaderEntry() {
      this.headers.push([this.nextHeaderName, this.nextHeaderValue]);
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
