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
    </template>
    <div
      slot="after"
      class="lost"
    >
      Forgot your password?
    </div>
    <template #finish>
      Login
    </template>
  </modal>
</template>
<script>
import {emitBusEvent} from "../../bus";
import modal from "./modal";

export default {
    name: "LoginModal",
    components: {modal},
    props: {
        show: Boolean,
        error: String,
    },
    data(): { lists: string; pw: string } {
        return {
            lists: "",
            pw: "",
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
    mounted(): void {
        console.log("hi");
    },
    methods: {
        sendForm(): void {
            emitBusEvent("do:login", {lists: this.lists, pw: this.pw});
        },
    }
};
</script>
