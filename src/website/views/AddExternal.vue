<template>
  <modal
    :error="error"
    @finish="sendForm()"
  >
    <template #title>
      Login
    </template>
    <template #input>
      <label>
        Identifier:
        <input
          v-model="user"
          class="user"
          placeholder="Your identifier"
          title="Identifier"
          type="text"
        >
      </label>
      <label>
        Password:
        <input
          v-model="pw"
          class="pw"
          placeholder="Your password"
          title="Password"
          type="password"
        >
      </label>
      <label>
        <select v-model="selected">
          <option
            v-for="option in options"
            :key="option"
            :value="option.values"
          >
            {{ option.name }}
          </option>
        </select>
      </label>
      <a
        target="_blank"
        rel="noopener noreferrer"
        :href="currentLink"
      >
        Open External
      </a>
    </template>
    <template #finish>
      Add
    </template>
  </modal>
</template>

<script lang="ts">
import {emitBusEvent} from "../bus";
import modal from "../components/modal/modal";
import { defineComponent, PropType } from "vue";

interface Option {
  name: string;
  values: any[];
}

export default defineComponent({
    name: "AddExternalModal",
    components: {modal},
    props: {
        options: { type: Array as PropType<Option[]>, required: true },
    },
    data(): { user: string; pw: string; selected: number } {
        return {
            user: "",
            pw: "",
            selected: 0
        };
    },
    computed: {
        currentLink(): string {
            const option = this.options.find((value) => value.values === this.selected);
            return option ? option.link : "#";
        }
    },
    watch: {
        show(show: boolean): void {
            if (!show) {
                this.user = "";
                this.pw = "";
            }
        }
    },
    methods: {
        sendForm(): void {
            emitBusEvent("add:externalUser", {identifier: this.user, pwd: this.pw, type: this.selected});
        },
    }
});
</script>
