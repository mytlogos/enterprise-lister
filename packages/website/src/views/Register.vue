<template>
  <div class="container">
    <h1>Register</h1>
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
      <div class="row">
        <label class="col-sm-2 col-form-label">Repeat Password:</label>
        <input
          v-model="data.pwRepeat"
          class="col-sm-4 form-control"
          placeholder="Repeat your password"
          title="Repeat your Password"
          type="password"
        />
      </div>
      <button class="btn btn-primary" type="button" @click="sendForm()">Register</button>
      <div class="lost">Forgot your password?</div>
      <div class="error" />
    </form>
  </div>
</template>
<script lang="ts" setup>
import { reactive, watchEffect } from "vue";
import { useUserStore } from "../store/store";

const props = defineProps<{ show: boolean; error: string }>();
const data = reactive({
  user: "",
  pw: "",
  pwRepeat: "",
});

watchEffect(() => {
  if (!props.show) {
    data.user = "";
    data.pw = "";
  }
});

function sendForm(): void {
  useUserStore().register({ user: data.user, pw: data.pw, pwRepeat: data.pwRepeat });
}
</script>
