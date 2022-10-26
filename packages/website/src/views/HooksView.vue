<template>
  <div class="container">
    <toolbar>
      <template #end>
        <router-link class="btn btn-success me-2" :to="{ name: 'addHook' }"> Add Hook </router-link>
        <router-link class="btn btn-success" :to="{ name: 'addHookV2' }"> Add V2 Hook </router-link>
      </template>
    </toolbar>
    <div class="d-flex flex-wrap">
      <div v-for="(item, index) in data.hooks" :key="item.id" class="card card-body" style="width: 20em">
        <div class="form-check form-switch">
          <input
            :id="'enabled-switch-' + index"
            :checked="isItemActive(item)"
            type="checkbox"
            class="form-check-input"
            @input="toggleHook(item)"
          />
          <label class="form-check-label" :for="'enabled-switch-' + index"> {{ item.name }}</label>
        </div>
        <div>{{ item.message }}</div>
      </div>
    </div>
    <div class="d-flex flex-wrap">
      <div v-for="(item, index) in data.customHooks" :key="item.id" class="card card-body" style="width: 20em">
        <div class="form-check form-switch">
          <input
            :id="'enabled-switch-' + index"
            :checked="isCustomItemActive(item)"
            type="checkbox"
            class="form-check-input"
            @input="toggleCustomHook(item)"
          />
          <label class="form-check-label" :for="'enabled-switch-' + index"> {{ item.name }}</label>
        </div>
        <router-link
          class="btn fa fa-edit align-self-start"
          :to="{ name: getHookEditRouterName(item), params: { hookId: item.id } }"
          aria-hidden="true"
        />
        <div>{{ item.comment }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { reactive } from "vue";
import { CustomHook, ScraperHook } from "enterprise-core/dist/types";

const data = reactive({
  hooks: [] as ScraperHook[],
  customHooks: [] as CustomHook[],
});

fetch().catch(console.error);

async function fetch() {
  const [hooks, customHooks] = await Promise.all([HttpClient.getHooks(), HttpClient.getCustomHooks()]);

  hooks.sort((a, b) => {
    const compare = a.state.localeCompare(b.state);
    return compare || a.name.localeCompare(b.name);
  });
  customHooks.sort((a, b) => {
    const compare = a.state.localeCompare(b.state);
    return compare || a.name.localeCompare(b.name);
  });
  data.hooks = hooks;
  data.customHooks = customHooks;
}
async function toggleHook(item: ScraperHook) {
  const newState = !item.enabled;
  await HttpClient.updateHook({ ...item, enabled: newState });
  item.enabled = newState;
}
function isItemActive(item: ScraperHook): boolean {
  return item.enabled;
}
async function toggleCustomHook(item: CustomHook) {
  const newState = !item.enabled;
  await HttpClient.updateCustomHook({ ...item, enabled: newState });
  item.enabled = newState;
}
function isCustomItemActive(item: CustomHook): boolean {
  return item.enabled;
}

function getHookEditRouterName(item: CustomHook) {
  let hookConfig: any;
  try {
    hookConfig = JSON.parse(item.state);
  } catch (error) {
    return;
  }

  if ("version" in hookConfig && hookConfig.version === 2) {
    return "editHookv2";
  } else {
    return "editHook";
  }
}
</script>
