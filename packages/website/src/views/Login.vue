<template>
  <div class="container">
    <h1>Login</h1>
    <form>
      <div class="row">
        <label class="col-sm-2 col-form-label">Username:</label>
        <input v-model="user" class="col-sm-4 form-control" placeholder="Your username" title="Username" type="text" />
      </div>
      <div class="row">
        <label class="col-sm-2 col-form-label">Password:</label>
        <input
          v-model="pw"
          class="col-sm-4 form-control"
          placeholder="Your password"
          title="Password"
          type="password"
        />
      </div>
      <button class="btn btn-primary" type="button" @click="sendForm()">Login</button>
      <div class="lost">Forgot your password?</div>
      <div class="error" />
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useUserStore } from "../store/store";

export default defineComponent({
  name: "Login",
  data(): { user: string; pw: string; error: string; show: boolean } {
    return {
      error: "",
      show: true,
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
      useUserStore().login({ user: this.user, pw: this.pw });
    },
  },
});
</script>
