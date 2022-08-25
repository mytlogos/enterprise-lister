<template>
  <div class="container">
    <h1>Login</h1>
    <form>
      <div class="row mb-3">
        <label for="name" class="col-sm-2 col-form-label">Username</label>
        <div class="col-sm-10">
          <input-text id="name" v-model="data.user" type="text" @keyup.enter="sendForm" />
        </div>
      </div>
      <div class="row mb-3">
        <label for="password" class="col-sm-2 col-form-label">Password</label>
        <div class="col-sm-10">
          <input-text id="password" v-model="data.pw" type="password" @keyup.enter="sendForm" />
        </div>
      </div>
      <p-button label="Login" :loading="data.loading" @click="sendForm()" />
      <div class="lost">Forgot your password?</div>
      <div class="error mt-2">{{ data.error }}</div>
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
  loading: false,
});

function sendForm(): void {
  if (!data.user.trim() || !data.pw.trim()) {
    return;
  }
  data.loading = true;
  useUserStore()
    .login({ user: data.user, pw: data.pw })
    .catch((reason) => {
      if (reason instanceof Error) {
        data.error = reason.message;
      } else {
        data.error = JSON.stringify(reason);
      }
    })
    .finally(() => (data.loading = false));
}
</script>
<style scoped>
.container {
  max-width: 560px;
}
</style>
