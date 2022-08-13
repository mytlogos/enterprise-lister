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
      <div v-if="selectorType === 'json'" class="col">
        <!-- TODO: use select instead of string -->
        <label for="sourceKey" class="form-label">Source Key</label>
        <input
          id="sourceKey"
          v-model="data.model.sourceKey"
          type="text"
          class="form-control"
          placeholder="Name of the Source Property"
        />
      </div>
      <div class="col">
        <!-- TODO: use select instead of string -->
        <label for="targetKey" class="form-label">Target Key</label>
        <input
          id="targetKey"
          v-model="data.model.targetKey"
          type="text"
          class="form-control"
          placeholder="Name of the Target Property"
        />
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="variableSource" class="form-label me-3">Value Type</label>
        <div id="variableSource" class="btn-group" role="group" aria-label="Select the type of the transfer value">
          <template v-for="transferType in data.allowedTypes" :key="transferType">
            <input
              :id="'type' + transferType + id"
              v-model="data.model.type"
              type="radio"
              class="btn-check"
              :name="'valueType' + id"
              autocomplete="off"
              :value="transferType"
              :checked="data.model.type === transferType"
            />
            <label class="btn btn-outline-primary" :for="'type' + transferType + id">{{ transferType }}</label>
          </template>
        </div>
      </div>
    </div>
    <div v-if="selectorType !== 'json'" class="row mb-3">
      <div class="col">
        <label for="valueSource" class="form-label me-3">Transfer Source</label>
        <div id="valueSource" class="btn-group" role="group" aria-label="Select the source of the transfer value">
          <template v-if="selectorType !== 'regex'">
            <input
              :id="'valueText' + id"
              v-model="data.model.use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="text"
              :checked="data.model.use === 'text'"
            />
            <label class="btn btn-outline-primary" :for="'valueText' + id">Full Value</label>
          </template>
          <template v-if="allowRegex">
            <input
              :id="'valueRegex' + id"
              v-model="data.model.use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="regex"
              :checked="data.model.use === 'regex'"
            />
            <label class="btn btn-outline-primary" :for="'valueRegex' + id">Regex</label>
          </template>
          <template v-if="allowAttribute">
            <input
              :id="'valueAttribute' + id"
              v-model="data.model.use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="attribute"
              :checked="data.model.use === 'attribute'"
            />
            <label class="btn btn-outline-primary" :for="'valueAttribute' + id">Attribute</label>
          </template>
        </div>
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="optionalTransfer"
            v-model="data.model.optional"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="data.model.optional"
          />
          <label class="form-check-label" for="optionalTransfer">Optional (does not throw error when failing)</label>
        </div>
      </div>
    </div>
    <div v-if="selectorType !== 'json'" class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="useHtml"
            v-model="data.model.html"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="data.model.html"
          />
          <label class="form-check-label" for="useHtml">Use HTML for value source</label>
        </div>
      </div>
    </div>
    <div v-if="data.model.use === 'regex'" class="row mb-3">
      <div class="col">
        <label for="variableName" class="form-label">Value Transformation Regex Replace</label>
        <input
          id="variableName"
          v-model="data.model.extractRegex"
          type="text"
          class="form-control"
          placeholder="Replace Pattern"
        />
      </div>
    </div>
    <attribute-selector
      v-else-if="data.model.use === 'attribute' && allowAttribute"
      v-model="data.model.extractAttribute"
    />
    <div>Transfer Mapping</div>
    <div v-for="mapping in data.model.mappings" :key="mapping[0]" class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input id="attributeName" v-model="mapping[0]" type="text" class="form-control" placeholder="Mapped from" />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">To</label>
        <input id="attributeName" v-model="mapping[1]" type="text" class="form-control" placeholder="Mapped to" />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input
          id="attributeName"
          v-model="data.nextFrom"
          type="text"
          class="form-control"
          placeholder="Mapped from"
          @keyup.enter="createMapping"
        />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">To</label>
        <input
          id="attributeName"
          v-model="data.nextTo"
          type="text"
          class="form-control"
          placeholder="Mapped to"
          @keyup.enter="createMapping"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import {
  AttributeSelector as AttributeSelectorType,
  JSONTransfer,
  RegexTransfer,
  SimpleTransfer,
  TransferType,
} from "enterprise-scraper/dist/externals/custom/types";
import { computed, PropType, reactive, toRef, watch } from "vue";
import { clone, idGenerator, deepEqual, Logger } from "../../init";
import { SelectorValueType } from "../../siteTypes";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();
// default export is required?
export default {};
</script>
<script lang="ts" setup>
type Source = "text" | "regex" | "attribute";

type Transfer = SimpleTransfer<any> | RegexTransfer<any> | JSONTransfer<any, any>;

function model() {
  return {
    mappings: [] as Array<[string, string]>,
    use: "text" as Source,
    extractAttribute: {
      attribute: "",
    } as AttributeSelectorType,
    extractRegex: "",
    targetKey: "",
    sourceKey: "",
    type: "string" as TransferType,
    optional: false as boolean | undefined,
    html: false as boolean | undefined,
  };
}

const props = defineProps({
  selectorType: {
    type: String as PropType<SelectorValueType>,
    required: true,
  },
  modelValue: {
    type: Object as PropType<Transfer>,
    required: true,
  },
});
const emits = defineEmits(["update:modelValue", "delete"]);

const id = nextId();
const logger = new Logger("value-transfer-" + id);
const data = reactive({
  nextTo: "",
  nextFrom: "",
  allowedTypes: ["string", "decimal", "integer", "date"] as TransferType[],
  model: model(),
});
const allowRegex = computed((): boolean => {
  return props.selectorType === "regex";
});

const allowAttribute = computed((): boolean => {
  return props.selectorType === "regex" || props.selectorType === "text";
});

watch(toRef(props, "selectorType"), (newValue: SelectorValueType) => {
  if (newValue === "json") {
    // json does not have attributes and is not string only, so allow only values/text
    data.model.use = "text";
  } else if (newValue === "regex" && data.model.use === "text") {
    // either use attribute or regex replace when parent selector has regex
    data.model.use = "regex";
  } else if (newValue === "text" && data.model.use === "regex") {
    // regex is only allowed when selectorType === "regex"
    data.model.use = "text";
  }
});

watch(
  toRef(data, "model"),
  (newValue: ReturnType<typeof model>) => {
    const result: Partial<Transfer> = {
      targetKey: newValue.targetKey,
      optional: newValue.optional,
    };

    if (newValue.mappings.length) {
      result.mapping = { include: Object.fromEntries(newValue.mappings) };
    }

    if (props.selectorType === "json") {
      // @ts-expect-error
      result.sourceKey = newValue.sourceKey;
    } else {
      // @ts-expect-error
      result.html = newValue.html;
      // @ts-expect-error
      result.type = newValue.type;

      if (newValue.use === "regex") {
        // @ts-expect-error
        result.extract = newValue.extractRegex;
      } else if (newValue.use === "attribute") {
        // @ts-expect-error
        result.extract = newValue.extractAttribute;
      }
    }

    if (deepEqual(result, props.modelValue)) {
      logger.info("Did not update modelValue");
    } else {
      logger.info("Updated modelValue");
      emits("update:modelValue", result);
    }
  },
  { deep: true },
);

watch(
  toRef(props, "modelValue"),
  (newValue) => {
    if (!newValue) {
      logger.info("Reset");
      data.model = model();
    } else {
      const newModel = clone(data.model);
      newModel.targetKey = newValue.targetKey || "";
      newModel.optional = newValue.optional || false;
      newModel.sourceKey = ("sourceKey" in newValue && newValue.sourceKey) || "";

      let toUse: Source = "text";

      if ("extract" in newValue) {
        if (typeof newValue.extract === "string") {
          newModel.extractRegex = newValue.extract || "";

          if (newValue.extract) {
            toUse = "regex";
          }
        } else if (typeof newValue.extract === "object") {
          newModel.extractAttribute = newValue.extract || {};

          if (newValue.extract.attribute) {
            toUse = "attribute";
          }
        } else {
          newModel.extractRegex = "";
          newModel.extractAttribute = { attribute: "" };
        }
      }
      newModel.use = toUse;
      newModel.html = "html" in newValue && newValue.html;
      newModel.type = ("type" in newValue && newValue.type) || "string";
      newModel.mappings = Object.entries(newValue.mapping?.include || {});

      if (deepEqual(newModel, data.model)) {
        logger.info("Did not update model from prop");
      } else {
        logger.info("Updated model from prop");
        data.model = newModel;
      }
    }
  },
  { deep: true, immediate: true },
);

function createMapping() {
  data.model.mappings.push([data.nextFrom, data.nextTo]);
  data.nextFrom = "";
  data.nextTo = "";
}
</script>
