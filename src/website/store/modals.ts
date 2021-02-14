import { Modal, Modals, VuexStore } from "../siteTypes";
import { Module } from "vuex";

function createModal(): Modal {
    return {
        error: "",
        show: false
    }
}

const module: Module<Modals, VuexStore> = {
    state: () => ({
        addList: createModal(),
        addMedium: createModal(),
        addExternalUser: createModal(),
        login: createModal(),
        register: createModal(),
        settings: createModal(),
        error: createModal()
    }),
    mutations: {
        // create error and show setter for modals
        ...(function() {
            const modals: Array<keyof Modals> = [
                "login", "register", "error",
                "addList", "addMedium", "settings",
                "addExternalUser"
            ];
            const modalSetter = {};

            for (const modalKey of modals) {
                modalSetter[`${modalKey}ModalError`] = (state: any, value: string) => state.modals[modalKey].error = value;
                modalSetter[`${modalKey}ModalShow`] = (state: any, value: boolean) => state.modals[modalKey].show = value;
            }

            return modalSetter;
        })(),
        resetModal(state: Modals, modalKey: keyof Modals): void {
            state[modalKey].show = false;
            state[modalKey].error = "";
        },
    }
};
export default module;