<template>
  <div class="container">
    <h1>Login</h1>
    <form>
      <div class="row">
        <label class="col-sm-2 col-form-label">Username:</label>
        <input
          v-model="data.user"
          class="col-sm-4 form-control"
          placeholder="Your username"
          title="Username"
          type="text"
        />
      </div>
      <div class="row">
        <label class="col-sm-2 col-form-label">Password:</label>
        <input
          v-model="data.pw"
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

<script lang="ts" setup>
import { reactive } from "vue";
import { useUserStore } from "../store/store";

const data = reactive({
  error: "",
  show: true,
  user: "",
  pw: "",
});

function sendForm(): void {
  useUserStore().login({ user: data.user, pw: data.pw });
}
</script>
