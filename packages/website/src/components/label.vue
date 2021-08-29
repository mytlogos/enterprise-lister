<template>
  <span class="badge" :title="value">
    <span class="p-1" style="max-width: 100px; display: inline-block; text-overflow: ellipsis; overflow: hidden">{{
      value
    }}</span>
    <button type="button" class="btn-close" aria-label="Close" @click="$emit('delete')">
      <span aria-hidden="true">&times;</span>
    </button>
  </span>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "Label",
  props: {
    value: {
      type: String,
      required: true,
    },
  },
  emits: ["delete"],
});
</script>
