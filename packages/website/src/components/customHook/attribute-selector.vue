<template>
  <div class="card card-body">
    <div class="row mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">Attributename</label>
        <input id="attributeName" type="text" class="form-control" placeholder="Name of the Attribute" />
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="variableSource" class="form-label me-3">Value Type</label>
        <div id="variableSource" class="btn-group" role="group" aria-label="Select the type of the variable value">
          <template v-for="type in allowedTypes" :key="type">
            <input
              :id="'type' + type"
              v-model="useType"
              type="radio"
              class="btn-check"
              :name="type"
              autocomplete="off"
              :value="type"
              :checked="useType === type"
            />
            <label class="btn btn-outline-primary" :for="'type' + type">{{ type }}</label>
          </template>
        </div>
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input id="resolveAttributeValue" class="form-check-input" type="checkbox" role="switch" checked />
          <label class="form-check-label" for="resolveAttributeValue">Resolve Value with Base Link</label>
        </div>
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="useRegex"
            v-model="useRegex"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="useRegex"
          />
          <label class="form-check-label" for="useRegex">Use Regex for Value</label>
        </div>
      </div>
    </div>
    <div v-if="useRegex" class="row mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">Regex</label>
        <input id="attributeName" type="text" class="form-control" placeholder="Regex Pattern" />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">Replace value with</label>
        <input id="attributeName" type="text" class="form-control" placeholder="Replace Pattern" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { TransferType } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent } from "vue";

export default defineComponent({
  name: "AttributeSelector",
  data() {
    return {
      useRegex: false,
      useType: "string" as TransferType,
      allowedTypes: ["string", "decimal", "integer", "date"] as TransferType[],
    };
  },
});
</script>
