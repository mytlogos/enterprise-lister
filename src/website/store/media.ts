import { AddMedium, Medium, SimpleMedium, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";

const module: Module<any, VuexStore> = {
    state: () => ({
        media: {}
    }),
    getters: {
        getMedium: (state) => (id: number): SimpleMedium => {
            return state.media[id];
        },
        media(state): SimpleMedium[] {
            return Object.values(state.media);
        },
    },
    mutations: {
        userMedia(state, media: Record<number, SimpleMedium>) {
            state.media = media;
        },
        addMedium(state, medium: Medium | Medium[]) {
            if (Array.isArray(medium)) {
                medium.forEach(item => state.media[item.id] = item)
            } else {
                state.media[medium.id] = medium;
            }
        },
        deleteMedium(state, id: number) {
            if (!(id in state.media)) {
                throw Error("invalid mediumId");
            }

            delete state.media[id];

            state.lists.forEach((value) => {
                const listIndex = value.items.findIndex(
                    (itemId: number) => itemId === id
                );

                if (listIndex >= 0) {
                    value.items.splice(listIndex, 1);
                }
            });
        },
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
        addMedium({ commit }, data: AddMedium) {
            if (!data.title) {
                commit("addMediumModalError", "Missing title");
            } else if (!data.medium) {
                commit("addMediumModalError", "Missing type");
            } else {
                HttpClient.createMedium(data)
                    .then((medium) => {
                        commit("addMedium", medium);
                        commit("resetModal", "addMedium");
                    })
                    .catch(
                        (error) => commit("addMediumModalError", String(error))
                    );
            }
            // TODO implement addMedium
        },

        editMedium({ commit }, data: { id: number; prop: string }) {
            if (data.id == null || !data.prop) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.updateMedium(data).catch(console.log);
            }
            // TODO implement editMedium
        },

        deleteMedium({ commit }, id: number) {
            if (id == null) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.deleteMedium(id)
                    .then(() => commit("deleteMedium", id))
                    .catch((error) => console.log(error));
            }
            // TODO implement deleteMedium
        },
    }
};
export default module;