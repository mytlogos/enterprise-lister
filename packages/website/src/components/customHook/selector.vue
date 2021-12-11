<template>
  <div>
    <div class="card" role="button" data-bs-toggle="collapse" :data-bs-target="'#selector' + id" aria-expanded="true">
      <div class="card-body">Selector {{ selector }}</div>
    </div>
    <div :id="'selector' + id" ref="collapse" class="collapse show">
      <div class="card card-body">
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
            <label for="selector" class="form-label">{{ selectorTitle }} Selector</label>
            <input
              id="selector"
              v-model="selector"
              type="text"
              class="form-control"
              :placeholder="selectorPlaceholder"
              required
            />
          </div>
        </div>
        <regex v-if="allowRegex" v-model="regex" />
        <div class="row align-items-center mb-3">
          <div class="col">
            <div class="form-check form-switch">
              <input
                id="multipleResults"
                v-model="multiple"
                class="form-check-input"
                type="checkbox"
                role="switch"
                :checked="multiple"
              />
              <label class="form-check-label" for="multipleResults">Expect multiple results for Selector</label>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addVariable">Add Variable</button>
          <template v-if="variables.length">
            <div
              class="card card-body mt-3"
              role="button"
              data-bs-toggle="collapse"
              :data-bs-target="'#selector' + id + 'transfers'"
              aria-expanded="true"
            >
              Variables
            </div>
            <div :id="'selector' + id + 'transfers'" class="collapse show">
              <div class="card">
                <variable-extractor
                  v-for="(variable, index) in variables"
                  :key="variable.variableName + index"
                  v-model="variables[index]"
                  :selector-type="currentSelectorType"
                  class="card-body mt-3"
                  :class="{ 'border-top': index }"
                  @delete="remove(variables, index)"
                />
              </div>
            </div>
          </template>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addTransfer">Add Transfer</button>
          <template v-if="transfers.length">
            <div
              class="card card-body mt-3"
              role="button"
              data-bs-toggle="collapse"
              :data-bs-target="'#selector' + id + 'transfers'"
              aria-expanded="true"
            >
              Transfers
            </div>
            <div :id="'selector' + id + 'transfers'" class="collapse show">
              <div class="card">
                <value-transfer
                  v-for="(transfer, index) in transfers"
                  :key="transfer.targetKey + index"
                  v-model="transfers[index]"
                  :selector-type="currentSelectorType"
                  class="card-body mt-3"
                  :class="{ 'border-top': index }"
                  @delete="remove(transfers, index)"
                />
              </div>
            </div>
          </template>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addChild">Add Child</button>
          <selector
            v-for="(child, index) in children"
            :key="index"
            v-model="children[index]"
            :selector-types="selectorTypes"
            class="mt-3"
            @delete="remove(children, index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import {
  JsonSelector,
  JSONTransfer,
  RegexTransfer,
  Selector,
  SimpleTransfer,
  VariableExtractor as VarExtractor,
} from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import ValueTransfer from "./value-transfer.vue";
import VariableExtractor from "./variable-extractor.vue";
import { createComputedProperty, idGenerator } from "../../init";
import { SelectorType, SelectorValueType } from "../../siteTypes";
import Regex from "./regex.vue";

// this relies on the fact that a component is loaded only once
const nextId = idGenerator();

export default defineComponent({
  name: "Selector",
  components: {
    VariableExtractor,
    ValueTransfer,
    Regex,
  },
  props: {
    selectorTypes: {
      // @ts-expect-error
      type: Array as PropType<SelectorType>,
      required: true,
    },
    modelValue: {
      type: Object as PropType<Selector<any> | JsonSelector<any, any>>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data() {
    return {
      id: nextId(),
      children: [] as Array<Selector<any> | JsonSelector<any, any>>,
      transfers: [] as Array<SimpleTransfer<any> | RegexTransfer<any> | JSONTransfer<any, any>>,
      variables: [] as VarExtractor[],
    };
  },
  computed: {
    selector: createComputedProperty("modelValue", "selector"),
    multiple: createComputedProperty("modelValue", "multiple"),
    regex: createComputedProperty("modelValue", "regex"),
    currentSelectorType(): SelectorValueType {
      if (this.selectorTypes.length === 1 && this.selectorTypes[0] === "json") {
        return "json";
      }
      if (this.selectorTypes.includes("regex") && (this.regex?.pattern || this.regex?.flags)) {
        return "regex";
      }
      return "text";
    },
    allowRegex(): boolean {
      return this.selectorTypes.includes("regex");
    },
    selectorTitle() {
      // @ts-expect-error
      if (this.selectorTypes.includes("json")) {
        return "JSON Property";
      }
      return "CSS";
    },
    selectorPlaceholder() {
      // @ts-expect-error
      if (this.selectorTypes.includes("json")) {
        return "authors.[*].name";
      }
      return "body > *";
    },
  },
  watch: {
    allowRegex: {
      handler(newValue: boolean) {
        if (newValue) {
          this.$emit("update:modelValue", { ...this.modelValue, regex: {} });
        } else {
          const tmp = { ...this.modelValue };
          // @ts-expect-error
          delete tmp.regex;
          this.$emit("update:modelValue", tmp);
        }
      },
      immediate: true,
    },
    children: {
      handler(newValue: any[]) {
        this.$emit("update:modelValue", { ...this.modelValue, children: newValue });
      },
      deep: true,
    },
    transfers: {
      handler(newValue: any[]) {
        this.$emit("update:modelValue", { ...this.modelValue, transfers: newValue });
      },
      deep: true,
    },
    variables: {
      handler(newValue: any[]) {
        this.$emit("update:modelValue", { ...this.modelValue, variables: newValue });
      },
      deep: true,
    },
  },
  created() {
    if (this.modelValue.children) {
      this.children = [...this.modelValue.children];
    }
    if (this.modelValue.transfers) {
      this.transfers = [...this.modelValue.transfers];
    }
    if (this.modelValue.variables) {
      this.variables = [...this.modelValue.variables];
    }
    if (this.allowRegex && !this.regex) {
      this.regex = {};
    }
  },
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    addVariable() {
      this.variables.push({
        variableName: "",
        value: "",
        extract: undefined,
      });
    },
    addTransfer() {
      this.transfers.push({
        targetKey: "",
        type: "string",
        optional: false,
        html: false,
        mapping: undefined,
      });
    },
    addChild() {
      this.children.push({
        selector: "",
        multiple: false,
        children: [],
        transfers: [],
        variables: [],
      });
    },
  },
});
</script>
<style scoped>
.card[aria-expanded="true"] {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.card + * > .card {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
}
</style>
