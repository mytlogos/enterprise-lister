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
    </div>
  </div>
</template>
<script lang="ts">
import { RequestConfig } from "enterprise-scraper/dist/externals/custom/types";
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
      options: {},
    };
  },
  computed: {
    regexUrl: createComputedProperty("modelValue", "regexUrl"),
    transformUrl: createComputedProperty("modelValue", "transformUrl"),
    templateUrl: createComputedProperty("modelValue", "templateUrl"),
    templateBody: createComputedProperty("modelValue", "templateBody"),
    jsonResponse: createComputedProperty("modelValue", "jsonResponse"),
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
