import { ListsStore, StoreInternalList, StoreList, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";
import { List } from "enterprise-core/src/types";

const module: Module<ListsStore, VuexStore> = {
  state: () => ({
    lists: [],
  }),
  getters: {
    allLists(state, _getters, rootState): StoreList[] {
      const externalLists = rootState.externalUser.externalUser.flatMap((value) => value.lists);
      return [...state.lists, ...externalLists];
    },
  },
  mutations: {
    userLists(state, lists: List[]): void {
      state.lists = lists.map((list) => ({ ...list, external: false }));
    },
    addList(state, list: StoreInternalList) {
      list.external = false;
      state.lists.push(list);
    },
    deleteList(state, id: number) {
      const index = state.lists.findIndex((value) => value.id === id);
      if (index < 0) {
        throw Error("invalid listId");
      }
      state.lists.splice(index, 1);
    },
    removeListItem(state, payload: { listId: number; mediumId: number }) {
      const list = state.lists.find((value) => value.id === payload.listId);
      if (!list) {
        throw Error("invalid listId");
      }
      list.items = list.items.filter((id) => id !== payload.mediumId);
    },
    addListItem(state, payload: { listId: number; mediumId: number }) {
      const list = state.lists.find((value) => value.id === payload.listId);
      if (!list) {
        throw Error("invalid listId");
      }
      list.items.push(payload.mediumId);
    },
    updateList(state, updateList: List) {
      const list = state.lists.find((value: List) => value.id === updateList.id);

      if (list) {
        Object.assign(list, updateList);
      } else {
        console.error("Cannot find list to update for id:", updateList.id);
      }
    },
  },
  actions: {
    async loadLists({ commit }) {
      try {
        const lists = await HttpClient.getLists();
        commit("userLists", lists);
        console.log("Finished loading Lists", lists);
      } catch (error) {
        console.error(error);
      }
    },

    async addList({ commit }, data: { name: string; type: number }) {
      if (!data.name) {
        commit("addListModalError", "Missing name");
      } else if (!data.type) {
        commit("addListModalError", "Missing type");
      } else {
        return HttpClient.createList(data).then((list) => {
          commit("addList", list);
          commit("resetModal", "addList");
        });
      }
    },

    deleteList({ commit }, id: number) {
      HttpClient.deleteList(id)
        .then(() => {
          commit("deleteList", id);
        })
        .catch((error) => console.log(error));
    },
  },
};
export default module;
