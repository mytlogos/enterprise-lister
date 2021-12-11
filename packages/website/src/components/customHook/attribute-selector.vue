<template>
  <div class="card card-body">
    <div class="row mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">Attributename</label>
        <input
          id="attributeName"
          v-model="model.attribute"
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
            v-model="model.resolve"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="model.resolve"
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
            v-model="model.useRegex"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="model.useRegex"
          />
          <label class="form-check-label" for="useRegex">Use Regex for Value</label>
        </div>
      </div>
    </div>
    <div v-if="model.useRegex" class="row mb-3">
      <div class="col">
        <regex v-model="model.regex" />
      </div>
      <div class="col">
        <label for="replace" class="form-label">Replace value with</label>
        <input id="replace" v-model="model.replace" type="text" class="form-control" placeholder="Replace Pattern" />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { AttributeSelector, JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
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
      model: model(),
    };
  },
  watch: {
    model: {
      handler(newValue: ReturnType<typeof model>) {
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

        if (deepEqual(newModelValue, this.modelValue)) {
          logger.info("Did not update model from prop");
        } else {
          logger.info("Updated modelValue");
          this.$emit("update:modelValue", newModelValue);
        }
      },
      deep: true,
    },
    modelValue: {
      handler(newValue: Partial<AttributeSelector>) {
        if (!newValue) {
          this.model = model();
          logger.info("attribute-selector: Resetting cuz ther is no value");
          return;
        }
        const newModel = clone(this.model);
        newModel.attribute = newValue.attribute || "";
        newModel.resolve = (newValue.resolve as boolean) || false;
        newModel.regex = ("regex" in newValue && (newValue.regex as JsonRegex)) || { flags: "", pattern: "" };
        newModel.replace = ("replace" in newValue && newValue.replace) || "";

        if (newModel.regex.pattern || newModel.regex.flags) {
          newModel.useRegex = true;
        }
        if (deepEqual(newModel, this.model)) {
          logger.info("Did not update model from prop");
        } else {
          logger.info("Updated model from prop");
          this.model = newModel;
        }
      },
      deep: true,
      immediate: true,
    },
  },
});
</script>
