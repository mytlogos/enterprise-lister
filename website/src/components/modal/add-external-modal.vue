<template>
  <modal
    :error="error"
    :show="show"
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

<script>
import {emitBusEvent} from "../../bus";
import modal from "./modal";

export default {
    name: "AddExternalModal",
    components: {modal},
    props: {
        show: Boolean,
        error: String,
        options: Array,
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
        show(show: boolean): boolean {
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
};
</script>

<style scoped>

</style>
