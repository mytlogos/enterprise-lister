import { ReleaseStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";

const module: Module<ReleaseStore, VuexStore> = {
    namespaced: true,
    state: () => ({
        readFilter: null,
        typeFilter: 0,
    }),
    mutations: {
        readFilter(state: ReleaseStore, read?: boolean): void {
            state.readFilter = read;
        },
        typeFilter(state: ReleaseStore, type: number): void {
            state.typeFilter = type;
        }
    }
};
export default module;