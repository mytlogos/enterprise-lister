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
import { computed, PropType, ref, toRef, watch } from "vue";
import { clone, deepEqual, idGenerator, Logger } from "../../init";
import { SelectorValueType } from "../../siteTypes";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();
export default {};
</script>
<script lang="ts" setup>
type Source = "text" | "regex" | "attribute";

function toModel(prop: VariableExtractor) {
  return {
    use: (prop.value ? "regex" : prop.extract?.attribute ? "attribute" : "text") as Source,
    extract: prop.extract || { attribute: "" },
    value: prop.value || "",
    name: prop.variableName,
  };
}
const props = defineProps({
  selectorType: {
    type: String as PropType<SelectorValueType>,
    required: true,
  },
  modelValue: {
    type: Object as PropType<VariableExtractor>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "delete"]);
const id = nextId();
const logger = new Logger("variable-extractor-" + id);

const model = ref(toModel(props.modelValue));
const allowRegex = computed((): boolean => {
  return props.selectorType === "regex";
});

const allowAttribute = computed((): boolean => {
  return props.selectorType === "regex" || props.selectorType === "text";
});

watch(
  model,
  (newValue) => {
    const result: VariableExtractor = {
      variableName: newValue.name,
    };

    if (newValue.use === "attribute") {
      result.extract = newValue.extract;
    } else if (newValue.use === "regex") {
      result.value = newValue.value;
    }

    if (deepEqual(result, props.modelValue.value)) {
      logger.info("Did not update modelValue");
    } else {
      logger.info("Updated modelValue");
      emits("update:modelValue", result);
    }
  },
  { deep: true },
);

watch(toRef(props, "selectorType"), (newValue) => {
  if (newValue === "json") {
    // json does not have attributes and is not string only, so allow only values/text
    model.value.use = "text";
  } else if (newValue === "regex" && model.value.use === "text") {
    // either use attribute or regex replace when parent selector has regex
    model.value.use = "regex";
  } else if (newValue === "text" && model.value.use === "regex") {
    // regex is only allowed when selectorType === "regex"
    model.value.use = "text";
  }
});

watch(
  toRef(props, "modelValue"),
  (newValue) => {
    const result = clone(model.value);

    result.extract = newValue.extract || { attribute: "" };
    result.value = newValue.value || "";
    result.name = newValue.variableName || "";

    if (deepEqual(result, model.value)) {
      logger.info("Did not update model from prop");
    } else {
      logger.info("Updated model from prop");
      model.value = result;
    }
  },
  { deep: true },
);
</script>
