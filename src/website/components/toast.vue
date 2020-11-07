<template>
  <div
    class="toast"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >
    <div class="toast-header">
      <i
        class="mr-2"
        :class="titleClass"
        aria-hidden="true"
      />
      <strong class="mr-auto">{{ title }}</strong>
      <button
        type="button"
        class="ml-2 mb-1 close"
        data-dismiss="toast"
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
export default defineComponent({
    name: "Toast",
    props: {
        title: {
            type: String,
            required: true
        },
        success: {
            type: Boolean,
            required: false,
            default: false
        },
        error: {
            type: Boolean,
            required: false,
            default: true
        },
        message: {
            type: String,
            required: true
        },
    },
    emits: ["close"],
    computed: {
        titleClass() {
            let cssClass = "fas rounded";
            if (this.error) {
                cssClass += " fa-exclamation-circle text-danger"
            } else if (this.success) {
                cssClass += " fa-check-circle text-success"
            } else {
                cssClass += " fa-question-circle"
            }
            return cssClass;
        }
    }
});
</script>

<style>

</style>