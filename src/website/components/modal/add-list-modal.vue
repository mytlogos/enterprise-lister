<template>
  <modal :error="error" :show="show" @finish="send()">
    <template #title> Add Reading List </template>
    <template #input>
      <div class="input-name">
        <label>
          Name:
          <input v-model="name" name="name" required title="List Name" type="text" />
        </label>
      </div>
      <div class="input-medium">
        <label>Medium:</label>
        <span v-for="type of mediaTypes" :key="type" class="medium-check-container">
          <label>
            <input v-model="type.checked" type="checkbox" />
            {{ type.name }}
          </label>
        </span>
      </div>
    </template>
    <template #finish> Add List </template>
  </modal>
</template>

<script lang="ts">
import modal from "./modal.vue";

interface GuiMediaType {
  value: number;
  name: string;
  checked: boolean;
}

import { defineComponent } from "vue";

export default defineComponent({
  name: "AddListModal",
  components: { modal },
  props: {
    show: Boolean,
    error: { type: String, required: true },
  },
  data(): { mediaTypes: GuiMediaType[]; name: string } {
    return {
      mediaTypes: [
        {
          name: "Text",
          checked: false,
          value: 0x1,
        },
        {
          name: "Audio",
          checked: false,
          value: 0x2,
        },
        {
          name: "Video",
          checked: false,
          value: 0x4,
        },
        {
          name: "Image",
          checked: false,
          value: 0x8,
        },
      ],
      name: "",
    };
  },

  methods: {
    send(): void {
      let mediumType = 0;
      this.mediaTypes.forEach((value) => {
        if (value.checked) {
          mediumType |= value.value;
        }
      });
      this.$store.dispatch("addList", { name: this.name, type: mediumType });
    },
  },
});
</script>
