<template>
  <div class="modal">
    <div class="modal-header">
      <span>
        <slot name="title" />
      </span>
    </div>
    <slot name="text" />
    <form>
      <slot name="input" />
      <div class="button">
        <button
          class="finish"
          type="button"
          @click="$emit('finish')"
        >
          <slot name="finish">
            Save
          </slot>
        </button>
      </div>
      <slot name="after" />
      <div class="error" />
    </form>
  </div>
</template>
<script lang="ts">
import { emitBusEvent } from "../../bus";

import { defineComponent } from "vue";

export default defineComponent({
    name: "Modal",
    props: {
        error: { type: String, required: true },
        show: Boolean
    },
    emits: ["finish"],
    mounted(): void {
        document.addEventListener("click", (evt) => {
            // noinspection JSCheckFunctionSignatures
            if (!this.$el.contains(evt.target) && this.show) {
                evt.stopImmediatePropagation();
                evt.preventDefault();
                this.close();
            }
        }, { capture: true });
    },
    methods: {
        close(): void {
            emitBusEvent("reset:modal");
        }
    }
});
</script>
