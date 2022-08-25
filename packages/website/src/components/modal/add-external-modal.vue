<template>
  <modal :error="data.error" :show="show" @update:show="emits('update:show', $event)" @finish="sendForm()">
    <template #title> Login </template>
    <template #input>
      <span class="p-float-label me-2 mb-2 mt-2">
        <input-text id="identifier" v-model="data.user" type="text" />
        <label for="identifier"> Identifier</label>
      </span>
      <span class="p-float-label me-2 mb-2">
        <input-text id="password" v-model="data.pw" type="password" />
        <label for="password">Password</label>
      </span>
      <dropdown
        v-model="data.selected"
        :options="options"
        class="mb-2"
        option-label="name"
        option-value="value"
        placeholder="External User Type"
      />
      <div>
        <a target="_blank" rel="noopener noreferrer" :href="currentLink"> Open External </a>
      </div>
    </template>
    <template #finish> Add </template>
  </modal>
</template>

<script lang="ts" setup>
import modal from "./modal.vue";
import { watch, PropType, reactive, toRef, computed } from "vue";
import { useExternalUserStore } from "../../store/externaluser";

export interface Option {
  name: string;
  link: string;
  value: number;
}

const props = defineProps({
  show: Boolean,
  options: { type: Array as PropType<Option[]>, required: true },
});

const emits = defineEmits(["update:show"]);

const data = reactive({
  user: "",
  pw: "",
  error: "",
  selected: 0,
});

const currentLink = computed((): string => {
  const option = props.options.find((value) => value.value === data.selected);
  return option ? option.link : "#";
});

watch(toRef(props, "show"), (show: boolean): void => {
  if (!show) {
    data.user = "";
    data.pw = "";
  }
});

function sendForm(): void {
  useExternalUserStore()
    .addExternalUser({
      identifier: data.user,
      pwd: data.pw,
      type: data.selected,
    })
    .then(() => {
      // if no error, close modal
      emits("update:show", false);
    })
    .catch((error: Error) => {
      data.error = error.message;
    });
}
</script>
