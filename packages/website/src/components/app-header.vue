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
        items.push(
          ...[
            {
              label: "Add Medium",
              to: { name: "addMedium" },
            },
            {
              label: "Add List",
              to: { name: "addList" },
            },
            {
              label: "News",
              to: { name: "news" },
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
              to: { name: "status" },
            },
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
          ],
        );
      } else {
        items.push(
          ...[
            {
              label: "Register",
              to: { name: "register" },
            },
            {
              label: "Login",
              to: { name: "login" },
            },
          ],
        );
      }
      return items;
    },
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
  },
});
</script>
