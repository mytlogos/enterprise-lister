<template>
  <div>
    <div class="d-flex">
      <i
        aria-hidden="true"
        title="Delete Item"
        class="fas fa-trash btn btn-sm btn-danger text-light ms-auto"
        @click="$emit('delete')"
      ></i>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Variable Name</label>
        <input
          id="variableName"
          v-model="variableName"
          type="text"
          class="form-control"
          placeholder="Name of the Variable"
        />
      </div>
    </div>
    <div v-if="selectorType !== 'json'" class="row mb-3">
      <div class="col">
        <label for="variableSource" class="form-label me-3">Variable Source</label>
        <div id="variableSource" class="btn-group" role="group" aria-label="Select the source of the variable value">
          <template v-if="selectorType !== 'regex'">
            <input
              :id="'sourceText' + id"
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="text"
              :checked="use === 'text'"
            />
            <label class="btn btn-outline-primary" :for="'sourceText' + id">Full Value</label>
          </template>
          <template v-if="allowRegex">
            <input
              :id="'sourceRegex' + id"
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="regex"
              :checked="use === 'regex'"
            />
            <label class="btn btn-outline-primary" :for="'sourceRegex' + id">Regex</label>
          </template>
          <template v-if="allowAttribute">
            <input
              :id="'sourceAttribute' + id"
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="attribute"
              :checked="use === 'attribute'"
            />
            <label class="btn btn-outline-primary" :for="'sourceAttribute' + id">Attribute</label>
          </template>
        </div>
      </div>
    </div>
    <div v-if="use === 'regex'" class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Value Transformation Regex Replace</label>
        <input id="variableName" v-model="value" type="text" class="form-control" placeholder="Replace Pattern" />
      </div>
    </div>
    <attribute-selector v-else-if="use === 'attribute' && extract && allowAttribute" v-model="extract" />
  </div>
</template>
<script lang="ts">
import { VariableExtractor } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { createComputedProperty, idGenerator } from "../../init";
import { SelectorValueType } from "../../siteTypes";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();
type Source = "text" | "regex" | "attribute";

export default defineComponent({
  name: "VariableExtractor",
  components: { AttributeSelector },
  props: {
    selectorType: {
      type: String as PropType<SelectorValueType>,
      required: true,
    },
    modelValue: {
      type: Object as PropType<VariableExtractor>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data() {
    return {
      id: nextId(),
      use: "text" as Source,
      extract: {},
      value: "",
    };
  },
  computed: {
    variableName: createComputedProperty("modelValue", "variableName"),

    allowRegex(): boolean {
      return this.selectorType === "regex";
    },

    allowAttribute(): boolean {
      return this.selectorType === "regex" || this.selectorType === "text";
    },
  },
  watch: {
    use(newValue: Source) {
      const tmp = { ...this.modelValue };

      if (newValue !== "regex") {
        delete tmp.value;
      }

      if (newValue !== "attribute") {
        delete tmp.extract;
      }
      this.$emit("update:modelValue", tmp);
    },
    value(newValue: string) {
      this.$emit("update:modelValue", { ...this.modelValue, value: newValue });
    },
    extract(newValue: any) {
      this.$emit("update:modelValue", { ...this.modelValue, extract: newValue });
    },
    selectorType(newValue: SelectorValueType) {
      if (newValue === "json") {
        // json does not have attributes and is not string only, so allow only values/text
        this.use = "text";
      } else if (newValue === "regex" && this.use === "text") {
        // either use attribute or regex replace when parent selector has regex
        this.use = "regex";
      } else if (newValue === "text" && this.use === "regex") {
        // regex is only allowed when selectorType === "regex"
        this.use = "text";
      }
    },
    "modelValue.extract"(newValue: any) {
      if (!newValue) {
        this.extract = {};
      } else {
        this.extract = newValue;
      }
    },
    "modelValue.value"(newValue: string) {
      if (!newValue) {
        this.value = "";
      } else {
        this.value = newValue;
      }
    },
  },
});
</script>
