<template>
  <div class="container">
    <div class="row">
      <div class="col text-end">
        <router-link v-slot="{ href, navigate, isActive }" :to="{ name: 'addhook' }" custom>
          <button :active="isActive" :href="href" class="btn btn-success" @click="navigate">Add Hook</button>
        </router-link>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: auto auto auto auto">
      <div v-for="(item, index) in hooks" :key="item.id" class="list-group-item">
        <h5>
          <div class="form-check form-switch d-inline">
            <input
              :id="'enabled-switch-' + index"
              :checked="isItemActive(item)"
              type="checkbox"
              class="form-check-input"
              @input="toggleHook(item)"
            />
            <label class="form-check-label" :for="'enabled-switch-' + index"></label>
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
