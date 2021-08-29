<template>
  <modal :error="error" :show="show" @finish="sendForm()">
    <template #title> Login </template>
    <template #input>
      <label>
        Username:
        <input v-model="username" class="user" placeholder="Your username" title="Username" type="text" />
      </label>
      <label>
        Password:
        <input v-model="pw" class="pw" placeholder="Your password" title="Password" type="password" />
      </label>
    </template>
    <template #after>
      <div class="lost">Forgot your password?</div>
    </template>
    <template #finish> Login </template>
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
  data(): { username: string; pw: string } {
    return {
      username: "",
      pw: "",
    };
  },
  watch: {
    show(newValue: boolean): void {
      if (!newValue) {
        this.username = "";
        this.pw = "";
      }
    },
  },
  methods: {
    sendForm(): void {
      this.$store.dispatch("login", { user: this.username, pw: this.pw });
    },
  },
});
</script>
