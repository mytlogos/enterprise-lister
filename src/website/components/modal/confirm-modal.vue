<template>
  <modal
    :error="error"
    :show="show"
    @finish="logout('yes')"
  >
    <template #title>
      Confirmation
    </template>
    <template #text>
      {{ text }}
    </template>
    <template #finish>
      Yes
    </template>
  </modal>
</template>

<script lang="ts">
import modal from "./modal.vue";
import { defineComponent } from "vue";

export default defineComponent({
    name: "ConfirmModal",
    components: {modal},
    props: {
        text: { type: String, required: true},
        show: Boolean,
        error: { type: String, required: true},
    }
});
</script>
