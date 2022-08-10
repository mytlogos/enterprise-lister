<template>
  <div class="settings">
    <div class="settings-list left-content p-2">
      <label class="input-group">
        <input v-model="filter" type="text" class="form-control" />
      </label>
      <list-box v-model="selectedSetting" :options="lists" option-label="name" option-value="type" />
    </div>
    <div class="page">
      <external-user v-if="selectedSetting === 'externaluser'" />
      <notifications-settings v-else-if="selectedSetting === 'notification'" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import externalUser from "../components/external-user.vue";
import NotificationsSettings from "../components/notifications-settings.vue";
// TODO: check and delete unused component list-comp
// import listComp from "../components/list-comp.vue";

type SettingsPageType = "externaluser" | "notification";

interface Data {
  lists: Array<{ name: string; type: SettingsPageType }>;
  filter: string;
  selectedSetting: "" | "externaluser" | "notification";
}

export default defineComponent({
  name: "SettingsPage",
  components: {
    externalUser,
    NotificationsSettings,
  },
  data(): Data {
    return {
      lists: [
        // TODO get options from server
        { name: "External", type: "externaluser" },
        { name: "Notifications", type: "notification" },
      ],
      filter: "",
      selectedSetting: "",
    };
  },
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
