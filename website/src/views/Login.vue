<template>
  <modal @finish="sendForm()">
    <template #title>
      Login
    </template>
    <template #input>
      <label>
        Username:
        <input
          v-model="user"
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
import {emitBusEvent} from "../bus";
import modal from "../components/modal/modal";

export default {
    name: "Login",
    components: {modal},
    data(): { user: string; pw: string } {
        return {
            user: "",
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
    methods: {
        sendForm(): void {
            emitBusEvent("do:login", {user: this.user, pw: this.pw});
        },
    }
};
</script>

<style scoped>

</style>
