<template>
  <div>
    You have reached the forbidden Zone. Turn around before its too late.
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "ErrorView",
    data(): { hello: number } {
        return {
            hello: 1
        };
    },
    mounted(): void {
        console.log("errorView mounted");
    }
});
</script>
