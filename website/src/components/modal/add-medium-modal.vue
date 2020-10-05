<template>
  <modal
    :error="error"
    :show="show"
    @finish="send()"
  >
    <template #title>
      Add Medium
    </template>
    <template #input>
      <div class="title">
        <label>
          Title:
          <input
            v-model="medium.title"
            name="title"
            required
            title="Title"
            type="text"
          >
        </label>
      </div>
      <div class="medium">
        <label>Medium:</label>
        <span
          v-for="type of mediaTypes"
          :key="type"
          class="medium-check-container"
        >
          <label>
            <input
              v-model="type.checked"
              type="checkbox"
            >
            {{ type.name }}
          </label>
        </span>
      </div>
      <div class="author autocomplete">
        <label>
          Author:
          <input
            v-model="medium.author"
            name="author"
            title="Author"
            type="text"
          >
        </label>
      </div>
      <div class="artist autocomplete">
        <label>Artist: <input
          v-model="medium.artist"
          name="artist"
          title="Artist"
          type="text"
        > </label>
      </div>
      <div class="series autocomplete">
        <label>Series: <input
          v-model="medium.series"
          name="series"
          title="Series"
          type="text"
        > </label>
      </div>
      <div class="universe autocomplete">
        <label>Universe: <input
          v-model="medium.universe"
          name="universe"
          title="Universe"
          type="text"
        > </label>
      </div>
      <div class="language autocomplete">
        <label>Language: <input
          v-model="medium.language"
          name="language"
          title="Language"
          type="text"
        > </label>
      </div>
      <div class="countryOfOrigin autocomplete">
        <label>Country Of Origin: <input
          v-model="medium.countryOfOrigin"
          name="countryOfOrigin"
          title="Country Of Origin"
          type="text"
        > </label>
      </div>
      <div class="langOfOrigin autocomplete">
        <label>Language Of Origin: <input
          v-model="medium.langOfOrigin"
          name="langOfOrigin"
          title="Language Of Origin"
          type="text"
        > </label>
      </div>
      <div class="stateTl autocomplete">
        <label>Status of Translator: <input
          v-model="medium.stateTl"
          name="stateTl"
          title="Status of Translator"
          type="text"
        > </label>
      </div>
      <div class="stateCOO autocomplete">
        <label>Status in COO: <input
          v-model="medium.stateCOO"
          name="stateCOO"
          title="Status in COO"
          type="text"
        >
        </label>
      </div>
      <div class="list select-container">
        <select
          class="list-select"
          title="Select list to add medium to:"
        >
          <option
            disabled
            selected
            value=""
          >
            Select list to add medium to
          </option>
          <option
            v-for="list in lists"
            :key="list.id"
            :value="list.id"
          >
            {{ list.name }}
          </option>
        </select>
      </div>
    </template>
    <template #finish>
      Add Medium
    </template>
  </modal>
</template>

<script lang="ts">
import {emitBusEvent} from "../../bus";
import modal from "./modal";

interface GuiMediaType {
  value: number;
  name: string;
  checked: boolean;
}

interface AddMedium {
  title: string;
  author: string;
  artist: string;
  series: string;
  universe: string;
  language: string;
  countryOfOrigin: string;
  langOfOrigin: string;
  stateTl: string;
  stateCOO: string;
}

interface Data {
  mediaTypes: GuiMediaType[];
  name: string;
  medium: AddMedium;
}

import { defineComponent, PropType } from "vue";
import { List } from "src/siteTypes";

export default defineComponent({
    name: "AddMediumModal",
    components: {modal},
    props: {
        show: Boolean,
        error: { type: String, required: true },
        lists: { type: Array as PropType<List[]>, required: true },
    },
    data(): Data {
        return {
            mediaTypes: [
                {
                    name: "Text",
                    checked: false,
                    value: 0x1,
                },
                {
                    name: "Audio",
                    checked: false,
                    value: 0x2,
                },
                {
                    name: "Video",
                    checked: false,
                    value: 0x4,
                },
                {
                    name: "Image",
                    checked: false,
                    value: 0x8,
                },
            ],
            name: "",
            medium: {
                title: "",
                author: "",
                artist: "",
                series: "",
                universe: "",
                language: "",
                countryOfOrigin: "",
                langOfOrigin: "",
                stateTl: "",
                stateCOO: "",
            }
        };
    },

    methods: {
        send(): void {
            let mediumType = 0;
            this.mediaTypes.forEach((value) => {
                if (value.checked) {
                    mediumType |= value.values;
                }
            });
            const result = {type: mediumType};
            Object.assign(result, this.medium);
            console.log(result);
            emitBusEvent("do:add-medium", result);
        }
    }
});
</script>
