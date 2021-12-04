<template>
  <div class="card mt-3" role="button" data-bs-toggle="collapse" :data-bs-target="'#request' + id" aria-expanded="true">
    <div class="card-body">Request Configuration</div>
  </div>
  <div :id="'request' + id" ref="collapse" class="collapse show">
    <div class="card card-body">
      <div class="row mb-3">
        <div class="col">
          <label for="regexUrl" class="form-label">Regex</label>
          <input id="regexUrl" type="text" class="form-control" placeholder="Pattern" v-bind="regexUrl" />
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="transformUrl" class="form-label">Regex Replace Value</label>
          <input
            id="transformUrl"
            type="text"
            class="form-control"
            placeholder="Replace Pattern"
            v-bind="transformUrl"
          />
        </div>
      </div>
      <div class="row mb-3">
        <div class="col">
          <label for="templateUrl" class="form-label">Template URL</label>
          <input id="templateUrl" type="text" class="form-control" placeholder="Template String" v-bind="templateUrl" />
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
              checked
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
import { idGenerator } from "../../init";

const nextId = idGenerator();

export default defineComponent({
  name: "RequestConfig",
  props: {
    value: {
      type: Object as PropType<RequestConfig>,
      required: true,
    },
  },
  data() {
    return {
      id: nextId(),
      regexUrl: "",
      transformUrl: "",
      templateUrl: "",
      templateBody: "",
      jsonResponse: false,
      options: {},
    };
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
