<template>
  <toggle-buttons
    :values="values"
    :state="selected"
    @update:state="selected = $event"
  />
</template>

<script lang="ts">
import { MediaType } from "../siteTypes";
import { defineComponent } from "vue";
import toggleButtons from "./toggle-buttons.vue";

/*
Currently for some reason the prop values are not updated via the event.
The user needs to have a eventlistener like:

'@update:state="<var> = $event"'

on this Component.
*/
export default defineComponent({
    name: "MediaFilter",
    components: {
        toggleButtons: toggleButtons
    },
    props: {
        state: {
            type: Number,
            default: 0,
        },
    },
    emits: ["update:state"],
    data() {
        const filter = [
            {
                tooltip: "Search Text Media",
                class: "fa-book",
                value: MediaType.TEXT
            },
            {
                tooltip: "Search Image Media",
                class: "fa-image",
                value: MediaType.IMAGE
            },
            {
                tooltip: "Search Video Media",
                class: "fa-film",
                value: MediaType.VIDEO
            },
            {
                tooltip: "Search Audio Media",
                class: "fa-headphones",
                value: MediaType.AUDIO
            }
        ];
        return {
            selected: filter[0],
            values: filter,
        };
    },
    watch: {
        state() {
            const found = this.values.find(value => value.value === this.state);
            this.selected = found;
        },
        selected() {
            this.$emit("update:state", this.selected ? this.selected.value : 0);
        },
    },
});
</script>