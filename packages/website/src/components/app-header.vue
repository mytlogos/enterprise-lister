<template>
  <Menubar :model="menuItems">
    <template #end>
      <div class="dropdown">
        <p-button
          id="notifications"
          type="button"
          :badge="(userStore.user.unreadNotificationsCount || '') + ''"
          icon="pi pi-bell"
          class="dropdown-toggle p-button-text p-button-plain w-100 px-2"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        ></p-button>
        <ul class="dropdown-menu" aria-labelledby="notifications">
          <toolbar>
            <template #start>
              <p-button label="Read all" class="btn btn-primary me-2" @click="userStore.readAllNotifications()" />
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
                <a href="#" class="btn btn-primary" @click="userStore.readNotification(item)">Read</a>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </Menubar>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";
import "@popperjs/core/dist/umd/popper.min.js";
import "bootstrap/js/dist/dropdown";
import Menubar from "primevue/menubar";
import { MenuItem as OriginalMenuItem } from "primevue/menuitem";
import { HttpClient } from "../Httpclient";
import { UserNotification } from "enterprise-core/dist/types";
import { notify } from "../notifications";
import { useUserStore } from "../store/store";
import { useToast } from "primevue/usetoast";

type MenuItem = Omit<OriginalMenuItem, "to"> & { to?: string | { name: string } };

// STORES
const userStore = useUserStore();

// DATA
const loggedInItems = [
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
];
const loggedOffItems = [
  {
    label: "Register",
    to: { name: "register" },
  },
  {
    label: "Login",
    to: { name: "login" },
  },
];
const notifications = ref<UserNotification[]>([]);

// COMPUTED
const menuItems = computed(() => {
  const items: MenuItem[] = [
    {
      label: "Home",
      to: { name: "home" },
    },
  ];

  if (userStore.loggedIn) {
    items.push(
      ...loggedInItems,
      {
        label: userStore.name,
        icon: "pi pi-fw pi-user",
        to: { name: "settings" },
      },
      {
        label: "Logout",
        to: { name: "home" },
        command: () => logout(),
        icon: "pi pi-fw pi-power-off",
      },
    );
  } else {
    items.push(...loggedOffItems);
  }
  return reactive(items) as OriginalMenuItem[];
});

// LIFECYCLE EVENTS
onMounted(() => {
  checkNotifications();
});

// FUNCTIONS
const toast = useToast();

function logout(): void {
  userStore.logout().catch((error) => {
    toast.add({
      summary: "Logout failed",
      detail: error + "",
      closable: true,
      severity: "error",
    });
  });
}
function checkNotifications() {
  getLatestNotifications();
  // check every minute at most
  setInterval(() => getLatestNotifications(), 1000 * 60);
}

async function getLatestNotifications() {
  await userStore.checkNotificationCounts();

  const now = new Date();
  now.setDate(now.getDate() - 5);
  const data = await HttpClient.getNotifications(now, false, 5);

  const newNotifications = data.map((value) => {
    const userNotification = value as UserNotification;
    userNotification.date = new Date(userNotification.date);
    return userNotification;
  });

  if (newNotifications.length) {
    const titleSuffix =
      userStore.user.unreadNotificationsCount > 1 ? ` +${userStore.user.unreadNotificationsCount - 1} more` : "";
    notify({ title: newNotifications[0].title + titleSuffix, content: newNotifications[0].content });
  }
  notifications.value = newNotifications;
}
</script>
