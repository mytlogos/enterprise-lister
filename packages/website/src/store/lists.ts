import { StoreInternalList, StoreList } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import { List } from "enterprise-core/src/types";
import { defineStore } from "pinia";
import { useExternalUserStore } from "./externaluser";
import { useUserStore } from "./store";

export const useListStore = defineStore("lists", {
  persist: true,
  state: () => ({
    lists: [] as StoreInternalList[],
  }),
  getters: {
    allLists(): StoreList[] {
      const externalLists = useExternalUserStore().externalUser.flatMap((value) => value.lists);
      return [...this.lists, ...externalLists];
    },
  },

  actions: {
    userListsLocal(lists: List[]): void {
      this.lists = lists.map((list) => ({ ...list, external: false }));
    },
    async deleteListItem(payload: { listId: number; mediumId: number }) {
      await HttpClient.deleteListItem({ listId: payload.listId, mediumId: [payload.mediumId] });

      const list = this.lists.find((value) => value.id === payload.listId);
      if (!list) {
        throw Error("invalid listId");
      }
      list.items = list.items.filter((id) => id !== payload.mediumId);
    },
    addListItemLocal(payload: { listId: number; mediumId: number }) {
      const list = this.lists.find((value) => value.id === payload.listId);
      if (!list) {
        throw Error("invalid listId");
      }
      list.items.push(payload.mediumId);
    },
    async updateList(updateList: List) {
      const success = await HttpClient.updateList(updateList);

      if (!success) {
        return false;
      }

      const list = this.lists.find((value: List) => value.id === updateList.id);

      if (list) {
        Object.assign(list, updateList);
      } else {
        console.error("Cannot find list to update for id:", updateList.id);
      }
      return true;
    },
    async loadLists() {
      try {
        const lists = await HttpClient.getLists();
        this.userListsLocal(lists);
        console.log("Finished loading Lists", lists);
      } catch (error) {
        console.error(error);
      }
    },

    async addList(data: { name: string; medium: number }) {
      if (this.lists.find((value) => value.name === data.name)) {
        throw Error("Duplicate List Name");
      }
      if (!data.name) {
        throw Error("Missing name");
      }
      if (!data.medium) {
        throw Error("Missing Type");
      }

      const userStore = useUserStore();
      const list = await HttpClient.createList({
        list: { name: data.name, medium: data.medium, userUuid: userStore.uuid },
      });
      this.lists.push({ ...list, external: false });
    },

    async deleteList(id: number) {
      await HttpClient.deleteList(id);

      const index = this.lists.findIndex((value) => value.id === id);
      if (index < 0) {
        throw Error("invalid listId");
      }
      this.lists.splice(index, 1);
    },
  },
});
