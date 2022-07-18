<template>
  <button class="btn btn-primary mt-3" role="button" @click="addRegex">Add Regex</button>
  <div class="row mb-3">
    <div class="col">
      <label for="hookBase" class="form-label">Regex Name</label>
      <input id="hookBase" v-model="name" type="text" class="form-control" placeholder="Name" />
    </div>
    <div class="col">
      <regex v-model="regex" />
    </div>
  </div>
  <div v-for="entry in Object.entries(modelValue)" :key="entry[0]" class="row mb-3">
    <div class="col">
      <span>{{ entry[0] }}</span>
      <span>{{ entry[1] }}</span>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { idGenerator } from "../../../init";
import Regex from "../regex.vue";
import { JsonRegex } from "enterprise-scraper/dist/externals/customv2/types";

const nextId = idGenerator();

function defaultRegex() {
  return { pattern: "", flags: "" };
}

export default defineComponent({
  name: "RegexMap",
  components: {
    Regex,
  },
  props: {
    idPrefix: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Object as PropType<Record<string, JsonRegex>>,
      required: true,
    },
  },
  emits: ["update:modelValue", "delete"],
  data: () => ({ id: nextId(), name: "", regex: defaultRegex() }),
  methods: {
    addRegex() {
      if (!this.name || !this.regex.pattern) {
        return;
      }
      this.$emit("update:modelValue", { ...this.modelValue, [this.name]: this.regex });
      this.regex = defaultRegex();
      this.name = "";
    },
  },
});
</script>
