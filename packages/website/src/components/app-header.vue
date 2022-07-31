<template>
  <Menubar :model="menuItems">
    <template #end>
      <div class="dropdown">
        <button
          id="notifications"
          class="btn dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <em
            v-if="$store.state.user.unreadNotificationsCount"
            v-badge="$store.state.user.unreadNotificationsCount"
            class="pi pi-bell"
          ></em>
          <em v-else class="pi pi-bell"></em>
        </button>
        <ul class="dropdown-menu" aria-labelledby="notifications">
          <toolbar>
            <template #start>
              <p-button
                label="Read all"
                class="btn btn-primary me-2"
                @click="$store.dispatch('readAllNotifications')"
              />
              <router-link :to="{ name: 'notifications' }" class="btn btn-primary">View all</router-link>
            </template>
          </toolbar>
          <li v-for="item in notifications" :key="item.id" class="dropdown-item" style="max-width: 100vw">
            <div class="card">
              <div class="card-header">{{ item.title }}</div>
              <div class="card-body">
                <h6 class="card-subtitle mb-2 text-muted">{{ item.date.toLocaleString() }}</h6>
                <p class="card-text text-truncate">
                  {{ item.content }}
                </p>
                <a href="#" class="btn btn-primary" @click="$store.dispatch('readNotification', item)">Read</a>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </Menubar>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";
import "@popperjs/core/dist/umd/popper.min.js";
import "bootstrap/js/dist/dropdown";
import Menubar from "primevue/menubar";
import { MenuItem as OriginalMenuItem } from "primevue/menuitem";
import { HttpClient } from "../Httpclient";
import { UserNotification } from "enterprise-core/dist/types";
import { notify } from "../notifications";

type MenuItem = Omit<OriginalMenuItem, "to"> & { to?: string | { name: string } };

export default defineComponent({
  name: "AppHeader",
  components: { Menubar },
  data() {
    return {
      loggedInItems: [
        {
          label: "Add Medium",
          to: { name: "addMedium" },
        },
        {
          label: "Add List",
          to: { name: "addList" },
        },
        {
          label: "Read History",
          to: { name: "readHistory" },
        },
        {
          label: "Lists",
          to: { name: "lists" },
        },
        {
          label: "Releases",
          to: { name: "releases" },
        },
        {
          label: "Media",
          to: { name: "media" },
        },
        {
          label: "Unused Media",
          to: { name: "media-in-wait" },
        },
        {
          label: "Search",
          to: { name: "search" },
        },
        {
          label: "Administration",
          items: [
            {
              label: "Status",
              to: { name: "status" },
            },
            {
              label: "Jobs",
              to: { name: "jobs" },
            },
            {
              label: "Job Statistics",
              to: { name: "job-stats" },
            },
            {
              label: "Hooks",
              to: { name: "hooks" },
            },
            {
              label: "Job History",
              to: { name: "jobhistory" },
            },
            {
              label: "Live Jobs",
              to: { name: "joblive" },
            },
          ],
        },
      ],
      loggedOffItems: [
        {
          label: "Register",
          to: { name: "register" },
        },
        {
          label: "Login",
          to: { name: "login" },
        },
      ],
      notifications: [] as UserNotification[],
    };
  },
  computed: {
    ...mapState(["name"]),
    ...mapGetters(["loggedIn"]),
    menuItems() {
      const items: MenuItem[] = [
        {
          label: "Home",
          to: { name: "home" },
        },
      ];

      if (this.loggedIn) {
        items.push(
          ...this.loggedInItems,
          {
            label: this.name,
            icon: "pi pi-fw pi-user",
            to: { name: "settings" },
          },
          {
            label: "Logout",
            to: { name: "home" },
            command: () => this.logout(),
            icon: "pi pi-fw pi-power-off",
          },
        );
      } else {
        items.push(...this.loggedOffItems);
      }
      return items as OriginalMenuItem[];
    },
  },
  mounted() {
    this.checkNotifications();
  },
  methods: {
    logout(): void {
      this.$store.dispatch("logout").catch((error) => {
        this.$toast.add({
          summary: "Logout failed",
          detail: error + "",
          closable: true,
          severity: "error",
        });
      });
    },
    checkNotifications() {
      this.getLatestNotifications();
      // check every minute at most
      setInterval(() => this.getLatestNotifications(), 1000 * 60);
    },
    async getLatestNotifications() {
      await this.$store.dispatch("checkNotificationCounts");

      const now = new Date();
      now.setDate(now.getDate() - 5);
      const data = await HttpClient.getNotifications(now, false, 5);

      const notifications = data.map((value) => {
        const userNotification = value as UserNotification;
        userNotification.date = new Date(userNotification.date);
        return userNotification;
      });

      if (notifications.length) {
        const titleSuffix =
          this.$store.state.user.unreadNotificationsCount > 1
            ? ` +${this.$store.state.user.unreadNotificationsCount - 1} more`
            : "";
        notify({ title: notifications[0].title + titleSuffix, content: notifications[0].content });
      }
      this.notifications = notifications;
    },
  },
});
</script>
