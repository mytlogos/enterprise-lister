<template>
  <span
    class="badge"
    :class="stateClass"
  >
    {{ stateText }}
  </span>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "JobModal"
});
</script>