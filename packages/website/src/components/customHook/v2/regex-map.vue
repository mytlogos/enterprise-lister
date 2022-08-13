<template>
  <button class="btn btn-primary mt-3" role="button" @click="addRegex">Add Regex</button>
  <div class="row mb-3">
    <div class="col">
      <label for="hookBase" class="form-label">Regex Name</label>
      <input id="hookBase" v-model="data.name" type="text" class="form-control" placeholder="Name" />
    </div>
    <div class="col">
      <regex v-model="data.regex" />
    </div>
  </div>
  <div v-for="entry in Object.entries(modelValue)" :key="entry[0]" class="row mb-3">
    <div class="col">
      <span>{{ entry[0] }}</span>
      <span>{{ entry[1] }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { PropType, reactive } from "vue";
import Regex from "../regex.vue";
import { JsonRegex } from "enterprise-scraper/dist/externals/customv2/types";

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
});

function addRegex() {
  if (!data.name || !data.regex.pattern) {
    return;
  }
  emits("update:modelValue", { ...props.modelValue, [data.name]: data.regex });
  data.regex = defaultRegex();
  data.name = "";
}
</script>
