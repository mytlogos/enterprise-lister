<template>
  <button
    class="btn"
    @click="emit(event)"
  >
    {{ name }}
  </button>
</template>

<script lang="ts">
import { emitBusEvent } from "../bus";

import { defineComponent } from "vue";

export default defineComponent({
    name: "AppHeader",
    props: {
        event: { type: String, required: true },
        name: { type: String, required: true }
    },
    methods: {
        logout(value: unknown): void {
            console.log("emitting");
            emitBusEvent(value);
        }
    }
});
</script>
