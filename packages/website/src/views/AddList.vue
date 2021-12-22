<template>
  <div class="container">
    <div class="card m-1">
      <div class="card-body">
        <div class="card-title">Add Reading List</div>
        <div class="input-name">
          <label>
            Name:
            <input v-model="name" name="name" required title="List Name" type="text" />
          </label>
        </div>
        <div class="input-medium">
          <label>Medium:</label>
          <span v-for="type of mediaTypes" :key="type.name" class="medium-check-container">
            <label>
              <input v-model="type.checked" type="checkbox" />
              {{ type.name }}
            </label>
          </span>
        </div>
        <button class="btn btn-primary" type="button" @click="send">Add List</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

interface GuiMediaType {
  value: number;
  name: string;
  checked: boolean;
}

export default defineComponent({
  name: "AddList",
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
