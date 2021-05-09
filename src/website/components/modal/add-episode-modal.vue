<template>
  <modal error="" :show="!!medium" @finish="send()" @close="$emit('update:medium', null)">
    <template #title> Add Episodes </template>
    <template #input>
      Current Items: {{ parts.length }}
      <div class="form-inline">
        <input v-model="newPartPrefix" class="form-input" @keyup.enter="createPart" />
        <input v-model.number="newPartIndex" type="number" class="form-input" @keyup.enter="createPart" />
        <input v-model="newEpisodePrefix" class="form-input" @keyup.enter="createPart" />
        <input v-model.number="newEpisodeCount" type="number" class="form-input" @keyup.enter="createPart" />
      </div>
    </template>
    <template #finish> Submit </template>
  </modal>
</template>
<script lang="ts">
import { MediaType, SimpleMedium, Part } from "../../siteTypes";
import { defineComponent, PropType } from "vue";
import modal from "./modal.vue";
import { HttpClient } from "../../Httpclient";
import { AddPart, SimpleEpisode } from "../../../server/bin/types";

export default defineComponent({
  name: "AddEpisodeModal",
  components: { modal },
  props: {
    medium: { type: Object as PropType<SimpleMedium>, required: false, default: null },
  },
  emits: ["update:medium"],
  data() {
    return {
      parts: [] as AddPart[],
      currentParts: [] as Part[],
      newPartPrefix: "",
      newPartIndex: 1,
      newEpisodePrefix: "",
      newEpisodeCount: 1,
    };
  },
  watch: {
    medium(newValue?: SimpleMedium): void {
      if (!newValue) {
        return;
      }
      if (newValue.id) {
        HttpClient.getMediumParts(newValue.id).then((parts) => {
          this.currentParts = parts;
        });
      }

      switch (newValue.medium) {
        case MediaType.TEXT:
          this.newPartPrefix = "Volume";
          this.newEpisodePrefix = "Chapter";
          break;
        case MediaType.AUDIO:
          this.newPartPrefix = "Volume";
          this.newEpisodePrefix = "";
          break;
        case MediaType.VIDEO:
          this.newPartPrefix = "Season";
          this.newEpisodePrefix = "Episode";
          break;
        case MediaType.IMAGE:
          this.newPartPrefix = "Volume";
          this.newEpisodePrefix = "Chapter";
          break;
        default:
          this.newPartPrefix = "";
          this.newEpisodePrefix = "";
      }
      this.newPartIndex = 1;
      this.newEpisodeCount = 1;
    },
  },
  methods: {
    createPart() {
      const medium = this.medium;
      if (!medium) {
        return;
      }
      const partIndex = this.newPartIndex;

      const part: Part | undefined = this.currentParts.reduce((firstPart?: Part, secondPart?: Part):
        | Part
        | undefined => {
        if (!firstPart) {
          return secondPart;
        }
        if (!secondPart) {
          return firstPart;
        }
        const firstDiff = firstPart.totalIndex - partIndex;
        const secondDiff = secondPart.totalIndex - partIndex;

        if (firstDiff < 0 && secondDiff < 0) {
          return;
        } else if (firstDiff < 0) {
          return secondPart;
        } else if (secondDiff < 0) {
          return firstPart;
        } else {
          return firstDiff > secondDiff ? firstPart : secondPart;
        }
      }, undefined);

      const indexOffset =
        (part?.episodes.length &&
          part.episodes.reduce((first, second) => (first.totalIndex < second.totalIndex ? second : first))
            .totalIndex) ||
        0;

      this.parts.push({
        mediumId: medium.id as number,
        id: 0,
        totalIndex: this.newPartIndex,
        episodes: Array(this.newEpisodeCount)
          .fill(undefined)
          .map((_undef, index) => {
            return {
              id: 0,
              totalIndex: index + 1 + indexOffset,
              partId: 0,
              releases: [
                {
                  url: "https://localhost/",
                  releaseDate: new Date(),
                  title: this.newPartPrefix + " " + this.newPartIndex + " " + this.newEpisodePrefix + " " + (index + 1),
                  episodeId: 0,
                },
              ],
            } as SimpleEpisode;
          }),
        title: this.newPartPrefix + " " + this.newPartIndex,
      });
    },
    async send() {
      const mediumId = this.medium.id;
      if (!mediumId) {
        return;
      }
      await Promise.allSettled(
        this.parts.map((part) => {
          return HttpClient.createPart(part, mediumId);
        }),
      );
    },
  },
});
</script>
