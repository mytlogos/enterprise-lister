import { HttpClient } from "../Httpclient";
import { User } from "../siteTypes";
import { useListStore } from "./lists";
import { useExternalUserStore } from "./externaluser";
import { useHookStore } from "./hooks";
import { UserNotification } from "enterprise-core/dist/types";
import { useMediaStore } from "./media";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

type UserState = ReturnType<typeof useUserStore>["$state"];

function userClear(state: UserState) {
  state.name = "";
  state.uuid = "";
  state.session = "";
  state.user.readNotificationsCount = 0;
  state.user.unreadNotificationsCount = 0;
  useListStore().lists = [];
  useMediaStore().media = {};
  useExternalUserStore().externalUser = [];
}

function setUser(state: UserState, user: User) {
  userClear(state);
  state.name = user.name;
  state.uuid = user.uuid;
  state.session = user.session;
}

let hydrateCallback: () => void;
let alreadyHydrated = false;

export const userHydrated = new Promise<void>((resolve) => {
  if (alreadyHydrated) {
    resolve();
    return;
  }
  let resolved = false;
  // resolve at most 500ms later
  const id = setTimeout(() => {
    console.warn("user store hydration took too long");
    resolved = true;
    resolve();
  }, 500);

  hydrateCallback = () => {
    if (resolved) {
      return;
    }
    clearTimeout(id);
    resolve();
  };
});

export const useUserStore = defineStore("user", {
  persist: {
    afterRestore() {
      alreadyHydrated = true;

      if (hydrateCallback) {
        hydrateCallback();
      }
    },
  },
  state: () => ({
    user: {
      unreadNotificationsCount: 0,
      readNotificationsCount: 0,
    },
    name: "",
    session: "",
    uuid: "",
  }),
  getters: {
    loggedIn(state): boolean {
      return !!state.uuid;
    },
  },
  actions: {
    async load() {
      const mediaStore = useMediaStore();
      const listStore = useListStore();
      const hookStore = useHookStore();
      const externalUserStore = useExternalUserStore();

      await Promise.all([
        mediaStore.loadMedia(),
        listStore.loadLists(),
        externalUserStore.loadExternalUser(),
        hookStore.loadHooks(),
      ]);
    },

    async changeUser(user: User) {
      const userChanged = user && this.uuid !== user.uuid;
      this.$patch((state) => setUser(state, user));

      if (userChanged) {
        const router = useRouter();

        if (router.currentRoute.value.path === "/login" || router.currentRoute.value.path === "/register") {
          // automatically navigate to view under home if successfully logged in
          await router.push("/").catch(console.error);
        }

        await this.load();
      }
    },

    async login(data: { user: string; pw: string }) {
      if (!data.user) {
        throw Error("Username is missing");
      }
      if (!data.pw) {
        throw Error("Password is missing");
      }
      const newUser = await HttpClient.login(data.user, data.pw);
      this.changeUser(newUser);
    },

    immediateLogout() {
      this.$patch(userClear);
    },

    async logout() {
      const loggedOut = await HttpClient.logout();
      this.$patch(userClear);

      if (!loggedOut) {
        throw Error("An error occurred while logging out");
      }
    },

    async register(data: { user: string; pw: string; pwRepeat: string }) {
      if (!data.user) {
        throw Error("Username is missing");
      }
      if (!data.pw) {
        throw Error("Password is missing");
      }
      if (!data.pwRepeat) {
        throw Error("Password was not repeated");
      }
      if (data.pwRepeat !== data.pw) {
        throw Error("Repeated Password is not password");
      }
      const newUser = await HttpClient.register(data.user, data.pw, data.pwRepeat);
      await this.changeUser(newUser);
    },

    async checkNotificationCounts() {
      if (!this.loggedIn) {
        return;
      }
      const [unreadCount, readCount] = await Promise.all([
        HttpClient.getNotificationsCount(false),
        HttpClient.getNotificationsCount(true),
      ]);
      this.user.unreadNotificationsCount = unreadCount;
      this.user.readNotificationsCount = readCount;
    },

    async readNotification(data: UserNotification) {
      if (!this.loggedIn) {
        return;
      }
      await HttpClient.readNotification(data.id);
      this.checkNotificationCounts();
    },

    async readAllNotifications() {
      if (!this.loggedIn) {
        return;
      }
      await HttpClient.readAllNotifications();
      this.checkNotificationCounts();
    },
  },
});
