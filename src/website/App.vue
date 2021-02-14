<template>
  <div>
    <app-header />
    <main>
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import appHeader from "./components/app-header.vue";
import { emitBusEvent, onBusEvent } from "./bus";
import { HttpClient } from "./Httpclient";
import { defineComponent } from "vue";
import { optimizedResize } from "./init";
import { List } from "siteTypes";

export default defineComponent({
    components: {
        appHeader
    },
    computed: {
        loggedIn(): boolean {
            return this.$store.getters.loggedIn;
        }
    },
    watch: {
        loggedIn(newValue) {
            console.log("loggedin changed: ", newValue);

            if (!newValue) {
                this.loginState();
            }
        },
    },
    mounted() {
        onBusEvent("refresh:externalUser", (data: string) =>  this.refreshExternalUser(data));

        onBusEvent("reset:modal", () => this.closeModal());

        optimizedResize.add(() => emitBusEvent("window:resize"));

        onBusEvent("select:list", (id, external, multi) => this.selectList(id, external, multi));
    },

    async created() {
        await this.loginState();
    },

    methods: {
        closeModal() {
            this.$store.commit("resetModal", "login");
            this.$store.commit("resetModal", "register");
            this.$store.commit("resetModal", "addList");
            this.$store.commit("resetModal", "addMedium");
            this.$store.commit("resetModal", "error");
            this.$store.commit("resetModal", "settings");
        },

        async loginState() {
            if (this.loggedIn) {
                return;
            }
            try {
                const newUser = await HttpClient.isLoggedIn();
                console.log(`Logged In: ${this.loggedIn} New User: `, newUser);

                if (!this.loggedIn && newUser) {
                    await this.$store.dispatch("changeUser", { user: newUser, modal: "login" });
                } else {
                    throw Error();
                }
            } catch (error) {
                setTimeout(() => this.loginState(), 5000);
            }
        },

        refreshExternalUser(uuid: string) {
            if (!uuid) {
                console.error("cannot refresh externalUser without data");
                return;
            }
        },

        selectList(id: number, external: boolean, multiSelect: boolean): void {
            if (multiSelect) {
                const list = this.$store.getters.allLists.find((value: List) => value.id === id && value.external === external);
                list.show = !list.show;
            } else {
                for (const list of this.$store.getters.allLists) {
                    list.show = list.id === id && list.external === external && !list.show;
                }
            }
        },
    },
});
</script>
