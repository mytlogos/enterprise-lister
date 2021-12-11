<template>
  <div>
    <div class="card" role="button" data-bs-toggle="collapse" :data-bs-target="'#selector' + id" aria-expanded="true">
      <div class="card-body">Selector {{ model.selector }}</div>
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
              v-model="model.selector"
              type="text"
              class="form-control"
              :placeholder="selectorPlaceholder"
              required
            />
          </div>
        </div>
        <regex v-if="allowRegex" v-model="model.regex" />
        <div class="row align-items-center mb-3">
          <div class="col">
            <div class="form-check form-switch">
              <input
                id="multipleResults"
                v-model="model.multiple"
                class="form-check-input"
                type="checkbox"
                role="switch"
                :checked="model.multiple"
              />
              <label class="form-check-label" for="multipleResults">Expect multiple results for Selector</label>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addVariable">Add Variable</button>
          <template v-if="model.variables.length">
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
                  v-for="(variable, index) in model.variables"
                  :key="variable.variableName + index"
                  v-model="model.variables[index]"
                  :selector-type="currentSelectorType"
                  class="card-body mt-3"
                  :class="{ 'border-top': index }"
                  @delete="remove(model.variables, index)"
                />
              </div>
            </div>
          </template>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addTransfer">Add Transfer</button>
          <template v-if="model.transfers.length">
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
                  v-for="(transfer, index) in model.transfers"
                  :key="transfer.targetKey + index"
                  v-model="model.transfers[index]"
                  :selector-type="currentSelectorType"
                  class="card-body mt-3"
                  :class="{ 'border-top': index }"
                  @delete="remove(model.transfers, index)"
                />
              </div>
            </div>
          </template>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary" role="button" @click="addChild">Add Child</button>
          <selector
            v-for="(child, index) in model.children"
            :key="index"
            v-model="model.children[index]"
            :selector-types="selectorTypes"
            class="mt-3"
            @delete="remove(model.children, index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import {
  JsonRegex,
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
import { clone, idGenerator, Logger, deepEqual, toArray } from "../../init";
import { SelectorType, SelectorValueType } from "../../siteTypes";
import Regex from "./regex.vue";

// this relies on the fact that a component is loaded only once
const nextId = idGenerator();

function model(prop: ModelValue) {
  return {
    children: toArray(prop.children as any) as Array<Selector<any> | JsonSelector<any, any>>,
    transfers: toArray(prop.transfers as any) as Array<
      SimpleTransfer<any> | RegexTransfer<any> | JSONTransfer<any, any>
    >,
    variables: toArray(prop.variables as any) as VarExtractor[],
    selector: prop.selector,
    multiple: prop.multiple || false,
    regex: ("regex" in prop && (prop.regex as JsonRegex)) || { pattern: "", flags: "" },
  };
}

type ModelValue = Selector<any> | JsonSelector<any, any>;

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
    const id = nextId();
    return {
      id,
      logger: new Logger("selector-" + id),
      model: model(this.modelValue),
    };
  },
  computed: {
    currentSelectorType(): SelectorValueType {
      if (this.selectorTypes.length === 1 && this.selectorTypes[0] === "json") {
        return "json";
      }
      if (this.selectorTypes.includes("regex") && (this.model.regex.pattern || this.model.regex.flags)) {
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
    model: {
      handler(newValue: ReturnType<typeof model>) {
        const result = clone(this.modelValue);

        result.variables = [...newValue.variables];
        result.transfers = [...newValue.transfers] as any[];
        result.children = [...newValue.children] as any[];

        result.multiple = newValue.multiple;
        result.selector = newValue.selector;

        if (this.currentSelectorType === "regex") {
          // @ts-expect-error
          result.regex = newValue.regex;
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
      handler(newValue: ModelValue) {
        const result = clone(this.model);

        result.variables = toArray(newValue.variables);
        result.transfers = toArray(newValue.transfers as any);
        result.children = toArray(newValue.children as any);

        result.multiple = newValue.multiple || false;
        result.selector = newValue.selector;
        result.regex = ("regex" in newValue && (newValue.regex as JsonRegex)) || { pattern: "", flags: "" };

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
  methods: {
    remove(array: any[], index: number) {
      array.splice(index, 1);
    },
    addVariable() {
      this.model.variables.push({
        variableName: "",
        value: "",
        extract: undefined,
      });
    },
    addTransfer() {
      this.model.transfers.push({
        targetKey: "",
        type: "string",
        optional: false,
        html: false,
        mapping: undefined,
      });
    },
    addChild() {
      this.model.children.push({
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
