<template>
  <div>
    <app-header />
    <main>
      <router-view />
      <toast />
      <ConfirmDialog></ConfirmDialog>
    </main>
  </div>
</template>

<script lang="ts" setup>
import appHeader from "./components/app-header.vue";
import { HttpClient } from "./Httpclient";
import { computed, watchEffect } from "vue";
import { useSettingsStore } from "./store/settings";
import { useUserStore } from "./store/store";

// STORES
const userStore = useUserStore();
const settingsStore = useSettingsStore();

// COMPUTED
const loggedIn = computed(() => userStore.loggedIn);

// WATCHES
watchEffect(() => {
  console.log("loggedin changed: ", loggedIn.value);

  if (!loggedIn.value) {
    loginState();
  }
});

// GENERIC SETUP
settingsStore.$subscribe(
  () => {
    if (settingsStore.notifications.newReleases.enabled) {
      settingsStore.activateNewReleases();
    } else {
      settingsStore.deactivateNewReleases();
    }
  },
  { immediate: true },
);

if (userStore.loggedIn) {
  userStore.load();
} else {
  loginState();
}

// FUNCTIONS
async function loginState() {
  if (loggedIn.value) {
    return;
  }
  try {
    const newUser = await HttpClient.isLoggedIn();
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`Logged In: ${loggedIn.value} New User: `, newUser);

    if (!loggedIn.value && newUser) {
      await userStore.changeUser(newUser, "login");
    } else {
      throw Error();
    }
  } catch (error) {
    setTimeout(() => loginState(), 5000);
  }
}
</script>
