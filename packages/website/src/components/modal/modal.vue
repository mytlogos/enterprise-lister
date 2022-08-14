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
          <button class="btn btn-primary" type="button" @click="emits('finish')">
            <slot name="finish"> Save </slot>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref, toRef, watch } from "vue";
import Modal from "bootstrap/js/dist/modal";

const props = defineProps({
  error: { type: String, required: true },
  show: Boolean,
});

const emits = defineEmits(["finish", "close", "update:show"]);
const data = reactive({
  closing: false,
  modal: null as Modal | null,
});
const root = ref<HTMLInputElement | null>(null);

watch(toRef(props, "show"), () => {
  if (props.show) {
    data.closing = false;
    data.modal?.show();
  } else {
    data.modal?.hide();
  }
});

onMounted((): void => {
  const modalElement = root.value as HTMLElement;
  data.modal = new Modal(modalElement);

  modalElement.addEventListener("hidden.bs.modal", () => close());
  document.addEventListener("click", listener, { capture: true });
});

onUnmounted(() => {
  document.removeEventListener("click", listener, { capture: true });
});

function listener(evt: MouseEvent) {
  if (!root.value) {
    return;
  }
  if (!root.value.contains(evt.target as Node | null) && props.show) {
    evt.stopImmediatePropagation();
    evt.preventDefault();
    close();
  }
}

function close(): void {
  if (data.closing || !props.show) {
    return;
  }
  data.closing = true;
  emits("close");
  emits("update:show", false);
}
</script>
