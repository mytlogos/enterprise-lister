<template>
  <div class="card card-body">
    <div class="row mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">Attributename</label>
        <input
          id="attributeName"
          v-model="attribute"
          type="text"
          class="form-control"
          placeholder="Name of the Attribute"
        />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="resolveAttributeValue"
            v-model="resolve"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="resolve"
          />
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
        <regex v-model="regex" />
      </div>
      <div class="col">
        <label for="replace" class="form-label">Replace value with</label>
        <input id="replace" v-model="replace" type="text" class="form-control" placeholder="Replace Pattern" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { AttributeSelector } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { createComputedProperty } from "../../init";
import Regex from "./regex.vue";

export default defineComponent({
  name: "AttributeSelector",
  components: {
    Regex,
  },
  props: {
    modelValue: {
      type: Object as PropType<AttributeSelector>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      useRegex: false,
    };
  },
  computed: {
    attribute: createComputedProperty("modelValue", "attribute"),
    resolve: createComputedProperty("modelValue", "resolve"),
    regex: createComputedProperty("modelValue", "regex"),
    replace: createComputedProperty("modelValue", "replace"),
  },
  watch: {
    useRegex(newValue: boolean) {
      if (!newValue) {
        const tmp = { ...this.modelValue };

        if ("regex" in tmp) {
          // @ts-expect-error
          delete tmp.regex;
          // @ts-expect-error
          delete tmp.replace;

          this.$emit("update:modelValue", tmp);
        }
      } else {
        this.$emit("update:modelValue", { ...this.modelValue, regex: {} });
      }
    },
  },
});
</script>
