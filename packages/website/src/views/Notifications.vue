<template>
  <div class="container">
    <toolbar>
      <template #start>
        <p-button
          v-if="shouldRequestPermission"
          label="Permit Notifications"
          class="btn btn-primary me-2"
          @click="requestPermission"
        />
        <p-button label="Read all" class="btn btn-primary me-2" @click="userStore.readAllNotifications()" />
        <select-button v-model="selectedRead" :options="readOptions" option-label="name" option-value="value" />
      </template>
    </toolbar>
    <!-- TODO: use paginator -->
    <p-paginator :rows="100" :total-records="totalItemsCount" :rows-per-page-options="[100, 200, 300]"></p-paginator>
    <div v-for="item in notifications" :key="item.id" class="card mt-1">
      <div class="card-header">{{ item.title }}</div>
      <div class="card-body">
        <h6 class="card-subtitle mb-2 text-muted">{{ item.date.toLocaleString() }}</h6>
        <p class="card-text">
          {{ item.content }}
        </p>
        <a v-if="!item.read" href="#" class="btn btn-primary" @click="readNotification(item)">Read</a>
      </div>
    </div>
    <div v-if="!notifications.length" class="text-center mt-1">No Notifications available</div>
  </div>
</template>
<script lang="ts">
import { UserNotification } from "enterprise-core/dist/types";
import { mapStores } from "pinia";
import { defineComponent } from "vue";
import { HttpClient } from "../Httpclient";
import { requestPermission, shouldRequestPermission } from "../notifications";
import { useUserStore } from "../store/store";

export default defineComponent({
  name: "Notifications",
  data() {
    return {
      selectedRead: false,
      readOptions: [
        {
          name: "Read",
          value: true,
        },
        {
          name: "Unread",
          value: false,
        },
      ],
      shouldRequestPermission: shouldRequestPermission(),
      notifications: [] as UserNotification[],
    };
  },
  computed: {
    ...mapStores(useUserStore),
    totalItemsCount() {
      if (this.selectedRead) {
        return 0;
      } else {
        // @ts-expect-error
        return this.userStore.user.unreadNotificationsCount;
      }
    },
  },
  watch: {
    selectedRead() {
      this.currentNofitications();
    },
  },
  created() {
    this.currentNofitications();
  },
  methods: {
    requestPermission() {
      requestPermission()
        .catch(console.error)
        .finally(() => (this.shouldRequestPermission = shouldRequestPermission()));
    },
    readNotification(item: UserNotification) {
      const index = this.notifications.indexOf(item);

      if (index >= 0) {
        this.notifications.splice(index, 1);
      }
      this.userStore.readNotification(item);
    },
    async currentNofitications() {
      const now = new Date();
      now.setDate(now.getDate() - 5);
      const data = await HttpClient.getNotifications(now, this.selectedRead, 100);

      const notifications = data.map((value) => {
        const userNotification = value as UserNotification;
        userNotification.date = new Date(userNotification.date);
        return userNotification;
      });

      this.notifications = notifications;
    },
  },
});
</script>
