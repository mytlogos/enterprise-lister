<template>
  <div ref="root" class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">
            <slot name="title" />
          </span>
          <button type="button" class="close" aria-label="Close" @click="close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <slot name="text" />
          <form>
            <slot name="input" />
            <slot name="after" />
            <div class="error" />
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Close</button>
          <button class="btn btn-primary" type="button" @click="$emit('finish'), close()">
            <slot name="finish"> Save </slot>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { emitBusEvent } from "../../bus";
import { defineComponent } from "vue";
import $ from "jquery";

export default defineComponent({
  name: "Modal",
  props: {
    error: { type: String, required: true },
    show: Boolean,
  },
  emits: ["finish", "close"],
  data() {
    return { closing: false };
  },
  watch: {
    show() {
      if (this.show) {
        this.closing = false;
        console.log(this.$refs);
        $(this.$refs.root as HTMLElement).show();
      } else {
        $(this.$refs.root as HTMLElement).hide();
      }
    },
  },
  mounted(): void {
    console.log(this.$refs);
    $(this.$refs.root as HTMLElement).modal({ show: false });
    $(this.$refs.root as HTMLElement).on("hidden.bs.modal", () => this.close());

    document.addEventListener(
      "click",
      (evt) => {
        // noinspection JSCheckFunctionSignatures
        if (!(this.$refs.root as HTMLElement).contains(evt.target as Node | null) && this.show) {
          evt.stopImmediatePropagation();
          evt.preventDefault();
          this.close();
        }
      },
      { capture: true },
    );
  },
  methods: {
    close(): void {
      if (this.closing || !this.show) {
        return;
      }
      this.closing = true;
      this.$emit("close");
      emitBusEvent("reset:modal");
    },
  },
});
</script>
