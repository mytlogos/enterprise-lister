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
    ignoreMedium(state, ids: number[]) {
      state.ignoreMedia = ids;
    },
    ignoreList(state, ids: number[]) {
      state.ignoreLists = ids;
    },
    requireMedium(state, ids: number[]) {
      state.onlyMedia = ids;
    },
    requireList(state, ids: number[]) {
      state.onlyLists = ids;
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
