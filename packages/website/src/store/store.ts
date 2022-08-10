import { HttpClient } from "../Httpclient";
import { User, VuexStore } from "../siteTypes";
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
import { UserNotification } from "enterprise-core/dist/types";
import { actions as settingsActions, mutations as settingsMutations, state as settingsState } from "./settings";

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

const plugins = [persistedState()];

if (process.env.NODE_ENV !== "production") {
  plugins.push(createLogger());
}

export const store = createStore({
  strict: process.env.NODE_ENV !== "production",
  plugins,
  modules: {
    releases: releaseStore,
    modals: modalStore,
    lists: listStore,
    externalUser: externalUserStore,
    media: mediumStore,
    news: newsStore,
    hooks: hookStore,
    settings: {
      actions: settingsActions,
      state: settingsState,
      mutations: settingsMutations,
    },
  },
  // @ts-expect-error
  state: (): VuexStore => ({
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
    unreadNotificationCount(state, count: number) {
      state.user.unreadNotificationsCount = count;
    },
    readNotificationCount(state, count: number) {
      state.user.readNotificationsCount = count;
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
    async checkNotificationCounts({ commit }) {
      const [unreadCount, readCount] = await Promise.all([
        HttpClient.getNotificationsCount(false),
        HttpClient.getNotificationsCount(true),
      ]);
      commit("unreadNotificationCount", unreadCount);
      commit("readNotificationCount", readCount);
    },
    async readNotification({ dispatch }, data: UserNotification) {
      await HttpClient.readNotification(data.id);
      dispatch("checkNotificationCounts");
    },
    async readAllNotifications({ dispatch }) {
      await HttpClient.readAllNotifications();
      dispatch("checkNotificationCounts");
    },
  },
});
