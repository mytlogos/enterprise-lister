<template>
  <div class="btn-group btn-group-toggle" data-bs-toggle="buttons" aria-label="Select what to filter on">
    <label
      class="btn btn-secondary"
      :class="{ active: state === true }"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      title="Show only Read"
      @click.left="$emit('update:state', true)"
    >
      <input class="btn-check" type="radio" name="read-state" :checked="state === true" />
      <i class="fas fa-check text-success" aria-hidden="true" />
    </label>
    <label
      class="btn btn-secondary"
      :class="{ active: state === false }"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      title="Show only Unread"
      @click.left="$emit('update:state', false)"
    >
      <input class="btn-check" type="radio" name="read-state" :checked="state === false" />
      <i class="fas fa-check" aria-hidden="true" />
    </label>
    <label
      class="btn btn-secondary"
      :class="{ active: state == undefined }"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      title="Show both"
      @click.left="$emit('update:state', undefined)"
    >
      <input class="btn-check" type="radio" name="read-state" :checked="state == undefined" />
      <i class="fas fa-check text-success" aria-hidden="true" />
      <i class="fas fa-check" aria-hidden="true" />
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ToolTip from "bootstrap/js/dist/tooltip";

export default defineComponent({
  name: "TripleState",
  props: {
    state: Boolean,
  },
  emits: ["update:state"],
  data() {
    return {
      tooltips: [] as ToolTip[],
    };
  },
  mounted() {
    // eslint-disable-next-line @typescript-eslint/quotes
    this.tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map((item) => new ToolTip(item));
  },
});
</script>
