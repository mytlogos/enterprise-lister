<template>
  <div class="card card-body">
    <div class="row mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">Attributename</label>
        <input
          id="attributeName"
          v-model="data.model.attribute"
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
            v-model="data.model.resolve"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="data.model.resolve"
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
            v-model="data.model.useRegex"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="data.model.useRegex"
          />
          <label class="form-check-label" for="useRegex">Use Regex for Value</label>
        </div>
      </div>
    </div>
    <div v-if="data.model.useRegex" class="row mb-3">
      <div class="col">
        <regex v-model="data.model.regex" />
      </div>
      <div class="col">
        <label for="replace" class="form-label">Replace value with</label>
        <input
          id="replace"
          v-model="data.model.replace"
          type="text"
          class="form-control"
          placeholder="Replace Pattern"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { AttributeSelector, JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { PropType, reactive, toRef, watch, watchEffect } from "vue";
import { clone, deepEqual, Logger } from "../../init";
import Regex from "./regex.vue";

function model() {
  return {
    useRegex: false,
    attribute: "",
    resolve: false,
    regex: {
      pattern: "",
      flags: "",
    },
    replace: "",
  };
}

const logger = new Logger("attribute-selector");
const props = defineProps({
  modelValue: {
    type: Object as PropType<AttributeSelector>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue"]);
const data = reactive({
  model: model(),
});

watch(
  toRef(data, "model"),
  (newValue: ReturnType<typeof model>) => {
    const newModelValue: Partial<AttributeSelector> = {
      attribute: newValue.attribute,
      // @ts-expect-error
      resolve: newValue.resolve,
    };

    if (newValue.useRegex) {
      // @ts-expect-error
      newModelValue.regex = {
        pattern: newValue.regex.pattern,
        flags: newValue.regex.flags,
      };
      // @ts-expect-error
      newModelValue.replace = newValue.replace;
    }

    if (deepEqual(newModelValue, props.modelValue)) {
      logger.info("Did not update model from prop");
    } else {
      logger.info("Updated modelValue");
      emits("update:modelValue", newModelValue);
    }
  },
  { deep: true },
);

watchEffect(() => {
  if (!props.modelValue) {
    data.model = model();
    logger.info("attribute-selector: Resetting cuz ther is no value");
    return;
  }
  const newModel = clone(data.model);
  newModel.attribute = props.modelValue.attribute || "";
  newModel.resolve = (props.modelValue.resolve as boolean) || false;
  newModel.regex = ("regex" in props.modelValue && (props.modelValue.regex as JsonRegex)) || { flags: "", pattern: "" };
  newModel.replace = ("replace" in props.modelValue && props.modelValue.replace) || "";

  if (newModel.regex.pattern || newModel.regex.flags) {
    newModel.useRegex = true;
  }
  if (deepEqual(newModel, data.model)) {
    logger.info("Did not update model from prop");
  } else {
    logger.info("Updated model from prop");
    data.model = newModel;
  }
});
</script>
