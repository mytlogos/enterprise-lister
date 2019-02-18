<template>
    <div>
        <app-header v-bind:logged-in="loggedIn"
                    v-bind:name="name"
                    v-bind:show-lists="showLists"
                    v-bind:show-releases="showReleases"
                    v-bind:show-settings="showSettings"></app-header>
        <main>
            <router-view :lists="lists"
                         :news="news"
                         :columns="columns"
                         :media="media"
                         :externalUser="externalUser"></router-view>
        </main>
    </div>
</template>

<script>
    import appHeader from "./components/app-header";
    import {onBusEvent} from "./bus";
    import {HttpClient} from "./Httpclient";
    import addListModal from "./components/modal/add-list-modal";
    import addMediumModal from "./components/modal/add-list-modal";
    import loginModal from "./components/modal/add-list-modal";
    import registerModal from "./components/modal/add-list-modal";

    export default {
        components: {
            appHeader,
            addListModal,
            addMediumModal,
            loginModal,
            registerModal,
        },
        data() {
            return {
                addListModal: {
                    show: false,
                    error: "",
                },
                addMediumModal: {
                    show: false,
                    error: "",
                },
                loginModal: {
                    show: false,
                    error: "",
                },
                registerModal: {
                    show: false,
                    error: "",
                },
                settingsModal: {
                    show: false,
                    error: "",
                },
                errorModal: {
                    error: "",
                },
                showLists: true,
                showSettings: false,
                showReleases: false,
                settings: {},
            };
        },

        props: {
            name: String,
            lists: Array,
            news: Array,
            columns: Array,
            media: Array,
            externalUser: Array,
        },

        mounted() {
            console.log(this.$data);
            console.log(this);
            onBusEvent("select:list", (id, external, multi) => this.selectList(id, external, multi));
        },

        methods: {
            selectList(id, external, multiSelect) {
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

        computed: {
            loggedIn() {
                return !!this.name;
            },

            allLists() {
                const externalLists = this.externalUser.flatMap((value) => value.lists);
                return [...this.lists, ...externalLists];
            },

            displayMedia() {
                const multiKeys = this.allLists.filter((value) => value.show).flatMap((value) => value.items);

                let uniqueMedia = [...new Set(multiKeys)];
                let missingMedia = [];

                uniqueMedia = uniqueMedia
                    .map((id) => {
                        const medium = this.media.find((value) => value.id === id);
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
                    HttpClient.getMedia(missingMedia)
                        .then((media) => {
                            if (Array.isArray(media)) {
                                user.addMedium(...media);
                            } else {
                                user.addMedium(media);
                            }
                            // filter out the now loaded media
                            loadingMedia = loadingMedia.filter((value) => {
                                return Array.isArray(media) ?
                                    !media.some((medium) => medium.id === value) :
                                    media.id !== value;
                            });
                        })
                        .catch((error) => (this.errorModal.error = String(error)) && console.log(error));
                }
                return uniqueMedia;
            }
        },
    };
</script>
