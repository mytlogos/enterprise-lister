<template>
  <modal :show="!!item" error="" @finish="sendForm" @close="close">
    <template #title> Create Medium from Unused Medium </template>
    <template #input>
      <input
        v-model="data.medium.title"
        class="form-control"
        name="title"
        required
        title="Title"
        type="text"
        placeholder="Title of the Medium"
      />
      <type-icon :type="data.medium.medium" class="form-control-plaintext" />
      <div class="row">
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
      <div class="row">
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
      <div class="row">
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
      <div class="row">
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
      <div class="row">
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
      <div class="row">
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
      <div class="row">
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
      <div class="row">
        <label>Status of Translator</label>
        <release-state
          :state="data.medium.stateTL"
          class="ms-1"
          name="stateTl"
          title="Status of Translator"
          placeholder="Status of the Translation"
        />
      </div>
      <div class="row">
        <label>Status in COO</label>
        <release-state
          :state="data.medium.stateOrigin"
          class="ms-1"
          name="stateCOO"
          title="Status in COO"
          placeholder="Publishing Status of the Medium"
        />
      </div>
      <div class="row">
        <select v-model="data.selectedList" class="form-select col-2" title="Select list to add medium to">
          <option disabled selected value="">Select list to add medium to</option>
          <option v-for="list in data.lists" :key="list.id" :value="list.id">
            {{ list.name }}
          </option>
        </select>
      </div>
      <AutoComplete
        :suggestions="data.suggestions"
        field="title"
        placeholder="Add Unused Media"
        @keyup.enter="addOwnSimilar"
        @complete="fetchSuggestions"
      />
      <ul class="list-group">
        <li
          v-for="similar in mergedSimilarItems"
          :key="similar.link"
          class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
        >
          {{ similar.title }}
          <button type="button" class="btn btn-danger" aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-x"
              viewBox="0 0 16 16"
            >
              <path
                d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>
        </li>
      </ul>
    </template>
    <template #finish>Add Medium</template>
  </modal>
  <div
    id="alert-toast"
    class="toast"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    data-bs-autohide="false"
    style="position: relative; top: -10em; left: 1em"
  >
    <div class="toast-header">
      <i class="fas fa-exclamation-circle rounded me-2 text-danger" aria-hidden="true" />
      <strong class="me-auto">{{ data.toastTitle }}</strong>
      <button type="button" class="ms-2 mb-1 btn-close" data-bs-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">
      {{ data.toastMessage }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import modal from "./modal.vue";
import { computed, PropType, reactive, watchEffect } from "vue";
import { HttpClient } from "../../Httpclient";
import { AddMedium, MediumInWait } from "../../siteTypes";
import Toast from "bootstrap/js/dist/toast";
import { debounce } from "../../init";
import ReleaseState from "../release-state.vue";
import TypeIcon from "../type-icon.vue";
import { useListStore } from "../../store/lists";
import { AutoCompleteCompleteEvent } from "primevue/autocomplete";

const props = defineProps({
  item: { type: Object as PropType<MediumInWait>, default: undefined, required: false },
  similarItems: { type: Array as PropType<MediumInWait[]>, required: true },
});
const emits = defineEmits(["update:item"]);

const listStore = useListStore();
const data = reactive({
  medium: createMediumValues(),
  lists: listStore.lists,
  selectedList: 0,
  toastMessage: "",
  toastTitle: "",
  tocs: [],
  selectedOwnSimilar: null as MediumInWait | null,
  ownSimilarItems: [] as MediumInWait[],
  suggestions: [] as MediumInWait[],
});

const mergedSimilarItems = computed((): MediumInWait[] => {
  return [...props.similarItems, ...data.ownSimilarItems];
});

watchEffect(() => load());

// FUNCTIONS
const toast = new Toast("#alert-toast");
const fetchSuggestions = debounce(async (event: AutoCompleteCompleteEvent) => {
  const result = await HttpClient.getAllMediaInWaits({
    title: event.query || undefined,
    // @ts-expect-error
    medium: this.medium || undefined,
    limit: 10,
  });
  // @ts-expect-error
  this.suggestions = result;
});

function addOwnSimilar() {
  if (data.selectedOwnSimilar) {
    data.ownSimilarItems.push(data.selectedOwnSimilar);
    data.selectedOwnSimilar = null;
  }
}

function load() {
  if (!props.item) {
    return;
  }
  data.medium.title = props.item.title;
  data.medium.medium = props.item.medium;
}

function createMediumValues() {
  return {
    title: "",
    medium: 0,
    author: "",
    artist: "",
    series: "",
    universe: "",
    lang: "",
    countryOfOrigin: "",
    languageOfOrigin: "",
    stateTL: 0,
    stateOrigin: 0,
  };
}

function reset() {
  data.medium = createMediumValues();
  data.lists = [];
  data.tocs = [];
  data.ownSimilarItems = [];
  data.toastMessage = "";
  data.toastTitle = "";
}

async function sendForm() {
  if (!props.item) {
    showMessage("Missing MediumInWait. Cannot add anything", "Invalid");
    return;
  }
  const result: AddMedium = { ...data.medium };

  if (!result.medium || !result.title) {
    showMessage("Invalid Medium, either title or medium type missing", "Invalid");
    return;
  }
  if (!data.selectedList) {
    showMessage("No List Selected", "Invalid");
    return;
  }
  try {
    const medium = await HttpClient.postCreateMediumFromMediaInWaits(
      props.item,
      mergedSimilarItems.value,
      data.selectedList,
    );
    const success = await HttpClient.updateMedium({ id: medium.id, ...result });
    if (success) {
      showMessage("Successfully created Medium", "Success");
    } else {
      // should never happen, success is always true if there is no error
      showMessage("Failed in creating Medium", "Failure");
    }
  } catch (error) {
    console.error(error);
    showMessage("Failed in creating Medium with an Error", "Hard Failure");
  }
}
function close() {
  emits("update:item", undefined);
  reset();
}
function showMessage(message: string, title: string) {
  data.toastMessage = message;
  data.toastTitle = title;
  toast.show();
}
</script>
