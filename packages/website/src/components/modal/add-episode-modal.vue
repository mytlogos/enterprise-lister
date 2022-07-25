<template>
  <Dialog v-model:visible="visible" header="Add Episodes" @hide="$emit('update:medium', null)">
    <div class="row">
      Current Items: {{ parts.length }}
      <p-button label="Next" @click="createPart" />
    </div>
    <div class="row">
      <input-text v-model="newPartPrefix" class="form-input col-3" @keyup.enter="createPart" />
      <input-number v-model.number="newPartIndex" type="number" class="form-input col-3" @keyup.enter="createPart" />
    </div>
    <div class="row">
      <input-text v-model="newEpisodePrefix" class="form-input col-3" @keyup.enter="createPart" />
      <input-number v-model.number="newEpisodeCount" type="number" class="form-input col-3" @keyup.enter="createPart" />
    </div>
    <ul class="list-group">
      <li v-for="part in parts" :key="part.title" class="list-group-item">
        {{ part.title }}: {{ part.episodes.length }} Items
      </li>
    </ul>
    <template #footer>
      <p-button label="Close" icon="pi pi-times" class="p-button-text" @click="$emit('update:medium', null)" />
      <p-button label="Add" icon="pi pi-check" autofocus @click="send()" />
    </template>
  </Dialog>
</template>
<script lang="ts">
import { MediaType, SimpleMedium, Part } from "../../siteTypes";
import { defineComponent, PropType } from "vue";
import { HttpClient } from "../../Httpclient";
import { AddPart, SimpleEpisode } from "enterprise-core/src/types";

export default defineComponent({
  name: "AddEpisodeModal",
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
  computed: {
    visible: {
      get() {
        return !!this.medium;
      },
      set(visible: boolean) {
        if (!visible) {
          this.$emit("update:medium", null);
        }
      },
    },
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

      const part: Part | undefined = this.currentParts.reduce(
        (firstPart?: Part, secondPart?: Part): Part | undefined => {
          if (!firstPart) {
            return secondPart;
          }
          if (!secondPart) {
            return firstPart;
          }
          const firstDiff = firstPart.totalIndex - partIndex;
          const secondDiff = secondPart.totalIndex - partIndex;

          if (firstDiff < 0 && secondDiff < 0) {
            return undefined;
          } else if (firstDiff < 0) {
            return secondPart;
          } else if (secondDiff < 0) {
            return firstPart;
          } else {
            return firstDiff > secondDiff ? firstPart : secondPart;
          }
        },
        undefined,
      );

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
          .map((_undef, index): SimpleEpisode => {
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
            };
          }),
        title: this.newPartPrefix + " " + this.newPartIndex,
      });
    },
    async send() {
      const mediumId = this.medium.id;
      if (!mediumId) {
        return;
      }
      const alreadyAddedPart = this.parts.find((item) => item.totalIndex === this.newPartIndex);

      if (!alreadyAddedPart) {
        this.createPart();
      }

      const result = await Promise.allSettled(
        this.parts.map((part) => {
          return HttpClient.createPart(part, mediumId);
        }),
      );

      let failed = 0;
      result.forEach((item) => {
        if (item.status === "rejected") {
          failed++;
          console.error(item.reason);
        }
      });
      this.$emit("update:medium", null);
      this.$toast.add({
        summary: "Created Parts",
        detail: `Created ${result.length - failed} and failed ${failed}`,
        life: 3000,
      });
    },
  },
});
</script>
