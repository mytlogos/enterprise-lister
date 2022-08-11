import { ExternalUser, StoreExternalList } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import { Id } from "enterprise-core/dist/types";
import { defineStore } from "pinia";

export const useExternalUserStore = defineStore("externaluser", {
  persist: true,
  state: () => ({
    externalUser: [] as ExternalUser[],
  }),
  actions: {
    getExternalList(id: Id) {
      return this.externalUser.map((user) => user.lists.find((list) => list.id === id)).find((value) => value);
    },
    addExternalUserLocal(externalUser: ExternalUser) {
      externalUser.lists.forEach((list) => {
        list.external = true;
      });
      this.externalUser.push(externalUser);
    },
    deleteExternalUserLocal(uuid: string) {
      const index = this.externalUser.findIndex((value) => value.uuid === uuid);
      if (index < 0) {
        return;
      }
      this.externalUser.splice(index, 1);
    },
    updateExternalListLocal(updateList: StoreExternalList) {
      let found = false;
      for (const user of this.externalUser) {
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
    async loadExternalUser() {
      try {
        const externalUser = await HttpClient.getExternalUser();
        externalUser.forEach((user) => {
          user.lists.forEach((list) => (list.external = true));
        });
        this.externalUser = externalUser;
        console.log("Finished loading ExternalUser", externalUser);
      } catch (error) {
        console.error(error);
      }
    },
    async addExternalUser(data: { identifier: string; pwd: string }) {
      if (!data.identifier) {
        // TODO: commit("addExternalUserModalError", "Identifier is missing!");
      } else if (!data.pwd) {
        // TODO: commit("addExternalUserModalError", "Password is missing!");
      } else {
        try {
          const externalUser: ExternalUser = await HttpClient.addExternalUser(data);
          this.addExternalUserLocal(externalUser);
        } catch (error) {
          // TODO: commit("addExternalUserModalError", String(error));
        }
      }
    },
    async deleteExternalUser(uuid: string) {
      if (!uuid) {
        console.error("cannot delete externalUser without data");
        return;
      }

      try {
        await HttpClient.deleteExternalUser(uuid);
        this.deleteExternalUserLocal(uuid);
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
});
