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
import { Medium, AddMedium } from "./siteTypes";
import { optimizedResize } from "./init";

let loadingMedia: number[] = [];

interface AppData {
    loadingMedia: number[];
    readNews: number[];
    newReadNews: number[];
    settings: any;
}

export default defineComponent({
    components: {
        appHeader
    },
    data(): AppData {
        return {
            settings: {},
            loadingMedia: [],
            readNews: [],
            newReadNews: [],
        };
    },

    computed: {
        loggedIn(): boolean {
            return this.$store.getters.loggedIn;
        },

        displayMedia(): any[] {
            const multiKeys: number[] = this.allLists.filter((value) => value.show).flatMap((value) => value.items);

            let uniqueMedia: number[] = [...new Set(multiKeys)];
            let missingMedia: number[] = [];

            uniqueMedia = uniqueMedia
                .map((id) => {
                    const medium = this.$store.state.user.media.find((value) => value.id === id);
                    if (!medium) {
                        missingMedia.push(id);
                    }
                    return medium;
                })
                .filter((value) => value != null);

            // filter any missing media which are already being queried
            missingMedia = missingMedia.filter((value) => !loadingMedia.some((id) => id === value));

            if (missingMedia.length) {
                loadingMedia.push(...missingMedia);

                // load missing media
                // eslint-disable-next-line vue/no-async-in-computed-properties
                HttpClient.getMedia(missingMedia)
                    .then((media: Medium | Medium[]) => {
                        emitBusEvent("append:media", media);

                        // filter out the now loaded media
                        loadingMedia = loadingMedia.filter((value) => {
                            return Array.isArray(media) ?
                                !media.some((medium) => medium.id === value) :
                                media.id !== value;
                        });
                    })
                    .catch((error) => this.$store.commit("errorModalError", String(error)) && console.log(error));
            }
            return uniqueMedia;
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
        onBusEvent("open:register", () => this.$store.commit("registerModalShow", true));
        onBusEvent("do:register", (data: any) => this.$store.dispatch("register", data));

        onBusEvent("open:login", () => this.$store.commit("loginModalShow", true));
        onBusEvent("do:login", (data: any) => this.$store.dispatch("login", data));
        onBusEvent("do:logout", () => this.$store.dispatch("logout"));

        onBusEvent("open:add-medium", () => this.$store.commit("addMediumModalShow", true));
        onBusEvent("open:medium", (data: any) => this.openMedium(data));
        onBusEvent("add:medium", (data: any) => this.addMedium(data));
        onBusEvent("edit:medium", (data: any) => this.editMedium(data));
        onBusEvent("delete:medium", (data: number) => this.deleteMedium(data));

        onBusEvent("open:add-list", () => this.$store.commit("addListModalShow", true));
        onBusEvent("add:list", (data: any) => this.addList(data));
        onBusEvent("delete:list", (data: number) => this.deleteList(data));

        onBusEvent("add:externalUser", (data: any) => this.$store.dispatch("addExternalUser", data));
        onBusEvent("delete:externalUser", (data: string) =>  this.$store.dispatch("deleteExternalUser", data));
        onBusEvent("refresh:externalUser", (data: string) =>  this.refreshExternalUser(data));

        onBusEvent("do:settings", (data: any) => this.changeSettings(data));

        onBusEvent("get:news", (data: any) => this.loadNews(data));
        onBusEvent("read:news", (data: number) => this.markReadNews(data));

        onBusEvent("append:media", (media: Medium | Medium[]) => {
            if (Array.isArray(media)) {
                // replace not append
                this.$store.commit("userMedia", media);
            } else {
                this.$store.commit("addMedium", media);
            }
        });

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
            console.log("loginState:", this.user);

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

        openMedium(id: number) {
            // TODO implement this
            console.log(id);
        },

        addMedium(data: AddMedium) {
            if (!data.title) {
                this.$store.commit("addMediumModalError", "Missing title");
            } else if (!data.medium) {
                this.$store.commit("addMediumModalError", "Missing type");
            } else {
                HttpClient.createMedium(data)
                    .then((medium) => {
                        this.$store.commit("addMedium", medium);
                        this.$store.commit("resetModal", "addMedium");
                    })
                    .catch(
                        (error) => this.$store.commit("addMediumModalError", String(error))
                    );
            }
            // TODO implement addMedium
        },

        editMedium(data: { id: number; prop: string }) {
            if (data.id == null || !data.prop) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.updateMedium(data).catch(console.log);
            }
            // TODO implement editMedium
        },

        deleteMedium(id: number) {
            if (id == null) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.deleteMedium(id)
                    .then(() => emitBusEvent("deletion", false))
                    .catch((error) => console.log(error));
            }
            // TODO implement deleteMedium
        },

        addList(data: { name: string; type: number }) {
            if (!data.name) {
                this.$store.commit("addListModalError", "Missing name");
            } else if (!data.type) {
                this.$store.commit("addListModalError", "Missing type");
            } else {
                HttpClient.createList(data)
                    .then((list) => {
                        this.$store.commit("addList", list);
                        this.$store.commit("resetModal", "addList");
                    })
                    .catch(
                        (error) => this.$store.commit("addListModalError", String(error))
                    );
            }
            // TODO implement addList
        },

        deleteList(id: number) {
            HttpClient.deleteList(id)
                .then(() => console.log("success"))
                .catch((error) => console.log(error));
            // TODO implement deleteList
        },

        changeSettings(data: any) {
            // TODO implement settings
        },

        markReadNews(newsId: number) {
            if (this.readNews.indexOf(newsId) < 0) {
                this.readNews.push(newsId);
                this.newReadNews.push(newsId);
            }
        },

        /**
         *
         * @param {{from: Date|undefined, to: Date|undefined}} data
         */
        loadNews(data: { from: Date | undefined; to: Date | undefined }) {
            HttpClient.getNews(data.from, data.to)
                .then((news) => this.$store.commit("userNews", news))
                .catch(console.log);
        },

        selectList(id: number, external: boolean, multiSelect: boolean): void {
            if (!this.showLists) {
                return;
            }
            if (multiSelect) {
                const list = this.allLists.find((value) => value.id === id && value.external === external);
                list.show = !list.show;
            } else {
                for (const list of this.allLists) {
                    list.show = list.id === id && list.external === external && !list.show;
                }
            }
        },
    },
});
</script>
