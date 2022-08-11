import { HttpClient } from "../Httpclient";
import { User } from "../siteTypes";
import router from "../router";
import { useListStore } from "./lists";
import { useExternalUserStore } from "./externaluser";
import { useHookStore } from "./hooks";
import { UserNotification } from "enterprise-core/dist/types";
import { useMediaStore } from "./media";
import { defineStore } from "pinia";

type UserState = ReturnType<typeof useUserStore>["$state"];

function userClear(state: UserState) {
  state.name = "";
  state.uuid = "";
  state.session = "";
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

export const useUserStore = defineStore("user", {
  persist: true,
  state: () => ({
    user: {
      settings: {},
      columns: [
        { name: "Author", prop: "author", show: true },
        { name: "Artist", prop: "artist", show: true },
      ],
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
    async changeUser(user: User, modal?: string) {
      const userChanged = user && this.uuid !== user.uuid;
      this.$patch((state) => setUser(state, user));

      if (modal) {
        // TODO: commit("resetModal", modal);
      }

      if (userChanged) {
        // TODO: load first and then change page, or reverse?
        await this.load();

        if (router.currentRoute.value.path === "/login") {
          // automatically navigate to view under home if successfully logged in
          await router.push("/").catch(console.error);
          console.log("pushed home");
        }
      }
    },
    async login(data: { user: string; pw: string }) {
      if (!data.user) {
        // TODO: commit("loginModalError", "Username is missing");
        return;
      } else if (!data.pw) {
        // TODO: commit("loginModalError", "Password is missing");
        return;
      }
      try {
        // FIXME modal does not close after successful login
        const newUser = await HttpClient.login(data.user, data.pw);
        this.changeUser(newUser, "login");
      } catch (error) {
        // TODO: commit("loginModalError", String(error));
      }
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
        // TODO: commit("registerModalError", "Username is missing");
      } else if (!data.pw) {
        // TODO: commit("registerModalError", "Password is missing");
      } else if (!data.pwRepeat) {
        // TODO: commit("registerModalError", "Password was not repeated");
      } else if (data.pwRepeat !== data.pw) {
        // TODO: commit("registerModalError", "Repeated Password is not password");
      } else {
        try {
          const newUser = await HttpClient.register(data.user, data.pw, data.pwRepeat);
          await this.changeUser(newUser, "register");
        } catch (error) {
          // TODO: commit("registerModalError", String(error));
        }
      }
    },
    async checkNotificationCounts() {
      const [unreadCount, readCount] = await Promise.all([
        HttpClient.getNotificationsCount(false),
        HttpClient.getNotificationsCount(true),
      ]);
      this.user.unreadNotificationsCount = unreadCount;
      this.user.readNotificationsCount = readCount;
    },
    async readNotification(data: UserNotification) {
      await HttpClient.readNotification(data.id);
      this.checkNotificationCounts();
    },
    async readAllNotifications() {
      await HttpClient.readAllNotifications();
      this.checkNotificationCounts();
    },
  },
});
