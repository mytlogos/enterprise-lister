<template>
  <Menubar :model="menuItems" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";
import "bootstrap/js/dist/collapse";
import Menubar from "primevue/menubar";
import { MenuItem as OriginalMenuItem } from "primevue/menuitem";

type MenuItem = Omit<OriginalMenuItem, "to"> & { to?: string | undefined | { name: string } };

export default defineComponent({
  name: "AppHeader",
  components: { Menubar },
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
        items.push({
          label: "Add Medium",
          to: { name: "addMedium" },
        });
        items.push({
          label: "Add List",
          to: { name: "addList" },
        });
        items.push({
          label: "News",
          to: { name: "news" },
        });
        items.push({
          label: "Read History",
          to: { name: "readHistory" },
        });
        items.push({
          label: "Lists",
          to: { name: "lists" },
        });
        items.push({
          label: "Releases",
          to: { name: "releases" },
        });
        items.push({
          label: "Media",
          to: { name: "media" },
        });
        items.push({
          label: "Unused Media",
          to: { name: "media-in-wait" },
        });
        items.push({
          label: "Search",
          to: { name: "search" },
        });
        items.push({
          label: "Administration",
          to: { name: "status" },
        });
        items.push({
          label: "Settings",
          to: { name: "settings" },
        });
        items.push({
          label: this.name,
          icon: "pi pi-fw pi-user",
        });
        items.push({
          label: "Logout",
          to: { name: "home" },
          command: () => this.logout(),
          icon: "pi pi-fw pi-power-off",
        });
      } else {
        items.push({
          label: "Register",
          to: { name: "register" },
        });
        items.push({
          label: "Login",
          to: { name: "login" },
        });
      }
      return items;
    },
  },
  methods: {
    logout(): void {
      this.$store.dispatch("logout");
    },
  },
});
</script>
