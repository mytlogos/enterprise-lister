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
          v-model="sourceKey"
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
          v-model="targetKey"
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
          <template v-for="type in allowedTypes" :key="type">
            <input
              :id="'type' + type + id"
              v-model="useType"
              type="radio"
              class="btn-check"
              :name="'valueType' + id"
              autocomplete="off"
              :value="type"
              :checked="useType === type"
            />
            <label class="btn btn-outline-primary" :for="'type' + type + id">{{ type }}</label>
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
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="text"
              :checked="use === 'text'"
            />
            <label class="btn btn-outline-primary" :for="'valueText' + id">Full Value</label>
          </template>
          <template v-if="allowRegex">
            <input
              :id="'valueRegex' + id"
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="regex"
              :checked="use === 'regex'"
            />
            <label class="btn btn-outline-primary" :for="'valueRegex' + id">Regex</label>
          </template>
          <template v-if="allowAttribute">
            <input
              :id="'valueAttribute' + id"
              v-model="use"
              type="radio"
              class="btn-check"
              :name="'valueSource' + id"
              autocomplete="off"
              value="attribute"
              :checked="use === 'attribute'"
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
            v-model="optional"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="optional"
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
            v-model="useHtml"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="useHtml"
          />
          <label class="form-check-label" for="useHtml">Use HTML for value source</label>
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
    <div>Transfer Mapping</div>
    <div v-for="mapping in mappings" :key="mapping.from" class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input id="attributeName" v-model="mapping.from" type="text" class="form-control" placeholder="Mapped from" />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">To</label>
        <input id="attributeName" v-model="mapping.to" type="text" class="form-control" placeholder="Mapped to" />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input
          id="attributeName"
          v-model="nextFrom"
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
          v-model="nextTo"
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
  JSONTransfer,
  RegexTransfer,
  SimpleTransfer,
  TransferType,
} from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { createComputedProperty, idGenerator } from "../../init";
import { SelectorValueType } from "../../siteTypes";
import AttributeSelector from "./attribute-selector.vue";

const nextId = idGenerator();
type Source = "text" | "regex" | "attribute";

export default defineComponent({
  name: "ValueTransfer",
  components: {
    AttributeSelector,
  },
  props: {
    selectorType: {
      type: String as PropType<SelectorValueType>,
      required: true,
    },
    modelValue: {
      type: Object as PropType<SimpleTransfer<any> | RegexTransfer<any> | JSONTransfer<any, any>>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data: () => ({
    id: nextId(),
    use: "text" as Source,
    extract: {},
    value: "",
    nextTo: "",
    nextFrom: "",
    mappings: [] as Array<{ from: string; to: string }>,
    allowedTypes: ["string", "decimal", "integer", "date"] as TransferType[],
  }),
  computed: {
    sourceKey: createComputedProperty("modelValue", "sourceKey"),
    targetKey: createComputedProperty("modelValue", "targetKey"),
    useType: createComputedProperty("modelValue", "type"),
    optional: createComputedProperty("modelValue", "optional"),
    useHtml: createComputedProperty("modelValue", "html"),

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
      let update = false;

      if (newValue === "text") {
        // @ts-expect-error
        delete tmp.extract;
        // @ts-expect-error
        delete tmp.value;
        update = true;
      }
      if (newValue !== "attribute" && "extract" in tmp && typeof tmp.extract === "object") {
        delete tmp.extract;
        update = true;
      }
      if (newValue === "attribute") {
        // @ts-expect-error
        tmp.extract = {};
        update = true;
      }
      if (update) {
        this.$emit("update:modelValue", tmp);
      }
    },
    selectorType(newValue: SelectorValueType) {
      const tmp = { ...this.modelValue };
      let update = false;

      if (newValue === "json") {
        // json does not have attributes and is not string only, so allow only values/text
        this.use = "text";

        if ("html" in tmp) {
          delete tmp.html;
          update = true;
        }
      } else if (newValue === "regex" && this.use === "text") {
        // either use attribute or regex replace when parent selector has regex
        this.use = "regex";
      } else if (newValue === "text" && this.use === "regex") {
        // regex is only allowed when selectorType === "regex"
        this.use = "text";
      }

      if (newValue !== "json" && "sourceKey" in tmp) {
        // @ts-expect-error
        delete tmp.sourceKey;
        update = true;
      }
      if (update) {
        this.$emit("update:modelValue", tmp);
      }
    },
    mappings: {
      handler() {
        const result = this.mappings.reduce((previous, current) => {
          previous[current.from] = current.to;
          return previous;
        }, {} as { [key: string]: string });
        this.$emit("update:modelValue", { ...this.modelValue, mapping: { include: result } });
      },
      deep: true,
    },
    extract: {
      handler() {
        this.$emit("update:modelValue", { ...this.modelValue, extract: { ...this.extract } });
      },
      deep: true,
    },
    "modelValue.extract": {
      handler(newValue: any) {
        if (!newValue) {
          this.extract = {};
        } else {
          if (Object.values(newValue).some((value) => !!value)) {
            this.use = "attribute";
          }
          this.extract = { ...newValue };
        }
      },
      deep: true,
    },
  },
  created() {
    const mapping = this.modelValue.mapping?.include || {};
    this.mappings = Object.entries(mapping).map((value) => ({ from: value[0], to: value[1] }));
  },
  methods: {
    createMapping() {
      this.mappings.push({ from: this.nextFrom, to: this.nextTo });
      this.nextFrom = "";
      this.nextTo = "";
    },
  },
});
</script>
