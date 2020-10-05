<template>
  <div>
    <app-header
      :logged-in="loggedIn"
      :name="name"
      :show-lists="showLists"
      :show-releases="showReleases"
      :show-settings="showSettings"
    />
    <main>
      <router-view
        :lists="allLists"
        :news="news"
        :columns="columns"
        :media="displayMedia"
        :external-user="externalUser"
      />
    </main>
  </div>
</template>

<script lang="ts">
import appHeader from "./components/app-header.vue";
import {emitBusEvent, onBusEvent} from "./bus";
import {HttpClient} from "./Httpclient";
import { defineComponent, PropType } from "vue";
import { List, News, Column, Medium, ExternalUser } from "./siteTypes";

let loadingMedia: number[] = [];


export default defineComponent({
    components: {
        appHeader
    },
    props: {
        name: { type: String, required: true },
        lists: { type: Array as PropType<List[]>, required: true },
        news: { type: Array as PropType<News[]>, required: true },
        columns: { type: Array as PropType<Column[]>, required: true },
        media: { type: Array as PropType<Medium[]>, required: true },
        externalUser: { type: Array as PropType<ExternalUser[]>, required: true }
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

    computed: {
        loggedIn(): boolean {
            return !!this.name;
        },

        allLists(): any[] {
            const externalLists = this.externalUser.flatMap((value) => value.lists);
            return [...this.lists, ...externalLists];
        },

        displayMedia(): any[] {
            const multiKeys: number[] = this.allLists.filter((value) => value.show).flatMap((value) => value.items);

            let uniqueMedia: number[] = [...new Set(multiKeys)];
            let missingMedia: number[] = [];

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
                    .catch((error) => (this.errorModal.error = String(error)) && console.log(error));
            }
            return uniqueMedia;
        }
    },

    mounted(): void {
        console.log(this.$data);
        console.log(this);
        onBusEvent("select:list", (id, external, multi) => this.selectList(id, external, multi));
    },

    methods: {
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
