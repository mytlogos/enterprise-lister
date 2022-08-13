<template>
  <div class="settings">
    <div class="settings-list left-content p-2">
      <label class="input-group">
        <input v-model="data.filter" type="text" class="form-control" />
      </label>
      <list-box v-model="data.selectedSetting" :options="data.lists" option-label="name" option-value="type" />
    </div>
    <div class="page">
      <external-user v-if="data.selectedSetting === 'externaluser'" />
      <notifications-settings v-else-if="data.selectedSetting === 'notification'" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from "vue";
import externalUser from "../components/external-user.vue";
import NotificationsSettings from "../components/notifications-settings.vue";

type SettingsPageType = "externaluser" | "notification";

interface Data {
  lists: Array<{ name: string; type: SettingsPageType }>;
  filter: string;
  selectedSetting: "" | SettingsPageType;
}

const data = reactive<Data>({
  lists: [
    // TODO get options from server
    { name: "External", type: "externaluser" },
    { name: "Notifications", type: "notification" },
  ],
  filter: "",
  selectedSetting: "",
});
</script>

<style scoped>
.settings {
  display: flex;
}

.settings > .page {
  flex: 80%;
}

.settings > .settings-list {
  flex: 20%;
}
</style>
