<template>
  <modal :error="error" :show="show" @finish="sendForm()">
    <template #title> Login </template>
    <template #input>
      <label>
        Identifier:
        <input v-model="data.user" class="user" placeholder="Your identifier" title="Identifier" type="text" />
      </label>
      <label>
        Password:
        <input v-model="data.pw" class="pw" placeholder="Your password" title="Password" type="password" />
      </label>
      <label>
        <select v-model="data.selected">
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.name }}
          </option>
        </select>
      </label>
      <a target="_blank" rel="noopener noreferrer" :href="currentLink"> Open External </a>
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
  error: { type: String, required: true },
  options: { type: Array as PropType<Option[]>, required: true },
});
const data = reactive({
  user: "",
  pw: "",
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
  useExternalUserStore().addExternalUser({
    identifier: data.user,
    pwd: data.pw,
    // @ts-expect-error
    type: data.selected,
  });
}
</script>
