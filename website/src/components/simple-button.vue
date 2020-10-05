<template>
  <button
    class="btn"
    @click="emit(event)"
  >
    {{ name }}
  </button>
</template>

<script>
import {emitBusEvent} from "../bus";

export default {
    name: "AppHeader",
    props: {
        event: String,
        name: String
    },
    methods: {
        logout(value: unknown): void {
            console.log("emitting");
            emitBusEvent(value);
        }
    }
};
</script>
