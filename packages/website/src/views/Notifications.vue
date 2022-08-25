<template>
  <div class="container">
    <toolbar>
      <template #start>
        <p-button
          v-if="data.canRequestPermission"
          label="Permit Notifications"
          class="btn btn-primary me-2"
          @click="requestNotificationsPermission"
        />
        <p-button label="Read all" class="btn btn-primary me-2" @click="userStore.readAllNotifications()" />
        <select-button v-model="data.selectedRead" :options="readOptions" option-label="name" option-value="value" />
      </template>
    </toolbar>
    <!-- TODO: use paginator -->
    <p-paginator :rows="100" :total-records="totalItemsCount" :rows-per-page-options="[100, 200, 300]"></p-paginator>
    <div v-for="item in data.notifications" :key="item.id" class="card mt-1">
      <div class="card-header">{{ item.title }}</div>
      <div class="card-body">
        <h6 class="card-subtitle mb-2 text-muted">{{ item.date.toLocaleString() }}</h6>
        <p class="card-text">
          {{ item.content }}
        </p>
        <a v-if="!item.read" href="#" class="btn btn-primary" @click="readNotification(item)">Read</a>
      </div>
    </div>
    <div v-if="!data.notifications.length" class="text-center mt-1">No Notifications available</div>
  </div>
</template>
<script lang="ts" setup>
import { UserNotification } from "enterprise-core/dist/types";
import { computed, reactive, watchEffect } from "vue";
import { HttpClient } from "../Httpclient";
import { requestPermission, shouldRequestPermission } from "../notifications";
import { useUserStore } from "../store/store";

const userStore = useUserStore();
const readOptions = [
  {
    name: "Read",
    value: true,
  },
  {
    name: "Unread",
    value: false,
  },
];
const data = reactive({
  selectedRead: false,
  canRequestPermission: shouldRequestPermission(),
  notifications: [] as UserNotification[],
});

// COMPUTED
const totalItemsCount = computed(() => {
  if (data.selectedRead) {
    return 0;
  } else {
    return userStore.user.unreadNotificationsCount;
  }
});

// WATCHES
watchEffect(() => {
  currentNotifications();
});

function requestNotificationsPermission() {
  requestPermission()
    .catch(console.error)
    .finally(() => (data.canRequestPermission = shouldRequestPermission()));
}

function readNotification(item: UserNotification) {
  const index = data.notifications.indexOf(item);

  if (index >= 0) {
    data.notifications.splice(index, 1);
  }
  userStore.readNotification(item);
}

async function currentNotifications() {
  const now = new Date();
  now.setDate(now.getDate() - 5);
  const response = await HttpClient.getNotifications(now, data.selectedRead, 100);

  const notifications = response.map((value) => {
    const userNotification = value as UserNotification;
    userNotification.date = new Date(userNotification.date);
    return userNotification;
  });

  data.notifications = notifications;
}
</script>
