<template>
  <modal
    :error="error"
    :show="show"
    @finish="send()"
  >
    <template #title>
      Register
    </template>
    <template #input>
      <label>
        Username:
        <input
          v-model="lists"
          class="user"
          placeholder="Your username"
          title="Username"
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
        Repeat Password:
        <input
          v-model="pwRepeat"
          class="pw-repeat"
          placeholder="Your password again"
          title="Repeat Password"
          type="password"
        >
      </label>
    </template>
    <template #finish>
      Register
    </template>
  </modal>
</template>
<script lang="ts">
import {emitBusEvent} from "../bus";
import modal from "../components/modal/modal.vue";

import { defineComponent } from "vue";

export default defineComponent({
    name: "RegisterModal",
    components: {modal},
    props: {
        show: { type: Boolean, required: true },
        error: { type: String, required: true },
    },
    data(): { user: string; pw: string; pwRepeat: string } {
        return {
            user: "",
            pw: "",
            pwRepeat: "",
        };
    },
    watch: {
        show(newValue: boolean): void {
            if (!newValue) {
                this.user = "";
                this.pw = "";
            }
        },
    },
    methods: {
        sendForm(): void {
            emitBusEvent("do:register", {user: this.user, pw: this.pw, pwRepeat: this.pwRepeat});
        },
    },
});
</script>
