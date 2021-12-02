<template>
  <div>I am a form</div>
</template>
<script lang="ts">
import { CustomHook } from "enterprise-core/dist/types";
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "CustomHookForm",
  props: {
    value: {
      type: Object as PropType<CustomHook>,
      required: true,
    },
  },
  emits: ["update:value"],
});
</script>
