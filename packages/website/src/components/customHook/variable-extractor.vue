<template>
  <div>
    <div class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Variable Name</label>
        <input id="variableName" type="text" class="form-control" placeholder="Name of the Variable" />
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="variableSource" class="form-label me-3">Variable Source</label>
        <div id="variableSource" class="btn-group" role="group" aria-label="Select the source of the variable value">
          <input
            :id="'sourceText' + id"
            v-model="useText"
            type="radio"
            class="btn-check"
            :name="'variableSource' + id"
            autocomplete="off"
            :checked="useText"
          />
          <label class="btn btn-outline-primary" :for="'sourceText' + id">Full Value</label>
          <input
            v-if="isRegex"
            :id="'sourceRegex' + id"
            v-model="useRegex"
            type="radio"
            class="btn-check"
            :name="'variableSource' + id"
            autocomplete="off"
            :checked="useRegex"
          />
          <label class="btn btn-outline-primary" :for="'sourceRegex' + id">Regex</label>
          <input
            :id="'sourceAttribute' + id"
            v-model="useAttributes"
            type="radio"
            class="btn-check"
            :name="'variableSource' + id"
            autocomplete="off"
            :checked="useAttributes"
          />
          <label class="btn btn-outline-primary" :for="'sourceAttribute' + id">Attribute</label>
        </div>
      </div>
    </div>
    <div v-if="useRegex" class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Value Transformation Regex</label>
        <input id="variableName" type="text" class="form-control" placeholder="Name of the Variable" />
      </div>
    </div>
    <attribute-selector v-if="useAttributes" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { idGenerator } from "../../init";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();

export default defineComponent({
  name: "VariableExtractor",
  components: { AttributeSelector },
  props: {
    isRegex: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      id: nextId(),
      useRegex: false,
      useText: true,
      useAttributes: false,
    };
  },
  watch: {
    useRegex(newValue) {
      if (newValue) {
        this.useText = false;
        this.useAttributes = false;
      }
    },
    useText(newValue) {
      if (newValue) {
        this.useRegex = false;
        this.useAttributes = false;
      }
    },
    useAttribute(newValue) {
      if (newValue) {
        this.useText = false;
        this.useRegex = false;
      }
    },
  },
});
</script>
