import { HttpClient } from "../Httpclient";
import { User, UserNotification, VuexStore } from "../siteTypes";
import router from "../router";
import { Commit, createStore, createLogger } from "vuex";
import persistedState from "vuex-persistedstate";
import releaseStore from "./releases";
import modalStore from "./modals";
import listStore from "./lists";
import mediumStore from "./media";
import externalUserStore from "./externaluser";
import newsStore from "./news";
import hookStore from "./hooks";
import { notify } from "../notifications";

function userClear(commit: Commit) {
  commit("userName", "");
  commit("userId", "");
  commit("userSession", "");
  commit("userLists", []);
  commit("userMedia", []);
  commit("userExternalUser", []);
}

function setUser(commit: Commit, user: User) {
  userClear(commit);
  commit("userName", user.name);
  commit("userId", user.uuid);
  commit("userSession", user.session);
}

export const store = createStore({
  strict: true,
  plugins: [createLogger(), persistedState()],
  modules: {
    releases: releaseStore,
    modals: modalStore,
    lists: listStore,
    externalUser: externalUserStore,
    media: mediumStore,
    news: newsStore,
    hooks: hookStore,
  },
  // @ts-expect-error
  state: (): VuexStore => ({
    user: {
      settings: {},
      columns: [
        { name: "Author", prop: "author", show: true },
        { name: "Artist", prop: "artist", show: true },
      ],
      notifications: [],
      readNotifications: {},
    },
    name: "",
    session: "",
    uuid: "",
  }),
  getters: {
    loggedIn(state): boolean {
      return !!state.uuid;
    },
    unreadNotifications(state): UserNotification[] {
      return state.user.notifications.filter((value) => !value.read);
    },
  },
  mutations: {
    userName(state, name: string) {
      state.name = name;
    },
    userId(state, id: string) {
      state.uuid = id;
    },
    userSession(state, session: string) {
      state.session = session;
    },
    notifications(state, notifications: UserNotification[]) {
      state.user.notifications = notifications;
    },
    readNotification(state, notification: UserNotification) {
      state.user.readNotifications[notification.id] = true;
      notification.read = true;
    },
    readAllNotifications(state) {
      state.user.notifications.forEach((value) => {
        state.user.readNotifications[value.id] = true;
        value.read = true;
      });
    },
  },
  actions: {
    async load({ dispatch }) {
      await Promise.all([
        dispatch("loadMedia"),
        dispatch("loadLists"),
        dispatch("loadExternalUser"),
        dispatch("loadHooks"),
      ]);
    },
    async changeUser({ commit, dispatch, state }, { user, modal }: { user: User; modal: string }) {
      const userChanged = user && state.uuid !== user.uuid;
      setUser(commit, user);

      if (modal) {
        commit("resetModal", modal);
      }

      if (userChanged) {
        await dispatch("load");

        if (router.currentRoute.value.path === "/login") {
          // automatically navigate to view under home if successfully logged in
          await router.push("/").catch(console.error);
          console.log("pushed home");
        }
      }
    },
    async login({ commit, dispatch }, data: { user: string; pw: string }) {
      if (!data.user) {
        commit("loginModalError", "Username is missing");
        return;
      } else if (!data.pw) {
        commit("loginModalError", "Password is missing");
        return;
      }
      try {
        // FIXME modal does not close after successful login
        const newUser = await HttpClient.login(data.user, data.pw);
        await dispatch("changeUser", { user: newUser, modal: "login" });
      } catch (error) {
        commit("loginModalError", String(error));
      }
    },
    immediateLogout({ commit }) {
      userClear(commit);
    },
    async logout({ commit }) {
      const loggedOut = await HttpClient.logout();
      userClear(commit);

      if (!loggedOut) {
        throw Error("An error occurred while logging out");
      }
    },
    async register({ commit, dispatch }, data: { user: string; pw: string; pwRepeat: string }) {
      if (!data.user) {
        commit("registerModalError", "Username is missing");
      } else if (!data.pw) {
        commit("registerModalError", "Password is missing");
      } else if (!data.pwRepeat) {
        commit("registerModalError", "Password was not repeated");
      } else if (data.pwRepeat !== data.pw) {
        commit("registerModalError", "Repeated Password is not password");
      } else {
        try {
          const newUser = await HttpClient.register(data.user, data.pw, data.pwRepeat);
          await dispatch("changeUser", { user: newUser, modal: "register" });
        } catch (error) {
          commit("registerModalError", String(error));
        }
      }
    },
    async checkNotifications({ commit, state }) {
      const now = new Date();
      now.setDate(now.getDate() - 5);
      const data = await HttpClient.getNotifications(now);

      const notifications = data
        .map((value) => {
          const read = state.user.readNotifications[value.id];
          const userNotification = value as UserNotification;
          userNotification.read = read ?? false;
          userNotification.date = new Date(userNotification.date);
          return userNotification;
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const ids = state.user.notifications.reduce((previous, current) => previous.add(current.id), new Set());

      const newNotifications = notifications.filter((value) => !ids.has(value.id));

      if (newNotifications.length) {
        const titleSuffix = newNotifications.length > 1 ? ` +${newNotifications.length - 1} more` : "";
        notify({ title: notifications[0].title + titleSuffix, content: notifications[0].content });
      }
      commit("notifications", notifications);
    },
  },
});
