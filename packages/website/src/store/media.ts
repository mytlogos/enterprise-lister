import { AddMedium, Medium, SecondaryMedium, SimpleMedium, StringKey } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import { mergeMediaTocProp } from "../init";
import { defineStore } from "pinia";
import { useListStore } from "./lists";

export interface MediaStore {
  media: Record<number, Medium>;
  secondaryMedia: Record<number, SecondaryMedium>;
  episodesOnly: boolean;
}

export const useMediaStore = defineStore("media", {
  persist: true,
  state: (): MediaStore => ({
    media: {},
    secondaryMedia: {},
    episodesOnly: false,
  }),
  getters: {
    getMergedProp() {
      return <T extends StringKey<SimpleMedium>>(medium: Medium, prop: T): SimpleMedium[T] => {
        if (!medium.id) {
          throw Error("missing id on medium");
        }
        const secondMedium = this.secondaryMedia[medium.id];
        return mergeMediaTocProp(medium, secondMedium?.tocs || [], prop);
      };
    },
    mediaList(): Medium[] {
      return Object.values(this.media);
    },
  },
  actions: {
    updateMediumLocal(medium: SimpleMedium) {
      if (!medium.id) {
        throw Error("missing id on medium");
      }
      Object.assign(this.media[medium.id], medium);
    },

    deleteMediumLocal(id: number) {
      if (!(id in this.media)) {
        throw Error("invalid mediumId");
      }

      delete this.media[id];

      useListStore().lists.forEach((value: { items: number[] }) => {
        const listIndex = value.items.findIndex((itemId: number) => itemId === id);

        if (listIndex >= 0) {
          value.items.splice(listIndex, 1);
        }
      });
    },

    deleteTocLocal(data: { mediumId: number; link: string }) {
      const medium = this.secondaryMedia[data.mediumId];
      if (!medium) {
        throw Error("invalid mediumId");
      }
      medium.tocs = medium.tocs.filter((toc) => toc.link !== data.link);
    },

    async loadMedia() {
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

        // @ts-expect-error
        this.media = media;
        this.secondaryMedia = secondaryMedia;
      } catch (error) {
        console.error(error);
      }
    },

    async addMedium(data: AddMedium) {
      if (!data.title) {
        throw Error("Missing title");
      } else if (!data.medium) {
        throw Error("Missing Type");
      } else {
        const medium = await HttpClient.createMedium(data);
        if (!medium.id) {
          throw Error("missing id on medium");
        }
        this.media[medium.id] = medium as Medium;
        return medium;
      }
    },

    editMedium(data: { id: number; prop: string }) {
      if (data.id == null || !data.prop) {
        // TODO handle this better
        throw Error();
      } else {
        // HttpClient.updateMedium(data).catch(console.log);
      }
      // TODO implement editMedium
    },

    deleteMedium(id: number) {
      if (id == null) {
        // TODO handle this better
        throw Error();
      } else {
        HttpClient.deleteMedium(id)
          .then(() => this.deleteMediumLocal(id))
          .catch((error) => console.log(error));
      }
      // TODO implement deleteMedium
    },
  },
});
