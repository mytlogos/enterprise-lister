<template>
  <i class="fas text-dark" :class="iconClass" aria-hidden="true" style="font-size: 1.3rem" />
</template>
<script lang="ts" setup>
import { MediaType } from "../siteTypes";
import { computed } from "vue";

const props = defineProps<{ type: number }>();
const iconClass = computed(() => {
  switch (props.type) {
    case MediaType.TEXT:
      return "fa-book";
    case MediaType.AUDIO:
      return "fa-headphones";
    case MediaType.VIDEO:
      return "fa-film";
    case MediaType.IMAGE:
      return "fa-image";
    default:
      return "fa-question";
  }
});
</script>
