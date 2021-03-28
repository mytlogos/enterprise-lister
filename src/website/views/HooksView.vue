<template>
  <div class="container">
    <div style="display: grid; grid-template-columns: auto auto auto auto">
      <div v-for="(item, index) in hooks" :key="item.id" class="list-group-item">
        <h5>
          <div class="custom-control custom-switch d-inline">
            <input
              :id="'enabled-switch-' + index"
              :checked="isItemActive(item)"
              type="checkbox"
              class="custom-control-input"
              @input="toggleHook(item)"
            />
            <label class="custom-control-label" :for="'enabled-switch-' + index"></label>
          </div>
          {{ item.name }}
        </h5>
        <div>{{ item.message }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { ScraperHook } from "../siteTypes";
import { defineComponent } from "vue";

export enum HookState {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

export default defineComponent({
  name: "HooksView",
  data() {
    return {
      hooks: [] as ScraperHook[],
    };
  },
  created() {
    this.fetch().catch(console.error);
  },
  methods: {
    async fetch() {
      const hooks = await HttpClient.getHooks();
      hooks.sort((a, b) => {
        let compare = a.state.localeCompare(b.state);
        return compare ? compare : a.name.localeCompare(b.name);
      });
      this.hooks = hooks;
    },
    async toggleHook(item: ScraperHook) {
      const newState = item.state === HookState.DISABLED ? HookState.ENABLED : HookState.DISABLED;
      await HttpClient.updateHook({ ...item, state: newState });
      item.state = newState;
    },
    isItemActive(item: ScraperHook): boolean {
      return item.state === HookState.ENABLED;
    },
  },
});
</script>
