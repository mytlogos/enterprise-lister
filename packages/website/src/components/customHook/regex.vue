<template>
  <div class="row">
    <div class="col">
      <label for="pattern" class="form-label">{{ regexName }}</label>
      <input id="pattern" v-model="pattern" type="text" class="form-control" placeholder="Regex Pattern" />
    </div>
    <div class="col-2">
      <label for="pattern" class="form-label">Flags</label>
      <input id="pattern" v-model="flags" type="text" class="form-control" placeholder="Flags" />
    </div>
  </div>
</template>
<script lang="ts">
import { JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { defineComponent, PropType } from "vue";
import { createComputedProperty } from "../../init";

export default defineComponent({
  name: "Regex",
  props: {
    modelValue: {
      type: Object as PropType<JsonRegex>,
      required: true,
    },
    regexName: {
      type: String,
      default: () => "Regex",
    },
  },
  emits: ["update:modelValue"],
  computed: {
    pattern: createComputedProperty("modelValue", "pattern"),
    flags: createComputedProperty("modelValue", "flags"),
  },
});
</script>
