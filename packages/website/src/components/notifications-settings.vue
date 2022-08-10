<template>
  <div>
    <h5>Notifications</h5>
    <p-button label="Save" />
    <form>
      <h6>Global Settings</h6>
      <p-button
        v-if="shouldRequestPermission"
        label="Permit native Notifications"
        class="btn btn-primary me-2"
        @click="requestPermission"
      />
      <div class="form-check form-switch">
        <input id="globalPush" v-model="activeSettings.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="globalPush">Enable native Notifications globally</label>
      </div>
      <Divider />
      <h6>New Releases Notifications</h6>
      <div class="form-check form-switch">
        <input
          id="releaseEnable"
          v-model="activeSettings.newReleases.enabled"
          type="checkbox"
          class="form-check-input"
        />
        <label class="form-check-label" for="releaseEnable">Notify when Media have new Releases</label>
      </div>
      <div class="form-check form-switch">
        <input
          id="releaseEnableAll"
          v-model="activeSettings.newReleases.allMedia"
          type="checkbox"
          class="form-check-input"
        />
        <label class="form-check-label" for="releaseEnableAll">All Media</label>
      </div>
      <div class="form-check form-switch">
        <input
          id="releasePush"
          v-model="activeSettings.newReleases.push"
          type="checkbox"
          class="form-check-input"
          :disabled="!activeSettings.newReleases.enabled"
        />
        <label class="form-check-label" for="releasePush">Enable native Notifications</label>
      </div>
      <span>Currently enabled: {{ activeSettings.newReleases.media.length }}</span>
      <Divider />
      <h6>Job Notifications</h6>
      <div class="form-check form-switch">
        <input id="jobPush" v-model="activeSettings.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="jobPush">Enable native Notifications</label>
      </div>
      <Divider />
      <h6>Program Notifications</h6>
      <div class="form-check form-switch">
        <input id="programPush" v-model="activeSettings.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="programPush">Enable native Notifications</label>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { clone } from "../init";
import { requestPermission, shouldRequestPermission } from "../notifications";
import { SettingStore } from "../siteTypes";

export default defineComponent({
  name: "NotificationsSettings",
  data() {
    return {
      activeSettings: clone(this.$store.state.settings.notifications),
      shouldRequestPermission: shouldRequestPermission(),
    };
  },
  computed: {
    setting(): SettingStore["notifications"] {
      return this.$store.state.settings.notifications;
    },
  },
  watch: {
    activeSettings: {
      handler() {
        this.$store.commit("updateNotificationSettings", clone(this.activeSettings));
      },
      deep: true,
    },
  },
  methods: {
    requestPermission() {
      requestPermission()
        .catch(console.error)
        .finally(() => (this.shouldRequestPermission = shouldRequestPermission()));
    },
  },
});
</script>
