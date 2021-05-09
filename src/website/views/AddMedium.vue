<template>
  <div>
    <h1>Add Medium</h1>
    <form class="form-inline mx-3 px-2">
      <label>
        Load from Toc Link:
        <input
          v-model="toc"
          class="form-control ml-1"
          name="toc"
          title="ToC Link"
          type="url"
          placeholder="URL of the ToC"
        />
      </label>
      <button class="btn btn-dark ml-1" type="button" @click.left="loadToc()">Load</button>
    </form>
    <form>
      <div class="form-row mx-3">
        <div class="form-group col-md-3">
          <label> Title </label>
          <input
            v-model="medium.title"
            class="form-control"
            name="title"
            required
            title="Title"
            type="text"
            placeholder="Title of the Medium"
          />
        </div>
        <div class="form-group col-md-3">
          <label>Medium</label>
          <select v-model="medium.medium" class="custom-select">
            <option :value="1"><type-icon :type="1" class="form-control-plaintext" /> Text</option>
            <option :value="2"><type-icon :type="2" class="form-control-plaintext" /> Audio</option>
            <option :value="4"><type-icon :type="4" class="form-control-plaintext" /> Video</option>
            <option :value="8"><type-icon :type="8" class="form-control-plaintext" /> Image</option>
          </select>
        </div>
      </div>
      <div class="form-row mx-3">
        <div class="form-group col-md-3">
          <label> Author </label>
          <input
            v-model="medium.author"
            name="author"
            class="form-control"
            title="Author"
            type="text"
            placeholder="One or multiple Authors of the Medium"
          />
        </div>
        <div class="form-group col-md-3">
          <label>Artist</label>
          <input
            v-model="medium.artist"
            class="form-control"
            name="artist"
            title="Artist"
            type="text"
            placeholder="One or multiple Artists of the Medium"
          />
        </div>
      </div>
      <div class="form-row mx-3">
        <div class="form-group col-md-3">
          <label>Series</label>
          <input
            v-model="medium.series"
            class="form-control"
            name="series"
            title="Series"
            type="text"
            placeholder="Series of the Medium"
          />
        </div>
        <div class="form-group col-md-3">
          <label>Universe</label>
          <input
            v-model="medium.universe"
            class="form-control"
            name="universe"
            title="Universe"
            type="text"
            placeholder="Universe of the Medium"
          />
        </div>
      </div>
      <div class="form-group col-md-3 mx-3 px-1">
        <label>Language</label>
        <input
          v-model="medium.lang"
          class="form-control"
          name="language"
          title="Language"
          type="text"
          placeholder="Translated Language"
        />
      </div>
      <div class="form-row mx-3">
        <div class="form-group col-md-3">
          <label>Country Of Origin</label>
          <input
            v-model="medium.countryOfOrigin"
            class="form-control"
            name="countryOfOrigin"
            title="Country Of Origin"
            type="text"
            placeholder="Country of Origin"
          />
        </div>
        <div class="form-group col-md-3">
          <label>Language Of Origin</label>
          <input
            v-model="medium.languageOfOrigin"
            class="form-control"
            name="langOfOrigin"
            title="Language Of Origin"
            type="text"
            placeholder="Original Language"
          />
        </div>
      </div>
      <div class="form-row mx-3">
        <div class="form-group col-md-3">
          <label>Status of Translator</label>
          <release-state
            :state="medium.stateTL"
            class="ml-1"
            name="stateTl"
            title="Status of Translator"
            placeholder="Status of the Translation"
          />
        </div>
        <div class="form-group col-md-3">
          <label>Status in COO</label>
          <release-state
            :state="medium.stateOrigin"
            class="ml-1"
            name="stateCOO"
            title="Status in COO"
            placeholder="Publishing Status of the Medium"
          />
        </div>
      </div>
      <div class="form-group mx-3 px-1">
        <select class="form-control col-md-3" title="Select list to add medium to:">
          <option disabled selected value="">Select list to add medium to</option>
          <option v-for="list in lists" :key="list.id" :value="list.id">
            {{ list.name }}
          </option>
        </select>
      </div>
      <button class="btn btn-dark mx-3 px-1" type="button" @click="send()">Add Medium</button>
      <div class="error" />
    </form>
    <div
      id="alert-toast"
      class="toast"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-autohide="false"
      style="position: relative; top: -10em; left: 1em"
    >
      <div class="toast-header">
        <i class="fas fa-exclamation-circle rounded mr-2 text-danger" aria-hidden="true" />
        <strong class="mr-auto">{{ toastTitle }}</strong>
        <button
          type="button"
          class="ml-2 mb-1 close"
          data-dismiss="toast"
          aria-label="Close"
          @click.left="closeProgressToast"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="toast-body">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { AddMedium, List } from "../siteTypes";
import { HttpClient } from "../Httpclient";
import TypeIcon from "../components/type-icon.vue";
import ReleaseState from "../components/release-state.vue";
import $ from "jquery";

// initialize all toasts
$(".toast").toast();

interface Data {
  medium: AddMedium;
  toc: string;
  toastMessage: string;
  toastTitle: string;
}

export default defineComponent({
  name: "AddMedium",
  components: {
    TypeIcon,
    ReleaseState,
  },
  props: {
    show: Boolean,
  },

  data(): Data {
    return {
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
        stateTL: 0,
        stateOrigin: 0,
      },
      toc: "",
      toastMessage: "",
      toastTitle: "",
    };
  },

  computed: {
    lists(): List[] {
      return this.$store.state.lists.lists;
    },
  },

  methods: {
    closeProgressToast() {
      // TODO: implement?
    },
    send(): void {
      const result: AddMedium = { ...this.medium };
      if (!result.medium || !result.title) {
        this.showMessage("Invalid Medium, either title or medium type missing", "Invalid");
        return;
      }
      HttpClient.createMedium(result)
        .then((medium) => {
          if (this.toc) {
            return HttpClient.addToc(this.toc, medium.id);
          } else {
            return true;
          }
        })
        .then((success) => {
          if (success) {
            this.showMessage("Successfully created Medium", "Success");
          } else {
            // should never happen, success is always true if there is no error
            this.showMessage("Failed in creating Medium", "Failure");
          }
        })
        .catch(() => {
          this.showMessage("Failed in creating Medium", "Failure");
        });
    },
    showMessage(message: string, title: string) {
      this.toastMessage = message;
      this.toastTitle = title;
      $("#alert-toast").toast("show");
      console.log(`Showing Message: ${title}: ${message}`);
    },
    loadToc(): void {
      HttpClient.getToc(this.toc)
        .then((value) => {
          // look only at first value for now
          const toc = value[0];

          if (toc) {
            this.medium.stateOrigin = toc.statusCOO || 0;
            this.medium.stateTL = toc.statusTl || 0;
            this.medium.medium = toc.mediumType;
            this.medium.title = toc.title;
            this.medium.lang = toc.langTL || "";
            this.medium.languageOfOrigin = toc.langCOO || "";
            this.medium.author = toc.authors ? toc.authors.join(", ") : "";
            this.medium.artist = toc.artists ? toc.artists.join(", ") : "";
          }
        })
        .catch(console.error);
    },
  },
});
</script>
