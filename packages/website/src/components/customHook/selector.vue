<template>
  <div class="card card-body">
    <div class="row mb-3">
      <div class="col">
        <label for="selector" class="form-label">CSS Selector</label>
        <input id="selector" type="text" class="form-control" placeholder="body > *" />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input id="flexSwitchCheckChecked" class="form-check-input" type="checkbox" role="switch" checked />
          <label class="form-check-label" for="flexSwitchCheckChecked">Expect multiple results for Selector</label>
        </div>
      </div>
    </div>
    <div class="mb-3">
      <button class="btn btn-primary" role="button" @click="addVariable">Add Variable</button>
      <variable-extractor
        v-for="(variable, index) in variables"
        :key="variable.variableName + index"
        is-regex="false"
        class="mt-3"
      />
    </div>
    <div class="mb-3">
      <button class="btn btn-primary" role="button" @click="addTransfer">Add Transfer</button>
      <value-transfer
        v-for="(transfer, index) in transfers"
        :key="transfer.targetKey + index"
        is-regex="false"
        class="mt-3"
      />
    </div>
    <div class="mb-3">
      <button class="btn btn-primary" role="button" @click="addChild">Add Child</button>
      <selector v-for="(child, index) in children" :key="index" :selector-types="selectorTypes" class="mt-3" />
    </div>
  </div>
</template>
<script lang="ts">
import {
  RegexTransfer,
  Selector,
  SimpleTransfer,
  VariableExtractor as VarExtractor,
} from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import ValueTransfer from "./value-transfer.vue";
import VariableExtractor from "./variable-extractor.vue";

export enum SelectorType {
  SIMPLE = "SIMPLE",
  JSON = "JSON",
  REGEX = "REGEX",
}

export default defineComponent({
  name: "Selector",
  components: {
    VariableExtractor,
    ValueTransfer,
  },
  props: {
    selectorTypes: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },
  data() {
    return {
      selector: "",
      multiple: false,
      children: [] as Array<Selector<any>>,
      transfers: [] as Array<SimpleTransfer<any> | RegexTransfer<any>>,
      variables: [] as VarExtractor[],
    };
  },
  methods: {
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
