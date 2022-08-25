<template>
  <p-dialog v-model:visible="visible" header="Add Episodes" @hide="$emit('update:medium', null)">
    <div class="row">
      Current Items: {{ data.parts.length }}
      <p-button label="Next" @click="createPart" />
    </div>
    <div class="row">
      <input-text v-model="data.newPartPrefix" class="form-input col-3" @keyup.enter="createPart" />
      <input-number
        v-model.number="data.newPartIndex"
        type="number"
        class="form-input col-3"
        @keyup.enter="createPart"
      />
    </div>
    <div class="row">
      <input-text v-model="data.newEpisodePrefix" class="form-input col-3" @keyup.enter="createPart" />
      <input-number
        v-model.number="data.newEpisodeCount"
        type="number"
        class="form-input col-3"
        @keyup.enter="createPart"
      />
    </div>
    <ul class="list-group">
      <li v-for="part in data.parts" :key="part.title" class="list-group-item">
        {{ part.title }}: {{ part.episodes.length }} Items
      </li>
    </ul>
    <template #footer>
      <p-button label="Close" icon="pi pi-times" class="p-button-text" @click="$emit('update:medium', null)" />
      <p-button label="Add" icon="pi pi-check" autofocus @click="send()" />
    </template>
  </p-dialog>
</template>
<script lang="ts" setup>
import { MediaType, SimpleMedium, Part } from "../../siteTypes";
import { computed, reactive, toRef, watch } from "vue";
import { HttpClient } from "../../Httpclient";
import { AddPart, SimpleEpisode } from "enterprise-core/dist/types";
import { useToast } from "primevue/usetoast";

const props = defineProps<{ medium?: SimpleMedium }>();
const emits = defineEmits(["update:medium"]);
const data = reactive({
  parts: [] as AddPart[],
  currentParts: [] as Part[],
  newPartPrefix: "",
  newPartIndex: 1,
  newEpisodePrefix: "",
  newEpisodeCount: 1,
});

const visible = computed({
  get() {
    return !!props.medium;
  },
  set(visible: boolean) {
    if (!visible) {
      emits("update:medium", null);
    }
  },
});

watch(toRef(props, "medium"), (newValue) => {
  if (!newValue) {
    return;
  }
  if (newValue.id) {
    HttpClient.getMediumParts(newValue.id).then((parts) => {
      data.currentParts = parts;
    });
  }

  switch (newValue.medium) {
    case MediaType.IMAGE:
    case MediaType.TEXT:
      data.newPartPrefix = "Volume";
      data.newEpisodePrefix = "Chapter";
      break;
    case MediaType.AUDIO:
      data.newPartPrefix = "Volume";
      data.newEpisodePrefix = "";
      break;
    case MediaType.VIDEO:
      data.newPartPrefix = "Season";
      data.newEpisodePrefix = "Episode";
      break;
    default:
      data.newPartPrefix = "";
      data.newEpisodePrefix = "";
  }
  data.newPartIndex = 1;
  data.newEpisodeCount = 1;
});

function createPart() {
  const medium = props.medium;

  if (!medium) {
    return;
  }
  const partIndex = data.newPartIndex;

  const part: Part | undefined = data.currentParts.reduce((firstPart?: Part, secondPart?: Part): Part | undefined => {
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
  }, undefined);

  const indexOffset =
    (part?.episodes.length &&
      part.episodes.reduce((first, second) => (first.totalIndex < second.totalIndex ? second : first)).totalIndex) ||
    0;

  data.parts.push({
    mediumId: medium.id,
    id: 0,
    totalIndex: data.newPartIndex,
    episodes: Array(data.newEpisodeCount)
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
              title: data.newPartPrefix + " " + data.newPartIndex + " " + data.newEpisodePrefix + " " + (index + 1),
              episodeId: 0,
            },
          ],
        };
      }),
    title: data.newPartPrefix + " " + data.newPartIndex,
  });
}
async function send() {
  const mediumId = props.medium?.id;

  if (!mediumId) {
    return;
  }
  const alreadyAddedPart = data.parts.find((item) => item.totalIndex === data.newPartIndex);

  if (!alreadyAddedPart) {
    createPart();
  }

  const result = await Promise.allSettled(
    data.parts.map((part) => {
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
  emits("update:medium", null);
  useToast().add({
    summary: "Created Parts",
    detail: `Created ${result.length - failed} and failed ${failed}`,
    life: 3000,
  });
}
</script>
