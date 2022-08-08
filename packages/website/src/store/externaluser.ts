import { ExternalUser, ExternalUserStore, StoreExternalList, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";
import { Id } from "enterprise-core/dist/types";

const module: Module<ExternalUserStore, VuexStore> = {
  state: () => ({
    externalUser: [],
  }),
  getters: {
    getExternalList(state) {
      return (id: Id) =>
        state.externalUser.map((user) => user.lists.find((list) => list.id === id)).find((value) => value);
    },
  },
  mutations: {
    userExternalUser(state, externalUser: ExternalUser[]) {
      state.externalUser = [...externalUser];
    },
    addExternalUser(state, externalUser: ExternalUser) {
      externalUser.lists.forEach((list) => {
        list.external = true;
      });
      state.externalUser.push(externalUser);
    },
    deleteExternalUser(state, uuid: string) {
      const index = state.externalUser.findIndex((value) => value.uuid === uuid);
      if (index < 0) {
        return;
      }
      state.externalUser.splice(index, 1);
    },
    updateExternalList(state, updateList: StoreExternalList) {
      let found = false;
      for (const user of state.externalUser) {
        for (const list of user.lists) {
          if (list.id === updateList.id) {
            found = true;
            Object.assign(list, updateList);
          }
        }
      }

      if (!found) {
        console.error("Cannot find list to update for id:", updateList.id);
      }
    },
  },
  actions: {
    async loadExternalUser({ commit }) {
      try {
        const externalUser = await HttpClient.getExternalUser();
        externalUser.forEach((user) => {
          user.lists.forEach((list) => (list.external = true));
        });
        commit("userExternalUser", externalUser);
        console.log("Finished loading ExternalUser", externalUser);
      } catch (error) {
        console.error(error);
      }
    },
    async addExternalUser({ commit }, data: { identifier: string; pwd: string }) {
      if (!data.identifier) {
        commit("addExternalUserModalError", "Identifier is missing!");
      } else if (!data.pwd) {
        commit("addExternalUserModalError", "Password is missing!");
      } else {
        try {
          const externalUser: ExternalUser = await HttpClient.addExternalUser(data);
          commit("addExternalUser", externalUser);
        } catch (error) {
          commit("addExternalUserModalError", String(error));
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
        console.log(error);
        throw error;
      }
    },
  },
};
export default module;
