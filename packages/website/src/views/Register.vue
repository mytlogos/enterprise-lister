<template>
  <div class="container text-center">
    <h1>Register</h1>
    <form>
      <span class="p-float-label mb-2">
        <label for="name">Username</label>
        <input-text id="name" v-model="data.user" type="text" />
      </span>
      <span class="p-float-label mb-2">
        <label for="password">Password</label>
        <input-text id="password" v-model="data.pw" type="password" />
      </span>
      <span class="p-float-label mb-2">
        <label for="pw-repeat">Repeat Password</label>
        <input-text id="pw-repeat" v-model="data.pwRepeat" type="password" />
      </span>
      <p-button label="Register" :loading="data.loading" @click="sendForm()" />
      <div class="error mt-2">{{ data.error }}</div>
    </form>
  </div>
</template>
<script lang="ts" setup>
import { reactive } from "vue";
import { useUserStore } from "../store/store";

const data = reactive({
  user: "",
  pw: "",
  pwRepeat: "",
  error: "",
  loading: false,
});

function sendForm(): void {
  data.loading = true;
  useUserStore()
    .register({ user: data.user, pw: data.pw, pwRepeat: data.pwRepeat })
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
