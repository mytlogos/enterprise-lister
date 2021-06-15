<template>
  <div class="btn-group btn-group-toggle" aria-label="Select what to filter on">
    <label
      v-for="item of values"
      :key="item.value"
      class="btn btn-secondary"
      :class="{ active: Array.isArray(state) ? state.includes(item) : state === item }"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      :title="item.tooltip"
      @click.left="$emit('update:state', item)"
    >
      <input class="btn-check" type="radio" :checked="state === item" />
      <i class="fas" :class="item.class" aria-hidden="true" />
      <slot name="additional" :value="item.value"></slot>
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import ToolTip from "bootstrap/js/dist/tooltip";

/**
 * The Type for the state Prop
 */
interface ToggleButton {
  value: any;
  class: string;
  tooltip: string;
}

/*
Currently for some reason the prop values are not updated via the event.
The user needs to have a eventlistener like:

'@update:state="<var> = $event"'

on this Component.
*/
export default defineComponent({
  name: "ToggleButtons",
  props: {
    state: {
      type: [Object, Array] as PropType<ToggleButton | ToggleButton[]>,
      required: true,
    },
    values: {
      type: Array as PropType<ToggleButton[]>,
      required: true,
    },
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
