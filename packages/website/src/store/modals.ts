import { Modal, Modals } from "../siteTypes";
import { defineStore } from "pinia";

function createModal(): Modal {
  return {
    error: "",
    show: false,
  };
}

export const useModalStore = defineStore("store", {
  state: () => ({
    addList: createModal(),
    addMedium: createModal(),
    addExternalUser: createModal(),
    login: createModal(),
    register: createModal(),
    settings: createModal(),
    error: createModal(),
  }),
  actions: {
    // create error and show setter for modals
    ...(function () {
      const modals: Array<keyof Modals> = [
        "login",
        "register",
        "error",
        "addList",
        "addMedium",
        "settings",
        "addExternalUser",
      ];
      const modalSetter: Record<string, any> = {};

      for (const modalKey of modals) {
        modalSetter[`${modalKey}ModalError`] = (state: any, value: string) => (state.modals[modalKey].error = value);
        modalSetter[`${modalKey}ModalShow`] = (state: any, value: boolean) => (state.modals[modalKey].show = value);
      }

      return modalSetter;
    })(),
    resetModal(state: Modals, modalKey: keyof Modals): void {
      state[modalKey].show = false;
      state[modalKey].error = "";
    },
  },
});
