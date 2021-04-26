import { ReleaseStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { remove } from "../init";

const module: Module<ReleaseStore, VuexStore> = {
  namespaced: true,
  state: () => ({
    readFilter: undefined,
    typeFilter: 0,
    onlyMedia: [],
    onlyLists: [],
    ignoreMedia: [],
    ignoreLists: [],
  }),
  mutations: {
    readFilter(state: ReleaseStore, read?: boolean): void {
      state.readFilter = read;
    },
    typeFilter(state: ReleaseStore, type: number): void {
      state.typeFilter = type;
    },
    ignoreMedium(state, id: number) {
      state.ignoreMedia.push(id);
    },
    ignoreList(state, id: number) {
      state.ignoreLists.push(id);
    },
    requireMedium(state, id: number) {
      state.onlyMedia.push(id);
    },
    requireList(state, id: number) {
      state.onlyLists.push(id);
    },
    unignoreMedium(state, id: number) {
      remove(state.ignoreMedia, id);
    },
    unignoreList(state, id: number) {
      remove(state.ignoreLists, id);
    },
    unrequireMedium(state, id: number) {
      remove(state.onlyMedia, id);
    },
    unrequireList(state, id: number) {
      remove(state.onlyLists, id);
    },
  },
};
export default module;
