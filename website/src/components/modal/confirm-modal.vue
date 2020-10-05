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

<script>
import modal from "./modal";

export default {
    name: "ConfirmModal",
    components: {modal},
    props: {
        text: String,
        show: Boolean,
        error: String,
    }
};
</script>

<style scoped>

</style>
