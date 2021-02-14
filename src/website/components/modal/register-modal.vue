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
import modal from "./modal.vue";

import { defineComponent } from "vue";

export default defineComponent({
    name: "LoginModal",
    components: { modal },
    props: {
        show: Boolean,
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
            this.$store.dispatch("register", { user: this.user, pw: this.pw, pwRepeat: this.pwRepeat });
        },
    },
});
</script>
