import { AddMedium, List, MediaStore, Medium, SecondaryMedium, SimpleMedium, StringKey, VuexStore } from "../siteTypes";
import { Module, useStore } from "vuex";
import { HttpClient } from "../Httpclient";
import { mergeMediaTocProp } from "../init";

const module: Module<MediaStore, VuexStore> = {
  state: () => ({
    media: {},
    secondaryMedia: {},
    episodesOnly: false,
  }),
  getters: {
    getMedium(state) {
      return (id: number): SimpleMedium => state.media[id];
    },
    getMergedProp(state) {
      return <T extends StringKey<SimpleMedium>>(medium: Medium, prop: T): SimpleMedium[T] => {
        if (!medium.id) {
          throw Error("missing id on medium");
        }
        const secondMedium = state.secondaryMedia[medium.id];
        return mergeMediaTocProp(medium, secondMedium?.tocs || [], prop);
      };
    },
    media(state): SimpleMedium[] {
      return Object.values(state.media);
    },
  },
  mutations: {
    userMedia(state, media: Record<number, SimpleMedium>) {
      state.media = media;
    },
    userSecondaryMedia(state, media: Record<number, SecondaryMedium>) {
      state.secondaryMedia = media;
    },
    addMedium(state, medium: Medium | Medium[]) {
      if (Array.isArray(medium)) {
        medium.forEach((item) => {
          if (!item.id) {
            throw Error("missing id on medium");
          }
          state.media[item.id] = item;
        });
      } else {
        if (!medium.id) {
          throw Error("missing id on medium");
        }
        state.media[medium.id] = medium;
      }
    },
    deleteMedium(state, id: number) {
      if (!(id in state.media)) {
        throw Error("invalid mediumId");
      }

      delete state.media[id];

      useStore().state.lists.forEach((value: List) => {
        const listIndex = value.items.findIndex((itemId: number) => itemId === id);

        if (listIndex >= 0) {
          value.items.splice(listIndex, 1);
        }
      });
    },
    episodesOnly(state, value: boolean) {
      state.episodesOnly = value;
    },
  },
  actions: {
    async loadMedia({ commit }) {
      try {
        const [data, secondaryData] = await Promise.all([HttpClient.getAllMedia(), HttpClient.getAllSecondaryMedia()]);
        const media: Record<number, SimpleMedium> = {};

        for (const datum of data) {
          if (datum.id) {
            media[datum.id] = datum;
          }
        }

        const secondaryMedia: Record<number, SecondaryMedium> = {};

        for (const datum of secondaryData) {
          if (datum.id) {
            secondaryMedia[datum.id] = datum;
          }
        }

        commit("userMedia", media);
        commit("userSecondaryMedia", secondaryMedia);
      } catch (error) {
        console.error(error);
      }
    },
    addMedium({ commit }, data: AddMedium) {
      if (!data.title) {
        commit("addMediumModalError", "Missing title");
      } else if (!data.medium) {
        commit("addMediumModalError", "Missing type");
      } else {
        HttpClient.createMedium(data)
          .then((medium) => {
            commit("addMedium", medium);
            commit("resetModal", "addMedium");
          })
          .catch((error) => commit("addMediumModalError", String(error)));
      }
      // TODO implement addMedium
    },

    editMedium({ commit }, data: { id: number; prop: string }) {
      if (data.id == null || !data.prop) {
        // TODO handle this better
        throw Error();
      } else {
        // HttpClient.updateMedium(data).catch(console.log);
      }
      // TODO implement editMedium
    },

    deleteMedium({ commit }, id: number) {
      if (id == null) {
        // TODO handle this better
        throw Error();
      } else {
        HttpClient.deleteMedium(id)
          .then(() => commit("deleteMedium", id))
          .catch((error) => console.log(error));
      }
      // TODO implement deleteMedium
    },
  },
};
export default module;
