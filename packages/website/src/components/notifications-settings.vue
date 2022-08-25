<template>
  <div>
    <Toolbar>
      <template #start>
        <h5 class="m-0">Notifications</h5>
      </template>
      <template #end>
        <p-button label="Save" />
      </template>
    </Toolbar>
    <form>
      <h6 class="my-2">Global Settings</h6>
      <p-button
        v-if="shouldRequest"
        label="Permit native Notifications"
        class="btn btn-primary me-2"
        @click="request"
      />
      <div class="form-check form-switch">
        <input id="globalPush" v-model="store.notifications.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="globalPush">Enable native Notifications globally</label>
      </div>
      <Divider />
      <h6>New Releases Notifications</h6>
      <div class="form-check form-switch">
        <input
          id="releaseEnable"
          v-model="store.notifications.newReleases.enabled"
          type="checkbox"
          class="form-check-input"
        />
        <label class="form-check-label" for="releaseEnable">Notify when Media have new Releases</label>
      </div>
      <div class="form-check form-switch">
        <input
          id="releaseEnableAll"
          v-model="store.notifications.newReleases.allMedia"
          type="checkbox"
          class="form-check-input"
        />
        <label class="form-check-label" for="releaseEnableAll">All Media</label>
      </div>
      <div class="form-check form-switch">
        <input
          id="releasePush"
          v-model="store.notifications.newReleases.push"
          type="checkbox"
          class="form-check-input"
          :disabled="!store.notifications.newReleases.enabled"
        />
        <label class="form-check-label" for="releasePush">Enable native Notifications</label>
      </div>
      <span>Currently enabled: {{ store.notifications.newReleases.media.length }}</span>
      <Divider />
      <h6>Job Notifications</h6>
      <div class="form-check form-switch">
        <input id="jobPush" v-model="store.notifications.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="jobPush">Enable native Notifications</label>
      </div>
      <Divider />
      <h6>Program Notifications</h6>
      <div class="form-check form-switch">
        <input id="programPush" v-model="store.notifications.push" type="checkbox" class="form-check-input" />
        <label class="form-check-label" for="programPush">Enable native Notifications</label>
      </div>
    </form>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { requestPermission, shouldRequestPermission } from "../notifications";
import { useSettingsStore } from "../store/settings";

const store = useSettingsStore();
const shouldRequest = ref(shouldRequestPermission());

function request() {
  requestPermission()
    .catch(console.error)
    .finally(() => (shouldRequest.value = shouldRequestPermission()));
}
</script>
