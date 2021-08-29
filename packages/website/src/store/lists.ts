import { List, ListsStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";

const module: Module<ListsStore, VuexStore> = {
  state: () => ({
    lists: [],
  }),
  getters: {
    allLists(state, _getters, rootState): List[] {
      const externalLists = rootState.externalUser.externalUser.flatMap((value) => value.lists);
      return [...state.lists, ...externalLists];
    },
  },
  mutations: {
    userLists(state, lists: List[]): void {
      state.lists = [...lists];
    },
    addList(state, list: List) {
      list.show = false;
      list.external = false;
      state.lists.push(list);
    },
    deleteList(state, id: number) {
      const index = state.lists.findIndex((value) => value.id === id);
      if (index < 0) {
        throw Error("invalid mediumId");
      }
      state.lists.splice(index, 1);
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

    addList({ commit }, data: { name: string; type: number }) {
      if (!data.name) {
        commit("addListModalError", "Missing name");
      } else if (!data.type) {
        commit("addListModalError", "Missing type");
      } else {
        HttpClient.createList(data)
          .then((list) => {
            commit("addList", list);
            commit("resetModal", "addList");
          })
          .catch((error) => commit("addListModalError", String(error)));
      }
      // TODO implement addList
    },

    deleteList({ commit }, id: number) {
      HttpClient.deleteList(id)
        .then(() => console.log("success"))
        .catch((error) => console.log(error));
      // TODO implement deleteList
    },
  },
};
export default module;
