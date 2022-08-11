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

<script lang="ts">
import appHeader from "./components/app-header.vue";
import { emitBusEvent, onBusEvent } from "./bus";
import { HttpClient } from "./Httpclient";
import { defineComponent } from "vue";
import { optimizedResize } from "./init";
import { useSettingsStore } from "./store/settings";
import { mapStores } from "pinia";
import { useUserStore } from "./store/store";

export default defineComponent({
  components: {
    appHeader,
  },
  computed: {
    ...mapStores(useUserStore),
    loggedIn(): boolean {
      return this.userStore.loggedIn;
    },
  },
  watch: {
    loggedIn(newValue) {
      console.log("loggedin changed: ", newValue);

      if (!newValue) {
        this.loginState();
      }
    },
  },
  mounted() {
    const store = useSettingsStore();
    store.$subscribe(
      () => {
        if (store.notifications.newReleases.enabled) {
          store.activateNewReleases();
        } else {
          store.deactivateNewReleases();
        }
      },
      { immediate: true },
    );
    onBusEvent("refresh:externalUser", (data: string) => this.refreshExternalUser(data));

    onBusEvent("reset:modal", () => this.closeModal());

    optimizedResize.add(() => emitBusEvent("window:resize"));
  },

  async created() {
    if (this.loggedIn) {
      await this.userStore.load();
    } else {
      await this.loginState();
    }
  },

  methods: {
    closeModal() {
      // TODO: modal thingis
      // this.$store.commit("resetModal", "login");
      // this.$store.commit("resetModal", "register");
      // this.$store.commit("resetModal", "addList");
      // this.$store.commit("resetModal", "addMedium");
      // this.$store.commit("resetModal", "error");
      // this.$store.commit("resetModal", "settings");
    },

    async loginState() {
      if (this.loggedIn) {
        return;
      }
      try {
        const newUser = await HttpClient.isLoggedIn();
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`Logged In: ${this.loggedIn} New User: `, newUser);

        if (!this.loggedIn && newUser) {
          await this.userStore.changeUser(newUser, "login");
        } else {
          throw Error();
        }
      } catch (error) {
        setTimeout(() => this.loginState(), 5000);
      }
    },

    refreshExternalUser(uuid: string) {
      if (!uuid) {
        console.error("cannot refresh externalUser without data");
      }
    },
  },
});
</script>
