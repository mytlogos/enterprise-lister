import { HttpClient } from "../Httpclient";
import { CustomHook } from "enterprise-core/dist/types";
import { defineStore } from "pinia";

export const useHookStore = defineStore("hooks", {
  persist: true,
  state: () => ({
    hooks: {} as Record<number, CustomHook>,
  }),
  actions: {
    delete(hook: CustomHook): void {
      if (!this.hooks[hook.id]) {
        throw Error("Hook does not exist already");
      }
      delete this.hooks[hook.id];
    },
    async createHook(hook: CustomHook): Promise<CustomHook> {
      const result = await HttpClient.createCustomHook(hook);
      if (this.hooks[hook.id]) {
        throw Error("Hook already exists");
      }
      this.hooks[hook.id] = hook;
      return result;
    },
    async updateHook(hook: CustomHook): Promise<CustomHook> {
      const result = await HttpClient.updateCustomHook(hook);
      if (!this.hooks[hook.id]) {
        throw Error("Hook does not exist already");
      }
      this.hooks[hook.id] = hook;
      return result;
    },
    async loadHooks(): Promise<void> {
      const result = await HttpClient.getCustomHooks();

      const newHooks: Record<number, CustomHook> = {};

      for (const hook of result) {
        newHooks[hook.id] = hook;
      }

      this.hooks = newHooks;
    },
  },
});
