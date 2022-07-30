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
          v-model="model.name"
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
              v-model="model.use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="text"
              :checked="model.use === 'text'"
            />
            <label class="btn btn-outline-primary" :for="'sourceText' + id">Full Value</label>
          </template>
          <template v-if="allowRegex">
            <input
              :id="'sourceRegex' + id"
              v-model="model.use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="regex"
              :checked="model.use === 'regex'"
            />
            <label class="btn btn-outline-primary" :for="'sourceRegex' + id">Regex</label>
          </template>
          <template v-if="allowAttribute">
            <input
              :id="'sourceAttribute' + id"
              v-model="model.use"
              type="radio"
              class="btn-check"
              :name="'variableSource' + id"
              autocomplete="off"
              value="attribute"
              :checked="model.use === 'attribute'"
            />
            <label class="btn btn-outline-primary" :for="'sourceAttribute' + id">Attribute</label>
          </template>
        </div>
      </div>
    </div>
    <div v-if="model.use === 'regex'" class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Value Transformation Regex Replace</label>
        <input id="variableName" v-model="model.value" type="text" class="form-control" placeholder="Replace Pattern" />
      </div>
    </div>
    <attribute-selector
      v-else-if="model.use === 'attribute' && model.extract && allowAttribute"
      v-model="model.extract"
    />
  </div>
</template>
<script lang="ts">
import { VariableExtractor } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../init";
import { SelectorValueType } from "../../siteTypes";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();
type Source = "text" | "regex" | "attribute";

function model(prop: VariableExtractor) {
  return {
    use: (prop.value ? "regex" : prop.extract?.attribute ? "attribute" : "text") as Source,
    extract: prop.extract || { attribute: "" },
    value: prop.value || "",
    name: prop.variableName,
  };
}

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
    const id = nextId();
    return {
      id,
      model: model(this.modelValue),
      logger: new Logger("variable-extractor-" + id),
    };
  },
  computed: {
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
    selectorType(newValue: SelectorValueType) {
      if (newValue === "json") {
        // json does not have attributes and is not string only, so allow only values/text
        this.model.use = "text";
      } else if (newValue === "regex" && this.model.use === "text") {
        // either use attribute or regex replace when parent selector has regex
        this.model.use = "regex";
      } else if (newValue === "text" && this.model.use === "regex") {
        // regex is only allowed when selectorType === "regex"
        this.model.use = "text";
      }
    },

    model: {
      handler(newValue: ReturnType<typeof model>) {
        const result: VariableExtractor = {
          variableName: newValue.name,
        };

        if (newValue.use === "attribute") {
          result.extract = newValue.extract;
        } else if (newValue.use === "regex") {
          result.value = newValue.value;
        }

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
      handler(newValue: VariableExtractor) {
        const result = clone(this.model);

        result.extract = newValue.extract || { attribute: "" };
        result.value = newValue.value || "";
        result.name = newValue.variableName || "";

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
});
</script>
