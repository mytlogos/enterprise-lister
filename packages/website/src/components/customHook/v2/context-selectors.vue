<template>
  <div class="mt-2">
    <h6>Context Selectors</h6>
    <div class="grid p-fluid">
      <div class="col-12 md:col-4">
        <span class="p-float-label">
          <input-text v-model="data.name" />
          <label class="form-label">Name</label>
        </span>
      </div>
      <div class="col-12 md:col-4">
        <span class="p-float-label">
          <input-text v-model="data.selector" />
          <label class="form-label">Selector</label>
        </span>
      </div>
      <div class="col-12 md:col-2">
        <p-button label="Add Context" @click="addContextSelector" />
      </div>
    </div>
    <div v-for="(_, key) in data.context" :key="key" class="grid p-fluid mt-1">
      <div class="col-12 md:col-4">
        <input-text :model-value="key" disabled />
      </div>
      <div class="col-12 md:col-4">
        <span class="p-float-label">
          <input-text v-model="data.context[key]" />
          <label class="form-label">Selector</label>
        </span>
      </div>
      <div class="col-12 md:col-2">
        <p-button label="Remove" @click="removeContextSelector(key)" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { PropType, reactive, watch } from "vue";
import { deepEqual } from "../../../init";

const props = defineProps({
  modelValue: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },
});

const emits = defineEmits(["update:modelValue"]);
const data = reactive({
  name: "",
  selector: "",
  context: props.modelValue ?? {},
});

watch(
  () => data.context,
  () => {
    emits("update:modelValue", { ...data.context });
  },
  {
    deep: true,
  },
);

watch(
  () => props.modelValue,
  () => {
    if (deepEqual(props.modelValue, data.context)) {
      return;
    }
    data.context = props.modelValue ? { ...props.modelValue } : {};
  },
  {
    deep: true,
  },
);

function addContextSelector() {
  if (!data.name || !data.selector) {
    return;
  }
  data.context[data.name] = data.selector;
  data.selector = "";
  data.name = "";
}

function removeContextSelector(key: string) {
  delete data.context[key];
}
</script>
