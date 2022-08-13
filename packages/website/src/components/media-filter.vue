<template>
  <SelectButton v-model="selected" class="d-inline-block" :options="filter" data-key="value" multiple>
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

<script lang="ts" setup>
import { MediaType } from "../siteTypes";
import { ref, watch, watchEffect } from "vue";
import SelectButton from "primevue/selectbutton";

// PROPS
const props = defineProps<{ state?: number; stateCount?: Record<number, number> }>();

// EVENTS
const emits = defineEmits(["update:state"]);

// DATA
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
const selected = ref(filter.filter((value) => (props.state || 0) & value.value));

// WATCHES
watchEffect(() => {
  selected.value = filter.filter((value) => value.value & (props.state || 0));
});

watch(selected, () => {
  emits(
    "update:state",
    selected.value.reduce((previous, next) => previous + next.value, 0),
  );
});
/*
Currently for some reason the prop values are not updated via the event.
The user needs to have a eventlistener like:

'@update:state="<var> = $event"'

on this Component.
*/
</script>
<style>
:deep(.p-button) {
  height: 100% !important;
}
</style>
