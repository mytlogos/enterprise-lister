<template>
  <div
    ref="root"
    class="toast"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    :style="{ display: showing ? 'block' : 'none' }"
  >
    <div class="toast-header">
      <i class="me-2" :class="titleClass" aria-hidden="true" />
      <strong class="me-auto">{{ title }}</strong>
      <button
        type="button"
        class="ms-2 mb-1 btn-close"
        data-bs-dismiss="toast"
        aria-label="Close"
        @click.left="$emit('close')"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">
      {{ message }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Toast from "bootstrap/js/dist/toast";

export default defineComponent({
  name: "Toast",
  props: {
    title: {
      type: String,
      required: true,
    },
    success: {
      type: Boolean,
      required: false,
      default: false,
    },
    error: {
      type: Boolean,
      required: false,
      default: true,
    },
    message: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      required: false,
    },
  },
  emits: ["close"],
  data() {
    return {
      showing: false,
      toast: null as null | Toast,
    };
  },
  computed: {
    titleClass() {
      let cssClass = "fas rounded";
      if (this.error) {
        cssClass += " fa-exclamation-circle text-danger";
      } else if (this.success) {
        cssClass += " fa-check-circle text-success";
      } else {
        cssClass += " fa-question-circle";
      }
      return cssClass;
    },
  },
  watch: {
    show() {
      if (this.show) {
        this.toast?.show();
      } else {
        this.toast?.hide();
      }
    },
  },
  mounted() {
    const toast = this.$refs.root as HTMLElement;
    this.toast = new Toast(toast);

    toast.addEventListener("hidden.bs.toast", () => (this.showing = false));
    toast.addEventListener("show.bs.toast", () => (this.showing = true));
  },
});
</script>
