<template>
  <div
    class="btn-group btn-group-toggle"
    data-toggle="buttons"
    aria-label="Select what to filter on"
  >
    <label
      class="btn btn-secondary"
      :class="{ active: state === true }"
      data-toggle="tooltip"
      data-placement="top"
      title="Show only Read"
      @click.left="$emit('update:state', true)"
    >
      <input
        type="radio"
        name="read-state"
        :checked="state === true"
      >
      <i
        class="fas fa-check text-success"
        aria-hidden="true"
      />
    </label>
    <label
      class="btn btn-secondary"
      :class="{ active: state === false }"
      data-toggle="tooltip"
      data-placement="top"
      title="Show only Unread"
      @click.left="$emit('update:state', false)"
    ><input
       type="radio"
       name="read-state"
       :checked="state === false"
     >
      <i
        class="fas fa-check"
        aria-hidden="true"
      />
    </label>
    <label
      class="btn btn-secondary"
      :class="{ active: state == undefined }"
      data-toggle="tooltip"
      data-placement="top"
      title="Show both"
      @click.left="$emit('update:state', undefined)"
    ><input
       type="radio"
       name="read-state"
       :checked="state == undefined"
     >
      <i
        class="fas fa-check text-success"
        aria-hidden="true"
      />
      <i
        class="fas fa-check"
        aria-hidden="true"
      />
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import $ from "jquery";

// initialize all tooltips on this page
$(function () {
    $("[data-toggle=\"tooltip\"]").tooltip()
});

export default defineComponent({
    name: "TripleState",
    props: {
        state: Boolean
    },
    emits: ["update:state"],
});
</script>