<template>
  <div class="mt-2">
    <h6>Regexes</h6>
    <div class="grid p-fluid">
      <div class="col-12 md:col-4">
        <span class="p-float-label">
          <input-text v-model="data.name" />
          <label class="form-label">Name</label>
        </span>
      </div>
      <div class="col-12 md:col-4">
        <regex v-model="data.regex" :show-label="false" />
      </div>
      <div class="col-12 md:col-2">
        <p-button label="Add Regex" @click="addRegex" />
      </div>
    </div>
    <div v-for="(_, key) in data.regexMap" :key="key" class="grid p-fluid mt-1">
      <div class="col-12 md:col-4">
        <input-text :model-value="key" disabled />
      </div>
      <div class="col-12 md:col-4">
        <regex v-model="data.regexMap[key]" :show-label="false" />
      </div>
      <div class="col-12 md:col-2">
        <p-button label="Remove" @click="removeRegex(key)" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { PropType, reactive, watch } from "vue";
import Regex from "../regex.vue";
import { JsonRegex } from "enterprise-scraper/dist/externals/customv2/types";
import { deepEqual } from "../../../init";

function defaultRegex() {
  return { pattern: "", flags: "" };
}

const props = defineProps({
  idPrefix: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Object as PropType<Record<string, JsonRegex>>,
    required: true,
  },
});

const emits = defineEmits(["update:modelValue", "delete"]);
const data = reactive({
  name: "",
  regex: defaultRegex(),
  regexMap: {} as Record<string, JsonRegex>,
});

watch(
  () => data.regexMap,
  () => {
    emits("update:modelValue", { ...data.regexMap });
  },
  {
    deep: true,
  },
);

watch(
  () => props.modelValue,
  () => {
    if (deepEqual(props.modelValue, data.regexMap)) {
      return;
    }
    data.regexMap = props.modelValue ? { ...props.modelValue } : {};
  },
  {
    deep: true,
  },
);

function addRegex() {
  if (!data.name || !data.regex.pattern) {
    return;
  }
  data.regexMap[data.name] = data.regex;
  data.regex = defaultRegex();
  data.name = "";
}

function removeRegex(key: keyof typeof data.regexMap) {
  delete data.regexMap[key];
}
</script>
