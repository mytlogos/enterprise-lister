<template>
  <i class="fas text-dark" :class="iconClass" aria-hidden="true" style="font-size: 1.3rem" />
</template>
<script lang="ts">
import { MediaType } from "../siteTypes";
import { defineComponent } from "vue";

export default defineComponent({
  name: "TypeIcon",
  props: {
    type: {
      type: Number,
      required: true,
    },
  },
  computed: {
    iconClass(): string {
      switch (this.type) {
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
    },
  },
});
</script>
