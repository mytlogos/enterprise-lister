<template>
  <div class="row">
    <div class="col">
      <label for="pattern" class="form-label">{{ regexName }}</label>
      <prism-editor v-model="pattern" class="my-editor form-control" :highlight="highlighter" />
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
import { PrismEditor } from "vue-prism-editor";
// @ts-expect-error
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-regex.js";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

export default defineComponent({
  name: "Regex",
  components: {
    PrismEditor,
  },
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
  methods: {
    highlighter(code: string) {
      return highlight(code, languages.regex); // languages.<insert language> to return html with markup
    },
  },
});
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
