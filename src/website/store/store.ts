import { HttpClient } from "../Httpclient";
import {
    User,
    VuexStore 
} from "../siteTypes";
import router from "../router";
import { Commit, createStore, createLogger } from "vuex";
import persistedState from "vuex-persistedstate";
import releaseStore from "./releases";
import modalStore from "./modals";
import listStore from "./lists";
import mediumStore from "./media";
import externalUserStore from "./externaluser";
import newsStore from "./news";


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
    plugins: [
        createLogger(),
        persistedState(),
    ],
    modules: {
        releases: releaseStore,
        modals: modalStore,
        lists: listStore,
        externalUser: externalUserStore,
        media: mediumStore,
        news: newsStore,
    },
    // @ts-expect-error
    state: (): VuexStore => ({
        user: {
            settings: {},
            columns: [
                { name: "Title", prop: "title", show: true },
                { name: "Author", prop: "author", show: true },
                { name: "Artist", prop: "artist", show: true },
            ]
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
    },
    actions: {
        async changeUser({ commit, dispatch, state }, { user, modal }: { user: User; modal: string }) {
            const userChanged = user && state.uuid !== user.uuid;
            setUser(commit, user);
            commit("resetModal", modal);

            if (userChanged) {
                await Promise.all([
                    dispatch("loadMedia"),
                    dispatch("loadLists"),
                    dispatch("loadExternalUser"),
                ]);

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
                const newUser = await HttpClient.login(data.user, data.pw)
                await dispatch("changeUser", { user: newUser, modal: "login"})
            } catch (error) {
                commit("loginModalError", String(error))
            }
        },
        async logout({ commit }) {
            try {
                const loggedOut = await HttpClient.logout();
                userClear(commit);

                if (!loggedOut) {
                    commit("errorModalError", "An error occurred while logging out");
                }
            } catch (error) {
                commit("errorModalError", String(error));
            }
            // TODO implement logout
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
                    await dispatch("changeUser", { user: newUser, modal: "register"})
                } catch (error) {
                    commit("registerModalError", String(error))
                }
            }
        },
    },
});
