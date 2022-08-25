<template>
  <div class="row">
    <div class="col">
      <label v-if="props.showLabel" for="pattern" class="form-label">{{ regexName }}</label>
      <prism-editor v-model="pattern" class="my-editor form-control" :highlight="highlighter" />
    </div>
    <div class="col-2" :class="{ 'p-float-label': !props.showLabel }">
      <label v-if="props.showLabel" for="pattern" class="form-label">Flags</label>
      <input-text id="pattern" v-model="flags" type="text" />
      <label v-if="!props.showLabel" for="pattern" class="form-label">Flags</label>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { JsonRegex } from "enterprise-scraper/dist/externals/custom/types";
import { computed, PropType } from "vue";
import { PrismEditor } from "vue-prism-editor";
// @ts-expect-error
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-regex.js";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

const props = defineProps({
  modelValue: {
    type: Object as PropType<JsonRegex>,
    required: true,
  },
  regexName: {
    type: String,
    default: () => "Regex",
  },
  showLabel: {
    type: Boolean,
    default: true,
  },
});

const emits = defineEmits(["update:modelValue"]);
const pattern = computed({
  get(): string {
    return props.modelValue.pattern;
  },
  set(value: string) {
    emits("update:modelValue", { ...props.modelValue, pattern: value });
  },
});
const flags = computed({
  get(): string {
    return props.modelValue.flags;
  },
  set(value: string) {
    emits("update:modelValue", { ...props.modelValue, flags: value });
  },
});

function highlighter(code: string) {
  return highlight(code, languages.regex); // languages.<insert language> to return html with markup
}
</script>
<style scoped>
/* required class */
.my-editor {
  /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
  background: #2d2d2d;
  color: #ccc;

  /* you must provide font-family font-size line-height. Example: */
  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  max-height: 38px; /* same height as other single line input-boxes */
}
/* optional class for removing the outline */
.my-editor :deep(.prism-editor__container) {
  margin-top: auto !important;
  margin-bottom: auto !important;
}
/* optional class for removing the outline */
.my-editor :deep(.prism-editor__textarea:focus) {
  outline: none;
}
/* give escape tokens a color */
.my-editor :deep(.token.escape) {
  color: #dc3545;
}
.my-editor :deep(.token.escape.special-escape) {
  color: cadetblue;
}
</style>
