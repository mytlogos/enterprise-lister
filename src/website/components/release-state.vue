<template>
  <span 
    class="badge"
    :class="stateClass"
  >
    {{ stateText }}
  </span>
</template>

<script lang="ts">
import { ReleaseState } from "../siteTypes";
import { defineComponent } from "vue"

export default defineComponent({
    name: "ReleaseState",
    props: {
        state: {
            type: Number,
            required: true
        }
    },
    computed: {
        stateClass(): string {
            switch (this.state) {
            case ReleaseState.Unknown:
                return "badge-light";
            case ReleaseState.Ongoing:
                return "badge-primary";
            case ReleaseState.Hiatus:
                return "badge-warning";
            case ReleaseState.Discontinued:
                return "badge-danger";
            case ReleaseState.Dropped:
                return "badge-danger";
            case ReleaseState.Complete:
                return "badge-success";
            default:
                return "badge-light";
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
        }
    }
})
</script>