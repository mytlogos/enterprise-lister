import { CustomHookStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";
import { CustomHook } from "enterprise-core/dist/types";

const module: Module<CustomHookStore, VuexStore> = {
  state: () => ({
    hooks: {},
  }),
  mutations: {
    add(state, hook: CustomHook): void {
      if (state.hooks[hook.id]) {
        throw Error("Hook already exists");
      }
      state.hooks[hook.id] = hook;
    },
    update(state, hook: CustomHook): void {
      if (!state.hooks[hook.id]) {
        throw Error("Hook does not exist already");
      }
      state.hooks[hook.id] = hook;
    },
    setAll(state, hooks: CustomHook[]): void {
      const newHooks: Record<number, CustomHook> = {};

      for (const hook of hooks) {
        newHooks[hook.id] = hook;
      }

      state.hooks = newHooks;
    },
    delete(state, hook: CustomHook): void {
      if (!state.hooks[hook.id]) {
        throw Error("Hook does not exist already");
      }
      delete state.hooks[hook.id];
    },
  },
  actions: {
    async createHook({ commit }, hook: CustomHook): Promise<CustomHook> {
      const result = await HttpClient.createCustomHook(hook);
      commit("add", result);
      return result;
    },
    async updateHook({ commit }, hook: CustomHook): Promise<CustomHook> {
      const result = await HttpClient.updateCustomHook(hook);
      commit("update", result);
      return result;
    },
    async loadHooks({ commit }): Promise<void> {
      const result = await HttpClient.getCustomHooks();
      commit("setAll", result);
    },
  },
};
export default module;
