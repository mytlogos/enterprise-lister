import { emitBusEvent } from "./bus";
import { HttpClient } from "./Httpclient";
import { 
    ExternalList,
    ExternalUser,
    List,
    Medium,
    Modals,
    News,
    SimpleMedium,
    User,
    VuexStore 
} from "./siteTypes";
import router from "./router";
import { Commit, createStore, createLogger } from "vuex";


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

function createModal(): { show: boolean; error: string } {
    return {
        error: "",
        show: false
    }
}

export const store = createStore({
    strict: true,
    plugins: [createLogger()],
    state: (): VuexStore => ({
        modals: {
            addList: createModal(),
            addMedium: createModal(),
            login: createModal(),
            register: createModal(),
            settings: createModal(),
            error: createModal()
        },
        user: {
            lists: [],
            news: [],
            name: "",
            externalUser: [],
            media: {},
            settings: {},
            columns: [
                { name: "Title", prop: "title", show: true },
                { name: "Author", prop: "author", show: true },
                { name: "Artist", prop: "artist", show: true },
            ]
        },
        session: "",
        uuid: "",
    }),
    getters: {
        loggedIn(state): boolean {
            return !!state.uuid;
        },
        getMedium: (state) => (id: number): SimpleMedium => {
            return state.user.media[id];
        },
        media(state): SimpleMedium[] {
            return Object.values(state.user.media);
        },
        allLists(state): any[] {
            const externalLists = state.user.externalUser.flatMap((value) => value.lists);
            return [...state.user.lists, ...externalLists];
        },
    },
    mutations: {
        userName(state, name: string) {
            state.user.name = name;
        },
        userId(state, id: string) {
            state.uuid = id;
        },
        userSession(state, session: string) {
            state.session = session;
        },
        userLists(state, lists: List[]) {
            state.user.lists = [...lists];
        },
        userExternalUser(state, externalUser: ExternalUser[]) {
            state.user.externalUser = [...externalUser];
        },
        userMedia(state, media: Record<number, SimpleMedium>) {
            state.user.media = media;
        },
        addExternalUser(state, externalUser: ExternalUser) {
            externalUser.lists.forEach((list: ExternalList) => {
                list.show = false;
                list.external = true;
            });
            state.user.externalUser.push(externalUser);
        },
        deleteExternalUser(state, uuid: string) {
            const index = state.user.externalUser.findIndex(
                (value) => value.uuid === uuid
            );
            if (index < 0) {
                return;
            }
            state.user.externalUser.splice(index, 1);
        },
        addMedium(state, medium: Medium) {
            state.user.media[medium.id] = medium;
        },
        deleteMedium(state, id: number) {
            if (!(id in state.user.media)) {
                throw Error("invalid mediumId");
            }

            delete state.user.media[id];

            state.user.lists.forEach((value) => {
                const listIndex = value.items.findIndex(
                    (itemId: number) => itemId === id
                );

                if (listIndex >= 0) {
                    value.items.splice(listIndex, 1);
                }
            });
        },
        addList(state, list: List) {
            list.show = false;
            list.external = false;
            state.user.lists.push(list);
        },
        deleteList(state, id: number) {
            const index = state.user.lists.findIndex((value) => value.id === id);
            if (index < 0) {
                throw Error("invalid mediumId");
            }
            state.user.lists.splice(index, 1);
        },
        addNews(state, news: News[]) {
            const ownNews = state.user.news;
            news = news
                .filter(
                    (value) =>
                        !ownNews.find((otherValue) => otherValue.id === value.id)
                )
                .map((value) => (value.date = new Date(value.date)) && value);

            if (news.length) {
                ownNews.push(...news);
            }
        },
        resetModal(state, modalKey: keyof Modals) {
            state.modals[modalKey].show = false;
            state.modals[modalKey].error = "";
        },
        // create error and show setter for modals
        ...(function() {
            const modals: Array<keyof Modals> = ["login", "register", "error", "addList", "addMedium", "settings"];
            const modalSetter = {};

            for (const modalKey of modals) {
                modalSetter[`${modalKey}ModalError`] = (state: any, value: string) => state.modals[modalKey].error = value;
                modalSetter[`${modalKey}ModalShow`] = (state: any, value: boolean) => state.modals[modalKey].show = value;
            }

            return modalSetter;
        })()
    },
    actions: {
        async loadMedia({ commit }) {
            try {
                const data = await HttpClient.getAllMedia();
                const media = {};
    
                for (const datum of data) {
                    media[datum.id] = datum;
                }
    
                commit("userMedia", media);
            } catch (error) {
                console.error(error);
            }
        },
        async loadLists({ commit }) {
            try {
                const lists = await HttpClient.getLists();
                commit("userLists", lists);
                console.log("Finished loading Lists", lists);
            } catch (error) {
                console.error(error);
            }
        },
        async loadExternalUser({ commit }) {
            try {
                const externalUser = await HttpClient.getExternalUser();
                commit("userExternalUser", externalUser);
                console.log("Finished loading ExternalUser", externalUser);
            } catch (error) {
                console.error(error);
            }
        },
        async addExternalUser({ commit }, data: { identifier: string; pwd: string }) {
            if (!data.identifier) {
                emitBusEvent("error:add:externalUser", "Identifier is missing!");
            } else if (!data.pwd) {
                emitBusEvent("error:add:externalUser", "Password is missing!");
            } else {
                try {
                    const externalUser: ExternalUser = await HttpClient.addExternalUser(data);
                    commit("addExternalUser", externalUser);
                } catch (error) {
                    emitBusEvent("error:add:externalUser", String(error));
                }
            }
        },
        async deleteExternalUser({ commit }, uuid: string) {
            if (!uuid) {
                console.error("cannot delete externalUser without data");
                return;
            }

            try {
                await HttpClient.deleteExternalUser(uuid);
                commit("deleteExternalUser", uuid);
            } catch (error) {
                console.log(error)
                throw error
            }
        },
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
