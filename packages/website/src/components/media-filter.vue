<template>
  <SelectButton v-model="selected" class="d-inline-block" :options="values" data-key="value" multiple>
    <template #option="slotProps">
      <i
        v-if="stateCount"
        v-badge="stateCount[slotProps.option.value]"
        class="fas"
        :class="slotProps.option.class"
        aria-hidden="true"
      />
      <i v-else class="fas" :class="slotProps.option.class" aria-hidden="true" />
    </template>
  </SelectButton>
</template>

<script lang="ts">
import { MediaType } from "../siteTypes";
import { defineComponent, PropType } from "vue";
import SelectButton from "primevue/selectbutton";

/*
Currently for some reason the prop values are not updated via the event.
The user needs to have a eventlistener like:

'@update:state="<var> = $event"'

on this Component.
*/
export default defineComponent({
  name: "MediaFilter",
  components: {
    SelectButton,
  },
  props: {
    state: {
      type: Number,
      default: 0,
    },
    stateCount: {
      type: Object as PropType<{ [key: number]: number } | null>,
      default: null,
    },
  },
  emits: ["update:state"],
  data() {
    const filter = [
      {
        tooltip: "Search Text Media",
        class: "fa-book",
        value: MediaType.TEXT,
      },
      {
        tooltip: "Search Image Media",
        class: "fa-image",
        value: MediaType.IMAGE,
      },
      {
        tooltip: "Search Video Media",
        class: "fa-film",
        value: MediaType.VIDEO,
      },
      {
        tooltip: "Search Audio Media",
        class: "fa-headphones",
        value: MediaType.AUDIO,
      },
    ];
    return {
      selected: filter.filter((value) => this.state & value.value),
      values: filter,
    };
  },
  watch: {
    state() {
      const found = this.values.filter((value) => value.value & this.state);
      this.selected = found;
    },
    selected() {
      this.$emit(
        "update:state",
        this.selected.reduce((previous, next) => previous + next.value, 0),
      );
    },
  },
});
</script>
<style>
:deep(.p-button) {
  height: 100% !important;
}
</style>
