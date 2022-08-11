import { StoreInternalList, StoreList } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import { List } from "enterprise-core/src/types";
import { defineStore } from "pinia";
import { useExternalUserStore } from "./externaluser";

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
    addListLocal(list: StoreInternalList) {
      list.external = false;
      this.lists.push(list);
    },
    deleteListLocal(id: number) {
      const index = this.lists.findIndex((value) => value.id === id);
      if (index < 0) {
        throw Error("invalid listId");
      }
      this.lists.splice(index, 1);
    },
    removeListItemLocal(payload: { listId: number; mediumId: number }) {
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
    updateListLocal(updateList: List) {
      const list = this.lists.find((value: List) => value.id === updateList.id);

      if (list) {
        Object.assign(list, updateList);
      } else {
        console.error("Cannot find list to update for id:", updateList.id);
      }
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

    async addList(data: { name: string; type: number }) {
      if (!data.name) {
        // TODO: commit("addListModalError", "Missing name");
      } else if (!data.type) {
        // TODO: commit("addListModalError", "Missing type");
      } else {
        return HttpClient.createList(data).then((list) => {
          // @ts-expect-error
          this.addListLocal(list);
          // TODO: commit("resetModal", "addList");
        });
      }
    },

    async deleteList(id: number) {
      await HttpClient.deleteList(id);
      this.deleteListLocal(id);
    },
  },
});
