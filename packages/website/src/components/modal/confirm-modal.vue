<template>
  <modal :error="error" :show="show" @finish="logout('yes')">
    <template #title> Confirmation </template>
    <template #text>
      {{ text }}
    </template>
    <template #finish> Yes </template>
  </modal>
</template>

<script lang="ts" setup>
import modal from "./modal.vue";

defineProps({
  text: { type: String, required: true },
  show: Boolean,
  error: { type: String, required: true },
});

function logout(params: string) {
  // TODO: implement?
}
</script>
