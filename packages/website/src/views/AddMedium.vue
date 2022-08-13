<template>
  <div class="container add-medium">
    <h1>Add Medium</h1>
    <form class="row mb-2">
      <label class="col-sm">
        Load from Toc Link:
        <input-text
          v-model="data.toc"
          class="form-control ms-1"
          name="toc"
          title="ToC Link"
          type="url"
          placeholder="URL of the ToC"
        />
      </label>
      <p-button label="Load" class="col-sm-2 mt-auto" :loading="data.isLoading" type="button" @click.left="loadToc()" />
    </form>
    <form class="row mb-2">
      <div class="row mx-1 py-1">
        <div class="row col-md pe-3">
          <label> Title </label>
          <input
            v-model="data.medium.title"
            class="form-control"
            name="title"
            required
            title="Title"
            type="text"
            placeholder="Title of the Medium"
          />
        </div>
        <div class="row col-md">
          <label>Medium</label>
          <dropdown
            v-model="selectedMediumOption"
            :options="mediumOptions"
            option-label="name"
            placeholder="Select a Medium Type"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value">
                <type-icon :type="slotProps.value.value" class="pe-1" />
                <span>{{ slotProps.value.name }}</span>
              </div>
              <span v-else>
                {{ slotProps.placeholder }}
              </span>
            </template>
            <template #option="slotProps">
              <div>
                <type-icon :type="slotProps.option.value" class="pe-1" />
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </dropdown>
        </div>
      </div>
      <div class="row mx-1 py-1">
        <div class="row col-md pe-3">
          <label> Author </label>
          <input
            v-model="data.medium.author"
            name="author"
            class="form-control"
            title="Author"
            type="text"
            placeholder="One or multiple Authors of the Medium"
          />
        </div>
        <div class="row col-md">
          <label>Artist</label>
          <input
            v-model="data.medium.artist"
            class="form-control"
            name="artist"
            title="Artist"
            type="text"
            placeholder="One or multiple Artists of the Medium"
          />
        </div>
      </div>
      <div class="row mx-1 py-1">
        <div class="row col-md pe-3">
          <label>Series</label>
          <input
            v-model="data.medium.series"
            class="form-control"
            name="series"
            title="Series"
            type="text"
            placeholder="Series of the Medium"
          />
        </div>
        <div class="row col-md">
          <label>Universe</label>
          <input
            v-model="data.medium.universe"
            class="form-control"
            name="universe"
            title="Universe"
            type="text"
            placeholder="Universe of the Medium"
          />
        </div>
      </div>
      <div class="row col-md mx-1 pe-1">
        <label>Language</label>
        <input
          v-model="data.medium.lang"
          class="form-control"
          name="language"
          title="Language"
          type="text"
          placeholder="Translated Language"
        />
      </div>
      <div class="row mx-1 py-1">
        <div class="row col-md pe-3">
          <label>Country Of Origin</label>
          <input
            v-model="data.medium.countryOfOrigin"
            class="form-control"
            name="countryOfOrigin"
            title="Country Of Origin"
            type="text"
            placeholder="Country of Origin"
          />
        </div>
        <div class="row col-md">
          <label>Language Of Origin</label>
          <input
            v-model="data.medium.languageOfOrigin"
            class="form-control"
            name="langOfOrigin"
            title="Language Of Origin"
            type="text"
            placeholder="Original Language"
          />
        </div>
      </div>
      <div class="row mx-1 py-1">
        <div class="row col-md pe-3">
          <label>Status of Translator</label>
          <dropdown v-model="data.medium.stateTL" :options="stateOptions" placeholder="Status of the Translation">
            <template #value="slotProps">
              <release-state
                v-if="slotProps.value != null"
                :state="slotProps.value"
                class="ms-1"
                name="stateTl"
                title="Status of Translator"
                placeholder="Status of the Translation"
              />
              <span v-else>
                {{ slotProps.placeholder }}
              </span>
            </template>
            <template #option="slotProps">
              <release-state
                :state="slotProps.option"
                class="ms-1"
                name="stateTl"
                title="Status of Translator"
                placeholder="Status of the Translation"
              />
            </template>
          </dropdown>
        </div>
        <div class="row col-md">
          <label>Status in COO</label>
          <dropdown v-model="data.medium.stateOrigin" :options="stateOptions" placeholder="Status in COO">
            <template #value="slotProps">
              <release-state
                v-if="slotProps.value != null"
                :state="slotProps.value"
                class="ms-1"
                name="stateCOO"
                title="Status in COO"
                placeholder="Publishing Status of the Medium"
              />
              <span v-else>
                {{ slotProps.placeholder }}
              </span>
            </template>
            <template #option="slotProps">
              <release-state
                :state="slotProps.option"
                class="ms-1"
                name="stateCOO"
                title="Status in COO"
                placeholder="Publishing Status of the Medium"
              />
            </template>
          </dropdown>
        </div>
      </div>
      <div class="row mx-1 py-1">
        <select class="form-control col-md" title="Select list to add medium to:">
          <option disabled selected value="">Select list to add medium to</option>
          <option v-for="list in listStore.lists" :key="list.id" :value="list.id">
            {{ list.name }}
          </option>
        </select>
      </div>
      <p-button label="Add Medium" class="mx-1 px-1" :loading="data.creating" type="button" @click="send()" />
    </form>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive } from "vue";
import { AddMedium, MediaType, Medium, ReleaseState as ReleaseStateType } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import TypeIcon from "../components/type-icon.vue";
import ReleaseState from "../components/release-state.vue";
import { useListStore } from "../store/lists";
import { useToast } from "primevue/usetoast";
import { useMediaStore } from "../store/media";

interface Data {
  medium: AddMedium;
  toc: string;
  isLoading: boolean;
  creating: boolean;
}

interface MediumOption {
  name: string;
  value: MediaType;
}

// STORES
const listStore = useListStore();

// DATA
const mediumOptions: MediumOption[] = [
  { name: "Text", value: MediaType.TEXT },
  { name: "Image", value: MediaType.IMAGE },
  { name: "Video", value: MediaType.VIDEO },
  { name: "Audio", value: MediaType.AUDIO },
];
const stateOptions = [
  ReleaseStateType.Unknown,
  ReleaseStateType.Ongoing,
  ReleaseStateType.Hiatus,
  ReleaseStateType.Complete,
  ReleaseStateType.Discontinued,
  ReleaseStateType.Dropped,
];
const data = reactive<Data>({
  medium: {
    title: "",
    medium: 0,
    author: "",
    artist: "",
    series: "",
    universe: "",
    lang: "",
    countryOfOrigin: "",
    languageOfOrigin: "",
    stateTL: ReleaseStateType.Unknown,
    stateOrigin: ReleaseStateType.Unknown,
  },
  toc: "",
  isLoading: false,
  creating: false,
});

// COMPUTED
const selectedMediumOption = computed({
  get(): MediumOption | undefined {
    return mediumOptions.find((item) => item.value === data.medium.medium);
  },
  set(value: MediumOption | undefined) {
    data.medium.medium = value?.value || 0;
  },
});

// FUNCTIONS
const toast = useToast();

function send(): void {
  const result: AddMedium = { ...data.medium };
  if (!result.medium || !result.title) {
    toast.add({
      summary: "Invalid",
      detail: "Invalid Medium, either title or medium type missing",
      life: 3000,
      severity: "warn",
    });
    return;
  }
  if (data.creating) {
    return;
  }
  data.creating = true;

  HttpClient.createMedium(result)
    .then((medium) => {
      useMediaStore().addMediumLocal(medium as Medium);

      if (data.toc) {
        return HttpClient.addToc(data.toc, medium.id).catch((error) => {
          toast.add({
            summary: "Failed in creating ToC",
            detail: error + "",
            closable: true,
            severity: "error",
          });
          return true;
        });
      } else {
        return true;
      }
    })
    .then((success) => {
      if (success) {
        toast.add({
          summary: "Successfully created Medium",
          severity: "success",
          life: 3000,
        });
      } else {
        // should never happen, success is always true if there is no error
        toast.add({
          summary: "Failed in creating Medium",
          detail: "Unknown Error",
          closable: true,
          severity: "error",
        });
      }
    })
    .catch((error) => {
      toast.add({
        summary: "Failed in creating Medium",
        detail: error + "",
        closable: true,
        severity: "error",
      });
    })
    .finally(() => (data.creating = false));
}
function loadToc(): void {
  if (data.isLoading) {
    return;
  }
  data.isLoading = true;
  HttpClient.getToc(data.toc)
    .then((value) => {
      // look only at first value for now
      const toc = value[0];

      if (toc) {
        data.medium.stateOrigin = toc.statusCOO || 0;
        data.medium.stateTL = toc.statusTl || 0;
        data.medium.medium = toc.mediumType;
        data.medium.title = toc.title;
        data.medium.lang = toc.langTL || "";
        data.medium.series = "";
        data.medium.universe = "";
        data.medium.languageOfOrigin = toc.langCOO || "";
        data.medium.author = toc.authors ? toc.authors.map((item) => item.name).join(", ") : "";
        data.medium.artist = toc.artists ? toc.artists.map((item) => item.name).join(", ") : "";
      } else {
        toast.add({
          severity: "error",
          summary: "Could not find any Toc",
          closable: true,
          life: 3000,
        });
      }
    })
    .catch((error) => {
      toast.add({
        summary: "Failed to load the ToC",
        detail: error + "",
        closable: true,
        severity: "error",
      });
    })
    .finally(() => (data.isLoading = false));
}
</script>
<style scoped>
@media (min-width: 576px) {
  .add-medium {
    max-width: 560px;
  }
}
</style>
