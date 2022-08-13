<template>
  <span class="badge" :class="stateClass">
    {{ stateText }}
  </span>
</template>

<script lang="ts" setup>
import { ReleaseState } from "../siteTypes";
import { computed } from "vue";

const props = defineProps<{ state?: ReleaseState }>();
const stateClass = computed(() => {
  switch (props.state) {
    case ReleaseState.Unknown:
      return "bg-light text-dark";
    case ReleaseState.Ongoing:
      return "bg-primary";
    case ReleaseState.Hiatus:
      return "bg-warning text-dark";
    case ReleaseState.Discontinued:
      return "bg-danger";
    case ReleaseState.Dropped:
      return "bg-danger";
    case ReleaseState.Complete:
      return "bg-success";
    default:
      return "bg-light text-dark";
  }
});
const stateText = computed(() => {
  switch (props.state) {
    case ReleaseState.Unknown:
      return "Unknown";
    case ReleaseState.Ongoing:
      return "Ongoing";
    case ReleaseState.Hiatus:
      return "Hiatus";
    case ReleaseState.Discontinued:
      return "Discontinued";
    case ReleaseState.Dropped:
      return "Dropped";
    case ReleaseState.Complete:
      return "Complete";
    default:
      return "Unknown";
  }
});
</script>
