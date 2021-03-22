<template>
  <div class="container">
    <h1>Register</h1>
    <form>
      <div class="form-group row">
        <label class="col-sm-2 col-form-label">Username:</label>
        <input v-model="user" class="col-sm-4 form-control" placeholder="Your username" title="Username" type="text" />
      </div>
      <div class="form-group row">
        <label class="col-sm-2 col-form-label">Password:</label>
        <input
          v-model="pw"
          class="col-sm-4 form-control"
          placeholder="Your password"
          title="Password"
          type="password"
        />
      </div>
      <div class="form-group row">
        <label class="col-sm-2 col-form-label">Repeat Password:</label>
        <input
          v-model="pwRepeat"
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
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Register",
  props: {
    show: { type: Boolean, required: true },
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
