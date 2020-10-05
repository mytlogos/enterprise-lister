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
<script>
import {emitBusEvent} from "../bus";
import modal from "../components/modal/modal";

export default {
    name: "RegisterModal",
    components: {modal},
    props: {
        show: Boolean,
        error: String,
    },
    data(): { lists: string; pw: string; pwRepeat: string } {
        return {
            lists: "",
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
            emitBusEvent("do:register", {lists: this.lists, pw: this.pw, pwRepeat: this.pwRepeat});
        },
    },
};
</script>
