<template>
  <div v-if="show" ref="root" class="modal">
    <div class="modal-header">
      <button class="close" title="Close" type="button" @click="close()">
        <span>×</span>
      </button>
    </div>
    <div v-if="failure">
      <!--TODO Insert failure icon and text-->
    </div>
    <span v-else>Are you sure you want to delete: {{ object.name }}</span>
    <div class="button">
      <button type="button" @click="sendForm">Sure, Delete it</button>
    </div>
  </div>
</template>

<script lang="ts">
import { emitBusEvent, onBusEvent } from "../../bus";

import { defineComponent, PropType } from "vue";

interface ToDeleteObject {
  name: string;
  id: number;
  type: any;
}

export default defineComponent({
  name: "DeleteModal",
  props: {
    show: Boolean,
    object: { type: Object as PropType<ToDeleteObject>, required: true },
  },
  emits: ["hide"],
  data(): { failure: boolean } {
    return {
      failure: false,
    };
  },
  watch: {
    show(newValue: boolean): void {
      if (!newValue) {
        this.failure = false;
      }
    },
  },
  mounted(): void {
    document.addEventListener(
      "click",
      (evt) => {
        const root = this.$refs.root as HTMLElement | undefined;
        if (!root) {
          console.error("Root Ref not defined in Delete Modal");
          return;
        }
        if (!root.contains(evt.target as Node | null) && this.show) {
          evt.stopImmediatePropagation();
          this.close();
        }
      },
      { capture: true },
    );
    onBusEvent("deletion", (failure) => {
      if (!this.show) {
        return;
      }
      if (!failure) {
        this.close();
      }
      this.failure = failure;
    });
  },
  methods: {
    sendForm(): void {
      emitBusEvent("delete:" + this.object.type, this.object.id);
    },
    close(): void {
      this.$emit("hide");
    },
  },
});
</script>
