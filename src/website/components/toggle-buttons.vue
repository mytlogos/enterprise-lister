<template>
  <div
    class="btn-group btn-group-toggle"
    aria-label="Select what to filter on"
  >
    <label
      v-for="item of values"
      :key="item.value"
      class="btn btn-secondary"
      :class="{ active: state === item }"
      data-toggle="tooltip"
      data-placement="top"
      :title="item.tooltip"
      @click.left="$emit('update:state', item)"
    >
      <input
        type="radio"
        :checked="state === item"
      >
      <i
        class="fas"
        :class="item.class"
        aria-hidden="true"
      />
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import $ from "jquery";

// initialize all tooltips on this page
$(function () {
    $("[data-toggle=\"tooltip\"]").tooltip()
});

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
            type: [Object, Array] as PropType<[ToggleButton, ToggleButton[]]>,
            required: true,
        },
        values:  {
            type: Array,
            required: true,
        },
    },
    emits: ["update:state"],
});
</script>