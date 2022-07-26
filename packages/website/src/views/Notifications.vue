<template>
  <div class="container">
    <toolbar>
      <template #start>
        <p-button label="Read all" class="btn btn-primary me-2" @click="$store.commit('readAllNotifications')" />
        <select-button v-model="selectedRead" :options="readOptions" option-label="name" option-value="value" />
      </template>
    </toolbar>
    <div v-for="item in notifications" :key="item.id" class="card mt-1">
      <div class="card-header">{{ item.title }}</div>
      <div class="card-body">
        <h6 class="card-subtitle mb-2 text-muted">{{ item.date.toLocaleString() }}</h6>
        <p class="card-text">
          {{ item.content }}
        </p>
        <a v-if="!item.read" href="#" class="btn btn-primary" @click="$store.commit('readNotification', item)">Read</a>
      </div>
    </div>
    <div v-if="!notifications.length" class="text-center mt-1">No Notifications available</div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

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
    };
  },
  computed: {
    notifications() {
      if (this.selectedRead) {
        return this.$store.state.user.notifications.filter((value) => value.read);
      } else {
        return this.$store.getters.unreadNotifications;
      }
    },
  },
});
</script>
