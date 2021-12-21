<template>
  <div ref="root" class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">
            <slot name="title" />
          </span>
          <button type="button" class="btn-close" aria-label="Close" @click="close" />
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
import Modal from "bootstrap/js/dist/modal";

export default defineComponent({
  name: "Modal",
  props: {
    error: { type: String, required: true },
    show: Boolean,
  },
  emits: ["finish", "close"],
  data() {
    return {
      closing: false,
      modal: null as Modal | null,
      listener: (evt: MouseEvent) => {
        if (!this.$refs.root) {
          return;
        }
        // noinspection JSCheckFunctionSignatures
        if (!(this.$refs.root as HTMLElement).contains(evt.target as Node | null) && this.show) {
          evt.stopImmediatePropagation();
          evt.preventDefault();
          this.close();
        }
      },
    };
  },
  watch: {
    show() {
      if (this.show) {
        this.closing = false;
        this.modal?.show();
      } else {
        this.modal?.hide();
      }
    },
  },
  mounted(): void {
    console.log(this.$refs);
    const modalElement = this.$refs.root as HTMLElement;
    this.modal = new Modal(modalElement);

    modalElement.addEventListener("hidden.bs.modal", () => this.close());
    document.addEventListener("click", this.listener, { capture: true });
  },
  unmounted() {
    document.removeEventListener("click", this.listener, { capture: true });
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
