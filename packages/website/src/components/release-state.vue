<template>
  <span class="badge" :class="stateClass">
    {{ stateText }}
  </span>
</template>

<script lang="ts">
import { ReleaseState } from "../siteTypes";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ReleaseState",
  props: {
    state: {
      type: Number,
      default: ReleaseState.Unknown,
      required: false,
    },
  },
  computed: {
    stateClass(): string {
      switch (this.state) {
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
    },
    stateText(): string {
      switch (this.state) {
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
    },
  },
});
</script>
